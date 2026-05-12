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

    const dpr = window.devicePixelRatio || 1;
    let particles: Particle[] = [];
    let raf = 0;
    let running = false;
    let width = 0;
    let height = 0;

    const buildParticles = () => {
      const isMobile = width < 768;
      const effectiveDensity = isMobile ? density * 0.35 : density;
      const min = isMobile ? 18 : 36;
      const max = isMobile ? 48 : 120;
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
      buildParticles();
    });

    const parent = canvas.parentElement;
    if (parent) ro.observe(parent);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
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

    const draw = () => {
      if (!running) return;
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

      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i];
          const b = all[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < effectiveLinkDist) {
            const alpha = 1 - dist / effectiveLinkDist;
            ctx.strokeStyle = color.replace(
              /rgba?\(([^)]+)\)/,
              (_m, inner) => {
                const parts = inner.split(",").map((s: string) => s.trim());
                const base = parts.slice(0, 3).join(", ");
                const baseAlpha = parts[3] ? parseFloat(parts[3]) : 1;
                return `rgba(${base}, ${(alpha * baseAlpha).toFixed(3)})`;
              },
            );
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      ctx.fillStyle = color;
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
          .requestIdleCallback(draw, { timeout: 600 });
      } else {
        setTimeout(draw, 100);
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
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

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
