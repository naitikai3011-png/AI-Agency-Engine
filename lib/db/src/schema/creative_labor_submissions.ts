import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const creativeLaborSubmissionsTable = pgTable("creative_labor_submissions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  taskType: text("task_type").notNull(),
  content: text("content").notNull(),
  verdict: text("verdict"),
  passed: boolean("passed"),
  gaRewarded: integer("ga_rewarded").notNull().default(0),
  credited: boolean("credited").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCreativeLaborSchema = createInsertSchema(creativeLaborSubmissionsTable).omit({ id: true, createdAt: true });
export type InsertCreativeLabor = z.infer<typeof insertCreativeLaborSchema>;
export type CreativeLaborSubmission = typeof creativeLaborSubmissionsTable.$inferSelect;
