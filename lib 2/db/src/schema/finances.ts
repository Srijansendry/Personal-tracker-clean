import { pgTable, serial, text, numeric, boolean, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tagsTable } from "./tags";

export const financesTable = pgTable("finances", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // income | expense
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  category: text("category").notNull(),
  description: text("description"),
  date: date("date").notNull(),
  dueDate: date("due_date"),
  isPaid: boolean("is_paid").notNull().default(true),
  tagId: integer("tag_id").references(() => tagsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFinanceSchema = createInsertSchema(financesTable).omit({ id: true, createdAt: true });
export type InsertFinance = z.infer<typeof insertFinanceSchema>;
export type Finance = typeof financesTable.$inferSelect;
