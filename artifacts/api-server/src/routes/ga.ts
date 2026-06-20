import { Router, type IRouter } from "express";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { db, usersTable, gaTokenLedgerTable, creativeLaborSubmissionsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/userSync";

const router: IRouter = Router();

router.get("/ga/balance", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({
    balance: user.gaBalance,
    dailyAllowance: user.dailyAllowance,
    lastResetAt: user.lastGaResetAt.toISOString(),
  });
});

router.get("/ga/history", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const entries = await db
    .select()
    .from(gaTokenLedgerTable)
    .where(eq(gaTokenLedgerTable.userId, user.clerkId))
    .orderBy(desc(gaTokenLedgerTable.createdAt))
    .limit(50);
  res.json(entries.map((e) => ({
    id: e.id, delta: e.delta, reason: e.reason,
    createdAt: e.createdAt.toISOString(),
  })));
});

router.post("/ga/spend", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { amount, reason } = req.body as { amount: number; reason: string };
  if (!amount || amount < 1 || !Number.isInteger(amount)) {
    res.status(400).json({ error: "Invalid amount" }); return;
  }
  if (!reason || typeof reason !== "string") {
    res.status(400).json({ error: "Reason is required" }); return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(usersTable)
        .set({ gaBalance: sql`${usersTable.gaBalance} - ${amount}` })
        .where(and(eq(usersTable.clerkId, user.clerkId), gte(usersTable.gaBalance, amount)))
        .returning({ gaBalance: usersTable.gaBalance, dailyAllowance: usersTable.dailyAllowance, lastGaResetAt: usersTable.lastGaResetAt });
      if (!updated) return null;
      await tx.insert(gaTokenLedgerTable).values({ userId: user.clerkId, delta: -amount, reason });
      return updated;
    });

    if (!result) { res.status(400).json({ error: "Insufficient GA balance" }); return; }
    res.json({ balance: result.gaBalance, dailyAllowance: result.dailyAllowance, lastResetAt: result.lastGaResetAt.toISOString() });
  } catch (err) {
    console.error("GA spend error:", err);
    res.status(500).json({ error: "Failed to process spend" });
  }
});

/**
 * POST /ga/earn
 *
 * Claims GA tokens for a verified submission. Requires a submissionId from a
 * passing /creative-labor/submit evaluation. Each submission can be credited
 * exactly once (credited=false guard prevents double-award). This design ensures
 * token issuance is always tied to a verified, AI-evaluated labor event.
 */
router.post("/ga/earn", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { submissionId } = req.body as { submissionId: number };
  if (!submissionId || !Number.isInteger(submissionId) || submissionId < 1) {
    res.status(400).json({ error: "Valid submissionId is required" }); return;
  }

  const [submission] = await db
    .select()
    .from(creativeLaborSubmissionsTable)
    .where(and(
      eq(creativeLaborSubmissionsTable.id, submissionId),
      eq(creativeLaborSubmissionsTable.userId, user.clerkId),
    ))
    .limit(1);

  if (!submission) {
    res.status(400).json({ error: "Submission not found" }); return;
  }
  if (!submission.passed || submission.gaRewarded <= 0) {
    res.status(400).json({ error: "Submission did not pass evaluation" }); return;
  }
  if (submission.credited) {
    res.status(400).json({ error: "Tokens for this submission have already been claimed" }); return;
  }

  const amount = submission.gaRewarded;

  try {
    const [updated] = await db.transaction(async (tx) => {
      await tx
        .update(creativeLaborSubmissionsTable)
        .set({ credited: true })
        .where(and(
          eq(creativeLaborSubmissionsTable.id, submissionId),
          eq(creativeLaborSubmissionsTable.credited, false),
        ));

      const rows = await tx
        .update(usersTable)
        .set({ gaBalance: sql`${usersTable.gaBalance} + ${amount}` })
        .where(eq(usersTable.clerkId, user.clerkId))
        .returning({ gaBalance: usersTable.gaBalance, dailyAllowance: usersTable.dailyAllowance, lastGaResetAt: usersTable.lastGaResetAt });

      await tx.insert(gaTokenLedgerTable).values({
        userId: user.clerkId,
        delta: amount,
        reason: `Creative Labor reward claimed`,
      });

      return rows;
    });

    res.json({
      balance: updated.gaBalance,
      dailyAllowance: updated.dailyAllowance,
      lastResetAt: updated.lastGaResetAt.toISOString(),
    });
  } catch (err) {
    console.error("GA earn error:", err);
    res.status(500).json({ error: "Failed to claim tokens" });
  }
});

export default router;
