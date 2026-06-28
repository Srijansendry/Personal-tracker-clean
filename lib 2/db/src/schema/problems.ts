import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const userIntegrationsTable = pgTable("user_integrations", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(), // 'leetcode' | 'gfg'
  username: text("username").notNull(),
  apiKey: text("api_key"),
  verified: boolean("verified").notNull().default(true),
  lastSyncedAt: timestamp("last_synced_at").defaultNow(),
});

export const problemsTable = pgTable("problems", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(), // 'leetcode' | 'gfg'
  problemSlug: text("problem_slug").notNull(),
  title: text("title").notNull(),
  difficulty: text("difficulty").notNull().default("Medium"), // 'Easy' | 'Medium' | 'Hard'
  category: text("category").notNull().default("homework"), // 'classwork' | 'homework'
  url: text("url").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'solved'
  solvedAt: timestamp("solved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserIntegration = typeof userIntegrationsTable.$inferSelect;
export type InsertUserIntegration = typeof userIntegrationsTable.$inferInsert;
export type Problem = typeof problemsTable.$inferSelect;
export type InsertProblem = typeof problemsTable.$inferInsert;
