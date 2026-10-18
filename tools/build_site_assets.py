"""Extract the site's sprites from the game's PAGAN build output (../age-of-boom/assets/generated).

Writes public/sprites/*.png (horizontal frame strips at native size) and src/lib/sprites.json (frame size, count, fps).
Team colours are the manifest's palette swaps, applied here exactly as the game's swap shader does.
Deterministic: rerun after the game's art changes and commit the output.

    .venv/bin/python tools/build_site_assets.py [--game ../age-of-boom]
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "sprites"
INDEX = ROOT / "src" / "lib" / "sprites.json"
SHIPS = ["sloop", "brig", "frigate", "galleon"]
TEAMS = ["base", "red", "blue", "gold"]
HEADINGS = [f"h{i:02d}" for i in range(32)]
# Effects: (asset, animation).
EFFECTS = [
    ("explosion_big", "boom"),
    ("explosion_hit", None),
    ("fire_large", "fire"),
    ("smoke_puff", "puff"),
    ("muzzle_flash", "flash"),
    ("splash", None),
    ("gull", None),
    ("whale_breach", None),
    ("dolphin_jump", None),
    ("coin", None),
    ("cannonball", None),
    ("chain_shot", None),
    ("grape_shot", None),
    ("fire_ball", None),
    ("pickups", None),
    ("smoke_column", None),
    ("geyser", None),
    ("shockwave", None),
]


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def swap(img: Image.Image, mapping: dict[str, str]) -> Image.Image:
    table = {hex_rgb(k): hex_rgb(v) for k, v in mapping.items()}
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a and (r, g, b) in table:
                px[x, y] = (*table[(r, g, b)], a)
    return out


def strip(sheet: Image.Image, rects: list[list[int]]) -> Image.Image:
    w, h = rects[0][2], rects[0][3]
    out = Image.new("RGBA", (w * len(rects), h))
    for i, (x, y, rw, rh) in enumerate(rects):
        out.paste(sheet.crop((x, y, x + rw, y + rh)), (i * w, 0))
    return out


def res(game: Path, path: str) -> Path:
    return game / path.removeprefix("res://")


def save(img: Image.Image, name: str) -> None:
    img.save(OUT / f"{name}.png", optimize=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--game", type=Path, default=ROOT.parent / "age-of-boom")
    args = ap.parse_args()
    manifest = json.loads((args.game / "assets/generated/manifest.json").read_text())["assets"]
    OUT.mkdir(parents=True, exist_ok=True)
    index: dict[str, dict] = {}

    for ship in SHIPS:
        a = manifest[ship]
        sheet = Image.open(res(args.game, a["sheet"])).convert("RGBA")
        w, h = a["size"]
        anims = a["animations"]
        headings = strip(sheet, [a["frames"][anims[hd]["frames"][0]] for hd in HEADINGS])
        sink = anims["sinking_h08"]
        sinking = strip(sheet, [a["frames"][f] for f in sink["frames"]])
        for team in TEAMS:
            m = a["variants"][team]["swap"] if team != "base" else {}
            save(swap(headings, m) if m else headings, f"{ship}_{team}")
            save(swap(sinking, m) if m else sinking, f"{ship}_{team}_sinking")
        index[ship] = {"w": w, "h": h, "headings": len(HEADINGS), "sinking": {"frames": len(sink["frames"]), "fps": sink["fps"]}}

    for name, anim in EFFECTS:
        a = manifest[name]
        sheet = Image.open(res(args.game, a["sheet"])).convert("RGBA")
        anim = anim or next(iter(a["animations"]))
        an = a["animations"][anim]
        save(strip(sheet, [a["frames"][f] for f in an["frames"]]), name)
        index[name] = {"w": a["size"][0], "h": a["size"][1], "frames": len(an["frames"]), "fps": an["fps"], "loop": an["loop"]}

    water = manifest["water"]
    sheet = Image.open(res(args.game, water["sheet"])).convert("RGBA")
    first = water["frames"][water["animations"][next(iter(water["animations"]))]["frames"][0]]
    tile = sheet.crop((first[0], first[1], first[0] + first[2], first[1] + first[3]))
    save(tile, "water")
    for biome, v in water.get("variants", {}).items():
        if v.get("swap"):
            save(swap(tile, v["swap"]), f"water_{biome}")

    INDEX.parent.mkdir(parents=True, exist_ok=True)
    INDEX.write_text(json.dumps(index, indent=2, sort_keys=True) + "\n")
    print(f"wrote {len(list(OUT.glob('*.png')))} sprites -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
