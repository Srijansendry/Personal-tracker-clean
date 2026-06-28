import { Router, type Request, type Response } from "express";
import multer from "multer";
import { db, leetcodeNotesTable, webdevNotesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { uploadFile, deleteFile, ensureBucket, isStorageAvailable } from "../lib/supabase";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

ensureBucket();

function handleUploadError(err: unknown, res: Response) {
  if (err instanceof Error && err.message === "STORAGE_UNAVAILABLE") {
    return res.status(503).json({ error: "File storage is not configured. Notes text and code are saved, but image/PDF attachments are unavailable." });
  }
  throw err;
}

// ─── LeetCode Notes ──────────────────────────────────────────────────────────

router.get("/leetcode", async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    let rows = await db.select().from(leetcodeNotesTable).orderBy(desc(leetcodeNotesTable.createdAt));
    if (q && typeof q === "string" && q.trim()) {
      const term = q.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.problemNumber.toLowerCase().includes(term) ||
          r.title.toLowerCase().includes(term) ||
          (r.tags ?? "").toLowerCase().includes(term) ||
          (r.notes ?? "").toLowerCase().includes(term),
      );
    }
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list leetcode notes");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/leetcode",
  upload.fields([{ name: "notesImage", maxCount: 1 }, { name: "codeImage", maxCount: 1 }]),
  async (req: Request, res: Response) => {
    try {
      const { problemNumber, title, difficulty, dateSolved, codeSolution, tags, notes } = req.body;
      if (!problemNumber || !title || !dateSolved) {
        return res.status(400).json({ error: "problemNumber, title, and dateSolved are required" });
      }

      const files = req.files as Record<string, Express.Multer.File[]>;
      const hasFiles = !!(files?.notesImage?.[0] || files?.codeImage?.[0]);
      if (hasFiles && !isStorageAvailable()) {
        return res.status(503).json({ error: "File storage is not configured. Save without attachments, or set up Supabase credentials." });
      }

      let notesImageUrl: string | null = null;
      let codeImageUrl: string | null = null;

      if (files?.notesImage?.[0]) {
        const f = files.notesImage[0];
        notesImageUrl = await uploadFile(f.buffer, f.mimetype, "leetcode/notes", f.originalname);
      }
      if (files?.codeImage?.[0]) {
        const f = files.codeImage[0];
        codeImageUrl = await uploadFile(f.buffer, f.mimetype, "leetcode/code", f.originalname);
      }

      const [row] = await db
        .insert(leetcodeNotesTable)
        .values({
          problemNumber: String(problemNumber),
          title: String(title),
          difficulty: difficulty || "Medium",
          dateSolved: String(dateSolved),
          notesImageUrl,
          codeSolution: codeSolution || null,
          codeImageUrl,
          tags: tags || null,
          notes: notes || null,
        })
        .returning();

      res.status(201).json(row);
    } catch (err) {
      req.log.error({ err }, "Failed to create leetcode note");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get("/leetcode/:id", async (req: Request, res: Response) => {
  try {
    const [row] = await db.select().from(leetcodeNotesTable).where(eq(leetcodeNotesTable.id, Number(req.params.id)));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to get leetcode note");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put(
  "/leetcode/:id",
  upload.fields([{ name: "notesImage", maxCount: 1 }, { name: "codeImage", maxCount: 1 }]),
  async (req: Request, res: Response) => {
    try {
      const [existing] = await db.select().from(leetcodeNotesTable).where(eq(leetcodeNotesTable.id, Number(req.params.id)));
      if (!existing) return res.status(404).json({ error: "Not found" });

      const { problemNumber, title, difficulty, dateSolved, codeSolution, tags, notes } = req.body;
      const files = req.files as Record<string, Express.Multer.File[]>;
      const hasFiles = !!(files?.notesImage?.[0] || files?.codeImage?.[0]);
      if (hasFiles && !isStorageAvailable()) {
        return res.status(503).json({ error: "File storage is not configured. Save without attachments, or set up Supabase credentials." });
      }

      let notesImageUrl = existing.notesImageUrl;
      let codeImageUrl = existing.codeImageUrl;

      if (files?.notesImage?.[0]) {
        if (existing.notesImageUrl) await deleteFile(existing.notesImageUrl);
        const f = files.notesImage[0];
        notesImageUrl = await uploadFile(f.buffer, f.mimetype, "leetcode/notes", f.originalname);
      }
      if (files?.codeImage?.[0]) {
        if (existing.codeImageUrl) await deleteFile(existing.codeImageUrl);
        const f = files.codeImage[0];
        codeImageUrl = await uploadFile(f.buffer, f.mimetype, "leetcode/code", f.originalname);
      }

      const [row] = await db
        .update(leetcodeNotesTable)
        .set({
          ...(problemNumber !== undefined && { problemNumber: String(problemNumber) }),
          ...(title !== undefined && { title: String(title) }),
          ...(difficulty !== undefined && { difficulty }),
          ...(dateSolved !== undefined && { dateSolved: String(dateSolved) }),
          notesImageUrl,
          codeImageUrl,
          ...(codeSolution !== undefined && { codeSolution }),
          ...(tags !== undefined && { tags }),
          ...(notes !== undefined && { notes }),
          updatedAt: new Date(),
        })
        .where(eq(leetcodeNotesTable.id, Number(req.params.id)))
        .returning();

      res.json(row);
    } catch (err) {
      req.log.error({ err }, "Failed to update leetcode note");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.delete("/leetcode/:id", async (req: Request, res: Response) => {
  try {
    const [row] = await db.select().from(leetcodeNotesTable).where(eq(leetcodeNotesTable.id, Number(req.params.id)));
    if (row) {
      if (row.notesImageUrl) await deleteFile(row.notesImageUrl);
      if (row.codeImageUrl) await deleteFile(row.codeImageUrl);
    }
    await db.delete(leetcodeNotesTable).where(eq(leetcodeNotesTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete leetcode note");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Web Dev Notes ────────────────────────────────────────────────────────────

router.get("/webdev", async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    let rows = await db.select().from(webdevNotesTable).orderBy(desc(webdevNotesTable.createdAt));
    if (q && typeof q === "string" && q.trim()) {
      const term = q.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.topic.toLowerCase().includes(term) ||
          r.category.toLowerCase().includes(term) ||
          (r.tags ?? "").toLowerCase().includes(term) ||
          (r.notes ?? "").toLowerCase().includes(term),
      );
    }
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list webdev notes");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/webdev",
  upload.fields([{ name: "notesFile", maxCount: 1 }]),
  async (req: Request, res: Response) => {
    try {
      const { topic, category, date, codeSnippet, tags, notes } = req.body;
      if (!topic || !date) {
        return res.status(400).json({ error: "topic and date are required" });
      }

      const files = req.files as Record<string, Express.Multer.File[]>;
      if (files?.notesFile?.[0] && !isStorageAvailable()) {
        return res.status(503).json({ error: "File storage is not configured. Save without attachments, or set up Supabase credentials." });
      }
      let notesUrl: string | null = null;

      if (files?.notesFile?.[0]) {
        const f = files.notesFile[0];
        notesUrl = await uploadFile(f.buffer, f.mimetype, "webdev/notes", f.originalname);
      }

      const [row] = await db
        .insert(webdevNotesTable)
        .values({
          topic: String(topic),
          category: category || "General",
          date: String(date),
          notesUrl,
          codeSnippet: codeSnippet || null,
          tags: tags || null,
          notes: notes || null,
        })
        .returning();

      res.status(201).json(row);
    } catch (err) {
      req.log.error({ err }, "Failed to create webdev note");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get("/webdev/:id", async (req: Request, res: Response) => {
  try {
    const [row] = await db.select().from(webdevNotesTable).where(eq(webdevNotesTable.id, Number(req.params.id)));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to get webdev note");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put(
  "/webdev/:id",
  upload.fields([{ name: "notesFile", maxCount: 1 }]),
  async (req: Request, res: Response) => {
    try {
      const [existing] = await db.select().from(webdevNotesTable).where(eq(webdevNotesTable.id, Number(req.params.id)));
      if (!existing) return res.status(404).json({ error: "Not found" });

      const { topic, category, date, codeSnippet, tags, notes } = req.body;
      const files = req.files as Record<string, Express.Multer.File[]>;
      if (files?.notesFile?.[0] && !isStorageAvailable()) {
        return res.status(503).json({ error: "File storage is not configured. Save without attachments, or set up Supabase credentials." });
      }

      let notesUrl = existing.notesUrl;
      if (files?.notesFile?.[0]) {
        if (existing.notesUrl) await deleteFile(existing.notesUrl);
        const f = files.notesFile[0];
        notesUrl = await uploadFile(f.buffer, f.mimetype, "webdev/notes", f.originalname);
      }

      const [row] = await db
        .update(webdevNotesTable)
        .set({
          ...(topic !== undefined && { topic: String(topic) }),
          ...(category !== undefined && { category }),
          ...(date !== undefined && { date: String(date) }),
          notesUrl,
          ...(codeSnippet !== undefined && { codeSnippet }),
          ...(tags !== undefined && { tags }),
          ...(notes !== undefined && { notes }),
          updatedAt: new Date(),
        })
        .where(eq(webdevNotesTable.id, Number(req.params.id)))
        .returning();

      res.json(row);
    } catch (err) {
      req.log.error({ err }, "Failed to update webdev note");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.delete("/webdev/:id", async (req: Request, res: Response) => {
  try {
    const [row] = await db.select().from(webdevNotesTable).where(eq(webdevNotesTable.id, Number(req.params.id)));
    if (row?.notesUrl) await deleteFile(row.notesUrl);
    await db.delete(webdevNotesTable).where(eq(webdevNotesTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete webdev note");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
