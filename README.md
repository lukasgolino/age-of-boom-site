# Age of Boom website

One-page static Astro site for [Age of Boom](../age-of-boom). No backend.

```sh
npm ci
npm run dev        # http://localhost:4321
npm run build      # -> dist/ (deploy this folder anywhere static)
```

- Copy and numbers: `src/lib/data.ts` (Steam URL, social links, YouTube ids, ships, ammo, modes).
- Sprites: `npm run assets` re-extracts `public/sprites/` from `../age-of-boom/assets/generated` (needs `.venv` with Pillow). Commit the output.
- Gameplay clips: `public/video/<loop>.mp4|.webm|.jpg` (muted loops, a few MB each). A clip shows only once its mp4 exists.
- Screenshots: drop PNGs in `public/img/shots/`; the gallery appears automatically.
- `media/` (gitignored): full-length cuts for YouTube.
