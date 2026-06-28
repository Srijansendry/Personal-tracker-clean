import { useState } from "react";
import { useListFinances, useGetMonthlySummary, useCreateFinanceEntry, useListTags, getListFinancesQueryKey, getGetMonthlySummaryQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Plus, ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell as RechartsCell, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { TiltPanel, FloatDepth } from "@/components/tilt-panel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
};

const COLORS = ["#FFB6C1", "#AFEEEE", "#E6E6FA", "#FFDAB9", "#98FB98"];

export default function Finances() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [tagId, setTagId] = useState("");

  const currentMonth = format(new Date(), "yyyy-MM");
  const { data: summary, isLoading: summaryLoading } = useGetMonthlySummary({ month: currentMonth });
  const { data: entries = [], isLoading: entriesLoading } = useListFinances({ month: currentMonth });
  const { data: tags = [] } = useListTags();
  const createFinanceEntry = useCreateFinanceEntry();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !category.trim()) return;

    createFinanceEntry.mutate({
      data: {
        type,
        amount: Number(amount),
        category: category.trim(),
        description: description || undefined,
        date,
        tagId: tagId ? Number(tagId) : undefined,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFinancesQueryKey({ month: currentMonth }) });
        queryClient.invalidateQueries({ queryKey: getGetMonthlySummaryQueryKey({ month: currentMonth }) });
        toast({ title: "Transaction added!" });
        setIsOpen(false);
        setType("expense");
        setAmount("");
        setCategory("");
        setDescription("");
        setDate(format(new Date(), "yyyy-MM-dd"));
        setTagId("");
      },
      onError: () => {
        toast({ title: "Failed to add transaction", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">

      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-[12px] font-semibold tracking-[0.25em] uppercase mb-1"
            style={{ color: "rgba(255,182,193,0.65)" }}>
            ✦ Wealth Tracker
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="text-4xl font-black"
            style={{ color: "rgba(255,255,255,0.95)" }}>
            Finances
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.35)" }}>
            {format(new Date(), "MMMM yyyy")} · Track your wealth and spending.
          </motion.p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, rgba(144,238,144,0.18), rgba(144,238,144,0.08))",
                border: "1px solid rgba(144,238,144,0.3)",
                color: "#90EE90",
              }}>
              <Plus size={14} /> Add Transaction
            </motion.button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-[#1a1a24] text-white border-white/10">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-[#20202d] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#90EE90] transition-colors text-white"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60">Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#90EE90] transition-colors text-white"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60">Category *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Food, Rent, Freelance"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#90EE90] transition-colors text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly grocery shopping (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#90EE90] transition-colors text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#90EE90] transition-colors text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60">Tag</label>
                  <select
                    value={tagId}
                    onChange={(e) => setTagId(e.target.value)}
                    className="w-full bg-[#20202d] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#90EE90] transition-colors text-white"
                  >
                    <option value="">None</option>
                    {Array.isArray(tags) && tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createFinanceEntry.isPending}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-[#90EE90] to-[#AFEEEE] text-[#1a1a24] hover:opacity-90 transition-opacity"
                >
                  {createFinanceEntry.isPending ? "Adding..." : "Add Transaction"}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Summary cards ── */}
      {summaryLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="h-28 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }} />
          ))}
        </div>
      ) : summary ? (
        <div className="grid gap-4 md:grid-cols-3">

          {/* Income */}
          <TiltPanel delay={0.10} glowColor="rgba(144,238,144,0.5)">
            <div className="rounded-2xl p-5" style={{
              ...GLASS,
              borderTop: "2px solid rgba(144,238,144,0.3)",
            }}>
              <div className="flex items-center justify-between mb-4">
                <FloatDepth depth={12}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(144,238,144,0.12)", border: "1px solid rgba(144,238,144,0.25)" }}>
                    <ArrowUpRight size={16} style={{ color: "#90EE90" }} />
                  </div>
                </FloatDepth>
                <span className="text-[10px] font-semibold tracking-widest uppercase"
                  style={{ color: "rgba(255,255,255,0.2)" }}>Income</span>
              </div>
              <FloatDepth depth={20}>
                <div className="text-3xl font-black" style={{ color: "#90EE90" }}>
                  ${Number(summary.totalIncome).toFixed(2)}
                </div>
              </FloatDepth>
              <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Total this month</div>
            </div>
          </TiltPanel>

          {/* Expenses */}
          <TiltPanel delay={0.18} glowColor="rgba(255,140,100,0.5)">
            <div className="rounded-2xl p-5" style={{
              ...GLASS,
              borderTop: "2px solid rgba(255,140,100,0.3)",
            }}>
              <div className="flex items-center justify-between mb-4">
                <FloatDepth depth={12}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(255,140,100,0.12)", border: "1px solid rgba(255,140,100,0.25)" }}>
                    <ArrowDownRight size={16} style={{ color: "#FF8C69" }} />
                  </div>
                </FloatDepth>
                <span className="text-[10px] font-semibold tracking-widest uppercase"
                  style={{ color: "rgba(255,255,255,0.2)" }}>Expenses</span>
              </div>
              <FloatDepth depth={20}>
                <div className="text-3xl font-black" style={{ color: "#FF8C69" }}>
                  ${Number(summary.totalExpenses).toFixed(2)}
                </div>
              </FloatDepth>
              <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Total this month</div>
            </div>
          </TiltPanel>

          {/* Net Balance */}
          <TiltPanel delay={0.26} glowColor="rgba(255,182,193,0.5)">
            <div className="rounded-2xl p-5" style={{
              ...GLASS,
              borderTop: `2px solid ${Number(summary.netBalance) >= 0 ? "rgba(144,238,144,0.3)" : "rgba(255,140,100,0.3)"}`,
            }}>
              <div className="flex items-center justify-between mb-4">
                <FloatDepth depth={12}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: Number(summary.netBalance) >= 0 ? "rgba(144,238,144,0.12)" : "rgba(255,140,100,0.12)",
                      border: `1px solid ${Number(summary.netBalance) >= 0 ? "rgba(144,238,144,0.25)" : "rgba(255,140,100,0.25)"}`,
                    }}>
                    <DollarSign size={16} style={{ color: Number(summary.netBalance) >= 0 ? "#90EE90" : "#FF8C69" }} />
                  </div>
                </FloatDepth>
                <div className="flex items-center gap-1">
                  <TrendingUp size={10} style={{ color: "rgba(255,255,255,0.2)" }} />
                  <span className="text-[10px] font-semibold tracking-widest uppercase"
                    style={{ color: "rgba(255,255,255,0.2)" }}>Balance</span>
                </div>
              </div>
              <FloatDepth depth={20}>
                <div className="text-3xl font-black"
                  style={{ color: Number(summary.netBalance) >= 0 ? "#90EE90" : "#FF8C69" }}>
                  {Number(summary.netBalance) >= 0 ? "+" : ""}${Number(summary.netBalance).toFixed(2)}
                </div>
              </FloatDepth>
              <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Net this month</div>
            </div>
          </TiltPanel>
        </div>
      ) : null}

      {/* ── Transactions + Chart ── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Transactions table */}
        <TiltPanel delay={0.32} className="lg:col-span-2" glowColor="rgba(255,182,193,0.3)">
          <div className="rounded-2xl p-6" style={GLASS}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 rounded-full"
                style={{ background: "linear-gradient(180deg, #FFB6C1, #C8A2C8)" }} />
              <h2 className="text-sm font-bold tracking-wider uppercase"
                style={{ color: "rgba(255,255,255,0.6)" }}>Recent Transactions</h2>
            </div>

            {entriesLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div key={i} className="h-10 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }} />
                ))}
              </div>
            ) : !Array.isArray(entries) || entries.length === 0 ? (
              <div className="text-center py-8 px-4 flex flex-col items-center justify-center">
                <p className="text-sm font-semibold mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                  No transactions logged for this month.
                </p>
                <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Track income and expenses to keep your wealth summary up to date.
                </p>
                <button
                  onClick={() => setIsOpen(true)}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-transform hover:scale-105 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, rgba(144,238,144,0.2), rgba(175,238,238,0.15))",
                    border: "1px solid rgba(144,238,144,0.3)",
                    color: "#90EE90",
                  }}
                >
                  <Plus size={14} /> Add Transaction
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Header row */}
                <div className="grid grid-cols-[1fr_2fr_1fr_auto] gap-3 px-3 py-2 text-[10px] font-bold tracking-wider uppercase"
                  style={{ color: "rgba(255,255,255,0.2)" }}>
                  <span>Date</span>
                  <span>Description</span>
                  <span>Category</span>
                  <span className="text-right">Amount</span>
                </div>
                {Array.isArray(entries) && entries.slice(0, 10).map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ x: 4 }}
                    className="grid grid-cols-[1fr_2fr_1fr_auto] gap-3 items-center px-3 py-2.5 rounded-xl transition-colors"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {format(new Date(entry.date + 'T00:00:00'), "MMM d")}
                    </span>
                    <span className="text-sm font-medium truncate"
                      style={{ color: "rgba(255,255,255,0.75)" }}>
                      {entry.description || "—"}
                    </span>
                    <span className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {entry.category}
                    </span>
                    <span className="text-sm font-bold text-right"
                      style={{ color: entry.type === "income" ? "#90EE90" : "#FF8C69" }}>
                      {entry.type === "income" ? "+" : "-"}${Number(entry.amount).toFixed(2)}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TiltPanel>

        {/* Spending pie chart */}
        <TiltPanel delay={0.40} glowColor="rgba(200,162,200,0.35)">
          <div className="rounded-2xl p-6 h-full" style={GLASS}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 rounded-full"
                style={{ background: "linear-gradient(180deg, #C8A2C8, #E6E6FA)" }} />
              <h2 className="text-sm font-bold tracking-wider uppercase"
                style={{ color: "rgba(255,255,255,0.6)" }}>By Category</h2>
            </div>

            {summary?.expensesByCategory && summary.expensesByCategory.length > 0 ? (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.expensesByCategory}
                        cx="50%" cy="50%"
                        innerRadius={52} outerRadius={72}
                        paddingAngle={4}
                        dataKey="total" nameKey="category"
                      >
                        {summary.expensesByCategory.map((_, idx) => (
                          <RechartsCell key={idx}
                            fill={COLORS[idx % COLORS.length]}
                            stroke="rgba(0,0,0,0)"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "rgba(10,10,20,0.92)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 10, color: "#fff", fontSize: 12,
                        }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 space-y-2">
                  {summary.expensesByCategory.slice(0, 5).map((cat, idx) => (
                    <motion.div key={cat.category}
                      className="flex justify-between items-center"
                      whileHover={{ x: 3 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{
                            background: COLORS[idx % COLORS.length],
                            boxShadow: `0 0 6px ${COLORS[idx % COLORS.length]}80`,
                          }} />
                        <span className="text-xs truncate max-w-[90px]"
                          style={{ color: "rgba(255,255,255,0.55)" }}>{cat.category}</span>
                      </div>
                      <span className="text-xs font-bold"
                        style={{ color: COLORS[idx % COLORS.length] }}>
                        ${Number(cat.total).toFixed(2)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48">
                <FloatDepth depth={12}>
                  <DollarSign size={32} style={{ color: "rgba(200,162,200,0.25)", marginBottom: 8 }} />
                </FloatDepth>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>No expenses to chart.</p>
              </div>
            )}
          </div>
        </TiltPanel>
      </div>
    </div>
  );
}
