import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gaTokenLedgerTable = pgTable("ga_token_ledger", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGaLedgerSchema = createInsertSchema(gaTokenLedgerTable).omit({ id: true, createdAt: true });
export type InsertGaLedger = z.infer<typeof insertGaLedgerSchema>;
export type GaLedgerEntry = typeof gaTokenLedgerTable.$inferSelect;
