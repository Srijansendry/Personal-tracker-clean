import { createContext, useContext, useRef, useCallback } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  MotionValue,
} from "framer-motion";

// ─── Context ──────────────────────────────────────────────────────────────────
export const TiltCtx = createContext<{
  mx: MotionValue<number>;
  my: MotionValue<number>;
}>({} as any);

// ─── FloatDepth ───────────────────────────────────────────────────────────────
// Wrap any element so it translates opposite to the card tilt,
// appearing to hover above the surface at the given Z depth.
export function FloatDepth({
  children, depth = 10, className,
}: {
  children: React.ReactNode; depth?: number; className?: string;
}) {
  const { mx, my } = useContext(TiltCtx);
  const tx = useTransform(mx, [-100, 100], [depth * 0.35, -depth * 0.35]);
  const ty = useTransform(my, [-100, 100], [-depth * 0.35,  depth * 0.35]);
  return (
    <motion.div style={{ x: tx, y: ty, display: "inline-flex" }} className={className}>
      {children}
    </motion.div>
  );
}

// ─── TiltPanel ────────────────────────────────────────────────────────────────
// GPU-safe 3-D tilt with glare, rim light, and entry shimmer.
// Only transform properties animate — no box-shadow / paint triggers.
export function TiltPanel({
  children, className, style, delay = 0, glowColor = "rgba(255,182,193,0.45)",
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  glowColor?: string;
}) {
  const panelRef   = useRef<HTMLDivElement>(null);
  const glareRef   = useRef<HTMLDivElement>(null);
  const rimRef     = useRef<HTMLDivElement>(null);
  const shimmerRef = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const springCfg = { stiffness: 300, damping: 26, mass: 0.75 };
  const rotateX = useSpring(useTransform(my, [-100, 100], [11, -11]), springCfg);
  const rotateY = useSpring(useTransform(mx, [-100, 100], [-11, 11]), springCfg);
  const scale   = useSpring(1, { stiffness: 260, damping: 22 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width  / 2;
    const cy = e.clientY - rect.top  - rect.height / 2;
    mx.set(cx);
    my.set(cy);

    if (glareRef.current) {
      const gx = ((e.clientX - rect.left) / rect.width)  * 100;
      const gy = ((e.clientY - rect.top)  / rect.height) * 100;
      glareRef.current.style.background =
        `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.10) 0%, transparent 60%)`;
    }
    if (rimRef.current) {
      const angle = Math.atan2(cy, cx) * (180 / Math.PI) + 90;
      rimRef.current.style.background =
        `conic-gradient(from ${angle}deg, transparent 55%, ${glowColor} 70%, ${glowColor} 78%, transparent 93%)`;
    }
  }, [mx, my, glowColor]);

  const handleMouseEnter = useCallback(() => {
    scale.set(1.025);
    if (glareRef.current)  glareRef.current.style.opacity  = "1";
    if (rimRef.current)    rimRef.current.style.opacity    = "1";
    if (shimmerRef.current) {
      const el = shimmerRef.current;
      el.style.animation = "none";
      void el.offsetHeight;
      el.style.animation = "tilt-shimmer 0.55s ease-out forwards";
    }
  }, [scale]);

  const handleMouseLeave = useCallback(() => {
    mx.set(0);
    my.set(0);
    scale.set(1);
    if (glareRef.current) glareRef.current.style.opacity = "0";
    if (rimRef.current)   rimRef.current.style.opacity   = "0";
  }, [mx, my, scale]);

  return (
    <TiltCtx.Provider value={{ mx, my }}>
      <style>{`
        @keyframes tilt-shimmer {
          from { left: -60%; opacity: 1; }
          to   { left: 120%; opacity: 0; }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: "relative", borderRadius: 16, ...style }}
        className={className}
      >
        <motion.div
          ref={panelRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            rotateX, rotateY, scale,
            transformPerspective: 1000,
            transformStyle: "preserve-3d",
            borderRadius: 16,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {children}

          {/* Directional rim / edge light */}
          <div ref={rimRef} style={{
            position: "absolute", inset: -1, borderRadius: "inherit",
            opacity: 0, transition: "opacity 0.3s ease",
            pointerEvents: "none", zIndex: 20,
            padding: 1,
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }} />

          {/* Cursor glare */}
          <div ref={glareRef} style={{
            position: "absolute", inset: 0, borderRadius: "inherit",
            opacity: 0, transition: "opacity 0.25s ease",
            pointerEvents: "none", zIndex: 12,
          }} />

          {/* Entry shimmer sweep */}
          <div ref={shimmerRef} style={{
            position: "absolute", top: 0, left: "-60%",
            width: "45%", height: "100%",
            background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.07) 50%, transparent 70%)",
            transform: "skewX(-10deg)",
            pointerEvents: "none", zIndex: 13,
          }} />
        </motion.div>
      </motion.div>
    </TiltCtx.Provider>
  );
}
