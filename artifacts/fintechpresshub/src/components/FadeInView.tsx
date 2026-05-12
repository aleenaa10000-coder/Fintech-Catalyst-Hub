import { useRef, useEffect, useState, type ReactNode, type CSSProperties, type ElementType } from "react";

interface FadeInViewProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
  style?: CSSProperties;
}

/**
 * Fade-in-up animation on first intersection.
 *
 * Uses CSS custom-property-driven transform/opacity so the browser compositor
 * can handle the animation on the GPU layer — no layout reflow on every frame.
 * The element is promoted via `will-change: transform, opacity` only while the
 * animation is pending, then the hint is removed to free compositor memory.
 */
export function FadeInView({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
  style,
}: FadeInViewProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-60px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={visible ? `fade-in-up ${className}` : `fade-in-up-init ${className}`}
      style={
        visible && delay > 0
          ? { ...style, animationDelay: `${delay}ms` }
          : style
      }
    >
      {children}
    </Tag>
  );
}
