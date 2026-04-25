import { Router, type IRouter } from "express";

const router: IRouter = Router();

// IndexNow ownership-verification key file.
//
// The IndexNow protocol requires a plaintext file at a stable URL whose body
// is exactly the key. The file path doesn't have to be /<key>.txt at the
// root — the `keyLocation` field in the API call lets us point IndexNow at
// any URL on the same host, so we use a fixed path here. That keeps the
// production routing config (artifact.toml `paths`) static instead of
// depending on the user's INDEXNOW_KEY value.
router.get("/indexnow-key.txt", (_req, res) => {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    res.status(404).send("IndexNow not configured");
    return;
  }
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(key);
});

export default router;
