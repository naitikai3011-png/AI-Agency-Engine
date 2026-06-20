import { eq, sql } from "drizzle-orm";
import { db, gatewayStateTable } from "@workspace/db";
import type { GatewayState } from "@workspace/db";
import {
  HUMAN_TASKS,
  pickRandomTask,
  SESSION_SPEND_THRESHOLD,
  SESSION_MINUTES_LIMIT,
  type HumanTaskType,
} from "./humanTasks";

const LOCK_COOLDOWN_MS = 5 * 60 * 1000;

export interface GatewayStatusPayload {
  locked: boolean;
  currentTask: {
    type: string;
    title: string;
    description: string;
    instructions: string;
    placeholder: string;
    gaBonus: number;
    timedSeconds: number | null;
  } | null;
  unlockExpiresAt: string | null;
  minutesRemaining: number | null;
  sessionSpend: number;
  sessionSpendThreshold: number;
  sessionMinutesElapsed: number;
  sessionMinutesLimit: number;
}

export async function getOrCreateGatewayState(userId: string): Promise<GatewayState> {
  const [existing] = await db
    .select()
    .from(gatewayStateTable)
    .where(eq(gatewayStateTable.userId, userId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(gatewayStateTable)
    .values({ userId })
    .onConflictDoNothing()
    .returning();

  if (!created) {
    const [refetched] = await db
      .select()
      .from(gatewayStateTable)
      .where(eq(gatewayStateTable.userId, userId))
      .limit(1);
    return refetched;
  }
  return created;
}

export async function triggerGateway(userId: string): Promise<GatewayState> {
  const taskType = pickRandomTask();
  const [updated] = await db
    .update(gatewayStateTable)
    .set({ locked: true, currentTaskType: taskType, lastTriggeredAt: new Date() })
    .where(eq(gatewayStateTable.userId, userId))
    .returning();
  return updated;
}

/**
 * Checks unlock-window expiry and session thresholds.
 * Auto-triggers the gateway if either threshold is exceeded.
 * Returns the current (possibly updated) state.
 */
export async function checkAndMaybeAutoTrigger(userId: string): Promise<GatewayState> {
  const state = await getOrCreateGatewayState(userId);
  const now = new Date();

  if (!state.locked && state.unlockExpiresAt && now > state.unlockExpiresAt) {
    const [updated] = await db
      .update(gatewayStateTable)
      .set({ unlockExpiresAt: null, sessionSpend: 0, sessionStartedAt: now })
      .where(eq(gatewayStateTable.userId, userId))
      .returning();
    return updated;
  }

  if (state.locked) return state;

  const sessionMinutes = (now.getTime() - state.sessionStartedAt.getTime()) / 60_000;
  const spendExceeded = state.sessionSpend >= SESSION_SPEND_THRESHOLD;
  const timeExceeded = sessionMinutes >= SESSION_MINUTES_LIMIT;

  if (spendExceeded || timeExceeded) {
    if (state.lastTriggeredAt) {
      const sinceLastMs = now.getTime() - state.lastTriggeredAt.getTime();
      if (sinceLastMs < LOCK_COOLDOWN_MS) return state;
    }
    return triggerGateway(userId);
  }

  return state;
}

export function buildStatusPayload(state: GatewayState): GatewayStatusPayload {
  const now = new Date();
  const sessionMinutesElapsed = Math.floor(
    (now.getTime() - state.sessionStartedAt.getTime()) / 60_000
  );

  let minutesRemaining: number | null = null;
  if (!state.locked && state.unlockExpiresAt) {
    const msLeft = state.unlockExpiresAt.getTime() - now.getTime();
    minutesRemaining = Math.max(0, Math.ceil(msLeft / 60_000));
  }

  let currentTask: GatewayStatusPayload["currentTask"] = null;
  if (state.locked && state.currentTaskType) {
    const task = HUMAN_TASKS[state.currentTaskType as HumanTaskType];
    if (task) {
      currentTask = {
        type: task.type,
        title: task.title,
        description: task.description,
        instructions: task.instructions,
        placeholder: task.placeholder,
        gaBonus: task.gaBonus,
        timedSeconds: task.timed === false ? null : task.timed,
      };
    }
  }

  return {
    locked: state.locked,
    currentTask,
    unlockExpiresAt: state.unlockExpiresAt?.toISOString() ?? null,
    minutesRemaining,
    sessionSpend: state.sessionSpend,
    sessionSpendThreshold: SESSION_SPEND_THRESHOLD,
    sessionMinutesElapsed,
    sessionMinutesLimit: SESSION_MINUTES_LIMIT,
  };
}

/**
 * Increments sessionSpend after a GA spend and auto-checks thresholds.
 * Designed to be called fire-and-forget from the spend route.
 */
export async function recordGatewaySpend(userId: string, amount: number): Promise<void> {
  await db
    .insert(gatewayStateTable)
    .values({ userId, sessionSpend: amount })
    .onConflictDoUpdate({
      target: gatewayStateTable.userId,
      set: { sessionSpend: sql`${gatewayStateTable.sessionSpend} + ${amount}` },
    });

  await checkAndMaybeAutoTrigger(userId);
}
