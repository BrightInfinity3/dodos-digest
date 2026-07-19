// The Saints Edition — accurate, warm little histories of twelve beloved saints,
// paired with REAL public-domain art fetched from Wikimedia Commons (every piece
// credited to its painter and museum, never AI). Same honesty promise as the
// octopus gallery: what you see is real art by real hands.

const UA = "DodosDigest/1.0 (family website; contact mkaiman4@gmail.com)";
const TIMEOUT_MS = 15000;
const TTL = 24 * 60 * 60 * 1000;

// --- The twelve. Feast days follow the current General Roman Calendar. ---
const SAINTS = [
  {
    slug: "francis-of-assisi",
    name: "St. Francis of Assisi",
    emoji: "🐦",
    feast: "October 4",
    dates: "1181 – 1226",
    patron: "Animals, nature, and ecology",
    symbols: "Birds and animals, the stigmata, a brown habit, a wolf",
    blurb: "The gentle friar who preached to the birds and called every creature his brother and sister.",
    query: "Saint Francis of Assisi",
    story: [
      "Francis was born to a wealthy cloth-merchant in the Italian town of Assisi and grew up expecting a life of comfort and adventure. But after a season of illness and prayer, he gave it all away — his fine clothes, his money, even his inheritance — to live simply and serve the poor. He wore a rough brown robe tied with a cord and owned almost nothing, and yet he is remembered as one of the most joyful people who ever lived.",
      "He loved every living thing as a gift from God. Old stories tell of him preaching to a flock of birds, taming a fierce wolf that had frightened a village, and singing his beautiful 'Canticle of the Creatures,' which praises God for Brother Sun, Sister Moon, and all of creation. Near the end of his life he received the stigmata — the wounds of Christ — on his own body. Today he is the patron saint of animals and the natural world, and his feast day is blessed with the gentle 'blessing of the animals.'",
    ],
    quote: "Praised be You, my Lord, with all Your creatures.",
  },
  {
    slug: "therese-of-lisieux",
    name: "St. Thérèse of Lisieux",
    emoji: "🌹",
    feast: "October 1",
    dates: "1873 – 1897",
    patron: "Missionaries and florists; a Doctor of the Church",
    symbols: "A shower of roses, a crucifix, the Carmelite habit",
    blurb: "The 'Little Flower' who taught that small acts of love are the surest path to Heaven.",
    query: "Thérèse of Lisieux",
    story: [
      "Thérèse was a bright, tender-hearted French girl who entered a quiet Carmelite convent when she was just fifteen. She never did anything the world would call grand — she never traveled, never founded anything, and died of tuberculosis when she was only twenty-four. Yet she is one of the most loved saints of modern times.",
      "Her secret was what she called her 'little way': doing ordinary things — a kind word, a hidden chore, a patient smile — with extraordinary love. She wrote it all down in a little book, 'The Story of a Soul,' which has comforted millions since. She promised that from Heaven she would 'let fall a shower of roses' of blessings upon the earth, and to this day people who pray to her often receive a rose as a quiet sign.",
    ],
    quote: "I will spend my Heaven doing good on earth.",
  },
  {
    slug: "anthony-of-padua",
    name: "St. Anthony of Padua",
    emoji: "🕯️",
    feast: "June 13",
    dates: "1195 – 1231",
    patron: "Lost things and lost people",
    symbols: "The Child Jesus, a white lily, a book",
    blurb: "The beloved helper you ask when something is lost — 'Tony, Tony, turn around.'",
    query: "Saint Anthony of Padua",
    story: [
      "Anthony was born in Lisbon, Portugal, and became a Franciscan friar known across Italy as a spellbinding preacher — crowds so large gathered to hear him that he often had to speak in the open fields. He was also a great scholar, but what people remembered most was his warmth and his gift for bringing wanderers back to God.",
      "He is most loved today as the patron of lost things. The tradition began with a story from his own life: a novice borrowed Anthony's treasured book of psalms and ran off with it, and after Anthony prayed, the young man's heart changed and he returned it. Ever since, people who misplace their keys or glasses whisper a little prayer to St. Anthony — and smile when the missing thing turns up. He is often pictured tenderly holding the Child Jesus.",
    ],
  },
  {
    slug: "joseph",
    name: "St. Joseph",
    emoji: "🪚",
    feast: "March 19",
    dates: "1st century",
    patron: "Workers, fathers, families, and a peaceful death",
    symbols: "A white lily, a carpenter's tools, the Child Jesus",
    blurb: "The quiet carpenter of Nazareth who raised Jesus and guarded the Holy Family.",
    query: "Saint Joseph",
    story: [
      "Joseph was a humble carpenter of Nazareth, chosen to be the husband of Mary and the foster father of Jesus. The Gospels record not a single word he spoke — he is the saint of quiet faithfulness. When an angel warned him in a dream that the Christ Child was in danger, he rose in the night and led his family to safety in Egypt, asking nothing for himself.",
      "Because he taught Jesus his trade and provided for the Holy Family with the work of his hands, Joseph is honored as the patron of workers and of fathers. And because tradition holds that he died gently in the company of Jesus and Mary, he is also the patron of a peaceful, happy death. He is usually shown holding a white lily, a sign of his purity, or the tools of his carpentry.",
    ],
  },
  {
    slug: "patrick",
    name: "St. Patrick",
    emoji: "☘️",
    feast: "March 17",
    dates: "c. 385 – 461",
    patron: "Ireland",
    symbols: "The shamrock, a bishop's staff, snakes",
    blurb: "The shepherd-slave who returned to Ireland and won a whole island to the faith.",
    query: "Saint Patrick",
    story: [
      "Patrick was born in Roman Britain, not Ireland. As a teenager he was kidnapped by raiders and carried across the sea to Ireland, where he spent six lonely years as a shepherd-slave on a cold hillside. In that hardship he turned to prayer, and one night he heard a voice telling him a ship was waiting. He escaped and made his way home — but years later, astonishingly, he chose to go back to the very land of his captivity, this time as a bishop and a missionary.",
      "With patience and courage he traveled all across Ireland, baptizing, teaching, and founding churches. A cherished legend says he used the little three-leaf shamrock to explain the Holy Trinity — three leaves, one plant — and another says he drove the snakes from Ireland. Whatever the legends, the history is real: he brought the Christian faith to an entire nation, and Ireland has loved him ever since.",
    ],
  },
  {
    slug: "nicholas",
    name: "St. Nicholas",
    emoji: "🎁",
    feast: "December 6",
    dates: "c. 270 – 343",
    patron: "Children, sailors, and generous givers",
    symbols: "Three gold balls or bags, a bishop's mitre, a ship",
    blurb: "The secret gift-giving bishop who became the world's 'Santa Claus.'",
    query: "Saint Nicholas of Myra",
    story: [
      "Nicholas was a bishop in the town of Myra, in what is now Turkey, and was famous in his own lifetime for his kindness and his secret generosity. The most beloved story tells of a poor father with three daughters who had no money for their dowries. On three nights, Nicholas quietly tossed bags of gold through the family's window — some say down the chimney — so the daughters would be provided for, never letting anyone see who had done it.",
      "That gentle habit of giving in secret is why he became the patron of children and the inspiration for 'Santa Claus' (from the Dutch 'Sinterklaas'). He is the patron of sailors too, and of anyone who gives quietly and expects nothing back. On his feast day, December 6, children in many countries still wake to find small gifts and sweets left overnight.",
    ],
  },
  {
    slug: "cecilia",
    name: "St. Cecilia",
    emoji: "🎵",
    feast: "November 22",
    dates: "2nd – 3rd century",
    patron: "Music and musicians",
    symbols: "An organ or harp, roses, a palm of martyrdom",
    blurb: "The Roman martyr who 'sang in her heart to the Lord' and became the patron of music.",
    query: "Saint Cecilia",
    story: [
      "Cecilia was a young noblewoman of ancient Rome who had promised her life to God. An old account says that even on the day of her wedding, as the musicians played, 'she sang in her heart to the Lord' — and from that single line grew her lasting title as the patron saint of music and of all who make it.",
      "She lived in a time when Christians were persecuted, and she gave her life for her faith rather than deny it. For centuries, composers and choirs have honored her with music written especially for her feast day, and she is nearly always pictured seated at a small organ, her face lifted in song. When you hear beautiful music in a church, St. Cecilia is not far away.",
    ],
  },
  {
    slug: "clare-of-assisi",
    name: "St. Clare of Assisi",
    emoji: "✨",
    feast: "August 11",
    dates: "1194 – 1253",
    patron: "Eye ailments and (fittingly) television",
    symbols: "A monstrance holding the Eucharist, a simple habit",
    blurb: "The noble girl who followed St. Francis into a life of holy poverty and light.",
    query: "Saint Clare of Assisi",
    story: [
      "Clare was born into a wealthy family in Assisi, the same town as Francis. As a young woman she heard him preach and was so moved that she slipped away from her family's grand home one night to give her life to God. Francis received her, and she founded an order of nuns who lived in radical simplicity and prayer — known to this day as the 'Poor Clares.'",
      "A famous story tells that when enemy soldiers threatened her convent, the ailing Clare had the Blessed Sacrament carried to the wall, and the attackers turned and fled — which is why she is so often pictured holding a monstrance, the golden vessel that holds the Eucharist. Late in her life, too sick to attend Mass, she is said to have seen and heard it upon the wall of her room — and for that gentle miracle she was named, centuries later, the patron saint of television.",
    ],
  },
  {
    slug: "catherine-of-siena",
    name: "St. Catherine of Siena",
    emoji: "📖",
    feast: "April 29",
    dates: "1347 – 1380",
    patron: "Italy and Europe; a Doctor of the Church",
    symbols: "A lily, a book, a ring, the stigmata",
    blurb: "The fearless mystic whose letters counseled popes and kings.",
    query: "Catherine of Siena",
    story: [
      "Catherine was the youngest of many children in a busy household in Siena, Italy. From childhood she felt a deep closeness to God, and though she never learned to read easily or hold any office, she became one of the most influential voices of her age. She cared for the sick and the poor with her own hands, especially during a terrible plague.",
      "She also had extraordinary courage. In an age when few women were heard, Catherine wrote bold, loving letters to the most powerful men in Europe — even persuading the Pope, who had been living in France, to return to Rome. Her writings on the spiritual life were so wise that the Church later named her a 'Doctor of the Church,' one of only a handful of women ever so honored. She is a patron of Italy and of all Europe.",
    ],
  },
  {
    slug: "teresa-of-avila",
    name: "St. Teresa of Ávila",
    emoji: "🕊️",
    feast: "October 15",
    dates: "1515 – 1582",
    patron: "Spain and those who suffer headaches; a Doctor of the Church",
    symbols: "A book and quill, a dove, a heart pierced by an arrow",
    blurb: "The joyful reformer and mystic who mapped the soul's journey to God.",
    query: "Teresa of Ávila",
    story: [
      "Teresa was a lively, witty Spanish noblewoman who became a Carmelite nun. In midlife she experienced a deep spiritual awakening and set out, against much opposition, to reform her order and return it to a simpler, more prayerful life. Traveling across Spain by mule and cart, she founded convent after convent, all while cheerfully insisting that holiness and good humor belong together.",
      "She was also one of the great teachers of prayer. Her books — especially 'The Interior Castle,' which pictures the soul as a beautiful castle with many rooms leading inward to God — are still read and loved today. For this the Church named her a Doctor of the Church, the first woman ever given that title. Her little bookmark prayer has steadied countless hearts.",
    ],
    quote: "Let nothing disturb you… God alone suffices.",
  },
  {
    slug: "michael-the-archangel",
    name: "St. Michael the Archangel",
    emoji: "⚔️",
    feast: "September 29",
    dates: "Honored since ancient times",
    patron: "Protection, soldiers, and police",
    symbols: "A sword, scales, armor, a defeated dragon",
    blurb: "The great protector, captain of the heavenly host, whose name means 'Who is like God?'",
    query: "Archangel Michael",
    story: [
      "Michael is an archangel — one of the mighty messengers of God — and his name is itself a question: 'Who is like God?' The Scriptures picture him as the leader of the heavenly host, the defender who stands against evil. In art he is almost always shown in shining armor, sword or spear in hand, gently but firmly overcoming a dragon beneath his feet.",
      "For that reason people have prayed to St. Michael for protection since the earliest days of the Church — soldiers, police officers, the sick, and the frightened. He is also pictured holding a set of scales, as a helper of souls. His feast on September 29, long called 'Michaelmas,' celebrates him together with the archangels Gabriel and Raphael.",
    ],
  },
  {
    slug: "george",
    name: "St. George",
    emoji: "🐉",
    feast: "April 23",
    dates: "died c. 303",
    patron: "England, soldiers, and scouts",
    symbols: "A lance, a red cross on white, a dragon, a white horse",
    blurb: "The brave soldier-saint of the famous dragon legend.",
    query: "Saint George dragon",
    story: [
      "George was a Roman soldier, born to a Christian family, who rose to a place of honor in the emperor's army. When a fierce persecution of Christians began, George refused to give up his faith even to save his life, and he died a martyr around the year 303. His courage made him famous across both East and West.",
      "Centuries later a beloved legend grew up around him: a town was terrorized by a dragon, and George — riding a white horse and armed with a lance — rode out, defeated the beast, and saved the people, who then embraced the faith. The story became a favorite of painters and storytellers everywhere as a picture of goodness overcoming evil. His red cross on a white field is the flag of England, of which he is the patron.",
    ],
  },
];

const BY_SLUG = new Map(SAINTS.map((s) => [s.slug, s]));

function list() {
  return SAINTS.map((s) => ({
    slug: s.slug, name: s.name, emoji: s.emoji,
    feast: s.feast, patron: s.patron, blurb: s.blurb,
  }));
}

function get(slug) {
  const s = BY_SLUG.get(slug);
  if (!s) return null;
  const { query, ...rest } = s; // don't leak the internal art query
  return rest;
}

// --- Real public-domain art, fetched per saint from Wikimedia Commons ---
const artCache = new Map(); // slug -> { items, at, inflight }

function stripHtml(x) {
  return String(x || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// Commons "Artist" fields are messy: some carry a "Creator:" prefix, and some
// leak template CSS (".mw-parser-output…"). Give an honest, clean name or none.
function cleanArtist(raw) {
  let a = stripHtml(raw).replace(/^\s*Creator[:\s]*/i, "").trim();
  if (!a || /mw-parser-output|\.ubx|[{}]|@media|:\s*(inherit|none|auto)/i.test(a)) {
    return "Unknown artist";
  }
  return a.length > 70 ? a.slice(0, 70).trim() + "…" : a;
}

// Commons "DateTimeOriginal" often carries Wikidata noise like
// "1590sdate QS:P571,+1590-00-00T00:00:00Z/8" — keep only the human part.
function cleanDate(raw) {
  let d = stripHtml(raw)
    .replace(/date\s*QS:.*$/i, "")
    .replace(/QS:.*$/i, "")
    .replace(/\+?\d{4}-\d{2}-\d{2}T[\d:.Z/-]*/g, "")
    .trim();
  if (!d || d.length > 40 || /[{}]|http/i.test(d)) return "";
  return d;
}

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Skip files that are clearly not a painting/portrait of the saint.
const REJECT = /\b(map|coat of arms|logo|diagram|banner|flag|seal|signature|gpx|locator)\b/i;

async function fetchArt(saint) {
  const q = encodeURIComponent(saint.query + " painting");
  const url = "https://commons.wikimedia.org/w/api.php?action=query&generator=search" +
    "&gsrsearch=" + q + "&gsrnamespace=6&gsrlimit=20&prop=imageinfo" +
    "&iiprop=url%7Cextmetadata%7Cmime&iiurlwidth=1000&format=json";
  const data = await fetchJson(url);
  const pages = (data.query && data.query.pages) || {};
  // generator=search returns an 'index' that preserves relevance ranking.
  const ordered = Object.values(pages).sort((a, b) => (a.index || 0) - (b.index || 0));
  const items = [];
  for (const p of ordered) {
    const title = (p.title || "").replace(/^File:/, "");
    const ii = (p.imageinfo || [])[0];
    if (!ii || !/^image\/(jpeg|png)$/.test(ii.mime || "")) continue;
    if (REJECT.test(title)) continue;
    const em = ii.extmetadata || {};
    const artist = cleanArtist((em.Artist && em.Artist.value) || "");
    const license = stripHtml((em.LicenseShortName && em.LicenseShortName.value) || "");
    const date = cleanDate((em.DateTimeOriginal && em.DateTimeOriginal.value) || "");
    items.push({
      id: "commons-" + p.pageid,
      src: ii.thumburl || ii.url,
      title: title.replace(/\.(jpe?g|png)$/i, ""),
      artist,
      date,
      credit: { name: artist, link: ii.descriptionurl || "https://commons.wikimedia.org" },
      license: license || "See source",
      source: "Wikimedia Commons",
    });
    if (items.length >= 8) break;
  }
  return items;
}

async function getArt(slug) {
  const saint = BY_SLUG.get(slug);
  if (!saint) return null;
  let entry = artCache.get(slug);
  if (!entry) { entry = { items: [], at: 0, inflight: null }; artCache.set(slug, entry); }

  const stale = Date.now() - entry.at > TTL;
  const refresh = () => {
    if (!entry.inflight) {
      entry.inflight = fetchArt(saint)
        .then((items) => { if (items.length) { entry.items = items; entry.at = Date.now(); } })
        .catch((err) => console.warn(`[dodos-digest] saint art (${slug}) failed:`, err.message))
        .finally(() => { entry.inflight = null; });
    }
    return entry.inflight;
  };

  if (entry.items.length === 0) await refresh();
  else if (stale) refresh();
  return entry.items;
}

module.exports = { list, get, getArt, slugs: () => SAINTS.map((s) => s.slug) };
