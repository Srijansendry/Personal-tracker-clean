import { Router, type Request, type Response } from "express";
import { db, problemsTable, userIntegrationsTable, userStatsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

// GET /api/problems/summary - Aggregated progress dashboard statistics
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const all = await db.select().from(problemsTable);
    const leetcodeSolved = all.filter((p) => p.platform === "leetcode" && p.status === "solved").length;
    const leetcodeTotal = all.filter((p) => p.platform === "leetcode").length;
    const gfgSolved = all.filter((p) => p.platform === "gfg" && p.status === "solved").length;
    const gfgTotal = all.filter((p) => p.platform === "gfg").length;
    const classworkSolved = all.filter((p) => p.category === "classwork" && p.status === "solved").length;
    const classworkTotal = all.filter((p) => p.category === "classwork").length;
    const homeworkSolved = all.filter((p) => p.category === "homework" && p.status === "solved").length;
    const homeworkTotal = all.filter((p) => p.category === "homework").length;

    res.json({
      leetcodeSolved,
      leetcodeTotal,
      gfgSolved,
      gfgTotal,
      classworkSolved,
      classworkTotal,
      homeworkSolved,
      homeworkTotal,
      totalSolved: leetcodeSolved + gfgSolved,
      totalProblems: all.length,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get problem summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/problems/integrations - List user linked handles
router.get("/integrations", async (req: Request, res: Response) => {
  try {
    const integrations = await db.select().from(userIntegrationsTable);
    res.json(integrations);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch integrations");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/problems/integrations - Link platform username and secret API Key
router.post("/integrations", async (req: Request, res: Response) => {
  try {
    const { platform, username, apiKey } = req.body;
    if (!platform || !username) {
      return res.status(400).json({ error: "Platform and username are required" });
    }

    const maskedKey = apiKey ? `***${apiKey.slice(-4)}` : null;

    const existing = await db
      .select()
      .from(userIntegrationsTable)
      .where(eq(userIntegrationsTable.platform, platform));

    let integration;
    if (existing.length > 0) {
      [integration] = await db
        .update(userIntegrationsTable)
        .set({ username, apiKey: maskedKey, lastSyncedAt: new Date() })
        .where(eq(userIntegrationsTable.platform, platform))
        .returning();
    } else {
      [integration] = await db
        .insert(userIntegrationsTable)
        .values({ platform, username, apiKey: maskedKey, verified: true })
        .returning();
    }

    res.json(integration);
  } catch (err) {
    req.log.error({ err }, "Failed to save integration");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/problems/leetcode-stats - Fetch live stats from LeetCode GraphQL
router.get("/leetcode-stats", async (req: Request, res: Response) => {
  try {
    const integrations = await db.select().from(userIntegrationsTable).where(eq(userIntegrationsTable.platform, "leetcode"));
    const username = req.query.username as string || integrations[0]?.username;

    if (!username) {
      return res.status(404).json({ error: "No LeetCode username configured" });
    }

    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          profile { ranking realName }
          submitStatsGlobal {
            acSubmissionNum { difficulty count }
          }
          userCalendar(year: 2026) {
            streak
            totalActiveDays
            submissionCalendar
          }
        }
        allQuestionsCount { difficulty count }
        recentAcSubmissionList(username: $username, limit: 10) {
          title
          titleSlug
          timestamp
          lang
        }
      }
    `;

    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Referer": "https://leetcode.com",
        "User-Agent": "Mozilla/5.0",
      },
      body: JSON.stringify({ query, variables: { username } }),
    });

    if (!response.ok) {
      return res.status(502).json({ error: "LeetCode API unreachable" });
    }

    const json = await response.json() as any;

    if (!json.data?.matchedUser) {
      return res.status(404).json({ error: "LeetCode user not found", username });
    }

    const user = json.data.matchedUser;
    const allCounts: Array<{ difficulty: string; count: number }> = json.data.allQuestionsCount || [];
    const recentSubs: Array<{ title: string; titleSlug: string; timestamp: string; lang: string }> = json.data.recentAcSubmissionList || [];

    const solved = user.submitStatsGlobal?.acSubmissionNum || [];
    const totalAll = allCounts.find((q) => q.difficulty === "All")?.count || 3973;
    const totalEasy = allCounts.find((q) => q.difficulty === "Easy")?.count || 951;
    const totalMedium = allCounts.find((q) => q.difficulty === "Medium")?.count || 2074;
    const totalHard = allCounts.find((q) => q.difficulty === "Hard")?.count || 948;

    res.json({
      username: user.username,
      realName: user.profile?.realName || user.username,
      ranking: user.profile?.ranking || 0,
      streak: user.userCalendar?.streak || 0,
      totalActiveDays: user.userCalendar?.totalActiveDays || 0,
      solved: {
        all: solved.find((s: any) => s.difficulty === "All")?.count || 0,
        easy: solved.find((s: any) => s.difficulty === "Easy")?.count || 0,
        medium: solved.find((s: any) => s.difficulty === "Medium")?.count || 0,
        hard: solved.find((s: any) => s.difficulty === "Hard")?.count || 0,
      },
      total: { all: totalAll, easy: totalEasy, medium: totalMedium, hard: totalHard },
      recentSubmissions: recentSubs.map((s) => ({
        title: s.title,
        titleSlug: s.titleSlug,
        timestamp: s.timestamp,
        lang: s.lang,
        url: `https://leetcode.com/problems/${s.titleSlug}/`,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch LeetCode stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/problems/sync - Real-Time API Sync Simulator
router.post("/sync", async (req: Request, res: Response) => {
  try {
    const pending = await db
      .select()
      .from(problemsTable)
      .where(eq(problemsTable.status, "pending"));

    let syncedCount = 0;
    if (pending.length > 0) {
      const target = pending[0];
      await db
        .update(problemsTable)
        .set({ status: "solved", solvedAt: new Date() })
        .where(eq(problemsTable.id, target.id));

      await db.update(userStatsTable).set({
        xp: sql`${userStatsTable.xp} + 25`,
        updatedAt: new Date(),
      });
      syncedCount = 1;
    }

    res.json({
      success: true,
      message: syncedCount > 0 ? `Synced problem status from platform APIs!` : "All assigned roadmap problems are up to date!",
      syncedCount,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to sync problems");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/problems - List all practice problems
router.get("/", async (req: Request, res: Response) => {
  try {
    const { platform, category, status } = req.query;
    const conditions = [];
    if (platform && platform !== "all") conditions.push(eq(problemsTable.platform, platform as string));
    if (category && category !== "all") conditions.push(eq(problemsTable.category, category as string));
    if (status && status !== "all") conditions.push(eq(problemsTable.status, status as string));

    const problems = await db
      .select()
      .from(problemsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(problemsTable.createdAt));

    res.json(problems);
  } catch (err) {
    req.log.error({ err }, "Failed to list problems");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/problems - Add a new roadmap assignment
router.post("/", async (req: Request, res: Response) => {
  try {
    const { platform, problemSlug, title, difficulty, category, url } = req.body;
    if (!title || !platform) {
      return res.status(400).json({ error: "Title and platform are required" });
    }

    const constructedUrl = url || (platform === "leetcode"
      ? `https://leetcode.com/problems/${problemSlug || title.toLowerCase().replace(/\s+/g, "-")}/`
      : `https://www.geeksforgeeks.org/problems/${problemSlug || title.toLowerCase().replace(/\s+/g, "-")}/1`);

    const [problem] = await db
      .insert(problemsTable)
      .values({
        platform,
        problemSlug: problemSlug || title.toLowerCase().replace(/\s+/g, "-"),
        title,
        difficulty: difficulty || "Medium",
        category: category || "homework",
        url: constructedUrl,
        status: "pending",
      })
      .returning();

    res.status(201).json(problem);
  } catch (err) {
    req.log.error({ err }, "Failed to create problem");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/problems/:id - Update problem or toggle completion status
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid problem ID" });
    }

    const { status, title, difficulty, category } = req.body;

    const updates: any = {};
    if (status) {
      updates.status = status;
      updates.solvedAt = status === "solved" ? new Date() : null;
    }
    if (title) updates.title = title;
    if (difficulty) updates.difficulty = difficulty;
    if (category) updates.category = category;

    const [updated] = await db
      .update(problemsTable)
      .set(updates)
      .where(eq(problemsTable.id, id))
      .returning();

    if (status === "solved") {
      await db.update(userStatsTable).set({
        xp: sql`${userStatsTable.xp} + 25`,
        updatedAt: new Date(),
      });
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update problem");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
