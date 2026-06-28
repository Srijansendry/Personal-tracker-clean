import { pgTable, serial, text, boolean, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tagsTable } from "./tags";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending | completed | missed
  priority: text("priority").notNull().default("medium"), // low | medium | high
  dueDate: date("due_date"),
  dueTime: text("due_time"),
  tagId: integer("tag_id").references(() => tagsTable.id, { onDelete: "set null" }),
  completedAt: timestamp("completed_at"),
  fromPdf: boolean("from_pdf").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
