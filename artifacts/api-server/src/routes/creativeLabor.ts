import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, gaTokenLedgerTable, creativeLaborSubmissionsTable, creativeLaborTaskTemplatesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/userSync";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.get("/creative-labor/tasks", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const tasks = await db
    .select()
    .from(creativeLaborTaskTemplatesTable)
    .orderBy(creativeLaborTaskTemplatesTable.id);

  res.json(
    tasks.map((t) => ({
      id: t.id,
      slug: t.slug,
      type: t.type,
      title: t.title,
      description: t.description,
      instructions: t.instructions,
      gaReward: t.gaReward,
    }))
  );
});

router.post("/creative-labor/submit", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { taskSlug, content } = req.body as { taskSlug: string; content: string };

  if (!taskSlug || typeof taskSlug !== "string") {
    res.status(400).json({ error: "taskSlug is required" });
    return;
  }
  if (!content || typeof content !== "string" || content.trim().length < 10) {
    res.status(400).json({ error: "Content must be at least 10 characters" });
    return;
  }

  const [task] = await db
    .select()
    .from(creativeLaborTaskTemplatesTable)
    .where(eq(creativeLaborTaskTemplatesTable.slug, taskSlug))
    .limit(1);

  if (!task) {
    res.status(400).json({ error: "Unknown task slug" });
    return;
  }

  const systemPrompt = `You are an evaluator for The Agency Engine, a platform that rewards genuine human cognitive effort. Your job is to assess submitted work against provided criteria.

Be an honest but fair judge. Reward genuine effort and creative thinking. Reject low-effort, AI-generated, or completely off-topic submissions.

ALWAYS respond with valid JSON matching this exact structure:
{
  "passed": boolean,
  "qualityNotes": string (2-4 sentences of specific feedback on the submission),
  "gaReward": number (integer, 0 if failed, between 1 and ${task.gaReward} if passed — award the full ${task.gaReward} for excellent work)
}`;

  const userPrompt = `Task: ${task.title}
Task Type: ${task.type}
Instructions given to user: ${task.instructions}
Evaluation criteria: ${task.evaluationCriteria}

User's submission:
---
${content.trim()}
---

Evaluate this submission. Does it meet the criteria? Award GA tokens (0–${task.gaReward}) based on quality.`;

  let passed = false;
  let qualityNotes = "Unable to evaluate at this time. Please try again.";
  let gaReward = 0;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 512,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        passed: boolean;
        qualityNotes: string;
        gaReward: number;
      };
      passed = Boolean(parsed.passed);
      qualityNotes = String(parsed.qualityNotes ?? "");
      gaReward = Math.max(0, Math.min(task.gaReward, Math.round(Number(parsed.gaReward) || 0)));
      if (!passed) gaReward = 0;
    }
  } catch (err) {
    console.error("AI evaluation error:", err);
    res.status(500).json({ error: "AI evaluation failed. Please try again." });
    return;
  }

  let newBalance = user.gaBalance;
  let submissionId: number;

  await db.transaction(async (tx) => {
    const [submission] = await tx
      .insert(creativeLaborSubmissionsTable)
      .values({
        userId: user.clerkId,
        taskType: task.type,
        content: content.trim(),
        verdict: qualityNotes,
        passed,
        gaRewarded: gaReward,
      })
      .returning();

    submissionId = submission.id;

    if (passed && gaReward > 0) {
      newBalance = user.gaBalance + gaReward;
      await tx
        .update(usersTable)
        .set({ gaBalance: newBalance })
        .where(eq(usersTable.clerkId, user.clerkId));

      await tx.insert(gaTokenLedgerTable).values({
        userId: user.clerkId,
        delta: gaReward,
        reason: `Creative Labor: ${task.title}`,
      });
    }
  });

  res.json({
    passed,
    qualityNotes,
    gaRewarded: gaReward,
    newBalance,
    submissionId: submissionId!,
  });
});

export default router;
