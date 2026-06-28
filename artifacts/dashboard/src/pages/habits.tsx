import { useState } from "react";
import { useListHabits, useCheckHabit, useCreateHabit, useListTags, getListHabitsQueryKey, getGetUserStatsQueryKey, getListBadgesQueryKey } from "@workspace/api-client-react";
import { Plus, Flame, Star, Check, Zap } from "lucide-react";
import { motion } from "framer-motion";
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

export default function Habits() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("Flame");
  const [color, setColor] = useState("#FFB6C1");
  const [tagId, setTagId] = useState("");

  const { data: habits = [], isLoading } = useListHabits();
  const { data: tags = [] } = useListTags();
  const createHabit  = useCreateHabit();
  const checkHabit   = useCheckHabit();
  const { toast }    = useToast();
  const queryClient  = useQueryClient();

  const invalidateAllRelated = () => {
    queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetUserStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListBadgesQueryKey() });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createHabit.mutate({
      data: {
        name: name.trim(),
        description: description || undefined,
        icon: icon || undefined,
        color: color || undefined,
        tagId: tagId ? Number(tagId) : undefined,
      }
    }, {
      onSuccess: () => {
        invalidateAllRelated();
        toast({ title: "Habit created!" });
        setIsOpen(false);
        setName("");
        setDescription("");
        setIcon("Flame");
        setColor("#FFB6C1");
        setTagId("");
      },
      onError: () => {
        toast({ title: "Failed to create habit", variant: "destructive" });
      }
    });
  };

  const handleCheck = (id: number) => {
    checkHabit.mutate({ id }, {
      onSuccess: () => {
        invalidateAllRelated();
        toast({ title: "Habit checked! +5 XP 🔥" });
      },
      onError: () => {
        toast({ title: "Failed to check habit", variant: "destructive" });
      },
    });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">

      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-[12px] font-semibold tracking-[0.25em] uppercase mb-1"
            style={{ color: "rgba(255,182,193,0.65)" }}>
            ✦ Daily Rituals
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="text-4xl font-black"
            style={{ color: "rgba(255,255,255,0.95)" }}>
            Habits
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
            className="text-sm mt-1"
            style={{ color: "rgba(255,255,255,0.35)" }}>
            Build consistency, one day at a time.
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
              <Plus size={14} /> New Habit
            </motion.button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-[#1a1a24] text-white border-white/10">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">New Habit</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Habit name (e.g. Meditate)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FFB6C1] transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60">Description</label>
                <textarea
                  placeholder="Habit description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FFB6C1] transition-colors h-20 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60">Icon</label>
                  <select
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full bg-[#20202d] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FFB6C1] transition-colors text-white"
                  >
                    <option value="Flame">Flame</option>
                    <option value="Star">Star</option>
                    <option value="Zap">Zap</option>
                    <option value="BookOpen">Book Open</option>
                    <option value="Activity">Activity</option>
                    <option value="Droplet">Droplet</option>
                    <option value="Brain">Brain</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60">Color</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 h-9 cursor-pointer"
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
                  disabled={createHabit.isPending}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-[#FFB6C1] to-[#C8A2C8] text-[#1a1a24] hover:opacity-90 transition-opacity"
                >
                  {createHabit.isPending ? "Creating..." : "Create Habit"}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Loading skeleton ── */}
      {isLoading && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="h-52 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }} />
          ))}
        </div>
      )}

      {/* ── Empty ── */}
      {!isLoading && (!Array.isArray(habits) || habits.length === 0) && (
        <TiltPanel glowColor="rgba(255,182,193,0.3)">
          <div className="rounded-2xl p-12 text-center flex flex-col items-center justify-center" style={GLASS}>
            <FloatDepth depth={16}>
              <Flame size={44} style={{ color: "rgba(255,140,100,0.4)", margin: "0 auto 16px" }} />
            </FloatDepth>
            <p className="font-bold text-lg" style={{ color: "rgba(255,255,255,0.8)" }}>No habits tracked yet.</p>
            <p className="text-sm mt-1 mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>Build daily consistency and earn bonus XP every day!</p>
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, rgba(255,140,100,0.25), rgba(255,182,193,0.2))",
                border: "1px solid rgba(255,140,100,0.4)",
                color: "#FF8C69",
              }}
            >
              <Plus size={16} /> Create Your First Habit
            </button>
          </div>
        </TiltPanel>
      )}

      {/* ── Habit grid ── */}
      {!isLoading && Array.isArray(habits) && habits.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {habits.map((habit, i) => {
            const accentColor = habit.color || "#FFB6C1";
            const done        = habit.completedToday;

            return (
              <TiltPanel
                key={habit.id}
                delay={i * 0.07}
                glowColor={`${accentColor}55`}
              >
                <div className="rounded-2xl p-5 h-full flex flex-col" style={{
                  ...GLASS,
                  borderTop: `2px solid ${accentColor}40`,
                }}>

                  {/* Top row: name + streak/level badges */}
                  <div className="flex justify-between items-start mb-4 gap-3">
                    <div className="flex-1 min-w-0">
                      <FloatDepth depth={14}>
                        <div className="flex items-center gap-2 mb-1">
                          {habit.icon && (
                            <span className="text-xl">{habit.icon}</span>
                          )}
                          <h3 className="text-lg font-bold truncate"
                            style={{ color: "rgba(255,255,255,0.92)" }}>
                            {habit.name}
                          </h3>
                        </div>
                      </FloatDepth>
                      {habit.description && (
                        <p className="text-xs line-clamp-2"
                          style={{ color: "rgba(255,255,255,0.3)" }}>
                          {habit.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {/* Streak badge */}
                      <FloatDepth depth={18}>
                        <div className="flex items-center gap-1 rounded-full px-2.5 py-1"
                          style={{
                            background: "rgba(255,140,100,0.12)",
                            border: "1px solid rgba(255,140,100,0.25)",
                          }}>
                          <Flame size={12} style={{ color: "#FF8C69" }} />
                          <span className="text-sm font-black" style={{ color: "#FF8C69" }}>
                            {habit.streak}
                          </span>
                        </div>
                      </FloatDepth>
                      {/* Level badge */}
                      <FloatDepth depth={12}>
                        <div className="flex items-center gap-1 text-[11px] font-semibold"
                          style={{ color: accentColor }}>
                          <Star size={10} fill={accentColor} />
                          Lvl {habit.level}
                        </div>
                      </FloatDepth>
                    </div>
                  </div>

                  {/* XP bar */}
                  <div className="mb-4">
                    <div className="h-1 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.06)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}80)` }}
                        initial={{ width: "0%" }}
                        animate={{ width: `${Math.min(((habit.streak % 7) / 7) * 100, 100)}%` }}
                        transition={{ duration: 1.2, delay: i * 0.07 + 0.3, ease: "easeOut" }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                        {habit.streak % 7}/7 to next level
                      </span>
                      <Zap size={10} style={{ color: accentColor, opacity: 0.6 }} />
                    </div>
                  </div>

                  {/* Check-in button */}
                  <div className="mt-auto">
                    <motion.button
                      whileHover={!done ? { scale: 1.02 } : {}}
                      whileTap={!done ? { scale: 0.97 } : {}}
                      onClick={() => !done && handleCheck(habit.id)}
                      disabled={done || checkHabit.isPending}
                      className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
                      style={done ? {
                        background: "rgba(144,238,144,0.12)",
                        border: "1px solid rgba(144,238,144,0.3)",
                        color: "#90EE90",
                        cursor: "default",
                      } : {
                        background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}12)`,
                        border: `1px solid ${accentColor}40`,
                        color: accentColor,
                        cursor: "pointer",
                      }}>
                      {done ? (
                        <span className="flex items-center justify-center gap-2">
                          <Check size={14} /> Done for today
                        </span>
                      ) : "Check In"}
                    </motion.button>
                  </div>
                </div>
              </TiltPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
