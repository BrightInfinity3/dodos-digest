// Dodo's Digest — a gentle daily digest of cute animals, made with love for Dodo.
const path = require("path");
const express = require("express");

const sources = require("./lib/sources");
const pool = require("./lib/pool");
const ratings = require("./lib/ratings");
const feed = require("./lib/feed");
const octopus = require("./lib/octopus");

const PORT = process.env.PORT || 3003;

// Railway notifies on every non-zero exit — log and keep serving instead of crashing.
process.on("uncaughtException", (err) => {
  console.error("[dodos-digest] uncaughtException:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("[dodos-digest] unhandledRejection:", err);
});

const app = express();

// Private family site — keep the whole thing out of search engines.
app.use((req, res, next) => {
  res.set("X-Robots-Tag", "noindex, nofollow");
  next();
});

app.get("/health", (req, res) => res.status(200).type("text/plain").send("ok"));

// The feed mom scrolls: normalized cat photos/GIFs/videos, never a 500.
app.get("/api/feed", (req, res) => {
  const count = Math.min(20, Math.max(1, parseInt(req.query.count, 10) || 10));
  pool.ensureFresh(); // kicks off any needed refills, never blocks the response
  const items = feed.buildFeed(count);
  const body = { items, sources: sources.availableSources() };
  if (items.length === 0) body.retryAfter = 30;
  res.json(body);
});

// The pearl-octopus gallery: real, licensed photos with full provenance.
app.get("/api/octopus", async (req, res) => {
  try {
    const items = await octopus.getGallery();
    res.json({ items });
  } catch (err) {
    console.error("[dodos-digest] octopus gallery failed:", err);
    res.json({ items: [] });
  }
});

// Only store media URLs that point at the content hosts we actually serve
// from — anything else rendered later on the grownups page would be a
// stored-content injection into MK's browser.
const ALLOWED_MEDIA_HOSTS = /(^|\.)thecatapi\.com$|^cataas\.com$|(^|\.)pexels\.com$|^upload\.wikimedia\.org$|(^|\.)inaturalist\.org$|^inaturalist-open-data\.s3\.amazonaws\.com$|^iiif\.mcz\.harvard\.edu$/i;
function safeMediaUrl(value) {
  if (typeof value !== "string" || !value || value.length > 2000) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || !ALLOWED_MEDIA_HOSTS.test(u.hostname)) return null;
    return value;
  } catch (err) {
    return null;
  }
}

// Upsert a rating with a full item snapshot so the grownups page can render
// thumbnails without ever re-resolving upstream APIs. rating "none" removes it.
app.post("/api/rating", express.json(), (req, res) => {
  const b = req.body || {};
  const validRatings = ["up", "down", "none"];
  if (typeof b.itemId !== "string" || !b.itemId || b.itemId.length > 200 ||
      !validRatings.includes(b.rating)) {
    return res.status(400).json({ error: "bad input" });
  }
  try {
    if (b.rating === "none") {
      ratings.remove(b.itemId);
    } else {
      const src = safeMediaUrl(b.src);
      if (!src) return res.status(400).json({ error: "bad input" });
      ratings.upsert({
        itemId: b.itemId,
        itemType: typeof b.itemType === "string" ? b.itemType : "photo",
        src,
        poster: safeMediaUrl(b.poster),
        source: typeof b.source === "string" ? b.source.slice(0, 40) : "unknown",
        credit: b.credit && typeof b.credit === "object"
          ? { name: String(b.credit.name || "").slice(0, 200), link: String(b.credit.link || "").slice(0, 2000) }
          : null,
        rating: b.rating,
      });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[dodos-digest] rating write failed:", err);
    res.status(503).json({ error: "could not save" });
  }
});

// Dormant admin gate: does nothing until ADMIN_TOKEN is set in the environment.
function adminGate(req, res, next) {
  if (process.env.ADMIN_TOKEN && req.query.token !== process.env.ADMIN_TOKEN) {
    return res.status(404).type("text/plain").send("Not found");
  }
  next();
}

app.get("/api/ratings", adminGate, (req, res) => {
  res.json(ratings.getAll());
});

app.delete("/api/rating/:itemId", adminGate, (req, res) => {
  try {
    ratings.remove(req.params.itemId);
    res.json({ success: true });
  } catch (err) {
    console.error("[dodos-digest] rating delete failed:", err);
    res.status(503).json({ error: "could not save" });
  }
});

// MK's review page — lives outside public/ so the obscure route is the only way in.
app.get("/grownups", adminGate, (req, res) => {
  res.sendFile(path.join(__dirname, "admin", "grownups.html"));
});

// Dev-only helper (Railway builds run with NODE_ENV=production): lets the page
// save its self-generated PWA icons into public/, and visual snapshots for review.
if (process.env.NODE_ENV !== "production") {
  const fs = require("fs");
  const ICON_NAMES = new Set(["icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"]);
  app.post("/dev/icon", express.json({ limit: "12mb" }), (req, res) => {
    const { name, dataUrl } = req.body || {};
    if (typeof name !== "string" || typeof dataUrl !== "string" ||
        !dataUrl.startsWith("data:image/png;base64,")) {
      return res.status(400).json({ error: "bad input" });
    }
    const buf = Buffer.from(dataUrl.split(",")[1], "base64");
    if (ICON_NAMES.has(name)) {
      fs.writeFileSync(path.join(__dirname, "public", name), buf);
    } else {
      const safe = name.replace(/[^a-z0-9._-]/gi, "_");
      const dir = path.join(__dirname, "data", "dev-snaps");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, safe), buf);
    }
    res.json({ success: true });
  });
}

// Clean page routes BEFORE static, so /cats and /octopus serve directly (200)
// instead of static issuing a trailing-slash 301 redirect to /cats/.
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/cats", (req, res) => res.sendFile(path.join(__dirname, "public", "cats", "index.html")));
app.get("/octopus", (req, res) => res.sendFile(path.join(__dirname, "public", "octopus", "index.html")));
app.use(express.static(path.join(__dirname, "public")));

ratings.init();
pool.warmUp().catch((err) => console.error("[dodos-digest] warm-up failed:", err));
octopus.warmUp().catch((err) => console.error("[dodos-digest] octopus warm-up failed:", err));

const server = app.listen(PORT, () => {
  console.log(`[dodos-digest] listening on port ${PORT}`);
  console.log(`[dodos-digest] ratings data dir: ${ratings.dataDir()}`);
  console.log(`[dodos-digest] sources: ${JSON.stringify(sources.availableSources())}`);
});

// Graceful shutdown so Railway's container rotation isn't logged as a crash.
function shutdown(signal) {
  console.log(`[dodos-digest] ${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
