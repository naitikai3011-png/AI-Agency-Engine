import { Router, type IRouter } from "express";
import { eq, desc, sql, and, gte, gt } from "drizzle-orm";
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
 * passing /creative-labor/submit evaluation.
 *
 * Concurrency safety: the `credited` flag is flipped inside the transaction
 * using a predicate that includes `credited=false`, `passed=true`, and
 * `gaRewarded > 0`. The UPDATE returns the affected row — if no row comes back
 * (concurrent claim already won, wrong user, or invalid state), the transaction
 * aborts and returns 400 before any balance change occurs. There is no
 * pre-read/check outside the transaction; all guards are inside the atomic block.
 */
router.post("/ga/earn", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { submissionId } = req.body as { submissionId: number };
  if (!submissionId || !Number.isInteger(submissionId) || submissionId < 1) {
    res.status(400).json({ error: "Valid submissionId is required" }); return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Atomically flip credited=false → credited=true with all validity checks in the predicate.
      // If another request already claimed this submission, or state is invalid, returns [].
      const [claimed] = await tx
        .update(creativeLaborSubmissionsTable)
        .set({ credited: true })
        .where(and(
          eq(creativeLaborSubmissionsTable.id, submissionId),
          eq(creativeLaborSubmissionsTable.userId, user.clerkId),
          eq(creativeLaborSubmissionsTable.credited, false),
          eq(creativeLaborSubmissionsTable.passed, true),
          gt(creativeLaborSubmissionsTable.gaRewarded, 0),
        ))
        .returning({ gaRewarded: creativeLaborSubmissionsTable.gaRewarded });

      // No row → submission not found, wrong owner, not passed, already credited, or 0 reward.
      if (!claimed) return null;

      const amount = claimed.gaRewarded;

      const [updated] = await tx
        .update(usersTable)
        .set({ gaBalance: sql`${usersTable.gaBalance} + ${amount}` })
        .where(eq(usersTable.clerkId, user.clerkId))
        .returning({
          gaBalance: usersTable.gaBalance,
          dailyAllowance: usersTable.dailyAllowance,
          lastGaResetAt: usersTable.lastGaResetAt,
        });

      await tx.insert(gaTokenLedgerTable).values({
        userId: user.clerkId,
        delta: amount,
        reason: "Creative Labor reward claimed",
      });

      return updated;
    });

    if (!result) {
      res.status(400).json({ error: "Submission is invalid, already credited, or not owned by you" });
      return;
    }

    res.json({
      balance: result.gaBalance,
      dailyAllowance: result.dailyAllowance,
      lastResetAt: result.lastGaResetAt.toISOString(),
    });
  } catch (err) {
    console.error("GA earn error:", err);
    res.status(500).json({ error: "Failed to claim tokens" });
  }
});

export default router;
