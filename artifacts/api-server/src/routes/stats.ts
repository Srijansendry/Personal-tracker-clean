import { Router, type Request, type Response } from "express";
import { db, userStatsTable, badgesTable, tasksTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const QUOTES = [
  { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { quote: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { quote: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { quote: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { quote: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { quote: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { quote: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { quote: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
  { quote: "Spread love everywhere you go. Let no one ever come to you without leaving happier.", author: "Mother Teresa" },
  { quote: "When you reach the end of your rope, tie a knot in it and hang on.", author: "Franklin D. Roosevelt" },
  { quote: "Always remember that you are absolutely unique. Just like everyone else.", author: "Margaret Mead" },
  { quote: "Do not go where the path may lead, go instead where there is no path and leave a trail.", author: "Ralph Waldo Emerson" },
];

const router = Router();

async function ensureStats() {
  const stats = await db.select().from(userStatsTable).limit(1);
  if (stats.length === 0) {
    const [s] = await db
      .insert(userStatsTable)
      .values({ dailyStreak: 0, level: 1, xp: 0, totalTasksCompleted: 0, totalHabitsChecked: 0 })
      .returning();
    return s;
  }
  return stats[0];
}

// GET /api/stats
router.get("/", async (req: Request, res: Response) => {
  try {
    const stats = await ensureStats();
    const badges = await db.select().from(badgesTable);

    const today = new Date().toISOString().split("T")[0];
    const todayTasks = await db
      .select({ status: tasksTable.status })
      .from(tasksTable)
      .where(eq(tasksTable.dueDate, today));

    const total = todayTasks.length;
    const completed = todayTasks.filter((t) => t.status === "completed").length;
    const allCompletedToday = total > 0 && completed === total;

    const xpPerLevel = 100;
    const xpToNextLevel = xpPerLevel - (stats.xp % xpPerLevel);

    // Check if streak was broken (last active was more than 1 day ago)
    let streakBroken = false;
    if (stats.lastActiveDate) {
      const lastActive = new Date(stats.lastActiveDate);
      const diffDays = Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        streakBroken = true;
        await db
          .update(userStatsTable)
          .set({ dailyStreak: 0 })
          .where(eq(userStatsTable.id, stats.id));
        stats.dailyStreak = 0;
      }
    }

    res.json({
      dailyStreak: stats.dailyStreak,
      level: stats.level,
      xp: stats.xp,
      xpToNextLevel,
      totalTasksCompleted: stats.totalTasksCompleted,
      totalHabitsChecked: stats.totalHabitsChecked,
      badges: badges.length,
      weeklyCompletionRate: 0,
      streakBroken,
      allTasksCompletedToday: allCompletedToday,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get user stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/stats/badges
router.get("/badges", async (req: Request, res: Response) => {
  try {
    const badges = await db.select().from(badgesTable).orderBy(badgesTable.earnedAt);
    res.json(badges);
  } catch (err) {
    req.log.error({ err }, "Failed to list badges");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/stats/daily-quote
router.get("/daily-quote", async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    // Deterministic daily selection
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );
    const quote = QUOTES[dayOfYear % QUOTES.length];
    res.json({ ...quote, date: today });
  } catch (err) {
    req.log.error({ err }, "Failed to get daily quote");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
