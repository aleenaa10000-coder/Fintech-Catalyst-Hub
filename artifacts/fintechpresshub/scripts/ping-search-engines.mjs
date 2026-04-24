import { readFile, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const SITE_URL = process.env.VITE_SITE_URL || "https://www.fintechpresshub.com";
const INDEXNOW_KEY = process.env.INDEXNOW_KEY;

if (!INDEXNOW_KEY) {
  console.error(
    "Error: INDEXNOW_KEY environment variable is required.\n" +
      "Generate one (a 8-128 char hex string) at https://www.bing.com/indexnow " +
      "and set it via your secrets manager.",
  );
  process.exit(1);
}

if (!/^[a-zA-Z0-9-]{8,128}$/.test(INDEXNOW_KEY)) {
  console.error(
    "Error: INDEXNOW_KEY must be 8-128 characters of [a-zA-Z0-9-].",
  );
  process.exit(1);
}

const host = new URL(SITE_URL).host;
const keyFilePath = resolve(projectRoot, `public/${INDEXNOW_KEY}.txt`);
const keyLocation = `${SITE_URL}/${INDEXNOW_KEY}.txt`;

try {
  await access(keyFilePath, constants.F_OK);
} catch {
  await writeFile(keyFilePath, INDEXNOW_KEY, "utf8");
  console.log(`Created verification key file at public/${INDEXNOW_KEY}.txt`);
}

const sitemapPath = resolve(projectRoot, "public/sitemap.xml");
const sitemap = await readFile(sitemapPath, "utf8");
const urlList = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)).map(
  (m) => m[1],
);

if (urlList.length === 0) {
  console.error("No URLs found in public/sitemap.xml. Run generate-sitemap first.");
  process.exit(1);
}

const body = {
  host,
  key: INDEXNOW_KEY,
  keyLocation,
  urlList,
};

console.log(`Submitting ${urlList.length} URLs to IndexNow for ${host}...`);

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

const text = await res.text();

if (res.ok || res.status === 202) {
  console.log(
    `IndexNow accepted: HTTP ${res.status}. Bing, Yandex, Seznam, and Naver have been notified.`,
  );
} else {
  console.error(`IndexNow rejected: HTTP ${res.status}`);
  if (text) console.error(text);
  process.exit(1);
}

console.log(
  "\nNote: Google does not participate in IndexNow. To notify Google, " +
    "submit the sitemap once in Search Console — after that, Google re-crawls " +
    "the sitemap on its own schedule.",
);
