import { useCallback, useState } from "react";
import { ListOrdered, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

export type TocHeading = { id: string; text: string; level: number };

type BlogPostTocProps = {
  items: TocHeading[];
  activeId: string | null;
};

const SCROLL_OFFSET_PX = 96;

function scrollToHeading(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET_PX;
  window.scrollTo({ top, behavior: "smooth" });
  if (typeof history !== "undefined" && typeof history.replaceState === "function") {
    history.replaceState(null, "", `#${id}`);
  }
}

function TocList({
  items,
  activeId,
  onItemClick,
}: BlogPostTocProps & { onItemClick?: (id: string) => void }) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      scrollToHeading(id);
      onItemClick?.(id);
    },
    [onItemClick],
  );

  return (
    <ul className="relative space-y-1 border-l border-slate-200">
      {items.map((h) => {
        const active = activeId === h.id;
        return (
          <li key={h.id} className="relative">
            {active ? (
              <span
                aria-hidden="true"
                className="absolute -left-px top-0 bottom-0 w-[2px] bg-[#0052FF] rounded-full transition-all duration-200"
              />
            ) : null}
            <a
              href={`#${h.id}`}
              onClick={(e) => handleClick(e, h.id)}
              data-active={active ? "true" : undefined}
              data-testid={`toc-link-${h.id}`}
              className={`relative block text-sm pl-4 py-1.5 transition-all duration-200 rounded-r ${
                h.level === 3 ? "pl-7 text-[13px]" : "font-medium"
              } ${
                active
                  ? "text-[#0052FF] font-semibold bg-[#0052FF]/5"
                  : "text-slate-600 hover:text-[#0052FF] hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                {active && h.level === 2 ? (
                  <span
                    aria-hidden="true"
                    className="inline-block w-1.5 h-1.5 rounded-full bg-[#0052FF] shrink-0"
                  />
                ) : null}
                <span className="truncate">{h.text}</span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function BlogPostToc({ items, activeId }: BlogPostTocProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  if (items.length === 0) return null;

  const activeIndex = Math.max(
    0,
    items.findIndex((h) => h.id === activeId),
  );
  const total = items.length;
  const progressPct =
    activeId && total > 0 ? Math.min(100, ((activeIndex + 1) / total) * 100) : 0;

  return (
    <>
      {/* Desktop sticky sidebar */}
      <aside
        className="hidden lg:block lg:col-span-1"
        data-testid="blog-toc-desktop"
      >
        <nav className="sticky top-24" aria-label="On this page">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <ListOrdered className="w-4 h-4" />
              On this page
            </div>
            {total > 0 ? (
              <span
                className="text-[10px] font-semibold text-slate-400 tabular-nums"
                aria-hidden="true"
              >
                {Math.min(activeIndex + 1, total)}/{total}
              </span>
            ) : null}
          </div>
          {/* Progress bar tracks position through the article */}
          <div
            className="relative h-[3px] w-full bg-slate-100 rounded-full mb-4 overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="absolute inset-y-0 left-0 bg-[#0052FF] transition-[width] duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <TocList items={items} activeId={activeId} />
        </nav>
      </aside>

      {/* Mobile floating action button + sheet */}
      <div className="lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open table of contents"
              data-testid="blog-toc-mobile-trigger"
              className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#0052FF] text-white px-4 py-3 shadow-lg shadow-[#0052FF]/30 hover:bg-[#0040CC] active:scale-95 transition-all"
            >
              <ListOrdered className="w-4 h-4" />
              <span className="text-sm font-semibold">On this page</span>
              {total > 0 ? (
                <span className="text-[11px] font-semibold tabular-nums opacity-80">
                  {Math.min(activeIndex + 1, total)}/{total}
                </span>
              ) : null}
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl max-h-[80vh] overflow-y-auto"
            data-testid="blog-toc-mobile-sheet"
          >
            <SheetHeader className="text-left flex-row items-center justify-between space-y-0 mb-2">
              <SheetTitle className="flex items-center gap-2 text-slate-900">
                <ListOrdered className="w-4 h-4 text-[#0052FF]" />
                On this page
              </SheetTitle>
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -mr-2"
                  aria-label="Close table of contents"
                >
                  <X className="w-4 h-4" />
                </Button>
              </SheetClose>
            </SheetHeader>
            <div
              className="relative h-[3px] w-full bg-slate-100 rounded-full mb-4 overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="absolute inset-y-0 left-0 bg-[#0052FF] transition-[width] duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <TocList
              items={items}
              activeId={activeId}
              onItemClick={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
