import { Router, type IRouter } from "express";
import { eq, and, gte, sum, sql } from "drizzle-orm";
import { db, usersTable, gaTokenLedgerTable, chsSnapshotsTable, creativeLaborSubmissionsTable, humanTaskCompletionsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/userSync";

const router: IRouter = Router();

router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const latestChs = await db
    .select()
    .from(chsSnapshotsTable)
    .where(eq(chsSnapshotsTable.userId, user.clerkId))
    .orderBy(sql`${chsSnapshotsTable.createdAt} desc`)
    .limit(1);

  res.json({
    clerkId: user.clerkId,
    email: user.email,
    displayName: user.displayName,
    gaBalance: user.gaBalance,
    chsScore: latestChs[0]?.score ?? 50,
    createdAt: user.createdAt.toISOString(),
  });
});

router.get("/stats", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [gaEarnedRow] = await db
    .select({ total: sum(gaTokenLedgerTable.delta) })
    .from(gaTokenLedgerTable)
    .where(
      and(
        eq(gaTokenLedgerTable.userId, user.clerkId),
        gte(gaTokenLedgerTable.createdAt, todayStart),
        sql`${gaTokenLedgerTable.delta} > 0`
      )
    );

  const [gaSpentRow] = await db
    .select({ total: sum(gaTokenLedgerTable.delta) })
    .from(gaTokenLedgerTable)
    .where(
      and(
        eq(gaTokenLedgerTable.userId, user.clerkId),
        gte(gaTokenLedgerTable.createdAt, todayStart),
        sql`${gaTokenLedgerTable.delta} < 0`
      )
    );

  const [tasksRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(creativeLaborSubmissionsTable)
    .where(
      and(
        eq(creativeLaborSubmissionsTable.userId, user.clerkId),
        eq(creativeLaborSubmissionsTable.passed, true)
      )
    );

  const [humanTasksRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(humanTaskCompletionsTable)
    .where(
      and(
        eq(humanTaskCompletionsTable.userId, user.clerkId),
        eq(humanTaskCompletionsTable.passed, true)
      )
    );

  const latestChs = await db
    .select()
    .from(chsSnapshotsTable)
    .where(eq(chsSnapshotsTable.userId, user.clerkId))
    .orderBy(sql`${chsSnapshotsTable.createdAt} desc`)
    .limit(2);

  const currentScore = latestChs[0]?.score ?? 50;
  const prevScore = latestChs[1]?.score ?? 50;
  const chsTrend: "up" | "down" | "stable" =
    currentScore > prevScore ? "up" : currentScore < prevScore ? "down" : "stable";

  res.json({
    gaBalance: user.gaBalance,
    gaEarnedToday: Number(gaEarnedRow?.total ?? 0),
    gaSpentToday: Math.abs(Number(gaSpentRow?.total ?? 0)),
    chsScore: currentScore,
    chsTrend,
    tasksCompletedTotal: Number(tasksRow?.count ?? 0),
    humanTasksCompletedTotal: Number(humanTasksRow?.count ?? 0),
    streakDays: 0,
  });
});

export default router;
