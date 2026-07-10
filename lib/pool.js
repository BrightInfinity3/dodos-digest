// In-memory content pools with lazy, non-blocking refills.
// A feed request is always served from what's on hand; refills happen behind it.

const sources = require("./sources");

const MIN_ITEMS = 20;
const MAX_ITEMS = 200;
const TTL = {
  thecatapi: 30 * 60 * 1000,
  cataas: 30 * 60 * 1000,
  pexelsPhotos: 6 * 60 * 60 * 1000,
  pexelsVideos: 6 * 60 * 60 * 1000,
};

// Hard self-cap: never more than 10 Pexels requests in any rolling hour
// (5% of the real 200/hr limit — one request yields 25–80 items).
const PEXELS_MAX_PER_HOUR = 10;
const pexelsRequestTimes = [];

function pexelsAllowed() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  while (pexelsRequestTimes.length && pexelsRequestTimes[0] < cutoff) {
    pexelsRequestTimes.shift();
  }
  return pexelsRequestTimes.length < PEXELS_MAX_PER_HOUR;
}

const pools = {
  thecatapi: { items: [], lastRefill: 0, refilling: false, fetcher: sources.fetchTheCatApi, pexels: false },
  cataas: { items: [], lastRefill: 0, refilling: false, fetcher: sources.fetchCataas, pexels: false },
  pexelsPhotos: { items: [], lastRefill: 0, refilling: false, fetcher: sources.fetchPexelsPhotos, pexels: true },
  pexelsVideos: { items: [], lastRefill: 0, refilling: false, fetcher: sources.fetchPexelsVideos, pexels: true },
};

// Recently-served dedupe: she shouldn't see the same cat twice in a sitting.
const RECENT_CAP = 500;
const recentlyServedSet = new Set();
const recentlyServedFifo = [];

function markServed(ids) {
  for (const id of ids) {
    if (recentlyServedSet.has(id)) continue;
    recentlyServedSet.add(id);
    recentlyServedFifo.push(id);
    while (recentlyServedFifo.length > RECENT_CAP) {
      recentlyServedSet.delete(recentlyServedFifo.shift());
    }
  }
}

function isRecentlyServed(id) {
  return recentlyServedSet.has(id);
}

async function refill(name) {
  const pool = pools[name];
  if (pool.refilling) return;
  if (pool.pexels && !pexelsAllowed()) return;
  pool.refilling = true;
  try {
    if (pool.pexels) pexelsRequestTimes.push(Date.now());
    const fresh = await pool.fetcher();
    const known = new Set(pool.items.map((it) => it.id));
    for (const item of fresh) {
      if (!known.has(item.id)) {
        pool.items.push(item);
        known.add(item.id);
      }
    }
    while (pool.items.length > MAX_ITEMS) pool.items.shift();
    pool.lastRefill = Date.now();
    if (fresh.length > 0) {
      console.log(`[dodos-digest] pool ${name}: +${fresh.length} fetched, ${pool.items.length} held`);
    }
  } catch (err) {
    console.warn(`[dodos-digest] pool ${name} refill failed:`, err.message);
  } finally {
    pool.refilling = false;
  }
}

// Called on every feed request: kick off refills where needed, don't wait.
function ensureFresh() {
  for (const name of Object.keys(pools)) {
    const pool = pools[name];
    const stale = Date.now() - pool.lastRefill > TTL[name];
    if (pool.items.length < MIN_ITEMS || stale) {
      refill(name); // fire and forget
    }
  }
}

async function warmUp() {
  await Promise.allSettled(Object.keys(pools).map((name) => refill(name)));
  const held = Object.entries(pools)
    .map(([n, p]) => `${n}=${p.items.length}`)
    .join(" ");
  console.log(`[dodos-digest] warm-up complete: ${held}`);
}

function allItems() {
  return [].concat(...Object.values(pools).map((p) => p.items));
}

module.exports = { ensureFresh, warmUp, allItems, markServed, isRecentlyServed };
