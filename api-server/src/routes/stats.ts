import { Router, type Request, type Response } from "express";
import { db, userStatsTable, badgesTable, tasksTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const QUOTES = [
  { quote: "When something is important enough, you do it even if the odds are not in your favor.", author: "Elon Musk", role: "CEO, SpaceX & Tesla" },
  { quote: "If you get up in the morning and think the future is going to be better, it is a bright day.", author: "Elon Musk", role: "Founder, xAI" },
  { quote: "Persistence is very important. You should not give up unless you are forced to give up.", author: "Elon Musk", role: "CEO, Tesla" },
  { quote: "The only way to do great work is to love what you do. Stay hungry, stay foolish.", author: "Steve Jobs", role: "Co-Founder, Apple" },
  { quote: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs", role: "Co-Founder, Apple" },
  { quote: "I think one of my great advantages is that I have very low expectations, but extremely high aspirations.", author: "Jensen Huang", role: "CEO, NVIDIA" },
  { quote: "Software is eating the world, but AI is going to eat software.", author: "Jensen Huang", role: "CEO, NVIDIA" },
  { quote: "The biggest risk is not taking any risk. High-velocity execution and extreme focus win.", author: "Sam Altman", role: "CEO, OpenAI" },
  { quote: "Great things come from hard work and perseverance. No excuses.", author: "Kobe Bryant", role: "5x NBA Champion" },
  { quote: "If you are not stubborn, you will give up on experiments too soon. If you are not flexible, you will pound your head against the wall.", author: "Jeff Bezos", role: "Founder, Amazon" },
  { quote: "When you innovate, you have got to be prepared for everyone telling you you are nuts.", author: "Larry Ellison", role: "Co-Founder, Oracle" },
  { quote: "Our industry does not respect tradition — it only respects innovation.", author: "Satya Nadella", role: "CEO, Microsoft" },
  { quote: "The present is theirs; the future, for which I really worked, is mine.", author: "Nikola Tesla", role: "Inventor & Visionary" },
  { quote: "At dawn, when you have trouble getting out of bed, tell yourself: I have to go to work — as a human being.", author: "Marcus Aurelius", role: "Roman Emperor & Stoic" },
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

// PATCH /api/stats - Admin update user stats
router.patch("/", async (req: Request, res: Response) => {
  try {
    const stats = await ensureStats();
    const { dailyStreak, level, xp, totalTasksCompleted, totalHabitsChecked } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (dailyStreak !== undefined) updates.dailyStreak = Number(dailyStreak);
    if (level !== undefined) updates.level = Number(level);
    if (xp !== undefined) updates.xp = Number(xp);
    if (totalTasksCompleted !== undefined) updates.totalTasksCompleted = Number(totalTasksCompleted);
    if (totalHabitsChecked !== undefined) updates.totalHabitsChecked = Number(totalHabitsChecked);

    const [updated] = await db
      .update(userStatsTable)
      .set(updates)
      .where(eq(userStatsTable.id, stats.id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update user stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

const DEFAULT_COOL_BADGES = [
  { name: "First Step", description: "Created your first task on SRIJAN.OS", icon: "Target", rarity: "common" },
  { name: "Early Bird", description: "Completed a high priority task early", icon: "Zap", rarity: "common" },
  { name: "FAANG Architect", description: "Mastered core DSA algorithms and system design roadmap", icon: "Crown", rarity: "legendary" },
  { name: "Algorithm Titan", description: "Solved 50+ Hard & Medium LeetCode problems", icon: "Code2", rarity: "epic" },
  { name: "Hyperdrive Streak", description: "Maintained a 30-day uninterrupted daily streak", icon: "Flame", rarity: "legendary" },
  { name: "Financial Wizard", description: "Tracked and managed personal budget & financial transactions", icon: "DollarSign", rarity: "rare" },
  { name: "Unstoppable Builder", description: "Checked off 50+ daily habit milestones", icon: "ShieldCheck", rarity: "epic" },
  { name: "Quantum Explorer", description: "Reached Level 50 and unlocked Top 0.1% Status", icon: "Sparkles", rarity: "legendary" },
];

async function seedCoolBadges() {
  try {
    const existing = await db.select().from(badgesTable);
    const existingNames = new Set(existing.map(b => b.name));
    for (const b of DEFAULT_COOL_BADGES) {
      if (!existingNames.has(b.name)) {
        await db.insert(badgesTable).values(b);
      }
    }
  } catch (err) {
  }
}

// GET /api/stats/badges
router.get("/badges", async (req: Request, res: Response) => {
  try {
    await seedCoolBadges();
    const badges = await db.select().from(badgesTable).orderBy(badgesTable.earnedAt);
    res.json(badges);
  } catch (err) {
    req.log.error({ err }, "Failed to list badges");
    res.status(500).json({ error: "Internal server error" });
  }
});


// POST /api/stats/badges - Admin create badge
router.post("/badges", async (req: Request, res: Response) => {
  try {
    const { name, description, icon, rarity } = req.body;
    if (!name || !description) {
      return res.status(400).json({ error: "Name and description are required" });
    }

    const [badge] = await db
      .insert(badgesTable)
      .values({
        name: String(name).trim(),
        description: String(description).trim(),
        icon: icon || "Award",
        rarity: rarity || "common",
      })
      .returning();

    res.status(201).json(badge);
  } catch (err) {
    req.log.error({ err }, "Failed to create badge");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/stats/badges/:id - Admin delete badge
router.delete("/badges/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await db.delete(badgesTable).where(eq(badgesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete badge");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/stats/quotes - List all top 0.1% motivational quotes
router.get("/quotes", async (req: Request, res: Response) => {
  try {
    res.json(QUOTES);
  } catch (err) {
    req.log.error({ err }, "Failed to get quotes list");
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


