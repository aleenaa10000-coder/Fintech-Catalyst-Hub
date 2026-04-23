import { motion } from "framer-motion";
import { type ReactNode } from "react";
import { Mouse } from "lucide-react";

interface PageHeroProps {
  eyebrow?: string;
  title: ReactNode;
  description: ReactNode;
  children?: ReactNode;
  align?: "center" | "left";
  titleClassName?: string;
  descriptionClassName?: string;
  showScrollIndicator?: boolean;
}

export function PageHero({
  eyebrow,
  title,
  description,
  children,
  align = "center",
  titleClassName,
  descriptionClassName,
  showScrollIndicator = false,
}: PageHeroProps) {
  const alignClasses =
    align === "center"
      ? "text-center mx-auto items-center"
      : "text-left mx-0 items-start";

  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-[hsl(var(--primary))] text-primary-foreground">
      {/* Layered gradient */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(221_83%_45%)] to-[hsl(222_47%_18%)]"
      />

      {/* Subtle grid pattern */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse at 50% 40%, black 40%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 40%, black 40%, transparent 75%)",
        }}
      />

      {/* Soft glowing orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-[hsl(210_100%_70%)] opacity-25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 h-[32rem] w-[32rem] rounded-full bg-[hsl(265_85%_60%)] opacity-20 blur-3xl"
      />

      {/* Top highlight line */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
      />

      <div className="container relative mx-auto px-4 pt-32 pb-20 md:pt-40 md:pb-28">
        <div className={`flex max-w-4xl flex-col gap-6 ${alignClasses}`}>
          {eyebrow && (
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white/90 backdrop-blur"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(190_95%_70%)]" />
              {eyebrow}
            </motion.span>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className={
              titleClassName ??
              "text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-5xl lg:text-6xl"
            }
          >
            {title}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15 }}
            className={
              descriptionClassName ??
              "max-w-3xl text-lg leading-relaxed text-white/80 md:text-xl"
            }
          >
            {description}
          </motion.div>

          {children && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.25 }}
              className="mt-2"
            >
              {children}
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom curve fade into next section */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background/0"
      />

      {showScrollIndicator && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-1 text-white/70"
        >
          <Mouse className="h-6 w-6 animate-bounce" strokeWidth={1.75} />
          <span className="text-[10px] font-medium uppercase tracking-[0.2em]">
            Scroll
          </span>
        </motion.div>
      )}
    </section>
  );
}

export default PageHero;
