import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const creativeLaborTaskTemplatesTable = pgTable("creative_labor_task_templates", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  instructions: text("instructions").notNull(),
  evaluationCriteria: text("evaluation_criteria").notNull(),
  gaReward: integer("ga_reward").notNull().default(2),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCreativeLaborTaskTemplateSchema = createInsertSchema(creativeLaborTaskTemplatesTable).omit({ id: true, createdAt: true });
export type InsertCreativeLaborTaskTemplate = z.infer<typeof insertCreativeLaborTaskTemplateSchema>;
export type CreativeLaborTaskTemplate = typeof creativeLaborTaskTemplatesTable.$inferSelect;
