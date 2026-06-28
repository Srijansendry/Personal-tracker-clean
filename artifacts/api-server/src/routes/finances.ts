import { Router, type Request, type Response } from "express";
import { db, financesTable, tagsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

// GET /api/finances
router.get("/", async (req: Request, res: Response) => {
  try {
    const { type, month, category } = req.query;

    const conditions = [];
    if (type && type !== "all") {
      conditions.push(eq(financesTable.type, type as string));
    }
    if (month) {
      // month is YYYY-MM
      conditions.push(sql`to_char(${financesTable.date}, 'YYYY-MM') = ${month as string}`);
    }
    if (category) {
      conditions.push(eq(financesTable.category, category as string));
    }

    const entries = await db
      .select({
        id: financesTable.id,
        type: financesTable.type,
        amount: financesTable.amount,
        category: financesTable.category,
        description: financesTable.description,
        date: financesTable.date,
        dueDate: financesTable.dueDate,
        isPaid: financesTable.isPaid,
        tagId: financesTable.tagId,
        tagName: tagsTable.name,
        createdAt: financesTable.createdAt,
      })
      .from(financesTable)
      .leftJoin(tagsTable, eq(financesTable.tagId, tagsTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${financesTable.date} DESC`);

    res.json(entries);
  } catch (err) {
    req.log.error({ err }, "Failed to list finances");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/finances
router.post("/", async (req: Request, res: Response) => {
  try {
    const { type, amount, category, description, date, dueDate, isPaid, tagId } = req.body;

    if (!type || !["income", "expense"].includes(type)) {
      return res.status(400).json({ error: "Type must be income or expense" });
    }
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }
    if (!category || typeof category !== "string" || category.trim().length === 0) {
      return res.status(400).json({ error: "Category is required" });
    }
    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    const [entry] = await db
      .insert(financesTable)
      .values({
        type,
        amount: String(amount),
        category: category.trim(),
        description: description || null,
        date,
        dueDate: dueDate || null,
        isPaid: isPaid !== false,
        tagId: tagId ? Number(tagId) : null,
      })
      .returning();

    const [withTag] = await db
      .select({
        id: financesTable.id,
        type: financesTable.type,
        amount: financesTable.amount,
        category: financesTable.category,
        description: financesTable.description,
        date: financesTable.date,
        dueDate: financesTable.dueDate,
        isPaid: financesTable.isPaid,
        tagId: financesTable.tagId,
        tagName: tagsTable.name,
        createdAt: financesTable.createdAt,
      })
      .from(financesTable)
      .leftJoin(tagsTable, eq(financesTable.tagId, tagsTable.id))
      .where(eq(financesTable.id, entry.id));

    res.status(201).json(withTag);
  } catch (err) {
    req.log.error({ err }, "Failed to create finance entry");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/finances/monthly-summary
router.get("/monthly-summary", async (req: Request, res: Response) => {
  try {
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({ error: "month parameter is required (YYYY-MM)" });
    }

    const entries = await db
      .select()
      .from(financesTable)
      .where(sql`to_char(${financesTable.date}, 'YYYY-MM') = ${month as string}`);

    const expenses = entries.filter((e) => e.type === "expense");
    const income = entries.filter((e) => e.type === "income");

    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalIncome = income.reduce((s, e) => s + Number(e.amount), 0);

    // Group expenses by category
    const expenseByCat = new Map<string, { total: number; count: number }>();
    for (const e of expenses) {
      const existing = expenseByCat.get(e.category) ?? { total: 0, count: 0 };
      expenseByCat.set(e.category, { total: existing.total + Number(e.amount), count: existing.count + 1 });
    }

    const incomeByCat = new Map<string, { total: number; count: number }>();
    for (const e of income) {
      const existing = incomeByCat.get(e.category) ?? { total: 0, count: 0 };
      incomeByCat.set(e.category, { total: existing.total + Number(e.amount), count: existing.count + 1 });
    }

    const expensesByCategory = Array.from(expenseByCat.entries()).map(([category, { total, count }]) => ({
      category,
      total,
      count,
      percentage: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
    }));

    const incomeByCategory = Array.from(incomeByCat.entries()).map(([category, { total, count }]) => ({
      category,
      total,
      count,
      percentage: totalIncome > 0 ? (total / totalIncome) * 100 : 0,
    }));

    res.json({
      month,
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      expensesByCategory,
      incomeByCategory,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get monthly summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/finances/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid finance entry ID" });
    const { type, amount, category, description, date, dueDate, isPaid, tagId } = req.body;

    const updates: Record<string, unknown> = {};
    if (type !== undefined) updates.type = type;
    if (amount !== undefined) updates.amount = String(amount);
    if (category !== undefined) updates.category = category.trim();
    if (description !== undefined) updates.description = description;
    if (date !== undefined) updates.date = date;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (isPaid !== undefined) updates.isPaid = isPaid;
    if (tagId !== undefined) updates.tagId = tagId ? Number(tagId) : null;

    await db.update(financesTable).set(updates).where(eq(financesTable.id, id));

    const [withTag] = await db
      .select({
        id: financesTable.id,
        type: financesTable.type,
        amount: financesTable.amount,
        category: financesTable.category,
        description: financesTable.description,
        date: financesTable.date,
        dueDate: financesTable.dueDate,
        isPaid: financesTable.isPaid,
        tagId: financesTable.tagId,
        tagName: tagsTable.name,
        createdAt: financesTable.createdAt,
      })
      .from(financesTable)
      .leftJoin(tagsTable, eq(financesTable.tagId, tagsTable.id))
      .where(eq(financesTable.id, id));

    if (!withTag) return res.status(404).json({ error: "Entry not found" });
    res.json(withTag);
  } catch (err) {
    req.log.error({ err }, "Failed to update finance entry");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/finances/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid finance entry ID" });
    await db.delete(financesTable).where(eq(financesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete finance entry");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
