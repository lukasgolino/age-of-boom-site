# Age of Boom website

One-page static Astro site for Age of Boom (game repo: `../age-of-boom`). No backend. Live at https://ageofboom.online (GitHub Pages, deployed by `.github/workflows/deploy.yml` on every push to `main`).

```sh
npm ci
npm run dev        # http://localhost:4321
npm run build      # -> dist/
npm run check      # astro check (types)
```

- Copy and numbers: `src/lib/data.ts` (Steam URL, social links, YouTube ids, ships, ammo, modes).
- Sprites, UI slices, pixel font: `npm run assets` rebuilds `public/sprites/` and `public/fonts/` from `../age-of-boom/assets/generated` (`python3 -m venv .venv && .venv/bin/pip install -r tools/requirements.txt`). Commit the output.
- Music: `public/audio/shanty.*` is the game score `shanty` (mix_combat) from `../age-of-boom/tools/music.sh render`, encoded with the venv ffmpeg.
- Gameplay clips: `public/video/<loop>.mp4|.webm|.jpg` (muted loops, a few MB each). A clip shows only once its mp4 exists.
- Screenshots: drop PNGs in `public/img/shots/`; the gallery appears automatically.
- `media/` (gitignored): full-length cuts for YouTube.
