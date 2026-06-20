import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
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
  if (user.gaBalance < amount) {
    res.status(400).json({ error: "Insufficient GA balance" });
    return;
  }

  const newBalance = user.gaBalance - amount;

  await db.transaction(async (tx) => {
    await tx
      .update(usersTable)
      .set({ gaBalance: newBalance })
      .where(eq(usersTable.clerkId, user.clerkId));

    await tx.insert(gaTokenLedgerTable).values({
      userId: user.clerkId,
      delta: -amount,
      reason,
    });
  });

  res.json({
    balance: newBalance,
    dailyAllowance: user.dailyAllowance,
    lastResetAt: user.lastGaResetAt.toISOString(),
  });
});

export default router;
