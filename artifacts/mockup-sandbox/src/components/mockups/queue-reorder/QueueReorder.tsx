import { useState, useRef } from "react";
import { GripVertical, Clock, RotateCcw, Save, CalendarClock, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Post = {
  id: number;
  title: string;
  author: string;
  category: string;
  scheduledAt: Date;
};

const seed: Post[] = [
  {
    id: 1,
    title: "How Open Banking Is Reshaping SME Lending in 2026",
    author: "Sarah Chen",
    category: "Open Banking",
    scheduledAt: new Date("2026-05-05T09:00:00"),
  },
  {
    id: 2,
    title: "DeFi Yield Strategies: Risk-Adjusted Returns for Institutional Players",
    author: "Marcus Webb",
    category: "DeFi",
    scheduledAt: new Date("2026-05-07T09:00:00"),
  },
  {
    id: 3,
    title: "Embedded Finance: The Race to Own the Customer Relationship",
    author: "Priya Nair",
    category: "Embedded Finance",
    scheduledAt: new Date("2026-05-09T09:00:00"),
  },
  {
    id: 4,
    title: "CBDC Pilots and the Future of Cross-Border Payments",
    author: "James Liu",
    category: "Payments",
    scheduledAt: new Date("2026-05-12T09:00:00"),
  },
  {
    id: 5,
    title: "AI Underwriting: Reducing Bias While Improving Accuracy",
    author: "Elena Torres",
    category: "InsurTech",
    scheduledAt: new Date("2026-05-14T09:00:00"),
  },
  {
    id: 6,
    title: "RegTech Compliance Automation: Lessons from Early Adopters",
    author: "David Osei",
    category: "RegTech",
    scheduledAt: new Date("2026-05-16T09:00:00"),
  },
];

function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function redistribute(items: Post[], originals: Post[]): Post[] {
  return items.map((item, i) => ({
    ...item,
    scheduledAt: new Date(originals[i].scheduledAt),
  }));
}

const categoryColors: Record<string, string> = {
  "Open Banking": "bg-blue-100 text-blue-700",
  DeFi: "bg-purple-100 text-purple-700",
  "Embedded Finance": "bg-cyan-100 text-cyan-700",
  Payments: "bg-green-100 text-green-700",
  InsurTech: "bg-orange-100 text-orange-700",
  RegTech: "bg-red-100 text-red-700",
};

export function QueueReorder() {
  const [posts, setPosts] = useState<Post[]>(seed);
  const [savedPosts, setSavedPosts] = useState<Post[]>(seed);
  const [undoSnapshot, setUndoSnapshot] = useState<Post[] | null>(null);

  const dragIdx = useRef<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const changedCount = posts.filter((p, i) => p.id !== savedPosts[i].id).length;
  const hasChanges = changedCount > 0;

  function onDragStart(idx: number) {
    dragIdx.current = idx;
    setDragging(true);
  }

  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setOverIdx(idx);
  }

  function onDrop(targetIdx: number) {
    const from = dragIdx.current;
    if (from === null || from === targetIdx) {
      setDragging(false);
      setOverIdx(null);
      return;
    }
    const reordered = [...posts];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(targetIdx, 0, moved);
    const withTimes = redistribute(reordered, seed);
    setPosts(withTimes);
    dragIdx.current = null;
    setDragging(false);
    setOverIdx(null);
  }

  function onDragEnd() {
    dragIdx.current = null;
    setDragging(false);
    setOverIdx(null);
  }

  function handleSave() {
    setUndoSnapshot(savedPosts);
    setSavedPosts(posts);
  }

  function handleUndo() {
    if (!undoSnapshot) return;
    setPosts(undoSnapshot);
    setSavedPosts(undoSnapshot);
    setUndoSnapshot(null);
  }

  function handleReset() {
    setPosts(savedPosts);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-slate-600" />
            <h2 className="text-base font-semibold text-slate-800">Scheduled Queue</h2>
            <Badge variant="secondary" className="text-xs">{posts.length} posts</Badge>
          </div>
          <div className="flex items-center gap-2">
            {undoSnapshot && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100"
                onClick={handleUndo}
              >
                <RotateCcw className="w-3 h-3" />
                Undo reorder
              </Button>
            )}
            {hasChanges && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground"
                onClick={handleReset}
              >
                Reset
              </Button>
            )}
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5"
              disabled={!hasChanges}
              onClick={handleSave}
            >
              <Save className="w-3 h-3" />
              Save order
              {hasChanges && (
                <span className="bg-white/20 rounded px-1 text-[10px] font-bold">{changedCount}</span>
              )}
            </Button>
          </div>
        </div>

        {/* Hint */}
        {!dragging && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 px-1">
            <ArrowUpDown className="w-3 h-3" />
            Drag rows to reorder — publish times reassign automatically
          </div>
        )}

        {/* Post list */}
        <div className="rounded-lg border bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
          {posts.map((post, idx) => {
            const orig = seed.find((s) => s.id === post.id)!;
            const origIdx = savedPosts.findIndex((s) => s.id === post.id);
            const moved = origIdx !== idx;
            const isDraggingThis = dragIdx.current === idx && dragging;
            const isOver = overIdx === idx && dragIdx.current !== idx;

            return (
              <div
                key={post.id}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDrop={() => onDrop(idx)}
                onDragEnd={onDragEnd}
                className={[
                  "flex items-center gap-3 px-3 py-3 transition-all select-none cursor-default",
                  isDraggingThis ? "opacity-40 bg-slate-50" : "bg-white hover:bg-slate-50/60",
                  isOver ? "border-t-2 border-blue-400" : "",
                ].join(" ")}
              >
                {/* Drag handle */}
                <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0">
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Slot number */}
                <div className="w-5 text-center text-xs font-mono text-muted-foreground shrink-0">
                  {idx + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-slate-800 truncate">{post.title}</p>
                    {moved && (
                      <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                        moved
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{post.author}</span>
                    <span>·</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${categoryColors[post.category] ?? "bg-gray-100 text-gray-600"}`}>
                      {post.category}
                    </span>
                  </div>
                </div>

                {/* Schedule info */}
                <div className="shrink-0 text-right">
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-700">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    {fmt(post.scheduledAt)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {fmtTime(post.scheduledAt)}
                    {post.scheduledAt.getTime() !== orig.scheduledAt.getTime() && (
                      <span className="ml-1 line-through text-muted-foreground/60">
                        {fmt(orig.scheduledAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="mt-3 text-xs text-muted-foreground text-center">
          Times are reassigned from the original slot schedule — no gaps, no collisions.
        </p>
      </div>
    </div>
  );
}
