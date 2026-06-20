import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * One row per user — tracks their current Proof-of-Humanity Gateway state.
 *
 * Lifecycle:
 *  - sessionStartedAt / sessionSpend: reset each time the gateway unlocks.
 *  - locked: true while the user must complete a human task.
 *  - currentTaskType: which of the 3 task types is currently assigned.
 *  - unlockExpiresAt: when the current open-access window closes (null = never unlocked or expired).
 */
export const gatewayStateTable = pgTable("gateway_state", {
  userId: text("user_id").primaryKey(),
  locked: boolean("locked").notNull().default(false),
  currentTaskType: text("current_task_type"),
  unlockExpiresAt: timestamp("unlock_expires_at", { withTimezone: true }),
  sessionSpend: integer("session_spend").notNull().default(0),
  sessionStartedAt: timestamp("session_started_at", { withTimezone: true }).notNull().defaultNow(),
  lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGatewayStateSchema = createInsertSchema(gatewayStateTable).omit({ updatedAt: true });
export type InsertGatewayState = z.infer<typeof insertGatewayStateSchema>;
export type GatewayState = typeof gatewayStateTable.$inferSelect;
