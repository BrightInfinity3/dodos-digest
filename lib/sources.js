// Upstream content adapters. Every fetcher returns an array of normalized items
// and NEVER throws — a failed source just contributes nothing this round.
//
// Normalized item shape (the contract the whole app speaks):
//   { id, type: "photo"|"gif"|"video", src, poster, width, height,
//     credit: { name, link } | null, source }

const TIMEOUT_MS = 8000;

async function fetchJson(url, headers = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function availableSources() {
  return {
    thecatapi: true,
    cataas: true,
    pexels: !!process.env.PEXELS_API_KEY,
  };
}

async function fetchTheCatApi() {
  const key = process.env.CAT_API_KEY;
  const limit = key ? 50 : 10;
  const headers = key ? { "x-api-key": key } : {};
  try {
    const data = await fetchJson(
      `https://api.thecatapi.com/v1/images/search?limit=${limit}&mime_types=jpg,png,gif`,
      headers
    );
    if (!Array.isArray(data)) return [];
    return data
      .filter((it) => it && it.id && it.url)
      .map((it) => ({
        id: `thecatapi-${it.id}`,
        type: /\.gif($|\?)/i.test(it.url) ? "gif" : "photo",
        src: it.url,
        poster: null,
        width: it.width || null,
        height: it.height || null,
        credit: { name: "TheCatAPI", link: "https://thecatapi.com" },
        source: "thecatapi",
      }));
  } catch (err) {
    console.warn("[dodos-digest] thecatapi fetch failed:", err.message);
    return [];
  }
}

async function fetchCataas() {
  // Random skip varies which slice of the archive we get each call.
  const skip = Math.floor(Math.random() * 1200);
  try {
    const data = await fetchJson(`https://cataas.com/api/cats?limit=40&skip=${skip}`);
    if (!Array.isArray(data)) return [];
    return data
      .map((it) => {
        const nativeId = it && (it.id || it._id);
        if (!nativeId) return null;
        const isGif =
          (it.mimetype && /gif/i.test(it.mimetype)) ||
          (Array.isArray(it.tags) && it.tags.includes("gif"));
        return {
          id: `cataas-${nativeId}`,
          type: isGif ? "gif" : "photo",
          src: `https://cataas.com/cat/${nativeId}`,
          poster: null,
          width: null,
          height: null,
          credit: { name: "Cataas", link: "https://cataas.com" },
          source: "cataas",
        };
      })
      .filter(Boolean);
  } catch (err) {
    console.warn("[dodos-digest] cataas fetch failed:", err.message);
    return [];
  }
}

// A different Pexels page each day = a fresh slice for the cost of ONE request.
function dailyPage(offset, pageCount) {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return 1 + ((dayOfYear + offset) % pageCount);
}

async function fetchPexelsPhotos() {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  const page = dailyPage(0, 25);
  try {
    const data = await fetchJson(
      `https://api.pexels.com/v1/search?query=cat&per_page=80&page=${page}`,
      { Authorization: key }
    );
    if (!data || !Array.isArray(data.photos)) return [];
    return data.photos
      .filter((p) => p && p.id && p.src && p.src.large)
      .map((p) => ({
        id: `pexels-photo-${p.id}`,
        type: "photo",
        src: p.src.large,
        poster: null,
        width: p.width || null,
        height: p.height || null,
        credit: { name: p.photographer || "Pexels", link: p.photographer_url || "https://www.pexels.com" },
        source: "pexels",
      }));
  } catch (err) {
    console.warn("[dodos-digest] pexels photos fetch failed:", err.message);
    return [];
  }
}

// Prefer a modest SD file that's still sharp on a phone; fall back gracefully.
function pickVideoFile(files) {
  if (!Array.isArray(files) || files.length === 0) return null;
  const mp4s = files.filter((f) => f && f.link && /mp4/i.test(f.file_type || "mp4"));
  if (mp4s.length === 0) return null;
  const sd = mp4s
    .filter((f) => f.quality === "sd" && (f.width || 0) >= 640)
    .sort((a, b) => (a.width || 0) - (b.width || 0));
  if (sd.length > 0) return sd[0];
  const hd = mp4s
    .filter((f) => f.quality === "hd")
    .sort((a, b) => (a.width || 0) - (b.width || 0));
  if (hd.length > 0) return hd[0];
  return mp4s[0];
}

async function fetchPexelsVideos() {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  const page = dailyPage(7, 20);
  try {
    const data = await fetchJson(
      `https://api.pexels.com/videos/search?query=cute%20cat&per_page=25&page=${page}`,
      { Authorization: key }
    );
    if (!data || !Array.isArray(data.videos)) return [];
    return data.videos
      .map((v) => {
        const file = v && v.id ? pickVideoFile(v.video_files) : null;
        if (!file) return null;
        return {
          id: `pexels-video-${v.id}`,
          type: "video",
          src: file.link,
          poster: v.image || null,
          width: file.width || null,
          height: file.height || null,
          credit: {
            name: (v.user && v.user.name) || "Pexels",
            link: (v.user && v.user.url) || "https://www.pexels.com",
          },
          source: "pexels",
        };
      })
      .filter(Boolean);
  } catch (err) {
    console.warn("[dodos-digest] pexels videos fetch failed:", err.message);
    return [];
  }
}

module.exports = {
  availableSources,
  fetchTheCatApi,
  fetchCataas,
  fetchPexelsPhotos,
  fetchPexelsVideos,
};
