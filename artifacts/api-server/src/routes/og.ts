import { Router, type IRouter } from "express";
import sharp from "sharp";

const router: IRouter = Router();

const WIDTH = 1200;
const HEIGHT = 630;
const TITLE_FONT_SIZE = 64;
const TITLE_LINE_HEIGHT = 78;
const TITLE_MAX_CHARS_PER_LINE = 28;
const TITLE_MAX_LINES = 4;

const CACHE_MAX = 200;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
type CacheEntry = { buf: Buffer; createdAt: number };
const cache = new Map<string, CacheEntry>();

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    } else {
      current = candidate;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (lines.length === maxLines) {
    const joined = lines.join(" ").split(/\s+/);
    const remainingWords = words.slice(joined.length);
    if (remainingWords.length > 0) {
      const last = lines[lines.length - 1];
      const trimmed =
        last.length > maxChars - 1
          ? last.slice(0, maxChars - 1).replace(/\s+\S*$/, "")
          : last;
      lines[lines.length - 1] = `${trimmed}…`;
    }
  }

  return lines;
}

function buildSvg({
  title,
  category,
}: {
  title: string;
  category: string;
}): string {
  const safeCategory = escapeXml(category.toUpperCase().slice(0, 40));
  const lines = wrapText(title, TITLE_MAX_CHARS_PER_LINE, TITLE_MAX_LINES);

  const titleStartY = 360 - ((lines.length - 1) * TITLE_LINE_HEIGHT) / 2;

  const titleTspans = lines
    .map((line, i) => {
      const y = titleStartY + i * TITLE_LINE_HEIGHT;
      return `<tspan x="80" y="${y}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#001F3F"/>
      <stop offset="1" stop-color="#0A2B5C"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.15" r="0.7">
      <stop offset="0" stop-color="#0074D9" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#0074D9" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#FFFFFF" stroke-width="0.6" opacity="0.05"/>
    </pattern>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grid)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>

  <rect x="0" y="0" width="${WIDTH}" height="6" fill="#0074D9"/>

  <g transform="translate(80, 80)">
    <rect x="0" y="0" width="80" height="80" rx="16" ry="16" fill="#FFFFFF" opacity="0.06"/>
    <rect x="0" y="0" width="80" height="80" rx="16" ry="16" fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity="0.18"/>
    <rect x="14" y="51" width="13" height="20" rx="2.5" fill="#0074D9"/>
    <rect x="34" y="38" width="13" height="33" rx="2.5" fill="#0074D9"/>
    <rect x="54" y="22" width="13" height="49" rx="2.5" fill="#0074D9"/>
    <line x1="20.5" y1="46" x2="40.5" y2="34" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
    <line x1="40.5" y1="34" x2="60.5" y2="19" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
    <circle cx="20.5" cy="46" r="4" fill="#FFFFFF"/>
    <circle cx="40.5" cy="34" r="4" fill="#FFFFFF"/>
    <circle cx="60.5" cy="19" r="5" fill="#2ECC71"/>
    <circle cx="60.5" cy="19" r="2" fill="#FFFFFF"/>
  </g>

  <text x="180" y="120"
        font-family="DejaVu Sans, Inter, 'Helvetica Neue', Arial, sans-serif"
        font-weight="700"
        font-size="38"
        letter-spacing="-0.5"
        fill="#FFFFFF">FintechPress<tspan fill="#4FA8FF">Hub</tspan></text>
  <text x="182" y="148"
        font-family="DejaVu Sans, Inter, 'Helvetica Neue', Arial, sans-serif"
        font-weight="500"
        font-size="14"
        letter-spacing="3"
        fill="#FFFFFF"
        opacity="0.55">FINTECH SEO &amp; CONTENT MARKETING</text>

  <g transform="translate(80, 220)">
    <rect x="0" y="0" width="${Math.max(160, safeCategory.length * 12 + 50)}" height="44" rx="22" ry="22"
          fill="#0074D9" opacity="0.18"/>
    <rect x="0" y="0" width="${Math.max(160, safeCategory.length * 12 + 50)}" height="44" rx="22" ry="22"
          fill="none" stroke="#4FA8FF" stroke-width="1.5" opacity="0.5"/>
    <circle cx="22" cy="22" r="5" fill="#2ECC71"/>
    <text x="40" y="29"
          font-family="DejaVu Sans, Inter, 'Helvetica Neue', Arial, sans-serif"
          font-weight="600"
          font-size="16"
          letter-spacing="2"
          fill="#FFFFFF">${safeCategory}</text>
  </g>

  <text font-family="DejaVu Sans, Inter, 'Helvetica Neue', Arial, sans-serif"
        font-weight="700"
        font-size="${TITLE_FONT_SIZE}"
        letter-spacing="-1.5"
        fill="#FFFFFF">${titleTspans}</text>

  <line x1="80" y1="540" x2="${WIDTH - 80}" y2="540" stroke="#FFFFFF" stroke-width="1" opacity="0.15"/>

  <text x="80" y="585"
        font-family="DejaVu Sans, Inter, 'Helvetica Neue', Arial, sans-serif"
        font-weight="600"
        font-size="20"
        letter-spacing="2"
        fill="#FFFFFF"
        opacity="0.65">fintechpresshub.com</text>

  <text x="${WIDTH - 80}" y="585"
        font-family="DejaVu Sans, Inter, 'Helvetica Neue', Arial, sans-serif"
        font-weight="600"
        font-size="18"
        letter-spacing="1.5"
        fill="#FFFFFF"
        opacity="0.55"
        text-anchor="end">SEO · LINK BUILDING · CONTENT</text>
</svg>`;
}

function getCached(key: string): Buffer | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.buf;
}

function setCached(key: string, buf: Buffer): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { buf, createdAt: Date.now() });
}

router.get("/og", async (req, res) => {
  const rawTitle = typeof req.query.title === "string" ? req.query.title : "";
  const rawCategory =
    typeof req.query.category === "string" ? req.query.category : "Insights";

  const title =
    rawTitle.trim().slice(0, 200) ||
    "Optimized Fintech Content That Ranks & Converts";
  const category = rawCategory.trim().slice(0, 40) || "Insights";

  const cacheKey = `${title}|${category}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader(
      "Cache-Control",
      "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    );
    res.setHeader("X-OG-Cache", "HIT");
    res.send(cached);
    return;
  }

  try {
    const svg = buildSvg({ title, category });
    const buf = await sharp(Buffer.from(svg, "utf-8"), { density: 200 })
      .resize(WIDTH, HEIGHT, { fit: "fill" })
      .jpeg({ quality: 88, progressive: true, mozjpeg: true })
      .toBuffer();

    setCached(cacheKey, buf);
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader(
      "Cache-Control",
      "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    );
    res.setHeader("X-OG-Cache", "MISS");
    res.send(buf);
  } catch (err) {
    req.log?.error({ err }, "Failed to render OG image");
    res.status(500).json({ error: "Failed to render image" });
  }
});

export default router;
