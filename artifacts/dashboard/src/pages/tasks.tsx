import { useState } from "react";
import { useListTasks, getListTasksQueryKey, getGetTaskSummaryQueryKey, getGetUserStatsQueryKey, useCompleteTask, useDeleteTask, useCreateTask, useListTags } from "@workspace/api-client-react";
import { CheckCircle2, Circle, Clock, Plus, Trash2, CalendarIcon, Target } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { TiltPanel, FloatDepth } from "@/components/tilt-panel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function safeFormatDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const d = typeof raw === "string" && !raw.includes("T") ? parseISO(raw) : new Date(raw);
    return isValid(d) ? format(d, "MMM d, yyyy") : null;
  } catch {
    return null;
  }
}

const PRIORITY_CFG = {
  high:   { color: "#FF8C69", bg: "rgba(255,140,105,0.12)", border: "rgba(255,140,105,0.25)", label: "High" },
  medium: { color: "#FFD700", bg: "rgba(255,215,0,0.10)",   border: "rgba(255,215,0,0.22)",   label: "Med"  },
  low:    { color: "#90EE90", bg: "rgba(144,238,144,0.10)", border: "rgba(144,238,144,0.22)", label: "Low"  },
} as const;

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
};

export default function Tasks() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [tagId, setTagId] = useState<string>("");

  const { data: tasks = [], isLoading } = useListTasks();
  const { data: tags = [] } = useListTags();
  const createTask   = useCreateTask();
  const completeTask = useCompleteTask();
  const deleteTask   = useDeleteTask();
  const { toast }    = useToast();
  const queryClient  = useQueryClient();

  const invalidateAllRelated = () => {
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTaskSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetUserStatsQueryKey() });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createTask.mutate({
      data: {
        title: title.trim(),
        description: description || undefined,
        priority,
        dueDate: dueDate || undefined,
        tagId: tagId ? Number(tagId) : undefined,
      }
    }, {
      onSuccess: () => {
        invalidateAllRelated();
        toast({ title: "Task added!" });
        setIsOpen(false);
        setTitle("");
        setDescription("");
        setPriority("medium");
        setDueDate("");
        setTagId("");
      },
      onError: () => {
        toast({ title: "Failed to add task", variant: "destructive" });
      }
    });
  };

  const handleComplete = (id: number) => {
    completeTask.mutate({ id }, {
      onSuccess: () => {
        invalidateAllRelated();
        toast({ title: "Task completed! +10 XP 🎉" });
      },
      onError: () => {
        toast({ title: "Failed to complete task", variant: "destructive" });
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteTask.mutate({ id }, {
      onSuccess: () => {
        invalidateAllRelated();
        toast({ title: "Task deleted" });
      },
      onError: () => {
        toast({ title: "Failed to delete task", variant: "destructive" });
      },
    });
  };

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const pending   = safeTasks.filter((t) => t.status !== "completed");
  const completed = safeTasks.filter((t) => t.status === "completed");

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">

      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-[12px] font-semibold tracking-[0.25em] uppercase mb-1"
            style={{ color: "rgba(255,182,193,0.65)" }}>
            ✦ Task Manager
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="text-4xl font-black"
            style={{ color: "rgba(255,255,255,0.95)" }}>
            Tasks
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.35)" }}>
            {pending.length} pending · {completed.length} done
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
                background: "linear-gradient(135deg, rgba(255,182,193,0.18), rgba(200,162,200,0.12))",
                border: "1px solid rgba(255,182,193,0.3)",
                color: "#FFB6C1",
              }}>
              <Plus size={14} /> Add Task
            </motion.button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-[#1a1a24] text-white border-white/10">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Task title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FFB6C1] transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60">Description</label>
                <textarea
                  placeholder="Task description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FFB6C1] transition-colors h-20 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-[#20202d] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FFB6C1] transition-colors text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FFB6C1] transition-colors text-white"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60">Tag</label>
                <select
                  value={tagId}
                  onChange={(e) => setTagId(e.target.value)}
                  className="w-full bg-[#20202d] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FFB6C1] transition-colors text-white"
                >
                  <option value="">None</option>
                  {Array.isArray(tags) && tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
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
                  disabled={createTask.isPending}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-[#FFB6C1] to-[#C8A2C8] text-[#1a1a24] hover:opacity-90 transition-opacity"
                >
                  {createTask.isPending ? "Adding..." : "Add Task"}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="h-20 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }} />
          ))}
        </div>
      )}

      {/* ── Empty ── */}
      {!isLoading && safeTasks.length === 0 && (
        <TiltPanel glowColor="rgba(255,182,193,0.3)">
          <div className="rounded-2xl p-12 text-center flex flex-col items-center justify-center" style={GLASS}>
            <FloatDepth depth={16}>
              <Target size={44} style={{ color: "rgba(255,182,193,0.4)", margin: "0 auto 16px" }} />
            </FloatDepth>
            <p className="font-bold text-lg" style={{ color: "rgba(255,255,255,0.8)" }}>No tasks created yet.</p>
            <p className="text-sm mt-1 mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>Add your first task to start earning XP and leveling up!</p>
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, rgba(255,182,193,0.25), rgba(200,162,200,0.2))",
                border: "1px solid rgba(255,182,193,0.4)",
                color: "#FFB6C1",
              }}
            >
              <Plus size={16} /> Create Your First Task
            </button>
          </div>
        </TiltPanel>
      )}

      {/* ── Pending tasks ── */}
      {!isLoading && pending.length > 0 && (
        <div className="space-y-3">
          <div className="text-[11px] font-bold tracking-[0.2em] uppercase px-1"
            style={{ color: "rgba(255,255,255,0.25)" }}>Pending</div>
          <AnimatePresence mode="popLayout">
            {pending.map((task, i) => {
              const pri = task.priority ? PRIORITY_CFG[task.priority as keyof typeof PRIORITY_CFG] : null;
              return (
                <motion.div key={task.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, scale: 0.96 }}
                  transition={{ duration: 0.28, delay: i * 0.04 }}>
                  <TiltPanel delay={0} glowColor={pri?.color ? `${pri.color}55` : "rgba(255,182,193,0.4)"}>
                    <div className="rounded-2xl p-4 flex items-start gap-4" style={GLASS}>

                      {/* Check button */}
                      <button
                        onClick={() => handleComplete(task.id)}
                        disabled={completeTask.isPending}
                        className="mt-0.5 flex-shrink-0 transition-all duration-200"
                        style={{ color: "rgba(255,255,255,0.25)" }}>
                        <motion.div whileHover={{ scale: 1.2, color: "#FFB6C1" }}
                          whileTap={{ scale: 0.85 }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                          <Circle size={22} />
                        </motion.div>
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <FloatDepth depth={8}>
                            <h3 className="text-base font-semibold"
                              style={{ color: "rgba(255,255,255,0.9)" }}>
                              {task.title}
                            </h3>
                          </FloatDepth>
                          {pri && (
                            <FloatDepth depth={12}>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: pri.bg, border: `1px solid ${pri.border}`, color: pri.color }}>
                                {pri.label}
                              </span>
                            </FloatDepth>
                          )}
                          {task.tagName && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full"
                              style={{
                                background: `${task.tagColor || "#FFB6C1"}18`,
                                border: `1px solid ${task.tagColor || "#FFB6C1"}33`,
                                color: task.tagColor || "#FFB6C1",
                              }}>
                              {task.tagName}
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-sm line-clamp-1 mb-2"
                            style={{ color: "rgba(255,255,255,0.3)" }}>{task.description}</p>
                        )}

                        <div className="flex items-center gap-4 text-[11px]"
                          style={{ color: "rgba(255,255,255,0.25)" }}>
                          {task.dueDate && safeFormatDate(task.dueDate) && (
                            <span className="flex items-center gap-1">
                              <CalendarIcon size={10} />
                              {safeFormatDate(task.dueDate)}
                            </span>
                          )}
                          {task.dueTime && (
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {task.dueTime}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete */}
                      <motion.button
                        whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.88 }}
                        onClick={() => handleDelete(task.id)}
                        disabled={deleteTask.isPending}
                        className="flex-shrink-0 p-1.5 rounded-lg transition-colors"
                        style={{ color: "rgba(255,255,255,0.2)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#FF8C69")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}>
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                  </TiltPanel>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Completed tasks ── */}
      {!isLoading && completed.length > 0 && (
        <div className="space-y-3">
          <div className="text-[11px] font-bold tracking-[0.2em] uppercase px-1"
            style={{ color: "rgba(255,255,255,0.2)" }}>Completed</div>
          <AnimatePresence mode="popLayout">
            {completed.map((task, i) => (
              <motion.div key={task.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}>
                <TiltPanel delay={0} glowColor="rgba(144,238,144,0.3)">
                  <div className="rounded-2xl p-4 flex items-center gap-4"
                    style={{ ...GLASS, opacity: 0.55 }}>
                    <CheckCircle2 size={22} style={{ color: "#90EE90", flexShrink: 0 }} />
                    <span className="text-base font-medium line-through flex-1"
                      style={{ color: "rgba(255,255,255,0.4)" }}>{task.title}</span>
                    <motion.button
                      whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.88 }}
                      onClick={() => handleDelete(task.id)}
                      disabled={deleteTask.isPending}
                      style={{ color: "rgba(255,255,255,0.15)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#FF8C69")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.15)")}>
                      <Trash2 size={14} />
                    </motion.button>
                  </div>
                </TiltPanel>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
