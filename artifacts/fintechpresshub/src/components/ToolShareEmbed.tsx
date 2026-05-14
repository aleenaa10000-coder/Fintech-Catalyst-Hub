import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, Link2, Code2 } from "lucide-react";
import {
  buildShareUrl,
  buildEmbedSnippet,
  SITE_ORIGIN,
} from "@/lib/toolShare";
import { trackEvent } from "@/lib/analytics";

type Props = {
  /**
   * Tool slug, used to build the canonical embed URL
   * (`/embed/:slug`). Must match the slug in `pages/tools/index.tsx`.
   */
  slug: string;
  /**
   * Current form state. Encoded into `?s=<base64url>` when the user
   * clicks Copy share link. Pass the full form even before generation —
   * recipients see the same starting point the sharer had.
   */
  state: unknown;
  /**
   * Recommended iframe height for this tool. Defaults to 900px which
   * fits all 10 tools without internal scroll on desktop.
   */
  embedHeight?: number;
};

/**
 * Universal share + embed footer rendered on every free tool page. Two
 * benefits in one:
 *
 *   • **Share link** — copies the current page URL with the form state
 *     encoded so recipients land on the exact same inputs.
 *   • **Embed** — copies a ready-to-paste iframe snippet pointing at
 *     `/embed/:slug`, providing a clean white-hat backlink hook
 *     (every embed displays a "Powered by FintechPressHub" attribution).
 *
 * Hidden on the `/embed/*` route itself to avoid recursion (the
 * EmbedShell strips the page chrome anyway).
 */
export function ToolShareEmbed({ slug, state, embedHeight }: Props) {
  const [copied, setCopied] = useState<"share" | "embed" | null>(null);
  const [showEmbed, setShowEmbed] = useState(false);

  // Suppress on the embed route itself.
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/embed/")) {
    return null;
  }

  const snippet = buildEmbedSnippet(slug, embedHeight);

  const copy = async (kind: "share" | "embed", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard blocked (Safari permissions, insecure context). Fall back
      // to selection so users can manually copy without the page breaking.
      return;
    }
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
    trackEvent(kind === "share" ? "Share Link Copied" : "Embed Snippet Copied", {
      tool: slug,
    });
  };

  return (
    <Card className="mt-8 border border-slate-100 shadow-sm" data-testid="tool-share-embed">
      <CardContent className="p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Share or embed this tool
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Send your inputs to a teammate or paste the tool into your own
              site. Both are free, no sign-up.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => copy("share", buildShareUrl(state))}
              data-testid="button-copy-share-link"
            >
              {copied === "share" ? (
                <>
                  <Check className="w-4 h-4 mr-1.5 text-green-600" />
                  Link copied
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-1.5" />
                  Copy share link
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowEmbed((v) => !v)}
              aria-expanded={showEmbed}
              data-testid="button-toggle-embed"
            >
              <Code2 className="w-4 h-4 mr-1.5" />
              {showEmbed ? "Hide embed" : "Embed on your site"}
            </Button>
          </div>
        </div>

        {showEmbed && (
          <div className="mt-4 space-y-2" data-testid="embed-snippet-panel">
            <p className="text-[11px] text-muted-foreground">
              Paste this iframe into any HTML page. The embed includes a small
              "Powered by FintechPressHub" link back to the tool.
            </p>
            <pre className="text-[11px] leading-relaxed bg-slate-50 border border-slate-200 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all font-mono">
              {snippet}
            </pre>
            <div className="flex items-center justify-between gap-2">
              <a
                href={`${SITE_ORIGIN}/embed/${slug}`}
                target="_blank"
                rel="noopener"
                className="text-[11px] text-blue-600 hover:underline"
              >
                Preview embed →
              </a>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copy("embed", snippet)}
                data-testid="button-copy-embed"
              >
                {copied === "embed" ? (
                  <>
                    <Check className="w-4 h-4 mr-1.5 text-green-600" />
                    Snippet copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1.5" />
                    Copy iframe
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
