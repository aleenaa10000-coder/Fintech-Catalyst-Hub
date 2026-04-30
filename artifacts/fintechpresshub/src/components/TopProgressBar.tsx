import { useEffect, useState } from "react";

/**
 * Indeterminate top-of-page progress bar shown while a lazy-loaded
 * route chunk is being fetched. Mounted as the Suspense fallback in
 * place of a centered spinner so the previous page stays visible
 * (no layout shift, no jarring blank state) and the user only sees
 * a thin animated bar at the very top — the same affordance used by
 * YouTube, GitHub, and Vercel for in-app navigation.
 *
 * The 100ms mount delay swallows sub-perceptible fetches (cached
 * chunks, fast networks) so the bar never flashes for instant loads.
 */
export function TopProgressBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 100);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden bg-primary/10"
      role="progressbar"
      aria-label="Loading page"
      aria-busy="true"
    >
      <div className="h-full w-1/3 animate-route-progress rounded-r-full bg-primary" />
    </div>
  );
}
