import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decayRate: number;
  size: number;
  r: number; g: number; b: number;
  speed: number; // normalized 0–1 for brightness scaling
}

const PALETTE: [number, number, number][] = [
  [255, 182, 193],
  [200, 162, 200],
  [230, 230, 250],
  [255, 255, 255],
  [255, 150, 180],
];

export function CursorParticleSystem() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const particles  = useRef<Particle[]>([]);
  const mouse      = useRef({ x: -2000, y: -2000, px: -2000, py: -2000, active: false, speed: 0 });
  const rafRef     = useRef<number>(0);
  const lastSpawn  = useRef(0);
  const cursorScale = useRef(1);
  const cursorScaleTarget = useRef(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const onMouseMove = (e: MouseEvent) => {
      const m = mouse.current;
      const dx = e.clientX - m.x;
      const dy = e.clientY - m.y;
      const spd = Math.sqrt(dx * dx + dy * dy);
      m.px = m.x; m.py = m.y;
      m.x = e.clientX; m.y = e.clientY;
      m.active = true;
      // Normalize speed: 0 = still, 1 = very fast (>40px/frame)
      m.speed = Math.min(spd / 40, 1);

      const now = performance.now();
      // Spawn more particles the faster you move; skip if too slow
      const interval = m.speed > 0.5 ? 12 : m.speed > 0.2 ? 20 : 35;
      if (now - lastSpawn.current < interval) return;
      lastSpawn.current = now;

      // Count scales with speed (1–4 particles)
      const count = Math.max(1, Math.round(m.speed * 3.5));
      // Move direction for directional spray
      const moveAngle = Math.atan2(dy, dx);

      for (let i = 0; i < count; i++) {
        const [r, g, b] = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        // Directional spread: mostly behind the cursor, slightly fanned
        const spreadAngle = moveAngle + Math.PI + (Math.random() - 0.5) * 1.4;
        const spraySpd = m.speed * 2.5 * (0.4 + Math.random() * 0.6);
        particles.current.push({
          x: m.x + (Math.random() - 0.5) * 8,
          y: m.y + (Math.random() - 0.5) * 8,
          vx: Math.cos(spreadAngle) * spraySpd,
          vy: Math.sin(spreadAngle) * spraySpd,
          life: 1,
          decayRate: 0.018 + Math.random() * 0.024 - m.speed * 0.008,
          size: (Math.random() * 1.8 + 0.6) * (1 + m.speed * 0.5),
          r, g, b,
          speed: m.speed,
        });
      }

      if (particles.current.length > 140) {
        particles.current.splice(0, particles.current.length - 140);
      }
    };

    const onMouseLeave = () => { mouse.current.active = false; };
    const onMouseDown  = () => { cursorScaleTarget.current = 0.72; };
    const onMouseUp    = () => { cursorScaleTarget.current = 1; };

    window.addEventListener("mousemove",  onMouseMove,  { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("mousedown",  onMouseDown);
    window.addEventListener("mouseup",    onMouseUp);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Lerp cursor scale
      cursorScale.current += (cursorScaleTarget.current - cursorScale.current) * 0.14;

      const ps = particles.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life -= p.decayRate;
        if (p.life <= 0) { ps.splice(i, 1); continue; }

        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.04;
        p.vx *= 0.965;
        p.vy *= 0.965;

        const a = Math.max(0, p.life);
        // Faster particles get a brighter, slightly larger render
        const brightness = 1 + p.speed * 0.5;
        const radius = p.size * a * brightness;

        ctx.globalAlpha = a * 0.9;
        ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, radius), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // ── Cursor ring ──────────────────────────────────────────────────────
      const { x: cx, y: cy, active, speed } = mouse.current;
      if (active) {
        const s = cursorScale.current;
        // Outer ring expands slightly with speed
        const outerR = (18 + speed * 6) * s;

        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,182,193,${0.45 + speed * 0.35})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Inner dot
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5 * s, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.88)";
        ctx.fill();

        // Speed streak — a short line segment showing direction+magnitude
        if (speed > 0.15) {
          const { px, py } = mouse.current;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + (px - cx) * 0.6, cy + (py - cy) * 0.6);
          ctx.strokeStyle = `rgba(255,182,193,${speed * 0.5})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize",    resize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup",   onMouseUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 99999, pointerEvents: "none" }}
    />
  );
}
