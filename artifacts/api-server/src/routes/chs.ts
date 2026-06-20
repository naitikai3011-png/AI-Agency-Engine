import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, chsSnapshotsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/userSync";

const router: IRouter = Router();

function getChsBand(score: number): "critical" | "poor" | "fair" | "good" | "thriving" {
  if (score <= 20) return "critical";
  if (score <= 40) return "poor";
  if (score <= 60) return "fair";
  if (score <= 80) return "good";
  return "thriving";
}

router.get("/chs/current", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const latest = await db
    .select()
    .from(chsSnapshotsTable)
    .where(eq(chsSnapshotsTable.userId, user.clerkId))
    .orderBy(desc(chsSnapshotsTable.createdAt))
    .limit(1);

  if (latest.length === 0) {
    const defaultFactors = { complexity: 50, originality: 50, depth: 50, effort: 50 };
    const [snapshot] = await db
      .insert(chsSnapshotsTable)
      .values({
        userId: user.clerkId,
        score: 50,
        factorsJson: defaultFactors,
      })
      .returning();

    res.json({
      score: snapshot.score,
      band: getChsBand(snapshot.score),
      factors: snapshot.factorsJson,
      updatedAt: snapshot.createdAt.toISOString(),
    });
    return;
  }

  const snapshot = latest[0];
  const factors = snapshot.factorsJson as { complexity: number; originality: number; depth: number; effort: number };

  res.json({
    score: snapshot.score,
    band: getChsBand(snapshot.score),
    factors,
    updatedAt: snapshot.createdAt.toISOString(),
  });
});

router.get("/chs/history", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const rows = await db
    .select({
      date: sql<string>`date_trunc('day', ${chsSnapshotsTable.createdAt})::date::text`,
      averageScore: sql<number>`round(avg(${chsSnapshotsTable.score}))::int`,
    })
    .from(chsSnapshotsTable)
    .where(
      sql`${chsSnapshotsTable.userId} = ${user.clerkId} AND ${chsSnapshotsTable.createdAt} >= ${thirtyDaysAgo}`
    )
    .groupBy(sql`date_trunc('day', ${chsSnapshotsTable.createdAt})`)
    .orderBy(sql`date_trunc('day', ${chsSnapshotsTable.createdAt})`);

  res.json(rows);
});

export default router;
