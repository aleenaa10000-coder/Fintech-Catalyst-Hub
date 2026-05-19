import { Router, type IRouter, type Request, type Response } from "express";
import { getSiteUrl } from "../lib/seo";

const router: IRouter = Router();

router.get("/__seo-debug", async (req: Request, res: Response) => {
  const targetPath = (req.query.path as string) || "/";
  const siteUrl = getSiteUrl();
  const targetUrl = `${siteUrl}${targetPath}`;

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        "User-Agent": "FintechPressHub-SEO-Debug/1.0",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    const html = await upstream.text();

    const jsonLdBlocks: unknown[] = [];
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        jsonLdBlocks.push(JSON.parse(match[1]));
      } catch {
        jsonLdBlocks.push({ _parseError: true, raw: match[1].slice(0, 200) });
      }
    }

    const metaTags: Record<string, string> = {};
    const metaRegex = /<meta\s+(?:[^>]*?\s)?(?:name|property)=["']([^"']+)["'][^>]*?\s+content=["']([^"']*)["'][^>]*?>/gi;
    while ((match = metaRegex.exec(html)) !== null) {
      metaTags[match[1]] = match[2];
    }
    const metaRegex2 = /<meta\s+(?:[^>]*?\s)?content=["']([^"']*)["'][^>]*?\s+(?:name|property)=["']([^"']+)["'][^>]*?>/gi;
    while ((match = metaRegex2.exec(html)) !== null) {
      metaTags[match[2]] = match[1];
    }

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/&amp;/g, "&").replace(/&#x27;/g, "'") : null;

    const hreflangLinks: Array<{ lang: string; href: string }> = [];
    const hreflangRegex = /<link[^>]+rel=["']alternate["'][^>]+hreflang=["']([^"']+)["'][^>]+href=["']([^"']+)["'][^>]*>/gi;
    while ((match = hreflangRegex.exec(html)) !== null) {
      hreflangLinks.push({ lang: match[1], href: match[2] });
    }
    const hreflangRegex2 = /<link[^>]+hreflang=["']([^"']+)["'][^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["'][^>]*>/gi;
    while ((match = hreflangRegex2.exec(html)) !== null) {
      hreflangLinks.push({ lang: match[1], href: match[2] });
    }

    const responseHeaders: Record<string, string | string[]> = {};
    upstream.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i)
      || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i);

    res.json({
      url: targetUrl,
      path: targetPath,
      httpStatus: upstream.status,
      title,
      canonical: canonicalMatch ? canonicalMatch[1] : null,
      metaTags,
      hreflangLinks,
      jsonLdBlocks,
      responseHeaders: {
        "content-type": responseHeaders["content-type"],
        "x-robots-tag": responseHeaders["x-robots-tag"],
        "last-modified": responseHeaders["last-modified"],
        "cache-control": responseHeaders["cache-control"],
        link: responseHeaders["link"],
        "strict-transport-security": responseHeaders["strict-transport-security"],
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err, targetUrl }, "seo-debug: failed to fetch target URL");
    res.status(500).json({
      error: "Failed to fetch target URL",
      url: targetUrl,
    });
  }
});

export default router;
