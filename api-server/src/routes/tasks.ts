import { Router, type Request, type Response } from "express";
import { db, tasksTable, tagsTable, userStatsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";

const router = Router();

// GET /api/tasks
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, date, tagId } = req.query;

    const conditions = [];
    if (status && status !== "all") {
      conditions.push(eq(tasksTable.status, status as string));
    }
    if (date) {
      conditions.push(eq(tasksTable.dueDate, date as string));
    }
    if (tagId) {
      conditions.push(eq(tasksTable.tagId, Number(tagId)));
    }

    const tasks = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        description: tasksTable.description,
        status: tasksTable.status,
        priority: tasksTable.priority,
        dueDate: tasksTable.dueDate,
        dueTime: tasksTable.dueTime,
        tagId: tasksTable.tagId,
        tagName: tagsTable.name,
        tagColor: tagsTable.color,
        completedAt: tasksTable.completedAt,
        fromPdf: tasksTable.fromPdf,
        createdAt: tasksTable.createdAt,
      })
      .from(tasksTable)
      .leftJoin(tagsTable, eq(tasksTable.tagId, tagsTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tasksTable.createdAt));

    res.json(tasks);
  } catch (err) {
    req.log.error({ err }, "Failed to list tasks");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/tasks
router.post("/", async (req: Request, res: Response) => {
  try {
    const { title, description, priority, dueDate, dueTime, tagId, fromPdf } = req.body;
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ error: "Title is required" });
    }

    const [task] = await db
      .insert(tasksTable)
      .values({
        title: title.trim(),
        description: description || null,
        priority: priority || "medium",
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        tagId: tagId ? Number(tagId) : null,
        fromPdf: fromPdf === true,
        status: "pending",
      })
      .returning();

    const [withTag] = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        description: tasksTable.description,
        status: tasksTable.status,
        priority: tasksTable.priority,
        dueDate: tasksTable.dueDate,
        dueTime: tasksTable.dueTime,
        tagId: tasksTable.tagId,
        tagName: tagsTable.name,
        tagColor: tagsTable.color,
        completedAt: tasksTable.completedAt,
        fromPdf: tasksTable.fromPdf,
        createdAt: tasksTable.createdAt,
      })
      .from(tasksTable)
      .leftJoin(tagsTable, eq(tasksTable.tagId, tagsTable.id))
      .where(eq(tasksTable.id, task.id));

    res.status(201).json(withTag);
  } catch (err) {
    req.log.error({ err }, "Failed to create task");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/tasks/summary
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const todayTasks = await db
      .select({ status: tasksTable.status })
      .from(tasksTable)
      .where(eq(tasksTable.dueDate, today));

    const total = todayTasks.length;
    const completed = todayTasks.filter((t) => t.status === "completed").length;
    const pending = todayTasks.filter((t) => t.status === "pending").length;
    const missed = todayTasks.filter((t) => t.status === "missed").length;

    res.json({
      total,
      completed,
      pending,
      missed,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get task summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/tasks/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid task ID" });
    const [task] = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        description: tasksTable.description,
        status: tasksTable.status,
        priority: tasksTable.priority,
        dueDate: tasksTable.dueDate,
        dueTime: tasksTable.dueTime,
        tagId: tasksTable.tagId,
        tagName: tagsTable.name,
        tagColor: tagsTable.color,
        completedAt: tasksTable.completedAt,
        fromPdf: tasksTable.fromPdf,
        createdAt: tasksTable.createdAt,
      })
      .from(tasksTable)
      .leftJoin(tagsTable, eq(tasksTable.tagId, tagsTable.id))
      .where(eq(tasksTable.id, id));

    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (err) {
    req.log.error({ err }, "Failed to get task");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/tasks/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid task ID" });
    const { title, description, priority, dueDate, dueTime, tagId, status } = req.body;

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (dueTime !== undefined) updates.dueTime = dueTime;
    if (tagId !== undefined) updates.tagId = tagId ? Number(tagId) : null;
    if (status !== undefined) updates.status = status;

    const [updated] = await db
      .update(tasksTable)
      .set(updates)
      .where(eq(tasksTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Task not found" });

    const [withTag] = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        description: tasksTable.description,
        status: tasksTable.status,
        priority: tasksTable.priority,
        dueDate: tasksTable.dueDate,
        dueTime: tasksTable.dueTime,
        tagId: tasksTable.tagId,
        tagName: tagsTable.name,
        tagColor: tagsTable.color,
        completedAt: tasksTable.completedAt,
        fromPdf: tasksTable.fromPdf,
        createdAt: tasksTable.createdAt,
      })
      .from(tasksTable)
      .leftJoin(tagsTable, eq(tasksTable.tagId, tagsTable.id))
      .where(eq(tasksTable.id, id));

    res.json(withTag);
  } catch (err) {
    req.log.error({ err }, "Failed to update task");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid task ID" });
    await db.delete(tasksTable).where(eq(tasksTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete task");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/tasks/:id/complete
router.patch("/:id/complete", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid task ID" });
    const now = new Date();

    // Atomic update: only mark complete if not already completed.
    // This prevents race conditions where two concurrent requests both read "pending".
    const updated = await db
      .update(tasksTable)
      .set({ status: "completed", completedAt: now })
      .where(and(eq(tasksTable.id, id), sql`${tasksTable.status} != 'completed'`))
      .returning();

    if (updated.length === 0) {
      // Either task doesn't exist, or it was already completed
      const [existingTask] = await db
        .select({
          id: tasksTable.id,
          title: tasksTable.title,
          description: tasksTable.description,
          status: tasksTable.status,
          priority: tasksTable.priority,
          dueDate: tasksTable.dueDate,
          dueTime: tasksTable.dueTime,
          tagId: tasksTable.tagId,
          tagName: tagsTable.name,
          tagColor: tagsTable.color,
          completedAt: tasksTable.completedAt,
          fromPdf: tasksTable.fromPdf,
          createdAt: tasksTable.createdAt,
        })
        .from(tasksTable)
        .leftJoin(tagsTable, eq(tasksTable.tagId, tagsTable.id))
        .where(eq(tasksTable.id, id));
      if (!existingTask) return res.status(404).json({ error: "Task not found" });
      return res.json(existingTask);
    }

    // Award XP
    const stats = await db.select().from(userStatsTable).limit(1);
    if (stats.length > 0) {
      const today = now.toISOString().split("T")[0];
      const lastActive = stats[0].lastActiveDate;
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let newStreak = stats[0].dailyStreak;
      if (lastActive !== today) {
        newStreak = lastActive === yesterdayStr ? newStreak + 1 : 1;
      }

      const newXp = stats[0].xp + 10;
      const xpPerLevel = 100;
      const newLevel = Math.floor(newXp / xpPerLevel) + 1;

      await db
        .update(userStatsTable)
        .set({
          totalTasksCompleted: stats[0].totalTasksCompleted + 1,
          xp: newXp,
          level: newLevel,
          dailyStreak: newStreak,
          lastActiveDate: today,
          updatedAt: now,
        })
        .where(eq(userStatsTable.id, stats[0].id));
    }

    const [withTag] = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        description: tasksTable.description,
        status: tasksTable.status,
        priority: tasksTable.priority,
        dueDate: tasksTable.dueDate,
        dueTime: tasksTable.dueTime,
        tagId: tasksTable.tagId,
        tagName: tagsTable.name,
        tagColor: tagsTable.color,
        completedAt: tasksTable.completedAt,
        fromPdf: tasksTable.fromPdf,
        createdAt: tasksTable.createdAt,
      })
      .from(tasksTable)
      .leftJoin(tagsTable, eq(tasksTable.tagId, tagsTable.id))
      .where(eq(tasksTable.id, id));

    res.json(withTag);
  } catch (err) {
    req.log.error({ err }, "Failed to complete task");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/tasks/:id/reschedule
router.patch("/:id/reschedule", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid task ID" });
    const { dueDate, dueTime, note } = req.body;

    if (!dueDate) {
      return res.status(400).json({ error: "dueDate is required" });
    }

    const updates: Record<string, unknown> = {
      dueDate,
      status: "pending",
    };
    if (dueTime !== undefined) updates.dueTime = dueTime;
    if (note !== undefined) updates.description = note;

    const [updated] = await db
      .update(tasksTable)
      .set(updates)
      .where(eq(tasksTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Task not found" });

    const [withTag] = await db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        description: tasksTable.description,
        status: tasksTable.status,
        priority: tasksTable.priority,
        dueDate: tasksTable.dueDate,
        dueTime: tasksTable.dueTime,
        tagId: tasksTable.tagId,
        tagName: tagsTable.name,
        tagColor: tagsTable.color,
        completedAt: tasksTable.completedAt,
        fromPdf: tasksTable.fromPdf,
        createdAt: tasksTable.createdAt,
      })
      .from(tasksTable)
      .leftJoin(tagsTable, eq(tasksTable.tagId, tagsTable.id))
      .where(eq(tasksTable.id, id));

    res.json(withTag);
  } catch (err) {
    req.log.error({ err }, "Failed to reschedule task");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
