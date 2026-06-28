import { pgTable, serial, text, date, timestamp } from "drizzle-orm/pg-core";

export const leetcodeNotesTable = pgTable("leetcode_notes", {
  id: serial("id").primaryKey(),
  problemNumber: text("problem_number").notNull(),
  title: text("title").notNull(),
  difficulty: text("difficulty").notNull().default("Medium"),
  dateSolved: date("date_solved").notNull(),
  notesImageUrl: text("notes_image_url"),
  codeSolution: text("code_solution"),
  codeImageUrl: text("code_image_url"),
  tags: text("tags"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const webdevNotesTable = pgTable("webdev_notes", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  category: text("category").notNull().default("General"),
  date: date("date").notNull(),
  notesUrl: text("notes_url"),
  codeSnippet: text("code_snippet"),
  tags: text("tags"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type LeetcodeNote = typeof leetcodeNotesTable.$inferSelect;
export type InsertLeetcodeNote = typeof leetcodeNotesTable.$inferInsert;
export type WebdevNote = typeof webdevNotesTable.$inferSelect;
export type InsertWebdevNote = typeof webdevNotesTable.$inferInsert;
