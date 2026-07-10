# Dodo's Digest 🐦

A gentle daily digest of cute animals, made with love for Dodo.

**v1: The Cat Edition** — an endless, phone-first feed of real cat photos, GIFs,
and videos with big friendly 👍/👎 buttons. Everything she rates is remembered;
thumbs-downed kitties never come back.

## How it runs

- `npm start` → Express server on `PORT` (local default 3003), serving `public/`
  and a small API (`/api/feed`, `/api/rating`).
- Content comes from [TheCatAPI](https://thecatapi.com), [Cataas](https://cataas.com),
  and [Pexels](https://www.pexels.com) (all human-made, licensed for this use),
  proxied and cached server-side so API keys and rate limits never touch her phone.
- Ratings persist to `ratings.json` in the Railway volume
  (`RAILWAY_VOLUME_MOUNT_PATH`), or `./data/` locally.

## Environment variables (Railway → service → Variables)

| Variable | Needed for | Where to get it |
|---|---|---|
| `PEXELS_API_KEY` | Videos + premium photos | Free instant key at [pexels.com/api](https://www.pexels.com/api/) |
| `CAT_API_KEY` | Optional: higher TheCatAPI limits | Free at [thecatapi.com/signup](https://thecatapi.com/signup) |
| `ADMIN_TOKEN` | Optional: locks `/grownups` behind `?token=...` | Make one up |

Without `PEXELS_API_KEY` the site still works — photos and GIFs only; the video
section lights up automatically once the key is set.

## For grownups

`/grownups` shows everything Dodo has loved (and not), with undo buttons.

## Deploy

Push to `main` → Railway auto-deploys (Nixpacks, `npm start`). The ratings
volume must be mounted at `/data` (`railway volume add --mount-path /data`)
or ratings reset on every deploy — the server logs a loud warning if it's missing.
