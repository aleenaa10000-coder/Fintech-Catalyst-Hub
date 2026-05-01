import { Skeleton } from "@/components/ui/skeleton";

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3 w-2/3 mt-3" />
      </div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <div className="bg-muted/30 py-24 px-6 flex flex-col items-center gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-12 w-3/4 max-w-xl" />
        <Skeleton className="h-12 w-2/4 max-w-md" />
        <Skeleton className="h-5 w-1/2 max-w-sm mt-2" />
        <div className="flex gap-3 mt-4">
          <Skeleton className="h-10 w-36 rounded-full" />
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>
      </div>

      {/* Trust logos strip */}
      <div className="border-y border-border/50 py-5 px-6 flex items-center justify-center gap-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-20" />
        ))}
      </div>

      {/* Stats row */}
      <div className="py-12 px-6 max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>

      {/* Blog card grid */}
      <div className="py-10 px-6 max-w-6xl mx-auto">
        <Skeleton className="h-7 w-40 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function BlogListSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Page hero */}
      <div className="bg-muted/30 py-16 px-6 flex flex-col items-center gap-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Search bar */}
        <div className="flex gap-3 mb-8">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="hidden lg:flex flex-col gap-4 w-52 shrink-0">
            <Skeleton className="h-5 w-24 mb-1" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
            <Skeleton className="h-5 w-24 mt-4 mb-1" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-16 rounded-full" />
              ))}
            </div>
          </div>

          {/* Post grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BlogPostSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex gap-2 items-center mb-6">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-4 w-4 rounded-none" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4 rounded-none" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Featured image */}
      <Skeleton className="h-64 sm:h-96 w-full rounded-xl mb-8" />

      {/* Meta row */}
      <div className="flex gap-4 mb-4">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20" />
      </div>

      <div className="flex gap-8">
        {/* Article content */}
        <div className="flex-1 space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-5/6" />
          <Skeleton className="h-5 w-full mt-4" />
          <Skeleton className="h-5 w-11/12" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />

          <div className="rounded-xl border border-border/50 p-4 my-6 space-y-2">
            <Skeleton className="h-5 w-36" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>

          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" style={{ width: `${85 + (i % 3) * 5}%` }} />
          ))}
        </div>

        {/* TOC sidebar */}
        <div className="hidden xl:flex flex-col gap-2 w-52 shrink-0 pt-2">
          <Skeleton className="h-4 w-24 mb-2" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4" style={{ width: `${60 + (i % 4) * 10}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AuthorSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Dark header */}
      <div className="bg-muted/40 py-16 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-8 items-center sm:items-start">
          <Skeleton className="h-32 w-32 rounded-full shrink-0" />
          <div className="flex-1 space-y-3 w-full">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-4/5 max-w-sm" />
            <div className="flex gap-3 mt-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-8 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 py-10 flex gap-8">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-32 mb-4" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="hidden lg:block w-64 shrink-0 space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>

      {/* Articles grid */}
      <div className="max-w-6xl mx-auto px-6 pb-12">
        <Skeleton className="h-7 w-32 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AuthorsListSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="bg-muted/30 py-16 px-6 flex flex-col items-center gap-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 p-6 flex flex-col items-center gap-3">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function GenericPageSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <div className="bg-muted/30 py-16 px-6 flex flex-col items-center gap-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>

      {/* Content blocks */}
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-4">
        <Skeleton className="h-7 w-48 mb-2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
        <Skeleton className="h-4 w-3/4" />

        <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 p-5 space-y-2">
              <Skeleton className="h-8 w-8 rounded-md mb-3" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
