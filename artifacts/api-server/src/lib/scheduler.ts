import { db, usersTable, gaTokenLedgerTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

function msUntilNextMidnightUtc(): number {
  const now = new Date();
  const nextMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
  );
  return nextMidnight.getTime() - now.getTime();
}

async function runDailyReset() {
  const resetAt = new Date();
  logger.info({ resetAt }, "Running daily GA token reset");

  try {
    const users = await db
      .select({
        clerkId: usersTable.clerkId,
        gaBalance: usersTable.gaBalance,
        dailyAllowance: usersTable.dailyAllowance,
      })
      .from(usersTable);

    await db.transaction(async (tx) => {
      for (const user of users) {
        const delta = user.dailyAllowance - user.gaBalance;

        await tx
          .update(usersTable)
          .set({
            gaBalance: user.dailyAllowance,
            lastGaResetAt: resetAt,
          })
          .where(sql`${usersTable.clerkId} = ${user.clerkId}`);

        await tx.insert(gaTokenLedgerTable).values({
          userId: user.clerkId,
          delta,
          reason: "Daily GA token reset",
        });
      }
    });

    logger.info({ usersProcessed: users.length }, "Daily GA reset complete");
  } catch (err) {
    logger.error({ err }, "Daily GA reset failed");
  }
}

function scheduleDailyReset() {
  const delay = msUntilNextMidnightUtc();
  const nextMidnight = new Date(Date.now() + delay);
  logger.info({ nextMidnight: nextMidnight.toISOString(), delayMs: delay }, "Daily GA reset scheduled");

  setTimeout(async () => {
    await runDailyReset();
    scheduleDailyReset();
  }, delay);
}

export function startScheduler() {
  scheduleDailyReset();
}
