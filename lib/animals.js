// The Animal Fun Facts Edition — the same 24 animals that star in MK's card
// game "30" (and Wordz), each with two-dozen cute, TRUE fun facts. The art on
// the pages is the games' own hand-drawn SVG sprites (public/animals/sprites.js),
// so this edition feels like a reunion of the whole family of games.

let FACTS = {};
try { FACTS = require("./animal-facts"); } catch (e) { FACTS = {}; }

// Order matches the games' character picker (ANIMAL_ORDER in 30/js/sprites.js).
// nicks = the games' seat nicknames — shown as a wink to the players.
const ANIMALS = [
  { slug: "ladybug",   name: "Ladybug",   emoji: "🐞", nicks: ["Dotty", "Pepper", "Ruby"],       blurb: "A lucky little spotted beetle and a gardener's best friend." },
  { slug: "cat",       name: "Cat",       emoji: "🐱", nicks: ["Shadow", "Mittens", "Whiskers"], blurb: "Cozy, curious, and purring — the whole internet's favorite." },
  { slug: "dog",       name: "Dog",       emoji: "🐶", nicks: ["Buddy", "Rex", "Scout"],          blurb: "Loyal, loving, and always overjoyed to see you." },
  { slug: "owl",       name: "Owl",       emoji: "🦉", nicks: ["Hoot", "Sage", "Luna"],           blurb: "The silent, wide-eyed wise one of the night." },
  { slug: "penguin",   name: "Penguin",   emoji: "🐧", nicks: ["Waddles", "Tux", "Frost"],        blurb: "A dapper little bird that flies through the water." },
  { slug: "raccoon",   name: "Raccoon",   emoji: "🦝", nicks: ["Bandit", "Rascal", "Stripe"],     blurb: "The clever masked mischief-maker with nimble hands." },
  { slug: "bear",      name: "Bear",      emoji: "🐻", nicks: ["Bruno", "Grizzly", "Kodiak"],     blurb: "Big and strong, yet surprisingly gentle — and very sleepy." },
  { slug: "frog",      name: "Frog",      emoji: "🐸", nicks: ["Ribbit", "Lily", "Marsh"],        blurb: "A hoppy, happy singer of ponds and summer rain." },
  { slug: "panda",     name: "Panda",     emoji: "🐼", nicks: ["Bamboo", "Oreo", "Patches"],      blurb: "The bamboo-munching cuddle-bear of the misty mountains." },
  { slug: "monkey",    name: "Monkey",    emoji: "🐵", nicks: ["Coco", "Chip", "Mango"],          blurb: "Playful, clever, and always up to something." },
  { slug: "deer",      name: "Deer",      emoji: "🦌", nicks: ["Dasher", "Fawn", "Buck"],         blurb: "Gentle and graceful, with velvet on its antlers." },
  { slug: "hedgehog",  name: "Hedgehog",  emoji: "🦔", nicks: ["Spike", "Bramble", "Thistle"],    blurb: "A tiny prickly ball with the sweetest snuffly nose." },
  { slug: "dolphin",   name: "Dolphin",   emoji: "🐬", nicks: ["Splash", "Snowflake", "Echo"],    blurb: "The ocean's smiling, playful genius." },
  { slug: "shark",     name: "Shark",     emoji: "🦈", nicks: ["Finn", "Jaws", "Reef"],           blurb: "An ancient, graceful ruler of the sea." },
  { slug: "octopus",   name: "Octopus",   emoji: "🐙", nicks: ["Inky", "Coral", "Squid"],         blurb: "A boneless, brainy shape-shifter with eight clever arms." },
  { slug: "hamster",   name: "Hamster",   emoji: "🐹", nicks: ["Nibbles", "Peanut", "Biscuit"],   blurb: "A pocket-sized fluff with cheeks full of treasures." },
  { slug: "goat",      name: "Goat",      emoji: "🐐", nicks: ["Billy", "Cliffs", "Bleat"],       blurb: "A nimble, curious climber with funny rectangle eyes." },
  { slug: "parrot",    name: "Parrot",    emoji: "🦜", nicks: ["Polly", "Stella", "Rio"],         blurb: "A dazzling chatterbox that can talk right back to you." },
  { slug: "turtle",    name: "Turtle",    emoji: "🐢", nicks: ["Shelly", "Mossy", "Tank"],        blurb: "A slow, ancient traveler who carries home on its back." },
  { slug: "spider",    name: "Spider",    emoji: "🕷️", nicks: ["Webster", "Silk", "Fang"],        blurb: "A patient little engineer spinning silken art." },
  { slug: "bee",       name: "Bee",       emoji: "🐝", nicks: ["Buzz", "Abby", "Nectar"],         blurb: "A busy, buzzing helper who makes the whole world bloom." },
  { slug: "crocodile", name: "Crocodile", emoji: "🐊", nicks: ["Snappy", "Chomp", "Marsh"],       blurb: "A living dinosaur with a surprisingly tender side." },
  { slug: "rabbit",    name: "Rabbit",    emoji: "🐰", nicks: ["Clover", "Hopper", "Thumper"],    blurb: "A soft, twitchy-nosed hopper with a big, quick heart." },
  { slug: "dodo",      name: "Dodo",      emoji: "🦤", nicks: ["Doodle", "Pebble", "Waddle"],     blurb: "The gentle, famous bird we'll always remember — our mascot!" },
];

const BY_SLUG = new Map(ANIMALS.map((a) => [a.slug, a]));

function list() {
  return ANIMALS.map((a) => ({
    slug: a.slug, name: a.name, emoji: a.emoji, blurb: a.blurb,
    factCount: (FACTS[a.slug] || []).length,
  }));
}

function get(slug) {
  const a = BY_SLUG.get(slug);
  if (!a) return null;
  return { slug: a.slug, name: a.name, emoji: a.emoji, nicks: a.nicks, blurb: a.blurb, facts: FACTS[a.slug] || [] };
}

module.exports = { list, get, slugs: () => ANIMALS.map((a) => a.slug) };
