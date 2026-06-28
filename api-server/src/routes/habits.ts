import { Router, type Request, type Response } from "express";
import { db, habitsTable, tagsTable, userStatsTable, badgesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

const taskWithTag = async (id: number) => {
  const [habit] = await db
    .select({
      id: habitsTable.id,
      name: habitsTable.name,
      description: habitsTable.description,
      icon: habitsTable.icon,
      color: habitsTable.color,
      streak: habitsTable.streak,
      currentStreak: habitsTable.currentStreak,
      longestStreak: habitsTable.longestStreak,
      level: habitsTable.level,
      lastChecked: habitsTable.lastChecked,
      tagId: habitsTable.tagId,
      tagName: tagsTable.name,
      createdAt: habitsTable.createdAt,
    })
    .from(habitsTable)
    .leftJoin(tagsTable, eq(habitsTable.tagId, tagsTable.id))
    .where(eq(habitsTable.id, id));

  if (!habit) return null;

  const today = new Date().toISOString().split("T")[0];
  return { ...habit, completedToday: habit.lastChecked === today };
};

// GET /api/habits
router.get("/", async (req: Request, res: Response) => {
  try {
    const habits = await db
      .select({
        id: habitsTable.id,
        name: habitsTable.name,
        description: habitsTable.description,
        icon: habitsTable.icon,
        color: habitsTable.color,
        streak: habitsTable.streak,
        currentStreak: habitsTable.currentStreak,
        longestStreak: habitsTable.longestStreak,
        level: habitsTable.level,
        lastChecked: habitsTable.lastChecked,
        tagId: habitsTable.tagId,
        tagName: tagsTable.name,
        createdAt: habitsTable.createdAt,
      })
      .from(habitsTable)
      .leftJoin(tagsTable, eq(habitsTable.tagId, tagsTable.id));

    const today = new Date().toISOString().split("T")[0];
    const result = habits.map((h) => ({ ...h, completedToday: h.lastChecked === today }));
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list habits");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/habits
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, description, icon, color, tagId } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }

    const [habit] = await db
      .insert(habitsTable)
      .values({
        name: name.trim(),
        description: description || null,
        icon: icon || null,
        color: color || "#FFB6C1",
        tagId: tagId ? Number(tagId) : null,
      })
      .returning();

    const result = await taskWithTag(habit.id);
    res.status(201).json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to create habit");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/habits/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid habit ID" });
    const { name, description, icon, color, tagId, streak, currentStreak, longestStreak, level } = req.body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (icon !== undefined) updates.icon = icon;
    if (color !== undefined) updates.color = color;
    if (tagId !== undefined) updates.tagId = tagId ? Number(tagId) : null;
    if (streak !== undefined) updates.streak = Number(streak);
    if (currentStreak !== undefined) updates.currentStreak = Number(currentStreak);
    if (longestStreak !== undefined) updates.longestStreak = Number(longestStreak);
    if (level !== undefined) updates.level = Number(level);

    await db.update(habitsTable).set(updates).where(eq(habitsTable.id, id));

    const result = await taskWithTag(id);
    if (!result) return res.status(404).json({ error: "Habit not found" });
    res.json(result);

  } catch (err) {
    req.log.error({ err }, "Failed to update habit");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/habits/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid habit ID" });
    await db.delete(habitsTable).where(eq(habitsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete habit");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/habits/:id/check
router.post("/:id/check", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid habit ID" });
    const [habit] = await db.select().from(habitsTable).where(eq(habitsTable.id, id));

    if (!habit) return res.status(404).json({ error: "Habit not found" });

    const today = new Date().toISOString().split("T")[0];
    if (habit.lastChecked === today) {
      const result = await taskWithTag(id);
      return res.json(result);
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const isConsecutive = habit.lastChecked === yesterdayStr;
    const newStreak = isConsecutive ? habit.streak + 1 : 1;
    const newCurrentStreak = isConsecutive ? habit.currentStreak + 1 : 1;
    const newLongest = Math.max(habit.longestStreak, newCurrentStreak);
    const newLevel = Math.floor(newCurrentStreak / 7) + 1;

    await db
      .update(habitsTable)
      .set({
        streak: newStreak,
        currentStreak: newCurrentStreak,
        longestStreak: newLongest,
        level: newLevel,
        lastChecked: today,
      })
      .where(eq(habitsTable.id, id));

    // Award XP and track
    const stats = await db.select().from(userStatsTable).limit(1);
    if (stats.length > 0) {
      const newXp = stats[0].xp + 5;
      const xpPerLevel = 100;
      const newLevelStat = Math.floor(newXp / xpPerLevel) + 1;
      await db
        .update(userStatsTable)
        .set({
          totalHabitsChecked: stats[0].totalHabitsChecked + 1,
          xp: newXp,
          level: newLevelStat,
          updatedAt: new Date(),
        })
        .where(eq(userStatsTable.id, stats[0].id));
    }

    // Check for milestone badges
    if (newCurrentStreak === 7) {
      const existing = await db
        .select()
        .from(badgesTable)
        .where(and(eq(badgesTable.name, "Week Warrior")));
      if (existing.length === 0) {
        await db.insert(badgesTable).values({
          name: "Week Warrior",
          description: "Completed a habit for 7 days straight!",
          icon: "Flame",
          rarity: "rare",
        });
      }
    }

    if (newCurrentStreak === 30) {
      const existing = await db
        .select()
        .from(badgesTable)
        .where(and(eq(badgesTable.name, "Monthly Master")));
      if (existing.length === 0) {
        await db.insert(badgesTable).values({
          name: "Monthly Master",
          description: "30-day habit streak achieved!",
          icon: "Crown",
          rarity: "epic",
        });
      }
    }

    const result = await taskWithTag(id);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to check habit");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
