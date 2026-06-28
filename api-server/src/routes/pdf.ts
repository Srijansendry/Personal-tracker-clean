import { Router, type Request, type Response } from "express";
import { db, tasksTable } from "@workspace/db";

const router = Router();

// Simple regex-based task extraction from PDF text
function extractTasksFromText(text: string) {
  const suggestions: Array<{
    title: string;
    description: string | null;
    dueDate: string | null;
    priority: "low" | "medium" | "high";
    confidence: number;
  }> = [];

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  // Patterns for due dates
  const datePattern = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/;
  const monthPattern = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\b/i;
  const deadlineKeywords = /\b(deadline|due|submit|complete|finish|by|before|until)\b/i;
  const taskKeywords = /\b(task|todo|action|item|step|milestone|deliverable|assignment|homework|project|meeting|review|report|call)\b/i;
  const highPriorityKeywords = /\b(urgent|asap|critical|priority|important|immediately|rush)\b/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 5 || trimmed.length > 300) continue;

    let confidence = 0;
    let dueDate: string | null = null;
    let priority: "low" | "medium" | "high" = "medium";

    // Boost confidence for task/deadline keywords
    if (deadlineKeywords.test(trimmed)) confidence += 0.4;
    if (taskKeywords.test(trimmed)) confidence += 0.3;

    // Bullet points / numbered lists suggest tasks
    if (/^[\-\*\•\d\.\)]\s/.test(trimmed)) confidence += 0.3;

    // Extract date
    const dateMatch = trimmed.match(datePattern);
    if (dateMatch) {
      const year = dateMatch[3].length === 2 ? "20" + dateMatch[3] : dateMatch[3];
      const month = dateMatch[1].padStart(2, "0");
      const day = dateMatch[2].padStart(2, "0");
      dueDate = `${year}-${month}-${day}`;
      confidence += 0.2;
    }

    const monthMatch = trimmed.match(monthPattern);
    if (monthMatch && !dueDate) {
      const months: Record<string, string> = {
        jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03",
        apr: "04", april: "04", may: "05", jun: "06", june: "06", jul: "07", july: "07",
        aug: "08", august: "08", sep: "09", september: "09", oct: "10", october: "10",
        nov: "11", november: "11", dec: "12", december: "12",
      };
      const monthNum = months[monthMatch[1].toLowerCase()] ?? "01";
      const day = monthMatch[2].padStart(2, "0");
      const year = monthMatch[3] ?? new Date().getFullYear().toString();
      dueDate = `${year}-${monthNum}-${day}`;
      confidence += 0.2;
    }

    // Priority from keywords
    if (highPriorityKeywords.test(trimmed)) {
      priority = "high";
      confidence += 0.1;
    }

    if (confidence >= 0.3) {
      // Clean up the title
      const title = trimmed
        .replace(/^[\-\*\•\d\.\)]\s+/, "")
        .replace(datePattern, "")
        .replace(monthPattern, "")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 200);

      if (title.length >= 5) {
        suggestions.push({
          title,
          description: null,
          dueDate,
          priority,
          confidence: Math.min(confidence, 1),
        });
      }
    }
  }

  // Deduplicate by similar titles
  const seen = new Set<string>();
  return suggestions.filter((s) => {
    const key = s.title.toLowerCase().substring(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}

// POST /api/pdf/parse-tasks
router.post("/parse-tasks", async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "text is required" });
    }
    if (text.length > 500000) {
      return res.status(400).json({ error: "Extracted text exceeds maximum size limit of 500,000 characters" });
    }

    const suggestions = extractTasksFromText(text);
    res.json(suggestions);
  } catch (err) {
    req.log.error({ err }, "Failed to parse PDF tasks");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/pdf/confirm-tasks
router.post("/confirm-tasks", async (req: Request, res: Response) => {
  try {
    const { tasks } = req.body;
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: "tasks array is required" });
    }

    const validTasks = tasks.filter(
      (t: any) => t && typeof t.title === "string" && t.title.trim().length > 0
    );

    if (validTasks.length === 0) {
      return res.status(400).json({ error: "No valid tasks provided" });
    }

    const created = await db
      .insert(tasksTable)
      .values(
        validTasks.map((t: any) => ({
          title: String(t.title).trim(),
          description: t.description || null,
          priority: ["low", "medium", "high"].includes(t.priority) ? t.priority : "medium",
          dueDate: t.dueDate || null,
          dueTime: t.dueTime || null,
          tagId: t.tagId ? Number(t.tagId) : null,
          fromPdf: true,
          status: "pending",
        }))
      )
      .returning();

    res.status(201).json(created);
  } catch (err) {
    req.log.error({ err }, "Failed to confirm PDF tasks");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
