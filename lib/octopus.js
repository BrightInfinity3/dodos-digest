// Real, honestly-sourced photos of Muusoctopus (the pearl octopus and its
// close cousins). Everything here is a genuine photograph or specimen image
// from a named scientist, museum, or expedition — no AI, no unlicensed scrapes.
//
// Sources: Wikimedia Commons (mostly NOAA Ocean Exploration ROV photos),
// iNaturalist (research-grade, CC-licensed), and GBIF (the one openly-licensed
// image of Muusoctopus robustus itself — a preserved museum specimen).

const UA = "DodosDigest/1.0 (family website; contact mkaiman4@gmail.com)";
const TIMEOUT_MS = 15000;
const TTL = 24 * 60 * 60 * 1000;

let cache = { items: [], at: 0, inflight: null };

async function fetchJson(url, headers = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, ...headers }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function stripHtml(s) {
  return String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// Descriptive filenames like "Muusoctopus at Davidson Seamount.jpg" must not
// become a fake binomial ("Muusoctopus at") — only accept real-looking epithets.
const NOT_EPITHETS = new Set([
  "at", "in", "of", "on", "and", "the", "from", "off", "near", "deep", "sea",
  "with", "voyage", "abyssal", "bathyal", "specimen", "photo", "image",
]);
function tidySpecies(name) {
  const s = stripHtml(name).replace(/\.(jpe?g|png|gif|tiff?)$/i, "");
  const m = s.match(/(Muusoctopus|Benthoctopus|Vulcanoctopus)\s+(sp\.?|[a-z]+)/i);
  if (m) {
    const genus = /^benthoctopus$/i.test(m[1]) ? "Muusoctopus" : m[1];
    let epithet = m[2].toLowerCase();
    if (epithet === "sp" || epithet === "sp.") epithet = "sp.";
    else if (!/^[a-z]{4,}$/.test(epithet) || NOT_EPITHETS.has(epithet)) epithet = "sp.";
    return genus + " " + epithet;
  }
  return "Muusoctopus sp.";
}

// Turn any license form (URL, code, or short name) into a clean, honest label.
function formatLicense(raw) {
  if (!raw) return "";
  const s = String(raw).toLowerCase();
  if (/publicdomain|\/zero\/|^cc0/.test(s)) return "CC0 (public domain)";
  if (/public domain/.test(s)) return "Public domain";
  const m = s.match(/licenses\/(by[a-z-]*)/) || s.match(/^cc-(by[a-z-]*)/) || s.match(/^(by[a-z-]*)$/);
  if (m) return "CC " + m[1].toUpperCase();
  return stripHtml(raw);
}

// "(c) Ocean Networks Canada, some rights reserved (CC BY-NC)" -> "Ocean Networks Canada"
function cleanAttribution(a) {
  return stripHtml(a)
    .replace(/^\(c\)\s*/i, "")
    .replace(/,?\s*(all|some|no) rights reserved.*$/i, "")
    .trim() || "iNaturalist observer";
}

// Keep the gallery curated: at most a few photos of any one species so a dozen
// near-identical shots of one cousin don't crowd out the variety.
function capPerSpecies(items, max) {
  const counts = {};
  return items.filter((it) => {
    const key = it.species.toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
    return counts[key] <= max;
  });
}

const LICENSE_URLS = {
  cc0: "https://creativecommons.org/publicdomain/zero/1.0/",
  "cc-by": "https://creativecommons.org/licenses/by/4.0/",
  "cc-by-sa": "https://creativecommons.org/licenses/by-sa/4.0/",
  "cc-by-nc": "https://creativecommons.org/licenses/by-nc/4.0/",
  "cc-by-nc-sa": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

// --- Wikimedia Commons: the best live ROV photographs of the genus ---
async function fetchCommons() {
  try {
    const url = "https://commons.wikimedia.org/w/api.php?action=query&generator=search" +
      "&gsrsearch=Muusoctopus&gsrnamespace=6&gsrlimit=25&prop=imageinfo" +
      "&iiprop=url%7Cextmetadata%7Cmime&iiurlwidth=1100&format=json";
    const data = await fetchJson(url);
    const pages = (data.query && data.query.pages) || {};
    const items = [];
    for (const p of Object.values(pages)) {
      const title = (p.title || "").replace(/^File:/, "");
      // Genus only — exclude the unrelated Vulcanoctopus, and skip non-images.
      if (!/muusoctopus|benthoctopus/i.test(title)) continue;
      const ii = (p.imageinfo || [])[0];
      if (!ii || !/^image\//.test(ii.mime || "")) continue;
      const em = ii.extmetadata || {};
      const author = stripHtml((em.Artist && em.Artist.value) || "Wikimedia Commons");
      const license = stripHtml((em.LicenseShortName && em.LicenseShortName.value) || "");
      const isNoaa = /noaa/i.test(author);
      // Old Benthoctopus plates are engravings, not "real-life pictures" — flag them.
      const isDrawing = /benthoctopus/i.test(title) && !isNoaa;
      items.push({
        id: "commons-" + p.pageid,
        kind: isDrawing ? "drawing" : "photo",
        src: ii.thumburl || ii.url,
        thumb: ii.thumburl || ii.url,
        credit: { name: author, link: ii.descriptionurl || "https://commons.wikimedia.org" },
        license,
        licenseUrl: stripHtml((em.LicenseUrl && em.LicenseUrl.value) || ""),
        source: "commons",
        species: tidySpecies(title),
        isExactSpecies: /robustus/i.test(title),
      });
    }
    return items;
  } catch (err) {
    console.warn("[dodos-digest] octopus/commons fetch failed:", err.message);
    return [];
  }
}

// --- iNaturalist: research-grade, CC-licensed observations of the genus ---
async function fetchINat() {
  try {
    // quality_grade=research means the community has verified the identification,
    // so a species label (and any "the pearl octopus itself" claim) is trustworthy.
    const url = "https://api.inaturalist.org/v1/observations?taxon_id=699693&photos=true" +
      "&photo_license=cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa&quality_grade=research&per_page=40&order_by=votes";
    const data = await fetchJson(url);
    const items = [];
    for (const o of data.results || []) {
      const photo = (o.photos || [])[0];
      if (!photo || !photo.url) continue;
      const medium = photo.url.replace(/square\.([a-z]+)(\?.*)?$/i, "medium.$1");
      const taxon = (o.taxon && o.taxon.name) || "Muusoctopus sp.";
      items.push({
        id: "inat-" + o.id,
        kind: "photo",
        src: medium,
        thumb: photo.url.replace(/square\.([a-z]+)(\?.*)?$/i, "small.$1"),
        credit: {
          name: cleanAttribution(photo.attribution),
          link: o.uri || ("https://www.inaturalist.org/observations/" + o.id),
        },
        license: formatLicense(photo.license_code),
        licenseUrl: LICENSE_URLS[photo.license_code] || "",
        source: "inaturalist",
        species: tidySpecies(taxon),
        isExactSpecies: /robustus/i.test(taxon),
      });
    }
    return items;
  } catch (err) {
    console.warn("[dodos-digest] octopus/inat fetch failed:", err.message);
    return [];
  }
}

// --- GBIF: the one openly-licensed image of the actual pearl octopus ---
async function fetchGbif() {
  try {
    const url = "https://api.gbif.org/v1/occurrence/search?scientificName=Muusoctopus%20robustus" +
      "&mediaType=StillImage&limit=10";
    const data = await fetchJson(url);
    const items = [];
    for (const r of data.results || []) {
      const media = (r.media || [])[0];
      if (!media || !media.identifier) continue;
      const institution = r.institutionCode || r.rightsHolder || media.rightsHolder || "Museum collection";
      items.push({
        id: "gbif-" + r.key,
        kind: "specimen",
        src: media.identifier,
        thumb: media.identifier,
        credit: { name: stripHtml(institution), link: "https://www.gbif.org/occurrence/" + r.key },
        license: formatLicense(r.license),
        licenseUrl: r.license || "",
        source: "gbif",
        species: "Muusoctopus robustus",
        isExactSpecies: true,
      });
    }
    return items;
  } catch (err) {
    console.warn("[dodos-digest] octopus/gbif fetch failed:", err.message);
    return [];
  }
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((it) => {
    if (seen.has(it.id) || !it.src) return false;
    seen.add(it.id);
    return true;
  });
}

async function doRefresh() {
  const [gbif, commons, inat] = await Promise.all([fetchGbif(), fetchCommons(), fetchINat()]);
  // Order the gallery to tell the story: the real species first (the museum
  // specimen), then the vivid live NOAA photos, then iNaturalist cousins.
  const photos = capPerSpecies(
    dedupe([...commons, ...inat]).filter((it) => it.kind === "photo"),
    3
  );
  const specimens = dedupe(gbif);
  const drawings = dedupe([...commons]).filter((it) => it.kind === "drawing");
  const merged = [...specimens, ...photos, ...drawings];
  if (merged.length > 0) {
    cache.items = merged;
    cache.at = Date.now();
    console.log(`[dodos-digest] octopus gallery: ${specimens.length} specimen, ${photos.length} photos, ${drawings.length} drawings`);
  }
}

// Share one in-flight fetch: concurrent cold callers (e.g. warm-up + the first
// visitor) all await the SAME refresh instead of racing and getting [].
function ensureRefresh() {
  if (!cache.inflight) {
    cache.inflight = doRefresh()
      .catch((err) => console.warn("[dodos-digest] octopus refresh failed:", err.message))
      .finally(() => { cache.inflight = null; });
  }
  return cache.inflight;
}

async function getGallery() {
  const stale = Date.now() - cache.at > TTL;
  if (cache.items.length === 0) {
    await ensureRefresh(); // first visitors all wait on the same fetch
  } else if (stale) {
    ensureRefresh(); // serve now, freshen behind the response
  }
  return cache.items;
}

async function warmUp() {
  await ensureRefresh();
}

module.exports = { getGallery, warmUp };
