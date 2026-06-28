import { useState, useMemo, useEffect } from "react";
import { useListFinances, useGetMonthlySummary, useCreateFinanceEntry, useListTags, getListFinancesQueryKey, getGetMonthlySummaryQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Plus, ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, Search, Download, Target, ShieldCheck, Percent, Zap, Filter, RefreshCw, Layers, Table, Calendar, Edit3, Trash2, CreditCard, Landmark, Coins, Scale, Award, Banknote, PieChart as PieChartIcon, BarChart3, StickyNote } from "lucide-react";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell as RechartsCell, Tooltip,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell
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

const COLORS = ["#FFB6C1", "#AFEEEE", "#E6E6FA", "#FFDAB9", "#98FB98", "#F472B6", "#A78BFA"];

const SPREADSHEET_SEED_DATA = [
  { id: "s-1", category: "Idli", calculation: "50x20 = 1000", amount: 1000, when: "Mon - fri" },
  { id: "s-2", category: "Zomato", calculation: "229 x 8 = 1832", amount: 1832, when: "Sat , sun" },
  { id: "s-3", category: "Evening snack", calculation: "40x30 = 1200", amount: 1200, when: "Daily" },
  { id: "s-4", category: "MESS(TIFFIN)", calculation: "PAID", amount: 0, when: "Daily" },
  { id: "s-5", category: "ROOM RENT", calculation: "5000x1 = 5000", amount: 5000, when: "1st dec" },
  { id: "s-6", category: "Petrol", calculation: "300 x 5 = 1500", amount: 1500, when: "After 6 days" },
  { id: "s-7", category: "Water", calculation: "30 x 10 = 300", amount: 300, when: "Every 3rd day" },
  { id: "s-8", category: "Laundary", calculation: "180 x 4 = 720", amount: 720, when: "Saturdays" },
  { id: "s-9", category: "Project print", calculation: "22 x 5 = 110", amount: 110, when: "3rd December" },
  { id: "s-10", category: "Yt premium", calculation: "199x1 = 199", amount: 199, when: "5th December" },
  { id: "s-11", category: "Wifi recharge", calculation: "580 x 1 = 580", amount: 580, when: "9th december" },
  { id: "s-12", category: "Recharge (my)", calculation: "399 x 1 = 399", amount: 399, when: "9th december" },
  { id: "s-13", category: "Dadi , mom", calculation: "199 x 2 = 400", amount: 400, when: "15th , 4th december" },
  { id: "s-14", category: "Blue lays", calculation: "20 x 40 = 800", amount: 800, when: "Sat , sun x 2, daily 1" },
  { id: "s-15", category: "Mixture", calculation: "80 x 4 = 320", amount: 320, when: "Tiffin" },
  { id: "s-16", category: "Fruits", calculation: "100 x 4 = 400", amount: 400, when: "Weekly" },
  { id: "s-17", category: "Dry fruits", calculation: "400 x 1 = 400", amount: 400, when: "Monthly" },
  { id: "s-18", category: "Stationary", calculation: "500 x 1 = 500", amount: 500, when: "monthly" },
  { id: "s-19", category: "Canteen", calculation: "50 x 4 = 200", amount: 200, when: "Once a week" },
  { id: "s-20", category: "Face items", calculation: "400+350+40+399+350=1539", amount: 1539, when: "Face wash + moisturiser + lip balm + sunscreen + body wash" },
  { id: "s-21", category: "Exam rgpv form", calculation: "1850 x 1 = 1850", amount: 1850, when: "Nearly 5-10 dec" },
  { id: "s-22", category: "Saloon", calculation: "1000 x 1 = 1000", amount: 1000, when: "Scrub, hair cut, beard set, massage, hair spa" },
  { id: "s-23", category: "Grocery", calculation: "100+50+40+200+100+200+60 = 750", amount: 750, when: "Grocery (surf, shampoo, soap, vim, foil, paste, freshener, milk, coffee)" },
  { id: "s-24", category: "Biscuit + cake + chocolate", calculation: "(10x30=300 + 30x5=150 + 10x10=100) = 550", amount: 550, when: "Daily snacks" },
];

export default function Finances() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [tagId, setTagId] = useState("");

  // Customization & View State
  const [currency, setCurrency] = useState(() => localStorage.getItem("finance_currency") || "₹");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [financeViewMode, setFinanceViewMode] = useState<"TABLE" | "CALENDAR">("TABLE");
  const [financeCalendarThemeMode, setFinanceCalendarThemeMode] = useState<"LIGHT" | "DARK">(() => (localStorage.getItem("finance_calendar_theme_mode") as any) || "LIGHT");

  // WEALTH PORTFOLIO STATE
  const [earnedOverride, setEarnedOverride] = useState(() => localStorage.getItem("wealth_earned_override") || "");
  const [bankSavings, setBankSavings] = useState(() => Number(localStorage.getItem("wealth_bank_savings")) || 150000);
  const [creditBalance, setCreditBalance] = useState(() => Number(localStorage.getItem("wealth_credit_balance")) || 12500);
  const [creditLimit, setCreditLimit] = useState(() => Number(localStorage.getItem("wealth_credit_limit")) || 150000);
  const [creditDueDate, setCreditDueDate] = useState(() => localStorage.getItem("wealth_credit_due_date") || "15th of month");
  const [creditScore, setCreditScore] = useState(() => Number(localStorage.getItem("wealth_credit_score")) || 785);
  const [fds, setFds] = useState(() => Number(localStorage.getItem("wealth_fds")) || 200000);
  const [gold, setGold] = useState(() => Number(localStorage.getItem("wealth_gold")) || 85000);
  const [silver, setSilver] = useState(() => Number(localStorage.getItem("wealth_silver")) || 35000);
  const [cash, setCash] = useState(() => Number(localStorage.getItem("wealth_cash")) || 15000);

  const [isWealthModalOpen, setIsWealthModalOpen] = useState(false);

  // Sync with events
  useEffect(() => {
    const syncWealth = () => {
      setEarnedOverride(localStorage.getItem("wealth_earned_override") || "");
      setBankSavings(Number(localStorage.getItem("wealth_bank_savings")) || 150000);
      setCreditBalance(Number(localStorage.getItem("wealth_credit_balance")) || 12500);
      setCreditLimit(Number(localStorage.getItem("wealth_credit_limit")) || 150000);
      setCreditDueDate(localStorage.getItem("wealth_credit_due_date") || "15th of month");
      setCreditScore(Number(localStorage.getItem("wealth_credit_score")) || 785);
      setFds(Number(localStorage.getItem("wealth_fds")) || 200000);
      setGold(Number(localStorage.getItem("wealth_gold")) || 85000);
      setSilver(Number(localStorage.getItem("wealth_silver")) || 35000);
      setCash(Number(localStorage.getItem("wealth_cash")) || 15000);
      setCurrency(localStorage.getItem("finance_currency") || "₹");
    };
    window.addEventListener("storage", syncWealth);
    window.addEventListener("wealth-settings-changed", syncWealth);
    return () => {
      window.removeEventListener("storage", syncWealth);
      window.removeEventListener("wealth-settings-changed", syncWealth);
    };
  }, []);

  // Interactive Spreadsheet Items state
  const [spreadsheetItems, setSpreadsheetItems] = useState(() => {
    const saved = localStorage.getItem("custom_spreadsheet_items");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return SPREADSHEET_SEED_DATA;
  });
  const [isAddBudgetItemOpen, setIsAddBudgetItemOpen] = useState(false);
  const [newBudgetCategory, setNewBudgetCategory] = useState("");
  const [newBudgetCalc, setNewBudgetCalc] = useState("");
  const [newBudgetAmount, setNewBudgetAmount] = useState("");
  const [newBudgetWhen, setNewBudgetWhen] = useState("");

  const currentMonth = format(new Date(), "yyyy-MM");
  const { data: summary } = useGetMonthlySummary({ month: currentMonth });
  const { data: entries = [], isLoading: entriesLoading } = useListFinances({ month: currentMonth });
  const { data: tags = [] } = useListTags();
  const createFinanceEntry = useCreateFinanceEntry();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toggleCurrency = () => {
    const next = currency === "₹" ? "$" : "₹";
    setCurrency(next);
    localStorage.setItem("finance_currency", next);
    toast({ title: `Currency changed to ${next}` });
  };

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
        toast({ title: "Transaction logged successfully!" });
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

  const handleSaveWealthPortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("wealth_earned_override", earnedOverride);
    localStorage.setItem("wealth_bank_savings", bankSavings.toString());
    localStorage.setItem("wealth_credit_balance", creditBalance.toString());
    localStorage.setItem("wealth_credit_limit", creditLimit.toString());
    localStorage.setItem("wealth_credit_due_date", creditDueDate);
    localStorage.setItem("wealth_credit_score", creditScore.toString());
    localStorage.setItem("wealth_fds", fds.toString());
    localStorage.setItem("wealth_gold", gold.toString());
    localStorage.setItem("wealth_silver", silver.toString());
    localStorage.setItem("wealth_cash", cash.toString());

    window.dispatchEvent(new Event("wealth-settings-changed"));
    setIsWealthModalOpen(false);
    toast({ title: "Wealth Assets & Portfolio Updated! 🏛️" });
  };

  const handleAddBudgetItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudgetCategory.trim() || !newBudgetAmount) return;
    const newItem = {
      id: `s-${Date.now()}`,
      category: newBudgetCategory.trim(),
      calculation: newBudgetCalc.trim() || "1x1",
      amount: Number(newBudgetAmount),
      when: newBudgetWhen.trim() || "Monthly",
    };
    const updated = [...spreadsheetItems, newItem];
    setSpreadsheetItems(updated);
    localStorage.setItem("custom_spreadsheet_items", JSON.stringify(updated));
    setIsAddBudgetItemOpen(false);
    setNewBudgetCategory("");
    setNewBudgetCalc("");
    setNewBudgetAmount("");
    setNewBudgetWhen("");
    toast({ title: "Budget Allocation Item Added! 💰" });
  };

  const handleDeleteBudgetItem = (id: string) => {
    const updated = spreadsheetItems.filter((i: any) => i.id !== id);
    setSpreadsheetItems(updated);
    localStorage.setItem("custom_spreadsheet_items", JSON.stringify(updated));
    toast({ title: "Item removed from budget matrix." });
  };

  const EditBudgetItemModal = ({ item }: { item: any }) => {
    const [open, setOpen] = useState(false);
    const [cat, setCat] = useState(item.category);
    const [calc, setCalc] = useState(item.calculation);
    const [amt, setAmt] = useState(item.amount.toString());
    const [when, setWhen] = useState(item.when);

    const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      const updated = spreadsheetItems.map((i: any) => {
        if (i.id === item.id) {
          return { ...i, category: cat, calculation: calc, amount: Number(amt), when };
        }
        return i;
      });
      setSpreadsheetItems(updated);
      localStorage.setItem("custom_spreadsheet_items", JSON.stringify(updated));
      setOpen(false);
      toast({ title: `Updated '${cat}' allocation!` });
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            className="p-1 rounded-lg text-amber-300 hover:bg-amber-500/10 transition-colors"
            title="Edit Item Details"
          >
            <Edit3 size={14} />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] bg-[#1a1a24] text-white border-white/10">
          <DialogHeader><DialogTitle>Edit Budget Item</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Category Name</label>
              <input
                type="text"
                required
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-white/70">Calculation Formula</label>
                <input
                  type="text"
                  value={calc}
                  onChange={(e) => setCalc(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-white/70">Amount ({currency})</label>
                <input
                  type="number"
                  required
                  value={amt}
                  onChange={(e) => setAmt(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Schedule / Frequency (When)</label>
              <input
                type="text"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-black">Save Allocation Changes</button>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  const BudgetItemNoteModal = ({ item }: { item: any }) => {
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState(item.note || "");

    const handleSaveNote = (e: React.FormEvent) => {
      e.preventDefault();
      const updated = spreadsheetItems.map((i: any) => {
        if (i.id === item.id) {
          return { ...i, note };
        }
        return i;
      });
      setSpreadsheetItems(updated);
      localStorage.setItem("custom_spreadsheet_items", JSON.stringify(updated));
      setOpen(false);
      toast({ title: `Saved notes for '${item.category}'! 📝` });
    };

    const hasNote = Boolean(item.note && item.note.trim());

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            className={`p-1 rounded-lg transition-colors ${hasNote ? "text-cyan-400 bg-cyan-500/20 hover:bg-cyan-500/30" : "text-white/40 hover:text-white hover:bg-white/10"}`}
            title={hasNote ? `Note: ${item.note}` : "Add Note / Remarks"}
          >
            <StickyNote size={14} />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] bg-[#1a1a24] text-white border-white/10">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-cyan-400"><StickyNote size={18} /> Budget Item Notes & Remarks</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveNote} className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-white/70">Custom Notes for <span className="text-white font-bold">{item.category}</span></label>
              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Attach custom vendor notes, UPI IDs, payment links, receipt notes..."
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-black">Save Item Note</button>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  // Filtered entries calculation
  const filteredEntries = useMemo(() => {
    if (!Array.isArray(entries)) return [];
    return entries.filter((item) => {
      const matchesType = filterType === "all" || item.type === filterType;
      const matchesSearch = 
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [entries, filterType, searchQuery]);

  // Derived Financial Metrics
  const spreadsheetTotal = useMemo(() => {
    return spreadsheetItems.reduce((acc: number, item: any) => acc + Number(item.amount), 0);
  }, [spreadsheetItems]);

  const totalIncomeNum = earnedOverride ? Number(earnedOverride) : Number(summary?.totalIncome || 0);
  const totalExpenseNum = Number(summary?.totalExpenses || 0) + (entries.length === 0 ? spreadsheetTotal : 0);
  const netBalanceNum = totalIncomeNum - totalExpenseNum;
  const daysInMonthSoFar = new Date().getDate();
  const dailyAvgExpense = totalExpenseNum > 0 ? (totalExpenseNum / daysInMonthSoFar).toFixed(2) : "0.00";

  // Total Portfolio Net Worth
  const totalAssets = bankSavings + fds + gold + silver + cash;
  const totalLiabilities = creditBalance;
  const totalNetWorth = totalAssets - totalLiabilities;

  // Asset Bar Chart Dataset
  const assetChartData = useMemo(() => [
    { name: "Bank Savings", value: bankSavings, fill: "#10B981" },
    { name: "Fixed Deposits", value: fds, fill: "#A855F7" },
    { name: "Gold Holdings", value: gold, fill: "#F59E0B" },
    { name: "Silver & Cash", value: silver + cash, fill: "#38BDF8" },
    { name: "Credit Liabilities", value: creditBalance, fill: "#F43F5E" },
  ], [bankSavings, fds, gold, silver, cash, creditBalance]);

  const exportCSV = () => {
    const headers = "Category,Calculation,Amount,When Schedule\n";
    const rows = spreadsheetItems.map((e: any) => `"${e.category}","${e.calculation}",${e.amount},"${e.when}"`).join("\n");
    const blob = new Blob([headers + rows], { type: "csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget_matrix_${currentMonth}.csv`;
    a.click();
    toast({ title: "CSV Budget Matrix Exported! 📥" });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">

      {/* ── Header & Primary Action Bar ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-[12px] font-semibold tracking-[0.25em] uppercase mb-1"
            style={{ color: "rgba(255,182,193,0.65)" }}>
            ✦ Personal Wealth Command Center
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="text-4xl font-black flex items-center gap-3"
            style={{ color: "rgba(255,255,255,0.95)" }}>
            Financial Matrix & Wealth Portfolio
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.35)" }}>
            {format(new Date(), "MMMM yyyy")} · Track total bank savings, credit cards, investments (FDs, Gold, Silver), cash & net worth.
          </motion.p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={toggleCurrency}
            className="px-3.5 py-2 rounded-xl text-xs font-black bg-white/10 hover:bg-white/15 border border-white/20 text-amber-300 flex items-center gap-1.5 transition-all"
            title="Switch Currency Symbol"
          >
            Currency: <span className="text-sm font-extrabold">{currency}</span>
          </button>

          {/* WEALTH PORTFOLIO MODAL TRIGGER */}
          <Dialog open={isWealthModalOpen} onOpenChange={setIsWealthModalOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-all">
                <Landmark size={14} /> Edit Wealth Assets & Portfolio
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] bg-[#1a1a24] text-white border-white/10 max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="text-xl font-bold flex items-center gap-2 text-amber-400"><Landmark size={20} /> Master Wealth Portfolio Customizer</DialogTitle></DialogHeader>
              <form onSubmit={handleSaveWealthPortfolio} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-amber-300">Earned This Month ({currency})</label>
                    <input
                      type="number"
                      value={earnedOverride}
                      onChange={(e) => setEarnedOverride(e.target.value)}
                      placeholder="Auto / Custom"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-emerald-300">Total Bank Savings ({currency})</label>
                    <input
                      type="number"
                      value={bankSavings}
                      onChange={(e) => setBankSavings(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-rose-300">Credit Card Used</label>
                    <input
                      type="number"
                      value={creditBalance}
                      onChange={(e) => setCreditBalance(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-rose-300">Credit Card Limit</label>
                    <input
                      type="number"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-rose-300">Due Date Note</label>
                    <input
                      type="text"
                      value={creditDueDate}
                      onChange={(e) => setCreditDueDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-blue-300">Credit Score (CIBIL)</label>
                    <input
                      type="number"
                      value={creditScore}
                      onChange={(e) => setCreditScore(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-purple-300">Fixed Deposits (FDs)</label>
                    <input
                      type="number"
                      value={fds}
                      onChange={(e) => setFds(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-amber-400">Gold Holdings ({currency})</label>
                    <input
                      type="number"
                      value={gold}
                      onChange={(e) => setGold(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Silver Holdings ({currency})</label>
                    <input
                      type="number"
                      value={silver}
                      onChange={(e) => setSilver(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-emerald-400">Cash on Hand ({currency})</label>
                    <input
                      type="number"
                      value={cash}
                      onChange={(e) => setCash(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-2.5 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-black">Save Portfolio Changes</button>
              </form>
            </DialogContent>
          </Dialog>

          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-all"
          >
            <Download size={14} /> Export Budget CSV
          </motion.button>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg, rgba(144,238,144,0.18), rgba(144,238,144,0.08))",
                  border: "1px solid rgba(144,238,144,0.3)",
                  color: "#90EE90",
                }}>
                <Plus size={16} /> Log Transaction
              </motion.button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-[#1a1a24] text-white border-white/10">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Record Financial Entry</DialogTitle>
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
                      <option value="expense">Expense (-)</option>
                      <option value="income">Income (+)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/60">Amount ({currency}) *</label>
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
                    placeholder="e.g. Food, Rent, Salary, Freelance"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#90EE90] transition-colors text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Grocery run, Client payment"
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
                    {createFinanceEntry.isPending ? "Recording..." : "Save Transaction"}
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── MASTER WEALTH ASSETS MATRIX CARDS WITH IN-CARD QUICK EDIT ── */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
        {/* Total Net Worth */}
        <div className="col-span-2 rounded-2xl p-4 bg-gradient-to-br from-amber-500/20 to-yellow-600/10 border border-amber-500/30 relative">
          <div className="text-[10px] font-bold tracking-widest uppercase text-amber-300">Total Net Worth</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{currency}{totalNetWorth.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-white/50 mt-1">Assets: {currency}{totalAssets.toLocaleString('en-IN')}</div>
        </div>
        {/* Bank Savings */}
        <div className="rounded-2xl p-4 border border-white/10 bg-white/5 relative group">
          <button onClick={() => setIsWealthModalOpen(true)} className="absolute top-2 right-2 p-1 rounded-md bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400 hover:bg-white/15"><Edit3 size={10} /></button>
          <div className="text-[10px] font-bold text-white/40 uppercase">Bank Savings</div>
          <div className="text-base font-black text-emerald-400 mt-1">{currency}{bankSavings.toLocaleString('en-IN')}</div>
        </div>
        {/* Credit Card Balance */}
        <div className="rounded-2xl p-4 border border-white/10 bg-white/5 relative group">
          <button onClick={() => setIsWealthModalOpen(true)} className="absolute top-2 right-2 p-1 rounded-md bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:bg-white/15"><Edit3 size={10} /></button>
          <div className="text-[10px] font-bold text-white/40 uppercase">Credit Card</div>
          <div className="text-base font-black text-rose-400 mt-1">{currency}{creditBalance.toLocaleString('en-IN')}</div>
          <div className="text-[9px] text-white/40">Due: {creditDueDate}</div>
        </div>
        {/* Credit Score */}
        <div className="rounded-2xl p-4 border border-white/10 bg-white/5 relative group">
          <button onClick={() => setIsWealthModalOpen(true)} className="absolute top-2 right-2 p-1 rounded-md bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity text-sky-400 hover:bg-white/15"><Edit3 size={10} /></button>
          <div className="text-[10px] font-bold text-white/40 uppercase">Credit Score</div>
          <div className="text-base font-black text-sky-400 mt-1">{creditScore} CIBIL</div>
        </div>
        {/* FDs */}
        <div className="rounded-2xl p-4 border border-white/10 bg-white/5 relative group">
          <button onClick={() => setIsWealthModalOpen(true)} className="absolute top-2 right-2 p-1 rounded-md bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400 hover:bg-white/15"><Edit3 size={10} /></button>
          <div className="text-[10px] font-bold text-white/40 uppercase">Fixed Deposits</div>
          <div className="text-base font-black text-purple-400 mt-1">{currency}{fds.toLocaleString('en-IN')}</div>
        </div>
        {/* Gold */}
        <div className="rounded-2xl p-4 border border-white/10 bg-white/5 relative group">
          <button onClick={() => setIsWealthModalOpen(true)} className="absolute top-2 right-2 p-1 rounded-md bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity text-amber-300 hover:bg-white/15"><Edit3 size={10} /></button>
          <div className="text-[10px] font-bold text-white/40 uppercase">Gold Portfolio</div>
          <div className="text-base font-black text-amber-300 mt-1">{currency}{gold.toLocaleString('en-IN')}</div>
        </div>
        {/* Silver */}
        <div className="rounded-2xl p-4 border border-white/10 bg-white/5 relative group">
          <button onClick={() => setIsWealthModalOpen(true)} className="absolute top-2 right-2 p-1 rounded-md bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:bg-white/15"><Edit3 size={10} /></button>
          <div className="text-[10px] font-bold text-white/40 uppercase">Silver / Cash</div>
          <div className="text-base font-black text-slate-300 mt-1">{currency}{(silver + cash).toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* ── VISUAL ASSET ALLOCATION BAR CHART & ANALYTICS ── */}
      <div className="p-6 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-950/90 via-background/95 to-emerald-950/30 backdrop-blur-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <BarChart3 size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Wealth Asset Allocation Bar Graph & Analytics
              </h2>
              <p className="text-xs text-white/50">Visual breakdown of liquid savings, investments, precious metals and credit liabilities.</p>
            </div>
          </div>
          <button onClick={() => setIsWealthModalOpen(true)} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 flex items-center gap-1.5 transition-all">
            <Edit3 size={12} /> Quick Edit Data Values
          </button>
        </div>

        <div className="h-64 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={assetChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickFormatter={(v) => `${currency}${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "rgba(10,10,20,0.95)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12, color: "#fff", fontSize: 12,
                }}
                formatter={(val: number) => [`${currency}${val.toLocaleString('en-IN')}`, "Amount"]}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {assetChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Summary & Health Metric Cards ── */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Income */}
        <TiltPanel delay={0.10} glowColor="rgba(144,238,144,0.5)">
          <div className="rounded-2xl p-5 relative group" style={{ ...GLASS, borderTop: "2px solid rgba(144,238,144,0.3)" }}>
            <button onClick={() => setIsWealthModalOpen(true)} className="absolute top-3 right-3 p-1 rounded-md bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity text-[#90EE90] hover:bg-white/15"><Edit3 size={12} /></button>
            <div className="flex items-center justify-between mb-4">
              <FloatDepth depth={12}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#90EE90]/10 border border-[#90EE90]/30">
                  <ArrowUpRight size={16} className="text-[#90EE90]" />
                </div>
              </FloatDepth>
              <span className="text-[10px] font-bold tracking-widest uppercase text-white/30">Earned This Month</span>
            </div>
            <FloatDepth depth={20}>
              <div className="text-3xl font-black text-[#90EE90]">{currency}{totalIncomeNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </FloatDepth>
            <div className="text-xs mt-1 text-white/40">{earnedOverride ? "Custom Override Active" : "Earned this month"}</div>
          </div>
        </TiltPanel>

        {/* Expenses */}
        <TiltPanel delay={0.18} glowColor="rgba(255,140,100,0.5)">
          <div className="rounded-2xl p-5" style={{ ...GLASS, borderTop: "2px solid rgba(255,140,100,0.3)" }}>
            <div className="flex items-center justify-between mb-4">
              <FloatDepth depth={12}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FF8C69]/10 border border-[#FF8C69]/30">
                  <ArrowDownRight size={16} className="text-[#FF8C69]" />
                </div>
              </FloatDepth>
              <span className="text-[10px] font-bold tracking-widest uppercase text-white/30">Total Expenses</span>
            </div>
            <FloatDepth depth={20}>
              <div className="text-3xl font-black text-[#FF8C69]">{currency}{totalExpenseNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </FloatDepth>
            <div className="text-xs mt-1 text-white/40">Avg {currency}{dailyAvgExpense} / day</div>
          </div>
        </TiltPanel>

        {/* Net Balance */}
        <TiltPanel delay={0.26} glowColor="rgba(255,182,193,0.5)">
          <div className="rounded-2xl p-5" style={{ ...GLASS, borderTop: `2px solid ${netBalanceNum >= 0 ? "rgba(144,238,144,0.3)" : "rgba(255,140,100,0.3)"}` }}>
            <div className="flex items-center justify-between mb-4">
              <FloatDepth depth={12}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-white/10">
                  <DollarSign size={16} className={netBalanceNum >= 0 ? "text-[#90EE90]" : "text-[#FF8C69]"} />
                </div>
              </FloatDepth>
              <span className="text-[10px] font-bold tracking-widest uppercase text-white/30">Net Balance</span>
            </div>
            <FloatDepth depth={20}>
              <div className={`text-3xl font-black ${netBalanceNum >= 0 ? "text-[#90EE90]" : "text-[#FF8C69]"}`}>
                {netBalanceNum >= 0 ? "+" : ""}{currency}{netBalanceNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </FloatDepth>
            <div className="text-xs mt-1 text-white/40">Net Cashflow status</div>
          </div>
        </TiltPanel>

        {/* Budget Allocation Total */}
        <TiltPanel delay={0.32} glowColor="rgba(255,215,0,0.5)">
          <div className="rounded-2xl p-5" style={{ ...GLASS, borderTop: "2px solid rgba(255,215,0,0.3)" }}>
            <div className="flex items-center justify-between mb-4">
              <FloatDepth depth={12}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FFD700]/10 border border-[#FFD700]/30">
                  <Table size={16} className="text-[#FFD700]" />
                </div>
              </FloatDepth>
              <span className="text-[10px] font-bold tracking-widest uppercase text-white/30">Budget Total</span>
            </div>
            <FloatDepth depth={20}>
              <div className="text-3xl font-black text-[#FFD700]">{currency}{spreadsheetTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </FloatDepth>
            <div className="text-xs mt-1 text-white/40">{spreadsheetItems.length} Recurring items allocated</div>
          </div>
        </TiltPanel>
      </div>

      {/* ── EXCLUSIVE FEATURE: Personal Recurring Budget Allocation Matrix & Hyper-Calendar ── */}
      <div className="p-6 rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-950/90 via-background/95 to-cyan-950/30 backdrop-blur-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Personal Monthly Budget & Financial Schedule Matrix
              </h2>
              <p className="text-xs text-white/50">Detailed calculation breakdown, scheduled payment frequency and recurring bill calendar.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* View Switcher Toggle */}
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setFinanceViewMode("TABLE")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${financeViewMode === "TABLE" ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/50" : "text-white/50 hover:text-white"}`}
              >
                📋 Matrix Table
              </button>
              <button
                onClick={() => setFinanceViewMode("CALENDAR")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${financeViewMode === "CALENDAR" ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/50" : "text-white/50 hover:text-white"}`}
              >
                🗓️ Payment Hyper-Calendar
              </button>
            </div>

            {financeViewMode === "TABLE" && (
              <Dialog open={isAddBudgetItemOpen} onOpenChange={setIsAddBudgetItemOpen}>
                <DialogTrigger asChild>
                  <button className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all">
                    <Plus size={14} /> Add Recurring Budget Item
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-[#1a1a24] text-white border-white/10">
                  <DialogHeader><DialogTitle>Add Budget Matrix Item</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddBudgetItem} className="space-y-4 mt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-white/70">Category / Item Name *</label>
                      <input
                        type="text"
                        required
                        value={newBudgetCategory}
                        onChange={(e) => setNewBudgetCategory(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                        placeholder="e.g. Idli, Zomato, Rent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-white/70">Calculation Formula</label>
                        <input
                          type="text"
                          value={newBudgetCalc}
                          onChange={(e) => setNewBudgetCalc(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                          placeholder="e.g. 50x20 = 1000"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-white/70">Amount ({currency}) *</label>
                        <input
                          type="number"
                          required
                          value={newBudgetAmount}
                          onChange={(e) => setNewBudgetAmount(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                          placeholder="1000"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-white/70">Schedule / Frequency (When)</label>
                      <input
                        type="text"
                        value={newBudgetWhen}
                        onChange={(e) => setNewBudgetWhen(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                        placeholder="e.g. Mon - fri, Daily, 1st dec"
                      />
                    </div>
                    <button type="submit" className="w-full py-2.5 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-black">Save Budget Item</button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* VIEW 1: Matrix Table */}
        {financeViewMode === "TABLE" ? (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-cyan-400 font-bold uppercase tracking-wider text-[11px] border-b border-white/10">
                <tr>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">CALCULATION</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">When</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {spreadsheetItems.map((item: any) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3.5 font-bold text-white">{item.category}</td>
                    <td className="p-3.5 font-mono text-white/60">{item.calculation}</td>
                    <td className="p-3.5 font-bold text-amber-300">{currency}{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3.5 text-white/60">{item.when}</td>
                    <td className="p-3.5 text-right flex items-center justify-end gap-1.5">
                      <BudgetItemNoteModal item={item} />
                      <EditBudgetItemModal item={item} />
                      <button
                        onClick={() => handleDeleteBudgetItem(item.id)}
                        className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-white/10 text-white font-black text-sm border-t-2 border-white/20">
                <tr>
                  <td className="p-4 uppercase tracking-wider text-cyan-300" colSpan={2}>Total Allocated Budget</td>
                  <td className="p-4 text-emerald-400 text-base" colSpan={3}>{currency}{spreadsheetTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          /* VIEW 2: Financial Payment Hyper-Calendar */
          <div className="space-y-4 pt-2">
            <div className="flex justify-end">
              <button
                onClick={() => {
                  const next = financeCalendarThemeMode === "LIGHT" ? "DARK" : "LIGHT";
                  setFinanceCalendarThemeMode(next);
                  localStorage.setItem("finance_calendar_theme_mode", next);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${financeCalendarThemeMode === "LIGHT" ? "bg-white border-slate-300 text-slate-800 hover:bg-slate-100 shadow" : "bg-white/10 border-white/20 text-emerald-300 hover:bg-white/15"}`}
              >
                {financeCalendarThemeMode === "LIGHT" ? "🌙 Dark Mode" : "☀️ Light Mode"}
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left Sidebar: Upcoming Bill Deadlines */}
              <div className={`space-y-4 rounded-3xl p-5 border transition-all ${financeCalendarThemeMode === "LIGHT" ? "bg-white/95 text-slate-900 border-slate-200 shadow-xl" : "bg-black/40 text-white border-white/10 backdrop-blur-xl"}`}>
                <div className={`border-b pb-3 ${financeCalendarThemeMode === "LIGHT" ? "border-slate-200" : "border-white/10"}`}>
                  <h3 className={`text-base font-black flex items-center gap-2 ${financeCalendarThemeMode === "LIGHT" ? "text-slate-900" : "text-white"}`}>
                    <Landmark size={18} className="text-emerald-500" /> Payment & Bill Due Dates
                  </h3>
                  <p className={`text-[11px] ${financeCalendarThemeMode === "LIGHT" ? "text-slate-500" : "text-white/40"}`}>Recurring allocation schedules</p>
                </div>

                <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                  {[
                    { title: "ROOM RENT", type: "Housing", dateStr: "1st of month", amt: 5000, color: "#DC2626" },
                    { title: "Yt premium", type: "Subscription", dateStr: "5th of month", amt: 199, color: "#DB2777" },
                    { title: "Wifi recharge", type: "Utility", dateStr: "9th of month", amt: 580, color: "#0284C7" },
                    { title: "Recharge (my)", type: "Utility", dateStr: "9th of month", amt: 399, color: "#0284C7" },
                    { title: "Credit Card Bill Statement", type: "Credit Debt", dateStr: creditDueDate, amt: creditBalance, color: "#D97706" },
                    { title: "Dadi, mom", type: "Family", dateStr: "15th & 4th", amt: 400, color: "#9333EA" },
                    { title: "Exam rgpv form", type: "Education", dateStr: "5-10 Dec", amt: 1850, color: "#DC2626" },
                  ].map((bill, i) => (
                    <div key={i} className={`p-3.5 rounded-2xl border space-y-1.5 transition-all ${financeCalendarThemeMode === "LIGHT" ? "bg-slate-50 border-slate-200 hover:bg-slate-100" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md" style={{ backgroundColor: `${bill.color}15`, color: bill.color, border: `1px solid ${bill.color}30` }}>{bill.type}</span>
                        <span className={`text-[11px] font-mono ${financeCalendarThemeMode === "LIGHT" ? "text-slate-500" : "text-white/50"}`}>{bill.dateStr}</span>
                      </div>
                      <div className={`text-sm font-bold flex items-center justify-between ${financeCalendarThemeMode === "LIGHT" ? "text-slate-900" : "text-white"}`}>
                        <span>{bill.title}</span>
                        <span className="text-amber-600 font-extrabold">{currency}{bill.amt.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Area: Full 7-Day Monthly Financial Grid Matrix */}
              <div className={`lg:col-span-2 space-y-4 rounded-3xl p-5 border transition-all ${financeCalendarThemeMode === "LIGHT" ? "bg-white/95 text-slate-900 border-slate-200 shadow-xl" : "bg-black/40 text-white border-white/10 backdrop-blur-xl"}`}>
                <div className={`flex items-center justify-between border-b pb-3 ${financeCalendarThemeMode === "LIGHT" ? "border-slate-200" : "border-white/10"}`}>
                  <h3 className={`text-lg font-black ${financeCalendarThemeMode === "LIGHT" ? "text-slate-900" : "text-white"}`}>Monthly Financial Schedule Matrix</h3>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${financeCalendarThemeMode === "LIGHT" ? "text-emerald-700 bg-emerald-50 border-emerald-300" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"}`}>Total Recurring: {currency}{spreadsheetTotal.toLocaleString('en-IN')}</span>
                </div>

                <div className={`grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider py-2 ${financeCalendarThemeMode === "LIGHT" ? "text-slate-500" : "text-white/40"}`}>
                  <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {[
                    { day: 31, isOther: true }, { day: 1, item: "Rent ₹5k", isUrgent: true }, { day: 2 }, { day: 3, item: "Print ₹110" }, { day: 4, item: "Mom ₹200" }, { day: 5, item: "YT ₹199" }, { day: 6 },
                    { day: 7 }, { day: 8 }, { day: 9, item: "Wifi ₹580" }, { day: 10, item: "Exam Form" }, { day: 11 }, { day: 12 }, { day: 13 },
                    { day: 14 }, { day: 15, item: "Credit Due" }, { day: 16 }, { day: 17 }, { day: 18 }, { day: 19 }, { day: 20 },
                    { day: 21 }, { day: 22 }, { day: 23 }, { day: 24 }, { day: 25 }, { day: 26 }, { day: 27 },
                    { day: 28, isToday: true }, { day: 29 }, { day: 30 }, { day: 1, isOther: true }, { day: 2, isOther: true }, { day: 3, isOther: true }, { day: 4, isOther: true }
                  ].map((cell, idx) => (
                    <div
                      key={idx}
                      className={`min-h-[80px] p-2 rounded-xl border flex flex-col justify-between transition-all ${
                        cell.isToday
                          ? financeCalendarThemeMode === "LIGHT" ? "bg-emerald-50 border-emerald-400 shadow-md ring-2 ring-emerald-300" : "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                          : cell.isOther
                          ? financeCalendarThemeMode === "LIGHT" ? "bg-slate-100/50 border-slate-200/50 opacity-40 text-slate-400" : "bg-white/2 border-white/5 opacity-40"
                          : financeCalendarThemeMode === "LIGHT" ? "bg-white border-slate-200 hover:border-slate-300 shadow-sm" : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex justify-end">
                        <span className={`text-xs font-bold ${cell.isToday ? "text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md" : financeCalendarThemeMode === "LIGHT" ? "text-slate-700" : "text-white/60"}`}>{cell.day}</span>
                      </div>
                      {cell.item && (
                        <div className="mt-1">
                          <span className={`text-[9px] font-bold block truncate px-1 py-0.5 rounded border ${
                            cell.isUrgent
                              ? financeCalendarThemeMode === "LIGHT" ? "bg-rose-100 text-rose-900 border-rose-300 font-extrabold" : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                              : financeCalendarThemeMode === "LIGHT" ? "bg-cyan-100 text-cyan-900 border-cyan-300 font-extrabold" : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                          }`} title={cell.item}>
                            {cell.item}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Transactions Ledger & Category Analytics ── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Transactions Table with Filter & Search */}
        <TiltPanel delay={0.32} className="lg:col-span-2" glowColor="rgba(255,182,193,0.3)">
          <div className="rounded-2xl p-6 space-y-5" style={GLASS}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#FFB6C1] to-[#C8A2C8]" />
                <h2 className="text-sm font-bold tracking-wider uppercase text-white/70">Recent Ledger Transactions</h2>
              </div>

              {/* Quick Filters & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-40">
                  <Search size={12} className="absolute left-2.5 top-2.5 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search ledger..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
                  />
                </div>
                <div className="flex bg-white/5 p-0.5 rounded-xl border border-white/10 text-[11px]">
                  <button
                    onClick={() => setFilterType("all")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${filterType === "all" ? "bg-white/15 text-white" : "text-white/40"}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterType("income")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${filterType === "income" ? "bg-[#90EE90]/20 text-[#90EE90]" : "text-white/40"}`}
                  >
                    Income
                  </button>
                  <button
                    onClick={() => setFilterType("expense")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${filterType === "expense" ? "bg-[#FF8C69]/20 text-[#FF8C69]" : "text-white/40"}`}
                  >
                    Expense
                  </button>
                </div>
              </div>
            </div>

            {entriesLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center justify-center text-white/40 text-xs">
                <p>No logged ledger transactions match your filter.</p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_2fr_1fr_auto] gap-3 px-3 py-2 text-[10px] font-bold tracking-wider uppercase text-white/30">
                  <span>Date</span>
                  <span>Description</span>
                  <span>Category</span>
                  <span className="text-right">Amount</span>
                </div>
                {filteredEntries.slice(0, 15).map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ x: 4 }}
                    className="grid grid-cols-[1fr_2fr_1fr_auto] gap-3 items-center px-3 py-2.5 rounded-xl border-b border-white/5 transition-colors hover:bg-white/5"
                  >
                    <span className="text-[11px] text-white/40">
                      {format(new Date(entry.date + 'T00:00:00'), "MMM d")}
                    </span>
                    <span className="text-sm font-medium truncate text-white/80">
                      {entry.description || "—"}
                    </span>
                    <span className="text-[11px] truncate text-white/50">
                      {entry.category}
                    </span>
                    <span className={`text-sm font-bold text-right ${entry.type === "income" ? "text-[#90EE90]" : "text-[#FF8C69]"}`}>
                      {entry.type === "income" ? "+" : "-"}{currency}{Number(entry.amount).toFixed(2)}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TiltPanel>

        {/* Spending Pie Chart & Category Distribution */}
        <TiltPanel delay={0.40} glowColor="rgba(200,162,200,0.35)">
          <div className="rounded-2xl p-6 h-full space-y-4" style={GLASS}>
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#C8A2C8] to-[#E6E6FA]" />
              <h2 className="text-sm font-bold tracking-wider uppercase text-white/70">Category Breakdown</h2>
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
                          <RechartsCell key={idx} fill={COLORS[idx % COLORS.length]} stroke="rgba(0,0,0,0)" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "rgba(10,10,20,0.92)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 10, color: "#fff", fontSize: 12,
                        }}
                        formatter={(value: number) => [`${currency}${value.toFixed(2)}`, ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 pt-2">
                  {summary.expensesByCategory.slice(0, 6).map((cat, idx) => (
                    <div key={cat.category} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-white/60 truncate max-w-[100px]">{cat.category}</span>
                      </div>
                      <span className="font-bold text-white">{currency}{Number(cat.total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-white/30 text-xs">
                <DollarSign size={32} className="mb-2 opacity-30" />
                <p>No expense data logged.</p>
              </div>
            )}
          </div>
        </TiltPanel>
      </div>
    </div>
  );
}
