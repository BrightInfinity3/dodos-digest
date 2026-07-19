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

let cache = { items: [], at: 0, refreshing: false };

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

// "Muusoctopus johnsonianus.jpg" / "...robustus (G.L.Voss, 1990)" -> "Muusoctopus robustus"
function tidySpecies(name) {
  const s = stripHtml(name).replace(/\.(jpe?g|png|gif|tiff?)$/i, "");
  const m = s.match(/(Muusoctopus|Benthoctopus|Vulcanoctopus)\s+(sp\.?|[a-z]+)/i);
  if (m) {
    const genus = /^benthoctopus$/i.test(m[1]) ? "Muusoctopus" : m[1];
    const epithet = m[2].toLowerCase() === "sp" ? "sp." : m[2].toLowerCase();
    return genus + " " + epithet;
  }
  return "Muusoctopus sp.";
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
    const url = "https://api.inaturalist.org/v1/observations?taxon_id=699693&photos=true" +
      "&photo_license=cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa&per_page=40&order_by=votes";
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
          name: stripHtml(photo.attribution) || "iNaturalist observer",
          link: o.uri || ("https://www.inaturalist.org/observations/" + o.id),
        },
        license: (photo.license_code || "").toUpperCase(),
        licenseUrl: LICENSE_URLS[photo.license_code] || "",
        source: "inaturalist",
        species: tidySpecies(taxon),
        isExactSpecies: /robustus/i.test(taxon),
        researchGrade: o.quality_grade === "research",
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
        license: (r.license || "").replace("http://creativecommons.org/licenses/", "CC ")
          .replace("/4.0/legalcode", "").toUpperCase().replace("CC ", "CC-").replace(/\/$/, ""),
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

async function refresh() {
  if (cache.refreshing) return;
  cache.refreshing = true;
  try {
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
      cache = { items: merged, at: Date.now(), refreshing: false };
      console.log(`[dodos-digest] octopus gallery: ${specimens.length} specimen, ${photos.length} photos, ${drawings.length} drawings`);
    }
  } catch (err) {
    console.warn("[dodos-digest] octopus refresh failed:", err.message);
  } finally {
    cache.refreshing = false;
  }
}

async function getGallery() {
  const stale = Date.now() - cache.at > TTL;
  if (cache.items.length === 0) {
    await refresh(); // first visitor waits once; everyone after is instant
  } else if (stale) {
    refresh(); // serve now, freshen behind the response
  }
  return cache.items;
}

async function warmUp() {
  await refresh();
}

module.exports = { getGallery, warmUp };
