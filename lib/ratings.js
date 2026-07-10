// Ratings store: one small JSON file, atomic writes, loaded once at boot.
// On Railway a mounted volume makes it survive redeploys; locally it's ./data.

const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "dodos-digest")
  : path.join(__dirname, "..", "data");
const FILE = path.join(DATA_DIR, "ratings.json");

let store = { version: 1, ratings: {} };
const blockedIds = new Set();

function dataDir() {
  return DATA_DIR;
}

function rebuildDerived() {
  blockedIds.clear();
  for (const [id, r] of Object.entries(store.ratings)) {
    if (r.rating === "down") blockedIds.add(id);
  }
}

function init() {
  if (process.env.NODE_ENV === "production" && !process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    console.warn(
      "[dodos-digest] WARNING: no volume mounted (RAILWAY_VOLUME_MOUNT_PATH unset) — " +
      "ratings will NOT survive redeploys! Attach a volume: railway volume add --mount-path /data"
    );
  }
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("[dodos-digest] could not create data dir:", err.message);
  }
  try {
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, "utf8"));
      if (parsed && typeof parsed.ratings === "object" && parsed.ratings !== null) {
        store = { version: 1, ratings: parsed.ratings };
      }
    }
  } catch (err) {
    // Never lose mom's ratings to a crash loop — set the bad file aside and go on.
    console.error("[dodos-digest] ratings file unreadable, backing it up:", err.message);
    try {
      fs.renameSync(FILE, `${FILE}.corrupt-${Date.now()}`);
    } catch (renameErr) {
      console.error("[dodos-digest] backup rename failed:", renameErr.message);
    }
    store = { version: 1, ratings: {} };
  }
  rebuildDerived();
  console.log(`[dodos-digest] ratings loaded: ${Object.keys(store.ratings).length}`);
}

function save() {
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, FILE);
}

// If the disk write fails, roll the in-memory change back so memory and file
// never diverge (a phantom rating would silently reappear/vanish on restart).
function upsert(entry) {
  const now = Date.now();
  const existing = store.ratings[entry.itemId];
  store.ratings[entry.itemId] = {
    ...entry,
    firstRatedAt: existing ? existing.firstRatedAt : now,
    updatedAt: now,
  };
  rebuildDerived();
  try {
    save();
  } catch (err) {
    if (existing) store.ratings[entry.itemId] = existing;
    else delete store.ratings[entry.itemId];
    rebuildDerived();
    throw err;
  }
}

function remove(itemId) {
  const existing = store.ratings[itemId];
  if (!existing) return;
  delete store.ratings[itemId];
  rebuildDerived();
  try {
    save();
  } catch (err) {
    store.ratings[itemId] = existing;
    rebuildDerived();
    throw err;
  }
}

function getRating(itemId) {
  const r = store.ratings[itemId];
  return r ? r.rating : null;
}

function isBlocked(itemId) {
  return blockedIds.has(itemId);
}

function getAll() {
  const all = Object.values(store.ratings).sort((a, b) => b.updatedAt - a.updatedAt);
  return {
    up: all.filter((r) => r.rating === "up"),
    down: all.filter((r) => r.rating === "down"),
  };
}

// Net thumb score per item type / source — the feed's gentle preference signal.
function netBy(field) {
  const net = {};
  for (const r of Object.values(store.ratings)) {
    const key = r[field] || "unknown";
    net[key] = (net[key] || 0) + (r.rating === "up" ? 1 : -1);
  }
  return net;
}

function netByType() {
  return netBy("itemType");
}

function netBySource() {
  return netBy("source");
}

module.exports = { init, dataDir, upsert, remove, getRating, isBlocked, getAll, netByType, netBySource };
