import { 
  useListTasks, useCreateTask, useUpdateTask, useDeleteTask,
  useListHabits, useCreateHabit, useUpdateHabit, useDeleteHabit,
  useListFinances, useCreateFinanceEntry, useUpdateFinanceEntry, useDeleteFinanceEntry,
  useListTags, useCreateTag, useDeleteTag,
  useGetUserStats, useListBadges,
  getListTasksQueryKey, getGetTaskSummaryQueryKey, getGetUserStatsQueryKey, getListHabitsQueryKey, getListFinancesQueryKey, getListTagsQueryKey, getListBadgesQueryKey
} from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Edit3, Trash2, Search, Plus, Flame, DollarSign, BookOpen, ShieldCheck, Award, Zap, Activity, Layers, RefreshCw, CheckCircle2, Clock, Settings, Code2, Link2, Sparkles, Crown, Terminal, Wrench, LayoutDashboard, Calendar, Wallet, Code, GraduationCap, Target } from "lucide-react";

// --- Form Schemas ---
const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  status: z.enum(["pending", "completed", "missed"]).default("pending"),
  dueDate: z.string().optional(),
  tagId: z.string().optional(),
});

const habitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().default("#FFB6C1"),
  streak: z.string().optional(),
  level: z.string().optional(),
});

const financeSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.string().min(1, "Amount is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
});

const problemSchema = z.object({
  platform: z.enum(["leetcode", "gfg"]),
  title: z.string().min(1, "Title is required"),
  problemSlug: z.string().optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  category: z.enum(["classwork", "homework"]),
  status: z.enum(["pending", "solved"]).default("pending"),
  url: z.string().optional(),
});

export default function Admin() {
  const [activeTab, setActiveTab] = useState("godmode");
  const [taskSearch, setTaskSearch] = useState("");
  const [problemSearch, setProblemSearch] = useState("");

  // Queries
  const { data: tasks = [] } = useListTasks({ status: "all" });
  const { data: habits = [] } = useListHabits();
  const { data: finances = [] } = useListFinances();
  const { data: tags = [] } = useListTags();
  const { data: stats } = useGetUserStats();
  const { data: badges = [] } = useListBadges();

  const { data: problems = [], refetch: refetchProblems } = useQuery({
    queryKey: ["admin", "problems"],
    queryFn: async () => {
      const res = await fetch("/api/problems");
      if (!res.ok) throw new Error("Failed to fetch problems");
      return res.json();
    },
  });

  const { data: integrations = [], refetch: refetchIntegrations } = useQuery({
    queryKey: ["admin", "integrations"],
    queryFn: async () => {
      const res = await fetch("/api/problems/integrations");
      if (!res.ok) throw new Error("Failed to fetch integrations");
      return res.json();
    },
  });

  // Mutations
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();

  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();

  const createFinance = useCreateFinanceEntry();
  const updateFinance = useUpdateFinanceEntry();
  const deleteFinance = useDeleteFinanceEntry();

  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetUserStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListFinancesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListTagsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListBadgesQueryKey() });
    refetchProblems();
    refetchIntegrations();
  };

  // Custom God Mode Mutations
  const updateStatsMutation = useMutation({
    mutationFn: async (updatedStats: any) => {
      const res = await fetch("/api/stats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedStats),
      });
      if (!res.ok) throw new Error("Failed to update stats");
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "God Mode Stats Override Saved! ⚡" });
    },
  });

  const deleteBadgeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/stats/badges/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete badge");
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Badge deleted" });
    },
  });

  const createProblemMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create problem");
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Problem added to roadmap!" });
    },
  });

  const updateProblemMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      const res = await fetch(`/api/problems/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update problem");
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Problem updated!" });
    },
  });

  const deleteProblemMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/problems/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete problem");
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Problem removed" });
    },
  });

  // God Mode One-Click Overrides
  const triggerMaxLevel = () => {
    updateStatsMutation.mutate({ level: 100, xp: 99999 });
    toast({ title: "⚡ GOD MODE: Max Level 100 & 99,999 XP Activated!" });
  };

  const triggerInfiniteStreak = () => {
    updateStatsMutation.mutate({ dailyStreak: 365 });
    toast({ title: "🔥 GOD MODE: 365-Day Legendary Streak Unlocked!" });
  };

  // --- SECTION CUSTOMIZERS FOR GOD MODE ---

  // 1. Dashboard Section Customizer
  const DashboardCustomizer = () => {
    const [name, setName] = useState(() => localStorage.getItem("custom_user_name") || "Srijan");
    const [motto, setMotto] = useState(() => localStorage.getItem("custom_hero_motto") || "Building The Top 0.1% Engineer Journey");

    const handleSave = () => {
      localStorage.setItem("custom_user_name", name);
      localStorage.setItem("custom_hero_motto", motto);
      window.dispatchEvent(new Event("profile-settings-changed"));
      toast({ title: "Dashboard Section Settings Saved! 🎨" });
    };

    return (
      <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-400"><LayoutDashboard className="w-5 h-5" /> Dashboard Section Customizer</CardTitle>
          <CardDescription>Configure hero welcome header, rank title banners and personal motto.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-cyan-300">User Welcome Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-cyan-300">Hero Motto Subtitle</label>
              <Input value={motto} onChange={(e) => setMotto(e.target.value)} />
            </div>
          </div>
          <Button size="sm" onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-500">Save Dashboard Section</Button>
        </CardContent>
      </Card>
    );
  };

  // 2. Study Planner & HUD Customizer
  const StudyPlannerCustomizer = () => {
    const [pace, setPace] = useState(() => localStorage.getItem("planner_pace") || "6 Days / Wk");
    const [startDate, setStartDate] = useState(() => localStorage.getItem("planner_start_date") || "2026-06-27");
    const [targetDate, setTargetDate] = useState(() => localStorage.getItem("planner_target_date") || "2026-09-18");
    const [sector, setSector] = useState(() => localStorage.getItem("custom_hud_sector") || "Phase 01: Core Architecture");
    const [gateway, setGateway] = useState(() => localStorage.getItem("custom_hud_gateway") || "Singly & Doubly LL");
    const [skillPayload, setSkillPayload] = useState(() => localStorage.getItem("custom_hud_skill_payload") || "Unlocks dynamic UI state engine & reactive DOM tree node synchronization.");

    const handleSave = () => {
      localStorage.setItem("planner_pace", pace);
      localStorage.setItem("planner_start_date", startDate);
      localStorage.setItem("planner_target_date", targetDate);
      localStorage.setItem("custom_hud_sector", sector);
      localStorage.setItem("custom_hud_gateway", gateway);
      localStorage.setItem("custom_hud_payload", skillPayload);
      localStorage.setItem("custom_hud_skill_payload", skillPayload);
      window.dispatchEvent(new Event("hud-settings-changed"));
      toast({ title: "Study Planner & HUD Telemetry Saved! 📚" });
    };

    return (
      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-950/20 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-400"><Calendar className="w-5 h-5" /> Study Planner & HUD Telemetry Matrix Controls</CardTitle>
          <CardDescription>Override HUD Telemetry matrix cards, study pace, start date and target completion dates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-purple-300">Pace Frequency</label>
              <Input value={pace} onChange={(e) => setPace(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-purple-300">Roadmap Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-purple-300">Target Completion Date</label>
              <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-white/10">
            <div>
              <label className="text-xs font-medium">HUD 01: Current Sector</label>
              <Input value={sector} onChange={(e) => setSector(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium">HUD 03: Skill Payload</label>
              <Input value={skillPayload} onChange={(e) => setSkillPayload(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium">HUD 04: Tactical Gateway</label>
              <Input value={gateway} onChange={(e) => setGateway(e.target.value)} />
            </div>
          </div>
          <Button size="sm" onClick={handleSave} className="bg-purple-600 hover:bg-purple-500">Save Study Planner & HUD</Button>
        </CardContent>
      </Card>
    );
  };

  // 3. Problem Matrix & Practice Engine Customizer
  const ProblemMatrixCustomizer = () => {
    const [lcTarget, setLcTarget] = useState(() => localStorage.getItem("target_lc_count") || "6");
    const [gfgTarget, setGfgTarget] = useState(() => localStorage.getItem("target_gfg_count") || "2");
    const [cwTarget, setCwTarget] = useState(() => localStorage.getItem("target_cw_count") || "4");
    const [hwTarget, setHwTarget] = useState(() => localStorage.getItem("target_hw_count") || "4");

    const handleSave = () => {
      localStorage.setItem("target_lc_count", lcTarget);
      localStorage.setItem("target_gfg_count", gfgTarget);
      localStorage.setItem("target_cw_count", cwTarget);
      localStorage.setItem("target_hw_count", hwTarget);
      toast({ title: "Problem Matrix Goals Saved! 💻" });
    };

    return (
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-400"><Target className="w-5 h-5" /> Problem Matrix Practice Engine Targets</CardTitle>
          <CardDescription>Override LeetCode, GFG, Classwork, and Homework solved target denominator numbers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-amber-300">LeetCode Goal Target</label>
              <Input type="number" value={lcTarget} onChange={(e) => setLcTarget(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-amber-300">GFG Goal Target</label>
              <Input type="number" value={gfgTarget} onChange={(e) => setGfgTarget(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-amber-300">Classwork Target Goal</label>
              <Input type="number" value={cwTarget} onChange={(e) => setCwTarget(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-amber-300">Homework Target Goal</label>
              <Input type="number" value={hwTarget} onChange={(e) => setHwTarget(e.target.value)} />
            </div>
          </div>
          <Button size="sm" onClick={handleSave} className="bg-amber-600 hover:bg-amber-500 text-black font-bold">Save Practice Targets</Button>
        </CardContent>
      </Card>
    );
  };

  // 4. Sigma 9 & Curriculum Tracks Customizer
  const CurriculumTracksCustomizer = () => {
    const [track1, setTrack1] = useState(() => localStorage.getItem("custom_track_1") || "Apna College - Sigma 9");
    const [track2, setTrack2] = useState(() => localStorage.getItem("custom_track_2") || "Coding Thinker - Java Roadmap");
    const [track3, setTrack3] = useState(() => localStorage.getItem("custom_track_3") || "Coding Thinker - MERN Stack");

    const handleSave = () => {
      localStorage.setItem("custom_track_1", track1);
      localStorage.setItem("custom_track_2", track2);
      localStorage.setItem("custom_track_3", track3);
      toast({ title: "Curriculum Track Titles Saved! 🎓" });
    };

    return (
      <Card className="border-rose-500/30 bg-gradient-to-br from-rose-950/20 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-rose-400"><GraduationCap className="w-5 h-5" /> Sigma 9 & Curriculum Tracks Customizer</CardTitle>
          <CardDescription>Configure learning roadmap track names and institution titles.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-rose-300">Track 01 Title</label>
              <Input value={track1} onChange={(e) => setTrack1(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-rose-300">Track 02 Title</label>
              <Input value={track2} onChange={(e) => setTrack2(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-rose-300">Track 03 Title</label>
              <Input value={track3} onChange={(e) => setTrack3(e.target.value)} />
            </div>
          </div>
          <Button size="sm" onClick={handleSave} className="bg-rose-600 hover:bg-rose-500">Save Curriculum Tracks</Button>
        </CardContent>
      </Card>
    );
  };

  // 5. Finances & Wealth Portfolio Customizer
  const FinancesCustomizer = () => {
    const [goal, setGoal] = useState(() => localStorage.getItem("finance_savings_goal") || "50000");
    const [curr, setCurr] = useState(() => localStorage.getItem("finance_currency") || "₹");
    const [earned, setEarned] = useState(() => localStorage.getItem("wealth_earned_override") || "");
    const [bank, setBank] = useState(() => localStorage.getItem("wealth_bank_savings") || "150000");
    const [creditBal, setCreditBal] = useState(() => localStorage.getItem("wealth_credit_balance") || "12500");
    const [creditLim, setCreditLim] = useState(() => localStorage.getItem("wealth_credit_limit") || "150000");
    const [creditDate, setCreditDate] = useState(() => localStorage.getItem("wealth_credit_due_date") || "15th of month");
    const [score, setScore] = useState(() => localStorage.getItem("wealth_credit_score") || "785");
    const [fdsVal, setFdsVal] = useState(() => localStorage.getItem("wealth_fds") || "200000");
    const [goldVal, setGoldVal] = useState(() => localStorage.getItem("wealth_gold") || "85000");
    const [silverVal, setSilverVal] = useState(() => localStorage.getItem("wealth_silver") || "35000");
    const [cashVal, setCashVal] = useState(() => localStorage.getItem("wealth_cash") || "15000");

    const handleSave = () => {
      localStorage.setItem("finance_savings_goal", goal);
      localStorage.setItem("finance_currency", curr);
      localStorage.setItem("wealth_earned_override", earned);
      localStorage.setItem("wealth_bank_savings", bank);
      localStorage.setItem("wealth_credit_balance", creditBal);
      localStorage.setItem("wealth_credit_limit", creditLim);
      localStorage.setItem("wealth_credit_due_date", creditDate);
      localStorage.setItem("wealth_credit_score", score);
      localStorage.setItem("wealth_fds", fdsVal);
      localStorage.setItem("wealth_gold", goldVal);
      localStorage.setItem("wealth_silver", silverVal);
      localStorage.setItem("wealth_cash", cashVal);

      window.dispatchEvent(new Event("wealth-settings-changed"));
      toast({ title: "Finances & Master Wealth Assets Saved! 🏛️" });
    };

    return (
      <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-400"><Wallet className="w-5 h-5" /> Finances & Master Wealth Assets Portfolio Customizer</CardTitle>
          <CardDescription>Omnipotent control panel over earned income, bank savings, credit card balances/limits, statement dates, credit scores, FDs, gold, silver, and physical cash.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-emerald-300">Earned This Month ({curr})</label>
              <Input value={earned} onChange={(e) => setEarned(e.target.value)} placeholder="Auto / Custom" />
            </div>
            <div>
              <label className="text-xs font-medium text-emerald-300">Total Bank Savings ({curr})</label>
              <Input type="number" value={bank} onChange={(e) => setBank(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-emerald-300">Currency Symbol (₹ / $)</label>
              <Select value={curr} onValueChange={setCurr}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="₹">₹ (INR)</SelectItem>
                  <SelectItem value="$">$ (USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-white/10">
            <div>
              <label className="text-xs font-medium text-rose-300">Credit Card Used Balance</label>
              <Input type="number" value={creditBal} onChange={(e) => setCreditBal(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-rose-300">Credit Card Total Limit</label>
              <Input type="number" value={creditLim} onChange={(e) => setCreditLim(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-rose-300">Credit Statement Due Date</label>
              <Input value={creditDate} onChange={(e) => setCreditDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2 border-t border-white/10">
            <div>
              <label className="text-xs font-medium text-sky-300">Credit Score (CIBIL)</label>
              <Input type="number" value={score} onChange={(e) => setScore(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-purple-300">Fixed Deposits (FDs)</label>
              <Input type="number" value={fdsVal} onChange={(e) => setFdsVal(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-amber-400">Gold Portfolio</label>
              <Input type="number" value={goldVal} onChange={(e) => setGoldVal(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300">Silver Portfolio</label>
              <Input type="number" value={silverVal} onChange={(e) => setSilverVal(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-emerald-400">Cash on Hand</label>
              <Input type="number" value={cashVal} onChange={(e) => setCashVal(e.target.value)} />
            </div>
          </div>
          <Button size="sm" onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 font-bold">Save All Wealth Portfolio Assets</Button>
        </CardContent>
      </Card>
    );
  };


  // --- Task Modals (Add / Edit) ---
  const TaskModal = ({ task }: { task?: any }) => {
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof taskSchema>>({
      resolver: zodResolver(taskSchema),
      defaultValues: {
        title: task?.title || "",
        description: task?.description || "",
        priority: task?.priority || "medium",
        status: task?.status || "pending",
        dueDate: task?.dueDate || format(new Date(), "yyyy-MM-dd"),
        tagId: task?.tagId ? String(task.tagId) : "",
      },
    });

    const onSubmit = (values: z.infer<typeof taskSchema>) => {
      const formatted = { ...values, tagId: values.tagId ? Number(values.tagId) : undefined };
      if (task) {
        updateTask.mutate({ id: task.id, data: formatted as any }, {
          onSuccess: () => { invalidateAll(); setOpen(false); toast({ title: "Task updated!" }); }
        });
      } else {
        createTask.mutate({ data: formatted as any }, {
          onSuccess: () => { invalidateAll(); setOpen(false); form.reset(); toast({ title: "Task created!" }); }
        });
      }
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {task ? (
            <Button variant="outline" size="sm" className="h-8 text-xs"><Edit3 className="w-3 h-3 mr-1" /> Edit</Button>
          ) : (
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> Add Task</Button>
          )}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Task title..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="Details..." {...field} /></FormControl></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem><FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="missed">Missed</SelectItem></SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
              <Button type="submit" className="w-full">{task ? "Save Changes" : "Create Task"}</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  };

  // --- Habit Modals (Add / Edit) ---
  const HabitModal = ({ habit }: { habit?: any }) => {
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof habitSchema>>({
      resolver: zodResolver(habitSchema),
      defaultValues: {
        name: habit?.name || "",
        description: habit?.description || "",
        color: habit?.color || "#FFB6C1",
        streak: habit?.streak ? String(habit.streak) : "0",
        level: habit?.level ? String(habit.level) : "1",
      },
    });

    const onSubmit = (values: z.infer<typeof habitSchema>) => {
      const formatted = {
        name: values.name,
        description: values.description,
        color: values.color,
        streak: values.streak ? Number(values.streak) : undefined,
        currentStreak: values.streak ? Number(values.streak) : undefined,
        level: values.level ? Number(values.level) : undefined,
      };
      if (habit) {
        updateHabit.mutate({ id: habit.id, data: formatted as any }, {
          onSuccess: () => { invalidateAll(); setOpen(false); toast({ title: "Habit updated!" }); }
        });
      } else {
        createHabit.mutate({ data: formatted as any }, {
          onSuccess: () => { invalidateAll(); setOpen(false); form.reset(); toast({ title: "Habit created!" }); }
        });
      }
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {habit ? (
            <Button variant="outline" size="sm" className="h-8 text-xs"><Edit3 className="w-3 h-3 mr-1" /> Edit</Button>
          ) : (
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> Add Habit</Button>
          )}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{habit ? "Edit Habit" : "Add Custom Habit"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Habit Name</FormLabel><FormControl><Input placeholder="e.g. Daily Meditation" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="Details..." {...field} /></FormControl></FormItem>
              )} />
              {habit && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="streak" render={({ field }) => (
                    <FormItem><FormLabel>Streak Days</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="level" render={({ field }) => (
                    <FormItem><FormLabel>Habit Level</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                </div>
              )}
              <Button type="submit" className="w-full">{habit ? "Save Changes" : "Create Habit"}</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  };

  // --- Finance Modals (Add / Edit) ---
  const FinanceModal = ({ entry }: { entry?: any }) => {
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof financeSchema>>({
      resolver: zodResolver(financeSchema),
      defaultValues: {
        type: entry?.type || "expense",
        amount: entry?.amount ? String(entry.amount) : "",
        category: entry?.category || "General",
        description: entry?.description || "",
        date: entry?.date || format(new Date(), "yyyy-MM-dd"),
      },
    });

    const onSubmit = (values: z.infer<typeof financeSchema>) => {
      if (entry) {
        updateFinance.mutate({ id: entry.id, data: values as any }, {
          onSuccess: () => { invalidateAll(); setOpen(false); toast({ title: "Entry updated!" }); }
        });
      } else {
        createFinance.mutate({ data: values as any }, {
          onSuccess: () => { invalidateAll(); setOpen(false); form.reset(); toast({ title: "Entry created!" }); }
        });
      }
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {entry ? (
            <Button variant="outline" size="sm" className="h-8 text-xs"><Edit3 className="w-3 h-3 mr-1" /> Edit</Button>
          ) : (
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> Add Entry</Button>
          )}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{entry ? "Edit Transaction" : "Record Financial Entry"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="Rent, Food, Salary..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
              )} />
              <Button type="submit" className="w-full">{entry ? "Save Changes" : "Add Entry"}</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  };

  // --- Problem Modals (Add / Edit) ---
  const ProblemModal = ({ problem }: { problem?: any }) => {
    const [open, setOpen] = useState(false);
    const form = useForm<z.infer<typeof problemSchema>>({
      resolver: zodResolver(problemSchema),
      defaultValues: {
        platform: problem?.platform || "leetcode",
        title: problem?.title || "",
        difficulty: problem?.difficulty || "Medium",
        category: problem?.category || "homework",
        status: problem?.status || "pending",
        url: problem?.url || "",
      },
    });

    const onSubmit = (values: z.infer<typeof problemSchema>) => {
      if (problem) {
        updateProblemMutation.mutate({ id: problem.id, ...values }, {
          onSuccess: () => { setOpen(false); }
        });
      } else {
        createProblemMutation.mutate(values, {
          onSuccess: () => { setOpen(false); form.reset(); }
        });
      }
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {problem ? (
            <Button variant="outline" size="sm" className="h-8 text-xs"><Edit3 className="w-3 h-3 mr-1" /> Edit</Button>
          ) : (
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> Add Assignment</Button>
          )}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{problem ? "Edit Problem Assignment" : "Add Roadmap Assignment"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="platform" render={({ field }) => (
                  <FormItem><FormLabel>Platform</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="leetcode">LeetCode</SelectItem><SelectItem value="gfg">GeeksforGeeks</SelectItem></SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="difficulty" render={({ field }) => (
                  <FormItem><FormLabel>Difficulty</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="Easy">Easy</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Hard">Hard</SelectItem></SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Problem Title</FormLabel><FormControl><Input placeholder="e.g. 3Sum..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem><FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="classwork">Classwork</SelectItem><SelectItem value="homework">Homework</SelectItem></SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="solved">Solved</SelectItem></SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <Button type="submit" className="w-full">{problem ? "Save Changes" : "Add Problem"}</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── GOD MODE HEADER BANNER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-950/60 via-slate-950 to-purple-950/60 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="border-amber-500 text-amber-400 bg-amber-500/10 px-3 py-1 text-xs font-black tracking-widest uppercase flex items-center gap-1.5 animate-pulse">
              <Zap className="w-3.5 h-3.5" /> GOD MODE ACTIVATED
            </Badge>
            <Badge variant="secondary" className="text-[10px] uppercase">Omnipotent Admin Power</Badge>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Crown className="w-8 h-8 text-amber-400" /> God Mode Command Center
          </h1>
          <p className="text-muted-foreground text-xs mt-1">High-precision multi-section control suite for dates, curriculum tracks, practice targets & telemetry.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={invalidateAll} className="border-white/10 hover:bg-white/10 text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" style={{ animationDuration: "8s" }} /> Sync System State
          </Button>
        </div>
      </div>

      {/* --- Quick Counters --- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-indigo-950/40 to-background border-indigo-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400"><Layers className="w-5 h-5" /></div>
            <div><p className="text-xs text-muted-foreground">Total Tasks</p><p className="text-xl font-bold">{Array.isArray(tasks) ? tasks.length : 0}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-950/40 to-background border-rose-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400"><Flame className="w-5 h-5" /></div>
            <div><p className="text-xs text-muted-foreground">Habits Tracked</p><p className="text-xl font-bold">{Array.isArray(habits) ? habits.length : 0}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-950/40 to-background border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400"><DollarSign className="w-5 h-5" /></div>
            <div><p className="text-xs text-muted-foreground">Transactions</p><p className="text-xl font-bold">{Array.isArray(finances) ? finances.length : 0}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-sky-950/40 to-background border-sky-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400"><BookOpen className="w-5 h-5" /></div>
            <div><p className="text-xs text-muted-foreground">DSA Problems</p><p className="text-xl font-bold">{Array.isArray(problems) ? problems.length : 0}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-950/40 to-background border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400"><Zap className="w-5 h-5" /></div>
            <div><p className="text-xs text-muted-foreground">Level / XP</p><p className="text-xl font-bold">Lv.{stats?.level || 1} ({stats?.xp || 0}xp)</p></div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-950/40 to-background border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400"><Award className="w-5 h-5" /></div>
            <div><p className="text-xs text-muted-foreground">Badges Unlocked</p><p className="text-xl font-bold">{Array.isArray(badges) ? badges.length : 0}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* --- Navigation Tabs --- */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 h-auto p-1 bg-secondary/50">
          <TabsTrigger value="godmode" className="text-xs py-2 text-amber-400 font-bold">⚡ God Mode Overrides</TabsTrigger>
          <TabsTrigger value="sections" className="text-xs py-2 text-cyan-400 font-bold">🎯 Multi-Section Suite</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs py-2">Tasks ({Array.isArray(tasks) ? tasks.length : 0})</TabsTrigger>
          <TabsTrigger value="habits" className="text-xs py-2">Habits ({Array.isArray(habits) ? habits.length : 0})</TabsTrigger>
          <TabsTrigger value="finances" className="text-xs py-2">Finances ({Array.isArray(finances) ? finances.length : 0})</TabsTrigger>
          <TabsTrigger value="problems" className="text-xs py-2">DSA Roadmap ({Array.isArray(problems) ? problems.length : 0})</TabsTrigger>
        </TabsList>

        {/* --- TAB 1: GOD MODE SYSTEM OVERRIDES --- */}
        <TabsContent value="godmode" className="space-y-6">
          <Card className="border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-400"><Sparkles className="w-5 h-5" /> Omnipotent One-Click Overrides</CardTitle>
              <CardDescription>Instant God Mode cheats and system parameter injections.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <Button onClick={triggerMaxLevel} className="h-14 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold flex items-center justify-center gap-2 shadow-lg hover:opacity-90">
                  <Crown className="w-5 h-5" /> Instant Level 100 & 99k XP
                </Button>
                <Button onClick={triggerInfiniteStreak} className="h-14 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-extrabold flex items-center justify-center gap-2 shadow-lg hover:opacity-90">
                  <Flame className="w-5 h-5" /> Set 365-Day Legendary Streak
                </Button>
                <Button onClick={() => updateStatsMutation.mutate({ level: 1, xp: 0, dailyStreak: 0 })} variant="outline" className="h-14 border-rose-500/40 text-rose-400 font-bold flex items-center justify-center gap-2 hover:bg-rose-500/10">
                  <RefreshCw className="w-4 h-4" /> Reset Stats to Beginner
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wrench className="w-5 h-5 text-indigo-400" /> Manual Gamification Parameter Injection</CardTitle>
              <CardDescription>Fine-tune individual level numbers, total XP, and habit counters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium">User Level Override</label>
                  <Input type="number" defaultValue={stats?.level || 1} onChange={(e) => updateStatsMutation.mutate({ level: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs font-medium">Total Experience Points (XP)</label>
                  <Input type="number" defaultValue={stats?.xp || 0} onChange={(e) => updateStatsMutation.mutate({ xp: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs font-medium">Active Daily Streak Days</label>
                  <Input type="number" defaultValue={stats?.dailyStreak || 0} onChange={(e) => updateStatsMutation.mutate({ dailyStreak: Number(e.target.value) })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 2: MULTI-SECTION MASTER SUITE --- */}
        <TabsContent value="sections" className="space-y-6">
          <DashboardCustomizer />
          <StudyPlannerCustomizer />
          <ProblemMatrixCustomizer />
          <CurriculumTracksCustomizer />
          <FinancesCustomizer />
        </TabsContent>

        {/* --- TAB 3: TASKS --- */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Tasks Management</CardTitle>
                <CardDescription>Create, edit, reschedule, or delete tasks across your platform.</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search tasks..." value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)} className="pl-8 h-9 text-xs" />
                </div>
                <TaskModal />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(tasks) && tasks.filter((t) => t.title.toLowerCase().includes(taskSearch.toLowerCase())).map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="text-xs text-muted-foreground">#{task.id}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate" title={task.title}>{task.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={task.priority === "high" ? "border-rose-500 text-rose-400" : task.priority === "medium" ? "border-amber-500 text-amber-400" : "border-slate-500"}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{task.dueDate ? format(new Date(task.dueDate + "T00:00:00"), "MMM d, yyyy") : "No date"}</TableCell>
                      <TableCell>
                        <Select value={task.status} onValueChange={(val: any) => updateTask.mutate({ id: task.id, data: { status: val } }, { onSuccess: () => invalidateAll() })}>
                          <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="missed">Missed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <TaskModal task={task} />
                          <Button variant="destructive" size="sm" className="h-8 w-8 p-0" onClick={() => deleteTask.mutate({ id: task.id }, { onSuccess: () => invalidateAll() })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 4: HABITS --- */}
        <TabsContent value="habits">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Habits Control Center</CardTitle>
                <CardDescription>Add new habits, modify level & streak numbers, or remove habits.</CardDescription>
              </div>
              <HabitModal />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Habit Name</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Current Streak</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(habits) && habits.map((habit) => (
                    <TableRow key={habit.id}>
                      <TableCell className="text-xs text-muted-foreground">#{habit.id}</TableCell>
                      <TableCell className="font-medium">{habit.name}</TableCell>
                      <TableCell><Badge variant="secondary">Level {habit.level || 1}</Badge></TableCell>
                      <TableCell className="font-bold text-amber-400">{habit.streak || 0} Days 🔥</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <HabitModal habit={habit} />
                          <Button variant="destructive" size="sm" className="h-8 w-8 p-0" onClick={() => deleteHabit.mutate({ id: habit.id }, { onSuccess: () => invalidateAll() })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 5: FINANCES --- */}
        <TabsContent value="finances">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Finances & Ledger Control</CardTitle>
                <CardDescription>Add transactions, edit amounts/categories, or remove entries.</CardDescription>
              </div>
              <FinanceModal />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(finances) && finances.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs text-muted-foreground">#{entry.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={entry.type === "income" ? "border-emerald-500 text-emerald-400" : "border-rose-500 text-rose-400"}>
                          {entry.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{entry.category}</TableCell>
                      <TableCell className={entry.type === "income" ? "font-bold text-emerald-400" : "font-bold text-rose-400"}>
                        {entry.type === "income" ? "+" : "-"}${Number(entry.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>{entry.date ? format(new Date(entry.date + "T00:00:00"), "MMM d, yyyy") : "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <FinanceModal entry={entry} />
                          <Button variant="destructive" size="sm" className="h-8 w-8 p-0" onClick={() => deleteFinance.mutate({ id: entry.id }, { onSuccess: () => invalidateAll() })}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- TAB 6: DSA ROADMAP --- */}
        <TabsContent value="problems">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>DSA Practice Roadmap Assignments</CardTitle>
                <CardDescription>Full CRUD over LeetCode & GeeksforGeeks roadmap problems.</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search problems..." value={problemSearch} onChange={(e) => setProblemSearch(e.target.value)} className="pl-8 h-9 text-xs" />
                </div>
                <ProblemModal />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Problem Title</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(problems) && problems.filter((p: any) => p.title.toLowerCase().includes(problemSearch.toLowerCase())).map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs text-muted-foreground">#{p.id}</TableCell>
                      <TableCell><Badge variant="secondary" className="uppercase text-[10px]">{p.platform}</Badge></TableCell>
                      <TableCell className="font-medium max-w-[180px] truncate" title={p.title}>{p.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={p.difficulty === "Easy" ? "border-emerald-500 text-emerald-400" : p.difficulty === "Medium" ? "border-[#FFD700] text-[#FFD700]" : "border-rose-500 text-rose-400"}>
                          {p.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize text-xs">{p.category}</TableCell>
                      <TableCell>
                        <Button 
                          variant={p.status === "solved" ? "default" : "outline"} 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={() => updateProblemMutation.mutate({ id: p.id, status: p.status === "solved" ? "pending" : "solved" })}
                        >
                          {p.status === "solved" ? <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" /> : <Clock className="w-3 h-3 mr-1" />}
                          {p.status === "solved" ? "Solved" : "Pending"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <ProblemModal problem={p} />
                          <Button variant="destructive" size="sm" className="h-8 w-8 p-0" onClick={() => deleteProblemMutation.mutate(p.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
