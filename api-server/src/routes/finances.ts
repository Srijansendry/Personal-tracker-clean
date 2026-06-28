import { Router, type Request, type Response } from "express";
import { db, financesTable, tagsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

// GET /api/finances
const USER_BUDGET_ITEMS = [
  { category: "Idli", calculation: "50x20 = 1000", amount: 1000, when: "Mon - fri", description: "Breakfast Idli (Mon - fri)" },
  { category: "Zomato", calculation: "229 x 8 = 1832", amount: 1832, when: "Sat , sun", description: "Weekend food delivery" },
  { category: "Evening snack", calculation: "40x30 = 1200", amount: 1200, when: "Daily", description: "Daily evening tea & snacks" },
  { category: "MESS(TIFFIN)", calculation: "PAID", amount: 0, when: "Daily", description: "Mess Tiffin service (Prepaid)" },
  { category: "ROOM RENT", calculation: "5000x1 = 5000", amount: 5000, when: "1st dec", description: "Monthly accommodation rent" },
  { category: "Petrol", calculation: "300 x 5 = 1500", amount: 1500, when: "After 6 days", description: "Vehicle fuel expense" },
  { category: "Water", calculation: "30 x 10 = 300", amount: 300, when: "Every 3rd day", description: "Drinking water cans" },
  { category: "Laundary", calculation: "180 x 4 = 720", amount: 720, when: "Saturdays", description: "Weekly laundry service" },
  { category: "Project print", calculation: "22 x 5 = 110", amount: 110, when: "3rd December", description: "College project printing" },
  { category: "Yt premium", calculation: "199x1 = 199", amount: 199, when: "5th December", description: "YouTube Premium subscription" },
  { category: "Wifi recharge", calculation: "580 x 1 = 580", amount: 580, when: "9th december", description: "High-speed broadband Wi-Fi" },
  { category: "Recharge (my)", calculation: "399 x 1 = 399", amount: 399, when: "9th december", description: "Mobile network monthly plan" },
  { category: "Dadi , mom", calculation: "199 x 2 = 400", amount: 400, when: "15th , 4th december", description: "Recharge for Dadi & Mom" },
  { category: "Blue lays", calculation: "20 x 40 = 800", amount: 800, when: "Sat , sun x 2, daily 1", description: "Snacks chips" },
  { category: "Mixture", calculation: "80 x 4 = 320", amount: 320, when: "Tiffin", description: "Tiffin side mixture snacks" },
  { category: "Fruits", calculation: "100 x 4 = 400", amount: 400, when: "Weekly", description: "Fresh fruits purchase" },
  { category: "Dry fruits", calculation: "400 x 1 = 400", amount: 400, when: "Monthly", description: "Almonds, cashews & nuts" },
  { category: "Stationary", calculation: "500 x 1 = 500", amount: 500, when: "monthly", description: "Notebooks, pens & stationery" },
  { category: "Canteen", calculation: "50 x 4 = 200", amount: 200, when: "Once a week", description: "College canteen snacks" },
  { category: "Face items", calculation: "400+350+40+399+350=1539", amount: 1539, when: "Face wash + moisturiser + lip balm + sunscreen + body wash", description: "Personal care & skincare products" },
  { category: "Exam rgpv form", calculation: "1850 x 1 = 1850", amount: 1850, when: "Nearly 5-10 dec", description: "University exam fee form" },
  { category: "Saloon", calculation: "1000 x 1 = 1000", amount: 1000, when: "Scrub, hair cut, beard set, massage, hair spa", description: "Grooming & spa day" },
  { category: "Grocery", calculation: "100+50+40+200+100+200+60 = 750", amount: 750, when: "Grocery (surf, shampoo, soap, vim, foil, paste, freshener, milk, coffee)", description: "Monthly household essentials" },
  { category: "Biscuit + cake + chocolate", calculation: "10x30=300 + 30x5=150 + 10x10=100", amount: 550, when: "Daily snacks", description: "Biscuits, cakes & chocolates" },
];

async function seedUserSpreadsheetItems() {
  try {
    const existing = await db.select().from(financesTable);
    if (existing.length === 0) {
      const today = new Date().toISOString().split("T")[0];
      for (const item of USER_BUDGET_ITEMS) {
        const fullDesc = `${item.description} || Calc: ${item.calculation} || When: ${item.when}`;
        await db.insert(financesTable).values({
          type: "expense",
          amount: String(item.amount),
          category: item.category,
          description: fullDesc,
          date: today,
        });
      }
    }
  } catch (e) {
  }
}

// GET /api/finances
router.get("/", async (req: Request, res: Response) => {
  try {
    await seedUserSpreadsheetItems();
    const { type, month, category } = req.query;

    const conditions = [];
    if (type && type !== "all") {
      conditions.push(eq(financesTable.type, type as string));
    }
    if (month) {
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
