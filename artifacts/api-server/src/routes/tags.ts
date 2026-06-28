import { Router, type Request, type Response } from "express";
import { db, tagsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/tags
router.get("/", async (req: Request, res: Response) => {
  try {
    const tags = await db.select().from(tagsTable).orderBy(tagsTable.createdAt);
    res.json(tags);
  } catch (err) {
    req.log.error({ err }, "Failed to list tags");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/tags
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, color, icon } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (!color) {
      return res.status(400).json({ error: "Color is required" });
    }

    const [tag] = await db
      .insert(tagsTable)
      .values({
        name: name.trim(),
        color,
        icon: icon || null,
        isCustom: true,
      })
      .returning();

    res.status(201).json(tag);
  } catch (err) {
    req.log.error({ err }, "Failed to create tag");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/tags/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [tag] = await db.select().from(tagsTable).where(eq(tagsTable.id, id));
    if (!tag) return res.status(404).json({ error: "Tag not found" });
    if (!tag.isCustom) return res.status(400).json({ error: "Cannot delete predefined tags" });

    await db.delete(tagsTable).where(eq(tagsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete tag");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
