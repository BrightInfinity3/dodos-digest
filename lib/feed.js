// Feed assembly: filter out what she's disliked or just seen, then pick a
// gentle mix of photos/GIFs/videos, nudged by what she's loved so far.

const pool = require("./pool");
const ratings = require("./ratings");

const BASE_MIX = { photo: 6, gif: 2, video: 2 }; // per 10 items

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function weightedPickSource(bucket, netSource) {
  // Group the bucket's items by source, weight each source by her net love for it.
  const bySource = {};
  for (const item of bucket) {
    (bySource[item.source] = bySource[item.source] || []).push(item);
  }
  const names = Object.keys(bySource);
  // Clamped like the type nudge: months of thumbs-ups on one source must stay
  // a gentle preference, not an unbounded multiplier that locks others out.
  const weights = names.map((s) => 1 + Math.max(0, Math.min(3, netSource[s] || 0)));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < names.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return bySource[names[i]];
  }
  return bySource[names[names.length - 1]];
}

function takeRandom(list) {
  const idx = Math.floor(Math.random() * list.length);
  return list.splice(idx, 1)[0];
}

function buildFeed(count) {
  const netType = ratings.netByType();
  const netSource = ratings.netBySource();

  const fresh = [];
  const seenButFine = []; // fallback so a long sitting never dead-ends
  for (const item of pool.allItems()) {
    if (ratings.isBlocked(item.id)) continue;
    if (pool.isRecentlyServed(item.id)) seenButFine.push(item);
    else fresh.push(item);
  }

  // Type weights: base mix, gently nudged by her net ratings per type.
  const weights = {};
  for (const type of Object.keys(BASE_MIX)) {
    weights[type] = BASE_MIX[type] + clamp(netType[type] || 0, -1, 2);
  }
  weights.photo = Math.max(1, weights.photo);

  const buckets = { photo: [], gif: [], video: [] };
  for (const item of fresh) {
    if (buckets[item.type]) buckets[item.type].push(item);
  }
  // No videos available (e.g. no Pexels key)? Their share goes to photos.
  if (buckets.video.length === 0) {
    weights.photo += weights.video;
    weights.video = 0;
  }

  const picked = [];
  const pickedIds = new Set();
  while (picked.length < count) {
    const liveTypes = Object.keys(buckets).filter(
      (t) => buckets[t].length > 0 && weights[t] > 0
    );
    // Weighted mix exhausted — fall back to ANY fresh type, then to repeats.
    const anyTypes = Object.keys(buckets).filter((t) => buckets[t].length > 0);
    const typesToUse = liveTypes.length > 0 ? liveTypes : anyTypes;
    if (typesToUse.length === 0) break;

    const totalW = typesToUse.reduce((a, t) => a + Math.max(1, weights[t]), 0);
    let roll = Math.random() * totalW;
    let chosenType = typesToUse[typesToUse.length - 1];
    for (const t of typesToUse) {
      roll -= Math.max(1, weights[t]);
      if (roll <= 0) {
        chosenType = t;
        break;
      }
    }

    const sourceGroup = weightedPickSource(buckets[chosenType], netSource);
    const item = takeRandom(sourceGroup);
    // splice from the source group also has to leave the bucket consistent:
    const bucketIdx = buckets[chosenType].indexOf(item);
    if (bucketIdx !== -1) buckets[chosenType].splice(bucketIdx, 1);

    if (!pickedIds.has(item.id)) {
      pickedIds.add(item.id);
      picked.push(item);
    }
  }

  // Everything fresh is exhausted but she's still scrolling — serve repeats
  // (never blocked items) rather than an empty feed.
  while (picked.length < count && seenButFine.length > 0) {
    const item = takeRandom(seenButFine);
    if (!pickedIds.has(item.id)) {
      pickedIds.add(item.id);
      picked.push(item);
    }
  }

  pool.markServed(picked.map((it) => it.id));
  return picked.map((item) => ({ ...item, rating: ratings.getRating(item.id) }));
}

module.exports = { buildFeed };
