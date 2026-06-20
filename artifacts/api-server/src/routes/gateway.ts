import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, gatewayStateTable, humanTaskCompletionsTable, gaTokenLedgerTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/userSync";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  getOrCreateGatewayState,
  triggerGateway,
  checkAndMaybeAutoTrigger,
  buildStatusPayload,
} from "../lib/gatewayEngine";
import { HUMAN_TASKS, UNLOCK_DURATION_MINUTES, type HumanTaskType } from "../lib/humanTasks";

const router: IRouter = Router();

/**
 * GET /gateway/status
 *
 * Returns the user's current gateway state, auto-running expiry and threshold
 * checks so the response always reflects the most up-to-date state.
 */
router.get("/gateway/status", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const state = await checkAndMaybeAutoTrigger(user.clerkId);
  res.json(buildStatusPayload(state));
});

/**
 * POST /gateway/trigger
 *
 * Manually locks the gateway for the current user.
 * Primarily used for testing; production triggers happen automatically via spend.
 */
router.post("/gateway/trigger", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const state = await getOrCreateGatewayState(user.clerkId);
  if (state.locked) {
    res.json(buildStatusPayload(state));
    return;
  }

  const updated = await triggerGateway(user.clerkId);
  res.json(buildStatusPayload(updated));
});

/**
 * POST /gateway/submit
 *
 * Evaluates a human-task response via LLM. On pass: unlocks the gateway for
 * 30 minutes, resets session counters, awards GA bonus. On fail: returns
 * feedback but leaves the gateway locked.
 */
router.post("/gateway/submit", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const state = await getOrCreateGatewayState(user.clerkId);

  if (!state.locked) {
    res.status(400).json({ error: "Gateway is not currently locked" });
    return;
  }
  if (!state.currentTaskType) {
    res.status(400).json({ error: "No active gateway task" });
    return;
  }

  const { response } = req.body as { response?: string };
  if (!response || typeof response !== "string" || response.trim().length < 20) {
    res.status(400).json({ error: "Response must be at least 20 characters" });
    return;
  }

  const task = HUMAN_TASKS[state.currentTaskType as HumanTaskType];
  if (!task) {
    res.status(500).json({ error: "Unknown task type" });
    return;
  }

  // LLM evaluation
  let passed = false;
  let verdict = "Unable to evaluate response at this time.";
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a strict evaluator for a proof-of-humanity system. " +
            "Assess whether the user genuinely engaged with the task or is just filling in text. " +
            "Respond ONLY with JSON: { \"passed\": true/false, \"verdict\": \"one sentence of feedback\" }. " +
            "Be demanding — generic, vague, or minimal responses must fail.",
        },
        {
          role: "user",
          content:
            `Task: ${task.title}\n` +
            `Instructions: ${task.instructions}\n\n` +
            `Evaluation criteria: ${task.evaluationCriteria}\n\n` +
            `User's response:\n${response.trim()}`,
        },
      ],
      max_tokens: 200,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { passed?: boolean; verdict?: string };
    passed = parsed.passed === true;
    verdict = typeof parsed.verdict === "string" ? parsed.verdict : verdict;
  } catch (err) {
    console.error("Gateway LLM evaluation error:", err);
  }

  // Record the attempt regardless of outcome
  const [completion] = await db
    .insert(humanTaskCompletionsTable)
    .values({
      userId: user.clerkId,
      taskType: state.currentTaskType,
      dataJson: { response: response.trim() },
      verdict,
      passed,
    })
    .returning();

  if (!passed) {
    res.json({ passed: false, verdict, gaBonus: 0, newBalance: user.gaBalance, unlockExpiresAt: null });
    return;
  }

  // Unlock: reset session, set expiry, award GA bonus
  const now = new Date();
  const unlockExpiresAt = new Date(now.getTime() + UNLOCK_DURATION_MINUTES * 60_000);

  await db
    .update(gatewayStateTable)
    .set({
      locked: false,
      currentTaskType: null,
      unlockExpiresAt,
      sessionSpend: 0,
      sessionStartedAt: now,
    })
    .where(eq(gatewayStateTable.userId, user.clerkId));

  const gaBonus = task.gaBonus;
  const [updatedUser] = await db
    .update(usersTable)
    .set({ gaBalance: sql`${usersTable.gaBalance} + ${gaBonus}` })
    .where(eq(usersTable.clerkId, user.clerkId))
    .returning({ gaBalance: usersTable.gaBalance });

  await db.insert(gaTokenLedgerTable).values({
    userId: user.clerkId,
    delta: gaBonus,
    reason: `Gateway unlock: ${task.title}`,
  });

  res.json({
    passed: true,
    verdict,
    gaBonus,
    newBalance: updatedUser?.gaBalance ?? user.gaBalance + gaBonus,
    unlockExpiresAt: unlockExpiresAt.toISOString(),
  });
});

export default router;
