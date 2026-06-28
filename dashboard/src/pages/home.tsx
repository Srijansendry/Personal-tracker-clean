import { useState, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  AnimatePresence,
} from "framer-motion";
import {
  useGetTaskSummary,
  useGetUserStats,
  useGetDailyQuote,
} from "@workspace/api-client-react";
import confetti from "canvas-confetti";
import { Flame, Zap, Target, Star, TrendingUp, ChevronRight, PenLine, Edit3 } from "lucide-react";
import { TiltPanel, FloatDepth } from "@/components/tilt-panel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";


// ─── Rank config ─────────────────────────────────────────────────────────────
const RANKS = [
  { label: "Beginner",        minLevel: 1,  color: "#c084fc" },
  { label: "Explorer",        minLevel: 3,  color: "#f472b6" },
  { label: "Builder",         minLevel: 6,  color: "#fb7185" },
  { label: "Engineer",        minLevel: 11, color: "#a78bfa" },
  { label: "Architect",       minLevel: 16, color: "#e879f9" },
  { label: "FAANG Candidate", minLevel: 21, color: "#f97316" },
  { label: "Top 1%",          minLevel: 31, color: "#d946ef" },
  { label: "Top 0.1%",        minLevel: 41, color: "#fbbf24" },
];

function getRankInfo(level: number) {
  let current = RANKS[0];
  let next: (typeof RANKS)[0] | null = RANKS[1];
  for (let i = 0; i < RANKS.length; i++) {
    if (level >= RANKS[i].minLevel) {
      current = RANKS[i];
      next = RANKS[i + 1] ?? null;
    }
  }
  return { current, next };
}

// ─── Animated number ──────────────────────────────────────────────────────────
function AnimatedNumber({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const count   = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const c = animate(count, value, { duration, ease: "easeOut" });
    const u = rounded.on("change", setDisplay);
    return () => { c.stop(); u(); };
  }, [value]);
  return <>{display}</>;
}

// ─── Radial ring ──────────────────────────────────────────────────────────────
function RadialRing({
  value, max, color, size = 116, strokeWidth = 8, label, sublabel,
}: {
  value: number; max: number; color: string; size?: number;
  strokeWidth?: number; label: string; sublabel?: string;
}) {
  const r    = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - pct) }}
            transition={{ duration: 1.8, ease: "easeOut", delay: 0.3 }}
            style={{ filter: `drop-shadow(0 0 10px ${color}90)` }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span className="text-2xl font-black" style={{ color }}>
            <AnimatedNumber value={value} />
          </span>
          {sublabel && (
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              /{max}
            </span>
          )}
        </div>
      </div>
      <div className="text-[10px] font-bold tracking-widest uppercase text-center"
        style={{ color: "rgba(255,255,255,0.4)" }}>
        {label}
      </div>
    </div>
  );
}

// ─── Glass surface ────────────────────────────────────────────────────────────
const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 18,
};

const GLASS_PINK: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(251,113,133,0.09), rgba(192,132,252,0.05))",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(251,113,133,0.18)",
  borderRadius: 18,
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const { data: taskSummary, isLoading: isTasksLoading } = useGetTaskSummary();
  const { data: userStats,   isLoading: isStatsLoading } = useGetUserStats();
  const { data: dailyQuote }                             = useGetDailyQuote();
  const [hasCelebrated, setHasCelebrated] = useState(false);

  // Profile customization state
  const [userName, setUserName] = useState(() => localStorage.getItem("custom_user_name") || "Srijan");
  const [heroMotto, setHeroMotto] = useState(() => localStorage.getItem("custom_hero_motto") || "Building The Top 0.1% Engineer Journey");

  useEffect(() => {
    const handleProfileUpdate = () => {
      setUserName(localStorage.getItem("custom_user_name") || "Srijan");
      setHeroMotto(localStorage.getItem("custom_hero_motto") || "Building The Top 0.1% Engineer Journey");
    };
    window.addEventListener("storage", handleProfileUpdate);
    window.addEventListener("profile-settings-changed", handleProfileUpdate);
    return () => {
      window.removeEventListener("storage", handleProfileUpdate);
      window.removeEventListener("profile-settings-changed", handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    if (userStats?.allTasksCompletedToday && !hasCelebrated) {
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.5 },
        colors: ["#f472b6", "#c084fc", "#e879f9", "#fbbf24"] });
      setHasCelebrated(true);
    }
  }, [userStats?.allTasksCompletedToday, hasCelebrated]);

  const level      = userStats?.level         ?? 1;
  const xp         = userStats?.xp            ?? 0;
  const xpToNext   = userStats?.xpToNextLevel ?? 100;
  const streak     = userStats?.dailyStreak   ?? 0;
  const tasksDone  = taskSummary?.completed   ?? 0;
  const tasksTotal = taskSummary?.total       ?? 0;
  const { current: rankInfo, next: nextRank } = getRankInfo(level);
  const taskProgress = tasksTotal > 0 ? tasksDone / tasksTotal : 0;
  const xpProgress   = Math.max(0, (100 - xpToNext) / 100);

  return (
    <div className="max-w-6xl mx-auto space-y-7 pb-14">

      {/* ── HERO ── */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-6 justify-between pt-2">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="flex items-center gap-2 mb-3"
          >
            <span className="text-xs" style={{ color: "rgba(251,113,133,0.7)" }}>✦</span>
            <span className="text-[11px] font-bold tracking-[0.28em] uppercase"
              style={{ color: "rgba(251,113,133,0.7)" }}>Personal OS</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="font-black leading-[1.04] tracking-tight mb-3"
            style={{ fontSize: "clamp(2.8rem, 5.5vw, 4.8rem)" }}
          >
            <span style={{ color: "rgba(255,255,255,0.93)" }}>Welcome Back, </span>
            <span style={{
              background: "linear-gradient(120deg, #fda4af 0%, #f472b6 45%, #e879f9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 28px rgba(244,114,182,0.45))",
            }}>{userName}</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap items-center gap-2 text-lg font-bold text-white/40"
          >
            {heroMotto}
          </motion.div>

        </div>

        {/* Rank card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="rounded-2xl px-5 py-4 flex items-center gap-4 shrink-0 relative overflow-hidden cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${rankInfo.color}18, ${rankInfo.color}07)`,
            border: `1px solid ${rankInfo.color}35`,
            boxShadow: `0 0 32px ${rankInfo.color}18`,
            minWidth: 220,
          }}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 0% 50%, ${rankInfo.color}12, transparent 65%)` }} />
          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl"
            style={{
              background: `${rankInfo.color}22`,
              border: `1px solid ${rankInfo.color}40`,
              color: rankInfo.color,
              boxShadow: `0 0 18px ${rankInfo.color}28`,
            }}>
            {level}
          </div>
          <div className="relative">
            <div className="text-[9px] tracking-[0.22em] uppercase font-bold mb-0.5"
              style={{ color: "rgba(255,255,255,0.3)" }}>Current Rank</div>
            <div className="text-sm font-black" style={{ color: rankInfo.color,
              textShadow: `0 0 14px ${rankInfo.color}70` }}>
              {rankInfo.label}
            </div>
            {nextRank && (
              <div className="text-[10px] flex items-center gap-1 mt-0.5"
                style={{ color: "rgba(255,255,255,0.25)" }}>
                Next: {nextRank.label} <ChevronRight size={8} />
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Tasks */}
        <TiltPanel delay={0.10} glowColor="rgba(244,114,182,0.5)">
          <div className="rounded-[18px] p-5 h-full relative overflow-hidden" style={GLASS}>
            <div className="absolute top-0 left-0 w-28 h-28 pointer-events-none"
              style={{ background: "radial-gradient(circle at 0% 0%, rgba(244,114,182,0.1), transparent 65%)" }} />
            <div className="flex items-center justify-between mb-4">
              <FloatDepth depth={12}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(244,114,182,0.14)", border: "1px solid rgba(244,114,182,0.24)" }}>
                  <Target size={15} style={{ color: "#f472b6" }} />
                </div>
              </FloatDepth>
              <span className="text-[9px] font-bold tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.2)" }}>Today</span>
            </div>
            <FloatDepth depth={18}>
              <div className="text-[2.6rem] font-black leading-none mb-1"
                style={{ color: "rgba(255,255,255,0.95)" }}>
                {isTasksLoading ? "—" : (
                  <>
                    <AnimatedNumber value={tasksDone} />
                    <span className="text-xl" style={{ color: "rgba(255,255,255,0.22)" }}>
                      /{tasksTotal}
                    </span>
                  </>
                )}
              </div>
            </FloatDepth>
            <div className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
              Tasks completed
            </div>
            <div className="h-[3px] rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #f472b6, #c084fc)" }}
                initial={{ width: "0%" }}
                animate={{ width: `${taskProgress * 100}%` }}
                transition={{ duration: 1.6, delay: 0.4, ease: "easeOut" }} />
            </div>
          </div>
        </TiltPanel>

        {/* Streak */}
        <TiltPanel delay={0.17} glowColor="rgba(251,146,60,0.5)">
          <div className="rounded-[18px] p-5 h-full relative overflow-hidden" style={GLASS}>
            <div className="absolute top-0 left-0 w-28 h-28 pointer-events-none"
              style={{ background: "radial-gradient(circle at 0% 0%, rgba(251,146,60,0.1), transparent 65%)" }} />
            <div className="flex items-center justify-between mb-4">
              <FloatDepth depth={12}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(251,146,60,0.14)", border: "1px solid rgba(251,146,60,0.24)" }}>
                  <Flame size={15} style={{ color: "#fb923c" }} />
                </div>
              </FloatDepth>
              <FloatDepth depth={8}>
                <motion.div animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }} className="text-lg">
                  🔥
                </motion.div>
              </FloatDepth>
            </div>
            <FloatDepth depth={18}>
              <div className="text-[2.6rem] font-black leading-none mb-1"
                style={{ color: "rgba(255,255,255,0.95)" }}>
                {isStatsLoading ? "—" : <AnimatedNumber value={streak} />}
              </div>
            </FloatDepth>
            <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              Day streak
            </div>
            <div className="text-[11px] font-semibold" style={{ color: "#fb923c" }}>
              {streak > 0 ? "Keep it alive! 💪" : "Start today!"}
            </div>
          </div>
        </TiltPanel>

        {/* XP */}
        <TiltPanel delay={0.24} glowColor="rgba(167,139,250,0.5)">
          <div className="rounded-[18px] p-5 h-full relative overflow-hidden" style={GLASS}>
            <div className="absolute top-0 left-0 w-28 h-28 pointer-events-none"
              style={{ background: "radial-gradient(circle at 0% 0%, rgba(167,139,250,0.1), transparent 65%)" }} />
            <div className="flex items-center justify-between mb-4">
              <FloatDepth depth={12}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(167,139,250,0.14)", border: "1px solid rgba(167,139,250,0.24)" }}>
                  <Zap size={15} style={{ color: "#a78bfa" }} />
                </div>
              </FloatDepth>
              <span className="text-[9px] font-bold tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.2)" }}>XP</span>
            </div>
            <FloatDepth depth={18}>
              <div className="text-[2.6rem] font-black leading-none mb-1"
                style={{ color: "rgba(255,255,255,0.95)" }}>
                {isStatsLoading ? "—" : <AnimatedNumber value={xp} />}
              </div>
            </FloatDepth>
            <div className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
              {xpToNext} XP to Level {level + 1}
            </div>
            <div className="h-[3px] rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #a78bfa, #e879f9)" }}
                initial={{ width: "0%" }}
                animate={{ width: `${xpProgress * 100}%` }}
                transition={{ duration: 1.6, delay: 0.5, ease: "easeOut" }} />
            </div>
          </div>
        </TiltPanel>

        {/* Level */}
        <TiltPanel delay={0.31} glowColor="rgba(232,121,249,0.45)">
          <div className="rounded-[18px] p-5 h-full relative overflow-hidden" style={GLASS}>
            <div className="absolute top-0 left-0 w-28 h-28 pointer-events-none"
              style={{ background: "radial-gradient(circle at 0% 0%, rgba(232,121,249,0.1), transparent 65%)" }} />
            <div className="flex items-center justify-between mb-4">
              <FloatDepth depth={12}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(232,121,249,0.14)", border: "1px solid rgba(232,121,249,0.24)" }}>
                  <Star size={15} style={{ color: "#e879f9" }} />
                </div>
              </FloatDepth>
              <span className="text-[9px] font-bold tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.2)" }}>Level</span>
            </div>
            <FloatDepth depth={18}>
              <div className="text-[2.6rem] font-black leading-none mb-1"
                style={{ color: "rgba(255,255,255,0.95)" }}>
                {isStatsLoading ? "—" : <AnimatedNumber value={level} />}
              </div>
            </FloatDepth>
            <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              Current level
            </div>
            <div className="text-[11px] font-bold" style={{ color: rankInfo.color }}>
              {rankInfo.label}
            </div>
          </div>
        </TiltPanel>
      </div>

      {/* ── LOWER ROW ── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Rank Progression */}
        <TiltPanel delay={0.38} className="h-full" glowColor="rgba(244,114,182,0.3)">
          <div className="rounded-[18px] p-6 h-full" style={GLASS}>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-5 rounded-full"
                style={{ background: "linear-gradient(180deg, #f472b6, #c084fc)" }} />
              <h2 className="text-[10px] font-black tracking-[0.2em] uppercase"
                style={{ color: "rgba(255,255,255,0.5)" }}>Rank Progression</h2>
            </div>

            <div className="flex items-center justify-around gap-2 mb-6">
              <RadialRing
                value={tasksDone} max={Math.max(tasksTotal, 1)}
                color="#f472b6" label="Tasks" sublabel="done"
              />
              <RadialRing
                value={streak} max={Math.max(streak + 2, 7)}
                color="#fb923c" label="Streak"
              />
              <RadialRing
                value={Math.round(xpProgress * 100)} max={100}
                color="#a78bfa" label="XP Bar" sublabel="xp"
              />
            </div>

            <div className="space-y-1.5">
              {RANKS.slice(0, 5).map((rank) => {
                const isCurrent = rank.label === rankInfo.label;
                const isPast    = level >= rank.minLevel && !isCurrent;
                return (
                  <motion.div
                    key={rank.label}
                    className="flex items-center gap-3 rounded-xl px-3 py-2"
                    style={{
                      background: isCurrent ? `${rank.color}0f` : "transparent",
                      border: isCurrent ? `1px solid ${rank.color}28` : "1px solid transparent",
                    }}
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 26 }}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background: isPast || isCurrent ? rank.color : "rgba(255,255,255,0.08)",
                        boxShadow: isCurrent ? `0 0 8px ${rank.color}90` : "none",
                      }} />
                    <div className="text-xs font-semibold flex-1"
                      style={{
                        color: isCurrent ? rank.color
                             : isPast ? "rgba(255,255,255,0.38)"
                             : "rgba(255,255,255,0.12)",
                      }}>
                      {rank.label}
                    </div>
                    <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.18)" }}>
                      Lv. {rank.minLevel}+
                    </div>
                    {isCurrent && (
                      <motion.div
                        animate={{ opacity: [1, 0.45, 1] }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                        className="text-[9px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: `${rank.color}20`, color: rank.color, border: `1px solid ${rank.color}38` }}
                      >
                        YOU
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </TiltPanel>

        {/* Right column */}
        <div className="flex flex-col gap-5">

          {/* Quote */}
          <AnimatePresence>
            {dailyQuote && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.44 }}
                className="rounded-[18px] p-6 flex-1 relative overflow-hidden"
                style={GLASS_PINK}
              >
                <div className="absolute top-4 right-5 pointer-events-none select-none"
                  style={{
                    fontSize: 72, lineHeight: 1,
                    color: "rgba(244,114,182,0.12)",
                    fontFamily: "Georgia, serif",
                    fontWeight: 900,
                  }}>
                  "
                </div>
                <div className="mb-3">
                  <span className="text-xl" style={{ color: "rgba(244,114,182,0.5)" }}>"</span>
                </div>
                <p className="text-[15px] font-medium leading-relaxed italic mb-4"
                  style={{ color: "rgba(255,255,255,0.8)" }}>
                  {dailyQuote.quote}
                </p>
                <p className="text-xs font-bold tracking-wide"
                  style={{ color: "rgba(244,114,182,0.65)" }}>
                  — {dailyQuote.author}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FAANG Target */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.52 }}
            className="rounded-[18px] p-5 relative overflow-hidden"
            style={GLASS}
          >
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 100% 100%, rgba(251,191,36,0.06), transparent 60%)" }} />
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={12} color="#f472b6" />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase"
                style={{ color: "rgba(255,255,255,0.35)" }}>FAANG Target</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Levels Away", value: Math.max(0, 21 - level),             color: "#f472b6" },
                { label: "Tasks Left",  value: Math.max(0, tasksTotal - tasksDone), color: "#a78bfa" },
                { label: "XP Needed",  value: Math.max(0, 2000 - xp),              color: "#e879f9" },
              ].map((s) => (
                <motion.div
                  key={s.label}
                  className="rounded-xl p-3 text-center"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                >
                  <div className="text-[1.4rem] font-black mb-0.5"
                    style={{ color: s.color, textShadow: `0 0 14px ${s.color}60` }}>
                    <AnimatedNumber value={s.value} />
                  </div>
                  <div className="text-[8px] uppercase tracking-wider"
                    style={{ color: "rgba(255,255,255,0.25)" }}>
                    {s.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
