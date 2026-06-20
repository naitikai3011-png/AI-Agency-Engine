import { pgTable, serial, text, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const humanTaskCompletionsTable = pgTable("human_task_completions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  taskType: text("task_type").notNull(),
  dataJson: jsonb("data_json"),
  verdict: text("verdict"),
  passed: boolean("passed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHumanTaskSchema = createInsertSchema(humanTaskCompletionsTable).omit({ id: true, createdAt: true });
export type InsertHumanTask = z.infer<typeof insertHumanTaskSchema>;
export type HumanTaskCompletion = typeof humanTaskCompletionsTable.$inferSelect;
