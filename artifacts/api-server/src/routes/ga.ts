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

export default router;
