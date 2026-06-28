import { useState, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import {
  useGetTaskSummary,
  useGetUserStats,
  useGetDailyQuote,
} from "@workspace/api-client-react";
import confetti from "canvas-confetti";
import { Flame, Zap, Target, TrendingUp, Quote, Star, ChevronRight } from "lucide-react";
import { TiltPanel, FloatDepth } from "@/components/tilt-panel";

// ─── Rank config ─────────────────────────────────────────────────────────────

const RANKS = [
  { label: "Beginner",        minLevel: 1,  color: "#E6E6FA" },
  { label: "Explorer",        minLevel: 3,  color: "#FFB6C1" },
  { label: "Builder",         minLevel: 6,  color: "#90EE90" },
  { label: "Engineer",        minLevel: 11, color: "#87CEEB" },
  { label: "Architect",       minLevel: 16, color: "#C8A2C8" },
  { label: "FAANG Candidate", minLevel: 21, color: "#FF8C69" },
  { label: "Top 1%",          minLevel: 31, color: "#C0C0C0" },
  { label: "Top 0.1%",        minLevel: 41, color: "#FFD700" },
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

// ─── Animated number counter ──────────────────────────────────────────────────

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
  value, max, color, size = 120, strokeWidth = 8, label, sublabel,
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
            stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - pct) }}
            transition={{ duration: 1.8, ease: "easeOut", delay: 0.3 }}
            style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <span className="text-2xl font-black" style={{ color }}>
            <AnimatedNumber value={value} />
          </span>
          {sublabel && (
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>/ {max}</span>
          )}
        </div>
      </div>
      <div className="text-xs font-semibold tracking-wider uppercase text-center"
        style={{ color: "rgba(255,255,255,0.5)" }}>
        {label}
      </div>
    </div>
  );
}

// ─── Shared glass surface ─────────────────────────────────────────────────────

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
};

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroText() {
  const words = ["Building", "The", "Top", "0.1%", "Engineer", "Journey"];
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-[13px] font-semibold tracking-[0.3em] uppercase mb-3"
        style={{ color: "rgba(255,182,193,0.7)" }}
      >
        ✦ Personal OS
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="font-black leading-[1.05] mb-3"
        style={{ fontSize: "clamp(2.8rem, 5vw, 4.5rem)" }}
      >
        <span style={{ color: "rgba(255,255,255,0.95)" }}>Welcome Back, </span>
        <span className="gradient-text-pink">Srijan</span>
      </motion.h1>
      <div className="flex flex-wrap gap-2 mb-1">
        {words.map((word, i) => (
          <motion.span
            key={word}
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.25 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            className={`text-xl font-bold ${word === "0.1%" ? "gradient-text-gold" : ""}`}
            style={{ color: word === "0.1%" ? undefined : "rgba(255,255,255,0.35)" }}
          >
            {word}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { data: taskSummary, isLoading: isTasksLoading } = useGetTaskSummary();
  const { data: userStats,   isLoading: isStatsLoading } = useGetUserStats();
  const { data: dailyQuote }                             = useGetDailyQuote();
  const [hasCelebrated, setHasCelebrated] = useState(false);

  useEffect(() => {
    if (userStats?.allTasksCompletedToday && !hasCelebrated) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 },
        colors: ["#FFB6C1", "#C8A2C8", "#E6E6FA"] });
      setHasCelebrated(true);
    }
  }, [userStats?.allTasksCompletedToday, hasCelebrated]);

  const level    = userStats?.level         ?? 1;
  const xp       = userStats?.xp            ?? 0;
  const xpToNext = userStats?.xpToNextLevel ?? 100;
  const streak   = userStats?.dailyStreak   ?? 0;
  const tasksDone  = taskSummary?.completed ?? 0;
  const tasksTotal = taskSummary?.total     ?? 0;
  const { current: rankInfo, next: nextRank } = getRankInfo(level);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">

      {/* ── Hero ── */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-8 justify-between pt-2">
        <HeroText />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="glass-pink rounded-2xl px-5 py-4 flex items-center gap-4 shrink-0"
          style={{ minWidth: 220 }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black"
            style={{
              background: `linear-gradient(135deg, ${rankInfo.color}30, ${rankInfo.color}10)`,
              border: `1px solid ${rankInfo.color}40`, color: rankInfo.color,
            }}>
            {level}
          </div>
          <div>
            <div className="text-[10px] tracking-[0.2em] uppercase mb-0.5"
              style={{ color: "rgba(255,255,255,0.35)" }}>Current Rank</div>
            <div className="font-bold text-sm" style={{ color: rankInfo.color }}>{rankInfo.label}</div>
            {nextRank && (
              <div className="text-[10px] flex items-center gap-1 mt-0.5"
                style={{ color: "rgba(255,255,255,0.3)" }}>
                Next: {nextRank.label} <ChevronRight size={8} />
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <TiltPanel delay={0.10} glowColor="rgba(255,182,193,0.55)">
          <div className="rounded-2xl p-5 h-full" style={GLASS}>
            <div className="flex items-center justify-between mb-4">
              <FloatDepth depth={14}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(255,182,193,0.12)", border: "1px solid rgba(255,182,193,0.22)" }}>
                  <Target size={16} style={{ color: "#FFB6C1" }} />
                </div>
              </FloatDepth>
              <span className="text-[10px] font-semibold tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.2)" }}>Today</span>
            </div>
            <FloatDepth depth={20}>
              <div className="text-4xl font-black mb-1" style={{ color: "rgba(255,255,255,0.95)" }}>
                {isTasksLoading ? "—" : (
                  <><AnimatedNumber value={tasksDone} />
                  <span className="text-xl" style={{ color: "rgba(255,255,255,0.3)" }}>/{tasksTotal}</span></>
                )}
              </div>
            </FloatDepth>
            <div className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>Tasks completed</div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #FFB6C1, #C8A2C8)" }}
                initial={{ width: "0%" }}
                animate={{ width: `${tasksTotal > 0 ? (tasksDone / tasksTotal) * 100 : 0}%` }}
                transition={{ duration: 1.5, delay: 0.4, ease: "easeOut" }} />
            </div>
          </div>
        </TiltPanel>

        <TiltPanel delay={0.18} glowColor="rgba(255,140,100,0.55)">
          <div className="rounded-2xl p-5 h-full" style={GLASS}>
            <div className="flex items-center justify-between mb-4">
              <FloatDepth depth={14}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(255,140,100,0.12)", border: "1px solid rgba(255,140,100,0.22)" }}>
                  <Flame size={16} style={{ color: "#FF8C69" }} />
                </div>
              </FloatDepth>
              <FloatDepth depth={10}>
                <motion.div animate={{ scale: [1, 1.18, 1] }} transition={{ duration: 2, repeat: Infinity }}
                  className="text-lg">🔥</motion.div>
              </FloatDepth>
            </div>
            <FloatDepth depth={20}>
              <div className="text-4xl font-black mb-1" style={{ color: "rgba(255,255,255,0.95)" }}>
                {isStatsLoading ? "—" : <AnimatedNumber value={streak} />}
              </div>
            </FloatDepth>
            <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Day streak</div>
            <div className="text-[11px] font-medium" style={{ color: "#FF8C69" }}>
              {streak > 0 ? "Keep it alive! 💪" : "Start today!"}
            </div>
          </div>
        </TiltPanel>

        <TiltPanel delay={0.26} glowColor="rgba(200,162,200,0.55)">
          <div className="rounded-2xl p-5 h-full" style={GLASS}>
            <div className="flex items-center justify-between mb-4">
              <FloatDepth depth={14}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(200,162,200,0.12)", border: "1px solid rgba(200,162,200,0.22)" }}>
                  <Zap size={16} style={{ color: "#C8A2C8" }} />
                </div>
              </FloatDepth>
              <span className="text-[10px] font-semibold tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.2)" }}>XP</span>
            </div>
            <FloatDepth depth={20}>
              <div className="text-4xl font-black mb-1" style={{ color: "rgba(255,255,255,0.95)" }}>
                {isStatsLoading ? "—" : <AnimatedNumber value={xp} />}
              </div>
            </FloatDepth>
            <div className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
              {xpToNext} XP to Level {level + 1}
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #C8A2C8, #E6E6FA)" }}
                initial={{ width: "0%" }}
                animate={{ width: `${Math.min(Math.max(0, 100 - xpToNext), 100)}%` }}
                transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }} />
            </div>
          </div>
        </TiltPanel>

        <TiltPanel delay={0.34} glowColor="rgba(230,230,250,0.45)">
          <div className="rounded-2xl p-5 h-full" style={GLASS}>
            <div className="flex items-center justify-between mb-4">
              <FloatDepth depth={14}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(230,230,250,0.1)", border: "1px solid rgba(230,230,250,0.2)" }}>
                  <Star size={16} style={{ color: "#E6E6FA" }} />
                </div>
              </FloatDepth>
              <span className="text-[10px] font-semibold tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.2)" }}>Level</span>
            </div>
            <FloatDepth depth={22}>
              <div className="text-4xl font-black mb-1" style={{ color: "rgba(255,255,255,0.95)" }}>
                {isStatsLoading ? "—" : <AnimatedNumber value={level} />}
              </div>
            </FloatDepth>
            <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Current level</div>
            <div className="text-[11px] font-bold" style={{ color: rankInfo.color }}>{rankInfo.label}</div>
          </div>
        </TiltPanel>
      </div>

      {/* ── RPG Progress ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        <TiltPanel delay={0.40} className="h-full" glowColor="rgba(255,182,193,0.35)">
          <div className="rounded-2xl p-6 h-full" style={GLASS}>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-5 rounded-full"
                style={{ background: "linear-gradient(180deg, #FFB6C1, #C8A2C8)" }} />
              <h2 className="text-sm font-bold tracking-wider uppercase"
                style={{ color: "rgba(255,255,255,0.6)" }}>Rank Progression</h2>
            </div>
            <div className="flex items-center justify-around gap-4">
              <RadialRing value={tasksDone} max={Math.max(tasksTotal, 1)} color="#FFB6C1" label="Tasks" sublabel="done" />
              <RadialRing value={streak} max={Math.max(streak + 2, 7)} color="#FF8C69" label="Streak" />
              <RadialRing value={100 - xpToNext} max={100} color="#C8A2C8" label="XP Bar" sublabel="xp" />
            </div>
            <div className="mt-6 space-y-2">
              {RANKS.slice(0, 5).map((rank) => {
                const isCurrent = rank.label === rankInfo.label;
                const isPast    = level >= rank.minLevel && !isCurrent;
                return (
                  <motion.div key={rank.label}
                    className="flex items-center gap-3"
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background: isPast || isCurrent ? rank.color : "rgba(255,255,255,0.1)",
                        boxShadow: isCurrent ? `0 0 8px ${rank.color}` : "none",
                      }} />
                    <div className="text-xs font-medium flex-1"
                      style={{ color: isCurrent ? rank.color : isPast ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)" }}>
                      {rank.label}
                    </div>
                    <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                      Lv. {rank.minLevel}+
                    </div>
                    {isCurrent && (
                      <motion.div
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${rank.color}20`, color: rank.color }}>
                        YOU
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </TiltPanel>

        <div className="flex flex-col gap-4">
          {dailyQuote && (
            <TiltPanel delay={0.45} glowColor="rgba(255,182,193,0.4)">
              <div className="rounded-2xl p-6" style={{
                background: "linear-gradient(135deg, rgba(255,182,193,0.08), rgba(200,162,200,0.05))",
                backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,182,193,0.15)", borderRadius: 16,
              }}>
                <FloatDepth depth={8}>
                  <Quote size={24} style={{ color: "rgba(255,182,193,0.4)", marginBottom: 12 }} />
                </FloatDepth>
                <p className="text-base font-medium leading-relaxed italic mb-3"
                  style={{ color: "rgba(255,255,255,0.8)" }}>"{dailyQuote.quote}"</p>
                <p className="text-xs font-semibold tracking-wider"
                  style={{ color: "rgba(255,182,193,0.6)" }}>— {dailyQuote.author}</p>
              </div>
            </TiltPanel>
          )}

          <TiltPanel delay={0.52} glowColor="rgba(200,162,200,0.4)">
            <div className="rounded-2xl p-5" style={GLASS}>
              <div className="flex items-center gap-2 mb-3">
                <FloatDepth depth={8}>
                  <TrendingUp size={14} style={{ color: "#FFB6C1" }} />
                </FloatDepth>
                <span className="text-xs font-bold tracking-wider uppercase"
                  style={{ color: "rgba(255,255,255,0.4)" }}>FAANG Target</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Levels Away", value: Math.max(0, 21 - level),             color: "#FFB6C1" },
                  { label: "Tasks Left",  value: Math.max(0, tasksTotal - tasksDone), color: "#C8A2C8" },
                  { label: "XP Needed",  value: Math.max(0, 2000 - xp),              color: "#E6E6FA" },
                ].map((stat) => (
                  <motion.div key={stat.label}
                    className="rounded-xl p-3 text-center"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                    whileHover={{ scale: 1.06 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}>
                    <FloatDepth depth={12}>
                      <div className="text-xl font-black mb-0.5" style={{ color: stat.color }}>
                        <AnimatedNumber value={stat.value} />
                      </div>
                    </FloatDepth>
                    <div className="text-[9px] uppercase tracking-wider"
                      style={{ color: "rgba(255,255,255,0.25)" }}>{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </TiltPanel>
        </div>
      </div>
    </div>
  );
}
