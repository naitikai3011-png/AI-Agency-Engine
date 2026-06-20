import { Router, type IRouter } from "express";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { db, usersTable, gaTokenLedgerTable } from "@workspace/db";
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

  res.json(
    entries.map((e) => ({
      id: e.id,
      delta: e.delta,
      reason: e.reason,
      createdAt: e.createdAt.toISOString(),
    }))
  );
});

router.post("/ga/spend", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { amount, reason } = req.body as { amount: number; reason: string };

  if (!amount || amount < 1 || !Number.isInteger(amount)) {
    res.status(400).json({ error: "Invalid amount" });
    return;
  }
  if (!reason || typeof reason !== "string") {
    res.status(400).json({ error: "Reason is required" });
    return;
  }

  let newBalance: number;

  try {
    const result = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(usersTable)
        .set({ gaBalance: sql`${usersTable.gaBalance} - ${amount}` })
        .where(
          and(
            eq(usersTable.clerkId, user.clerkId),
            gte(usersTable.gaBalance, amount)
          )
        )
        .returning({
          gaBalance: usersTable.gaBalance,
          dailyAllowance: usersTable.dailyAllowance,
          lastGaResetAt: usersTable.lastGaResetAt,
        });

      if (!updated) {
        return null;
      }

      await tx.insert(gaTokenLedgerTable).values({
        userId: user.clerkId,
        delta: -amount,
        reason,
      });

      return updated;
    });

    if (!result) {
      res.status(400).json({ error: "Insufficient GA balance" });
      return;
    }

    newBalance = result.gaBalance;
    res.json({
      balance: newBalance,
      dailyAllowance: result.dailyAllowance,
      lastResetAt: result.lastGaResetAt.toISOString(),
    });
  } catch (err) {
    console.error("GA spend error:", err);
    res.status(500).json({ error: "Failed to process spend" });
  }
});

router.post("/ga/earn", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { amount, reason } = req.body as { amount: number; reason: string };

  if (!amount || amount < 1 || !Number.isInteger(amount)) {
    res.status(400).json({ error: "Invalid amount" });
    return;
  }
  if (!reason || typeof reason !== "string") {
    res.status(400).json({ error: "Reason is required" });
    return;
  }

  const cappedAmount = Math.min(amount, user.dailyAllowance);

  try {
    const [updated] = await db.transaction(async (tx) => {
      const rows = await tx
        .update(usersTable)
        .set({ gaBalance: sql`${usersTable.gaBalance} + ${cappedAmount}` })
        .where(eq(usersTable.clerkId, user.clerkId))
        .returning({
          gaBalance: usersTable.gaBalance,
          dailyAllowance: usersTable.dailyAllowance,
          lastGaResetAt: usersTable.lastGaResetAt,
        });

      await tx.insert(gaTokenLedgerTable).values({
        userId: user.clerkId,
        delta: cappedAmount,
        reason,
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
    res.status(500).json({ error: "Failed to process earn" });
  }
});

export default router;
