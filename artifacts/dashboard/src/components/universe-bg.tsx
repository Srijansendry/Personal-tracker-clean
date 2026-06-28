import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/** Single canvas — 200 stars drawn via requestAnimationFrame, GPU-composited */
function StarCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let stars: { x: number; y: number; r: number; base: number; phase: number; speed: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const seed = () => {
      stars = Array.from({ length: 200 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 0.9 + 0.3,
        base: Math.random() * 0.45 + 0.1,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.4 + 0.15,
      }));
    };

    resize();
    seed();
    window.addEventListener("resize", () => { resize(); seed(); });

    const draw = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        const alpha = s.base + (s.base * 0.6) * Math.sin(t * s.speed * 0.001 + s.phase);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230,230,250,${alpha.toFixed(3)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}

/** Floating wireframe spheres — Framer Motion, mouse parallax */
function FloatingSphere({
  x, y, size, duration, delay, color, mouseX, mouseY, parallax,
}: {
  x: string; y: string; size: number; duration: number; delay: number;
  color: string; mouseX: ReturnType<typeof useSpring>;
  mouseY: ReturnType<typeof useSpring>; parallax: number;
}) {
  const tx = useTransform(mouseX, [-0.5, 0.5], [-parallax, parallax]);
  const ty = useTransform(mouseY, [-0.5, 0.5], [-parallax, parallax]);

  return (
    <motion.div
      style={{
        position: "absolute", left: x, top: y,
        width: size, height: size, borderRadius: "50%",
        border: `1px solid ${color}`, opacity: 0.06,
        translateX: tx, translateY: ty,
      }}
      animate={{ y: [0, -12, 0], rotate: [0, 360] }}
      transition={{
        y: { duration, delay, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: duration * 8, delay, repeat: Infinity, ease: "linear" },
      }}
    />
  );
}

/** Subtle perspective grid */
function PerspectiveGrid({
  mouseX, mouseY,
}: {
  mouseX: ReturnType<typeof useSpring>;
  mouseY: ReturnType<typeof useSpring>;
}) {
  const rx = useTransform(mouseY, [-0.5, 0.5], [5, -5]);
  const ry = useTransform(mouseX, [-0.5, 0.5], [-4, 4]);

  return (
    <motion.div
      style={{
        position: "absolute", inset: "-10%",
        backgroundImage: [
          "linear-gradient(rgba(255,182,193,0.018) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(255,182,193,0.018) 1px, transparent 1px)",
        ].join(","),
        backgroundSize: "64px 64px",
        rotateX: rx, rotateY: ry,
        transformPerspective: 1000,
        transformOrigin: "center center",
        willChange: "transform",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

/** Master background — canvas stars + Framer Motion parallax spheres */
export function UniverseBackground() {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mouseX = useSpring(rawX, { stiffness: 30, damping: 25, mass: 1.2 });
  const mouseY = useSpring(rawY, { stiffness: 30, damping: 25, mass: 1.2 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      rawX.set(e.clientX / window.innerWidth - 0.5);
      rawY.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [rawX, rawY]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 0,
        pointerEvents: "none", overflow: "hidden",
        background: "radial-gradient(circle at 50% 50%, #06060a 0%, #030305 100%)",
      }}
    >
      <StarCanvas />

      <FloatingSphere x="18%" y="15%" size={180} duration={6} delay={0}   color="#FFB6C1" mouseX={mouseX} mouseY={mouseY} parallax={24} />
      <FloatingSphere x="68%" y="60%" size={260} duration={8} delay={1.5} color="#C8A2C8" mouseX={mouseX} mouseY={mouseY} parallax={18} />
      <FloatingSphere x="30%" y="70%" size={140} duration={5} delay={0.8} color="#E6E6FA" mouseX={mouseX} mouseY={mouseY} parallax={30} />

      <PerspectiveGrid mouseX={mouseX} mouseY={mouseY} />
    </div>
  );
}

export function MouseGlowOverlay() {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let tx = -600, ty = -600;
    let ox = -600, oy = -600;
    let ix = -600, iy = -600;
    let raf: number;

    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };
    window.addEventListener("mousemove", onMove, { passive: true });

    const tick = () => {
      const dox = (tx - ox) * 0.08;
      const doy = (ty - oy) * 0.08;
      const dix = (tx - ix) * 0.15;
      const diy = (ty - iy) * 0.15;
      if (Math.abs(dox) > 0.01 || Math.abs(doy) > 0.01 || Math.abs(dix) > 0.01 || Math.abs(diy) > 0.01) {
        ox += dox; oy += doy;
        ix += dix; iy += diy;
        if (outerRef.current) outerRef.current.style.transform = `translate3d(${ox - 350}px,${oy - 350}px,0)`;
        if (innerRef.current) innerRef.current.style.transform = `translate3d(${ix - 150}px,${iy - 150}px,0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={outerRef} style={{
        position: "fixed", top: 0, left: 0,
        width: 700, height: 700, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,182,193,0.03) 0%, rgba(200,162,200,0.01) 45%, transparent 70%)",
        pointerEvents: "none", zIndex: 1, willChange: "transform",
      }} />
      <div ref={innerRef} style={{
        position: "fixed", top: 0, left: 0,
        width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,182,193,0.05) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 1, willChange: "transform",
      }} />
    </>
  );
}
