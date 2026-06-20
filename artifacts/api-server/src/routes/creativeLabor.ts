import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, creativeLaborSubmissionsTable, creativeLaborTaskTemplatesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/userSync";
import { openai } from "@workspace/integrations-openai-ai-server";
import { recordInteraction } from "../lib/chsEngine";

const router: IRouter = Router();

router.get("/creative-labor/tasks", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const tasks = await db
    .select()
    .from(creativeLaborTaskTemplatesTable)
    .orderBy(creativeLaborTaskTemplatesTable.id);

  res.json(tasks.map((t) => ({
    id: t.id, slug: t.slug, type: t.type, title: t.title,
    description: t.description, instructions: t.instructions, gaReward: t.gaReward,
  })));
});

/**
 * POST /creative-labor/submit
 *
 * Evaluates a creative labor submission via AI and records the verdict.
 * Does NOT credit tokens directly — returns submissionId so the client can
 * call POST /ga/earn to claim tokens. This keeps token issuance in a single
 * auditable path.
 *
 * Deterministic pre-checks run before the AI call for applicable task types
 * (e.g., lipogram letter check). Structured JSON mode is enforced on the AI
 * call to prevent prompt-injection gaming of the verdict format.
 */
router.post("/creative-labor/submit", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { taskSlug, content } = req.body as { taskSlug: string; content: string };

  if (!taskSlug || typeof taskSlug !== "string") {
    res.status(400).json({ error: "taskSlug is required" }); return;
  }
  if (!content || typeof content !== "string" || content.trim().length < 10) {
    res.status(400).json({ error: "Content must be at least 10 characters" }); return;
  }

  const [task] = await db
    .select()
    .from(creativeLaborTaskTemplatesTable)
    .where(eq(creativeLaborTaskTemplatesTable.slug, taskSlug))
    .limit(1);

  if (!task) { res.status(400).json({ error: "Unknown task slug" }); return; }

  const trimmedContent = content.trim();

  let passed = false;
  let qualityNotes = "Unable to evaluate at this time. Please try again.";
  let gaReward = 0;

  // ── Deterministic pre-checks (run before AI, cheap to enforce) ──────────
  if (task.slug === "lipogram-writing") {
    if (/[eE]/.test(trimmedContent)) {
      passed = false;
      qualityNotes = "Automatic fail: your submission contains the letter 'E'. The lipogram constraint requires zero occurrences of 'e' or 'E'. Every word must avoid this letter.";
      gaReward = 0;

      const [submission] = await db
        .insert(creativeLaborSubmissionsTable)
        .values({ userId: user.clerkId, taskType: task.type, content: trimmedContent, verdict: qualityNotes, passed, gaRewarded: gaReward, credited: false })
        .returning();

      res.json({ passed, qualityNotes, gaRewarded: gaReward, currentBalance: user.gaBalance, submissionId: submission.id });
      return;
    }
  }

  // ── AI evaluation with enforced JSON mode ─────────────────────────────────
  const systemPrompt = `You are an evaluator for The Agency Engine. Assess submitted work against the provided criteria.
Be honest but fair. Reward genuine human cognitive effort. Reject low-effort, off-topic, or AI-generated submissions.

Respond ONLY with a JSON object — no markdown, no explanation outside JSON:
{
  "passed": boolean,
  "qualityNotes": "2-4 sentences of specific feedback",
  "gaReward": number (0 if failed; 1–${task.gaReward} if passed based on quality)
}`;

  const userPrompt = `Task: ${task.title}
Type: ${task.type}
Instructions shown to user: ${task.instructions}
Evaluation criteria: ${task.evaluationCriteria}

Submission:
---
${trimmedContent}
---

Evaluate and return JSON verdict.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 512,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";

    let parsed: { passed?: unknown; qualityNotes?: unknown; gaReward?: unknown } = {};
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      console.error("AI returned non-JSON response:", raw);
    }

    passed = Boolean(parsed.passed);
    qualityNotes = typeof parsed.qualityNotes === "string" && parsed.qualityNotes.length > 0
      ? parsed.qualityNotes
      : "No feedback provided.";
    gaReward = passed
      ? Math.max(0, Math.min(task.gaReward, Math.round(Number(parsed.gaReward) || 0)))
      : 0;
  } catch (err) {
    console.error("AI evaluation error:", err);
    res.status(500).json({ error: "AI evaluation failed. Please try again." });
    return;
  }

  // ── Persist verdict (token crediting happens in POST /ga/earn) ────────────
  try {
    const [submission] = await db
      .insert(creativeLaborSubmissionsTable)
      .values({
        userId: user.clerkId,
        taskType: task.type,
        content: trimmedContent,
        verdict: qualityNotes,
        passed,
        gaRewarded: gaReward,
        credited: false,
      })
      .returning();

    // Fire-and-forget CHS update — doesn't affect submission response
    recordInteraction(user.clerkId, trimmedContent, `Creative Labor: ${task.title}`)
      .catch((err) => console.error("CHS record error after submission:", err));

    res.json({
      passed,
      qualityNotes,
      gaRewarded: gaReward,
      currentBalance: user.gaBalance,
      submissionId: submission.id,
    });
  } catch (err) {
    console.error("DB insert error:", err);
    res.status(500).json({ error: "Failed to record submission" });
  }
});

export default router;
