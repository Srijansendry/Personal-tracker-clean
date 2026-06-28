import { useState, useEffect } from "react";
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
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Minimize2,
  Maximize2,
  Quote
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
  href: string; label: string; Icon: React.ElementType; isActive: boolean;
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.08)" }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer relative"
        style={{
          color: isActive ? "#ffffff" : "rgba(255,255,255,0.55)",
          background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
          border: isActive ? "1px solid rgba(255,255,255,0.15)" : "1px solid transparent",
        }}
      >
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
            style={{ background: "linear-[#FFB6C1]" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <Icon size={17} style={{ color: isActive ? "#FFB6C1" : "currentColor" }} />
        <span>{label}</span>
      </motion.div>
    </Link>
  );
}

const TOP_01_QUOTES = [
  { quote: "When something is important enough, you do it even if the odds are not in your favor.", author: "Elon Musk", role: "CEO, SpaceX & Tesla" },
  { quote: "If you get up in the morning and think the future is going to be better, it is a bright day.", author: "Elon Musk", role: "Founder, xAI" },
  { quote: "The only way to do great work is to love what you do. Stay hungry, stay foolish.", author: "Steve Jobs", role: "Co-Founder, Apple" },
  { quote: "I think one of my great advantages is that I have very low expectations, but extremely high aspirations.", author: "Jensen Huang", role: "CEO, NVIDIA" },
  { quote: "The biggest risk is not taking any risk. High-velocity execution and extreme focus win.", author: "Sam Altman", role: "CEO, OpenAI" },
  { quote: "Great things come from hard work and perseverance. No excuses.", author: "Kobe Bryant", role: "5x NBA Champion" },
  { quote: "If you are not stubborn, you will give up on experiments too soon.", author: "Jeff Bezos", role: "Founder, Amazon" },
  { quote: "When you innovate, you have got to be prepared for everyone telling you you are nuts.", author: "Larry Ellison", role: "Co-Founder, Oracle" },
  { quote: "Our industry does not respect tradition — it only respects innovation.", author: "Satya Nadella", role: "CEO, Microsoft" },
];

function Top01MotivationalWidget() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % TOP_01_QUOTES.length);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  const current = TOP_01_QUOTES[currentIndex];

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm pointer-events-auto">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          <motion.button
            key="minimized"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-xl border border-amber-500/30 bg-background/80 text-amber-300 hover:bg-amber-500/20 transition-all"
          >
            <Sparkles size={16} className="animate-pulse" />
            <span className="text-xs font-bold tracking-wide">Top 0.1% Wisdom</span>
            <Maximize2 size={12} className="ml-1 opacity-70" />
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="rounded-2xl p-5 shadow-2xl backdrop-blur-2xl border border-amber-500/20 bg-gradient-to-br from-slate-950/90 via-background/95 to-amber-950/30 relative overflow-hidden text-left"
          >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                <Sparkles size={12} className="text-amber-400 animate-spin" style={{ animationDuration: "6s" }} />
                <span className="text-[10px] font-black tracking-wider uppercase text-amber-300">Top 0.1% Visionary Mindset</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentIndex((prev) => (prev - 1 + TOP_01_QUOTES.length) % TOP_01_QUOTES.length)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                  title="Previous Quote"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setCurrentIndex((prev) => (prev + 1) % TOP_01_QUOTES.length)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                  title="Next Quote"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                  title="Minimize"
                >
                  <Minimize2 size={14} />
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
              >
                <p className="text-xs font-medium italic leading-relaxed text-slate-200">
                  "{current.quote}"
                </p>
                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-amber-400">— {current.author}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{current.role}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hudTitle, setHudTitle] = useState(() => localStorage.getItem("custom_hud_title") || "SRIJAN.OS");
  const [hudSubtitle, setHudSubtitle] = useState(() => localStorage.getItem("custom_hud_subtitle") || "FAANG Journey");
  const { data: stats } = useGetUserStats();

  useEffect(() => {
    const handleStorage = () => {
      setHudTitle(localStorage.getItem("custom_hud_title") || "SRIJAN.OS");
      setHudSubtitle(localStorage.getItem("custom_hud_subtitle") || "FAANG Journey");
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("hud-settings-changed", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("hud-settings-changed", handleStorage);
    };
  }, []);

  const level = stats?.level ?? 1;
  const rank = getRankInfo(level);

  const Sidebar = (
    <div
      className="flex flex-col h-full px-4 py-6"
      style={{
        background: "rgba(10,10,18,0.75)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Brand Header */}
      <div className="px-3 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-black"
            style={{ background: "linear-gradient(135deg, #FFB6C1, #C8A2C8)" }}
          >
            {hudTitle.charAt(0).toUpperCase()}
          </div>
          <span className="font-extrabold tracking-wider text-sm gradient-text-pink">
            {hudTitle}
          </span>
        </div>
        <p className="text-[10px] tracking-widest uppercase font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>
          {hudSubtitle}
        </p>
      </div>


      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
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

      {/* User Rank Card Footer */}
      <div className="pt-4 mt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div
          className="p-3 rounded-xl relative overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
              Current Rank
            </span>
            <span className="text-xs font-extrabold" style={{ color: rank.current.color }}>
              {rank.current.label}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white/70">Lv.{level}</span>
            {rank.next && (
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                Next: {rank.next.label} (Lv.{rank.next.minLevel})
              </span>
            )}
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
      <Top01MotivationalWidget />

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
          <span className="text-sm font-bold gradient-text-pink">{hudTitle}</span>
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

export const Layout = AppLayout;

