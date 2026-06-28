import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  CheckSquare,
  Activity,
  Wallet,
  Shield,
  FileText,
  Tag,
  Award,
  Menu,
  X,
  Zap,
  BookOpen,
  NotebookPen,
} from "lucide-react";
import { UniverseBackground, MouseGlowOverlay } from "./universe-bg";
import { CursorParticleSystem } from "./cursor-effects";
import { useGetUserStats } from "@workspace/api-client-react";

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

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planner", label: "Study Planner", icon: BookOpen },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/habits", label: "Habits", icon: Activity },
  { href: "/finances", label: "Finances", icon: Wallet },
  { href: "/pdf-import", label: "PDF Import", icon: FileText },
  { href: "/notes", label: "Notes & Problems", icon: NotebookPen },
  { href: "/tags", label: "Tags", icon: Tag },
  { href: "/badges", label: "Badges", icon: Award },
  { href: "/admin", label: "Admin", icon: Shield },
];

function NavItem({ href, label, Icon, isActive }: {
  href: string;
  label: string;
  Icon: any;
  isActive: boolean;
}) {
  return (
    <Link href={href}>
      <motion.div
        className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer select-none"
        whileHover={{ x: 4 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {isActive && (
          <motion.div
            layoutId="nav-active"
            className="absolute inset-0 rounded-xl"
            style={{
              background: "linear-gradient(135deg, rgba(255,182,193,0.15), rgba(200,162,200,0.1))",
              border: "1px solid rgba(255,182,193,0.25)",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <div
          className="relative z-10 flex items-center justify-center w-8 h-8 rounded-lg"
          style={{
            background: isActive
              ? "linear-gradient(135deg, rgba(255,182,193,0.3), rgba(200,162,200,0.2))"
              : "transparent",
          }}
        >
          <Icon
            size={16}
            style={{ color: isActive ? "#FFB6C1" : "rgba(255,255,255,0.4)" }}
          />
        </div>
        <span
          className="relative z-10 text-sm font-medium"
          style={{ color: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.4)" }}
        >
          {label}
        </span>
        {isActive && (
          <motion.div
            className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
            style={{ background: "#FFB6C1" }}
            animate={{ opacity: [1, 0.4, 1], scale: [1, 0.8, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.div>
    </Link>
  );
}


export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: userStats } = useGetUserStats();
  const level = userStats?.level ?? 1;
  const xp = userStats?.xp ?? 0;
  const xpToNext = userStats?.xpToNextLevel ?? 100;
  const { current: rankInfo, next: nextRank } = getRankInfo(level);
  const xpProgressPct = Math.min(Math.max(0, 100 - xpToNext), 100);

  const Sidebar = (
    <div
      className="flex flex-col h-full"
      style={{
        background: "rgba(5,5,8,0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{
            background: "linear-gradient(135deg, #FFB6C1, #C8A2C8)",
            boxShadow: "0 0 20px rgba(255,182,193,0.4)",
          }}
        >
          <Zap size={16} color="#fff" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-widest gradient-text-pink">SRIJAN.OS</div>
          <div className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>
            FAANG Journey
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            Icon={item.icon}
            isActive={location === item.href}
          />
        ))}
      </nav>

      {/* Bottom rank card */}
      <div className="px-4 pb-6 pt-3">
        <div
          className="rounded-xl p-3"
          style={{
            background: "linear-gradient(135deg, rgba(255,182,193,0.08), rgba(200,162,200,0.08))",
            border: "1px solid rgba(255,182,193,0.15)",
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Award size={12} style={{ color: "#FFB6C1" }} />
            <span className="text-[10px] font-semibold tracking-[0.15em] uppercase" style={{ color: "#FFB6C1" }}>
              Current Rank
            </span>
          </div>
          <div className="text-sm font-bold" style={{ color: rankInfo.color }}>
            {rankInfo.label}
          </div>
          <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${rankInfo.color}, #C8A2C8)` }}
              initial={{ width: "0%" }}
              animate={{ width: `${xpProgressPct}%` }}
              transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
            {nextRank ? `Lv.${level} → ${nextRank.label}` : `Max Rank`}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ position: "relative", minHeight: "100vh", display: "flex" }}>
      <UniverseBackground />
      <MouseGlowOverlay />
      <CursorParticleSystem />

      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col"
        style={{ width: 220, minWidth: 220, position: "relative", zIndex: 10, flexShrink: 0 }}
      >
        {Sidebar}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 h-full z-50"
              style={{ width: 240 }}
            >
              {Sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 relative z-10">
        {/* Mobile top bar */}
        <div
          className="flex md:hidden items-center gap-3 px-4 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <span className="text-sm font-bold gradient-text-pink">SRIJAN.OS</span>
        </div>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ padding: "2rem 2.5rem" }}
        >
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
