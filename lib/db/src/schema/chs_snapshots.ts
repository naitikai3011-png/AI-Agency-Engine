import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chsSnapshotsTable = pgTable("chs_snapshots", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  score: integer("score").notNull().default(50),
  factorsJson: jsonb("factors_json").notNull().default({ complexity: 50, originality: 50, depth: 50, effort: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChsSnapshotSchema = createInsertSchema(chsSnapshotsTable).omit({ id: true, createdAt: true });
export type InsertChsSnapshot = z.infer<typeof insertChsSnapshotSchema>;
export type ChsSnapshot = typeof chsSnapshotsTable.$inferSelect;
