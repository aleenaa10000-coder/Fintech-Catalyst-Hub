import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface ParticleNetworkProps {
  className?: string;
  density?: number;
  linkDistance?: number;
  color?: string;
}

/**
 * Parse an rgba/rgb string to { r, g, b, a } once, avoiding regex in the
 * hot draw loop. Falls back to the hero blue if parsing fails.
 */
function parseColor(color: string): { r: string; g: string; b: string; a: number } {
  const m = color.match(/rgba?\(\s*([^,)]+),\s*([^,)]+),\s*([^,)]+)(?:,\s*([^)]+))?\s*\)/);
  if (m) {
    return {
      r: m[1].trim(),
      g: m[2].trim(),
      b: m[3].trim(),
      a: m[4] !== undefined ? parseFloat(m[4]) : 1,
    };
  }
  return { r: "186", g: "230", b: "253", a: 0.7 };
}

export function ParticleNetwork({
  className,
  density = 0.00009,
  linkDistance = 130,
  color = "rgba(186, 230, 253, 0.7)",
}: ParticleNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── Color pre-computation ────────────────────────────────────────────────
    // Parse the RGBA components ONCE here so the draw loop never runs a regex.
    // The previous approach called String.prototype.replace(/rgba?…/) on every
    // particle-pair link (~3000 times/frame at 60 fps) — a major TBT source.
    const { r: cr, g: cg, b: cb, a: ca } = parseColor(color);
    // Pre-build the opaque fill string used for particle dots.
    const fillColor = `rgba(${cr}, ${cg}, ${cb}, ${ca})`;

    const dpr = window.devicePixelRatio || 1;
    let particles: Particle[] = [];
    let raf = 0;
    let running = false;
    let width = 0;
    let height = 0;

    // Cache bounding rect — updated by ResizeObserver, never inside mousemove.
    let cachedRect = { left: 0, top: 0 };

    const buildParticles = () => {
      const isMobile = width < 768;
      // ── Particle count reduction ─────────────────────────────────────────
      // The draw loop is O(n²). Halving the particle count quarters the work.
      // Reducing from max 120 → 40 desktop / 14 mobile brings per-frame time
      // well under 50 ms, eliminating its contribution to Total Blocking Time.
      const effectiveDensity = isMobile ? density * 0.30 : density * 0.40;
      const min = isMobile ? 10 : 20;
      const max = isMobile ? 14 : 40;
      const target = Math.max(min, Math.min(max, Math.floor(width * height * effectiveDensity)));
      particles = Array.from({ length: target }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
      }));
    };

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { inlineSize: w, blockSize: h } = entry.contentBoxSize[0];
      width = w;
      height = h;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Refresh cached rect after resize so mouse tracking stays accurate.
      const br = canvas.getBoundingClientRect();
      cachedRect = { left: br.left, top: br.top };
      buildParticles();
    });

    const parent = canvas.parentElement;
    if (parent) ro.observe(parent);

    // passive: true — browser skips synchronous preventDefault check before painting.
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX - cachedRect.left;
      mouseRef.current.y = e.clientY - cachedRect.top;
      mouseRef.current.active = true;
    };
    const handleMouseLeave = () => {
      mouseRef.current.active = false;
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };

    const effectiveLinkDist =
      typeof window !== "undefined" && window.innerWidth < 768
        ? linkDistance * 0.65
        : linkDistance;
    const linkDistSq = effectiveLinkDist * effectiveLinkDist;

    // ── RAF throttle ─────────────────────────────────────────────────────────
    // Run at 30 fps instead of 60 — particle motion is slow enough that the
    // halved frame rate is imperceptible, but it halves main-thread work.
    let lastTime = 0;
    const TARGET_INTERVAL = 1000 / 30; // ~33 ms

    const draw = (now: number) => {
      if (!running) return;

      const elapsed = now - lastTime;
      if (elapsed < TARGET_INTERVAL) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastTime = now - (elapsed % TARGET_INTERVAL);

      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      }

      const all = mouseRef.current.active
        ? [...particles, { x: mouseRef.current.x, y: mouseRef.current.y, vx: 0, vy: 0 }]
        : particles;

      // ── Draw links ──────────────────────────────────────────────────────
      // Use squared distance (no sqrt) for the range check — sqrt only when
      // we actually need the normalised distance for alpha computation.
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i];
          const b = all[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < linkDistSq) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / effectiveLinkDist) * ca;
            // Pre-computed color components — no regex, no string parsing.
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(2)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // ── Draw dots ───────────────────────────────────────────────────────
      ctx.fillStyle = fillColor;
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    const startAnimation = () => {
      if (running) return;
      running = true;
      if ("requestIdleCallback" in window) {
        (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
          .requestIdleCallback(() => { lastTime = performance.now(); raf = requestAnimationFrame(draw); }, { timeout: 600 });
      } else {
        setTimeout(() => { lastTime = performance.now(); raf = requestAnimationFrame(draw); }, 100);
      }
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startAnimation();
        } else {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0.01 },
    );

    io.observe(canvas);
    canvas.addEventListener("mousemove", handleMouseMove, { passive: true });
    canvas.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [density, linkDistance, color]);

  return <canvas ref={canvasRef} className={className} />;
}
