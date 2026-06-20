import { getAuth, clerkClient } from "@clerk/express";
import type { Request } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function getOrCreateUser(req: Request) {
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) return null;

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);

  if (existing.length > 0) {
    const user = existing[0];
    await maybeResetGaTokens(user);
    return (await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1))[0];
  }

  const clerkUser = await clerkClient.users.getUser(clerkId);
  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const displayName = clerkUser.firstName
    ? `${clerkUser.firstName} ${clerkUser.lastName ?? ""}`.trim()
    : null;

  const [newUser] = await db
    .insert(usersTable)
    .values({
      id: clerkId,
      clerkId,
      email,
      displayName,
      gaBalance: 5,
      dailyAllowance: 5,
    })
    .returning();

  return newUser;
}

async function maybeResetGaTokens(user: typeof usersTable.$inferSelect) {
  const now = new Date();
  const lastReset = new Date(user.lastGaResetAt);
  const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

  if (hoursSinceReset >= 24) {
    await db
      .update(usersTable)
      .set({
        gaBalance: user.dailyAllowance,
        lastGaResetAt: now,
      })
      .where(eq(usersTable.clerkId, user.clerkId));
  }
}
