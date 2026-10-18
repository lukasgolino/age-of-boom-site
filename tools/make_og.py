"""Social preview (public/img/og.png, 1200x630): a gameplay poster frame with the logo.

    .venv/bin/python tools/make_og.py [poster.jpg]   (default public/video/loop_galleons.jpg)
Fonts come from node_modules (Pixelify Sans) and public/fonts (the game's pixel font), converted to TTF on the fly.
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    f = TTFont(path)
    f.flavor = None
    buf = io.BytesIO()
    f.save(buf)
    buf.seek(0)
    return ImageFont.truetype(buf, size)


def main() -> None:
    poster = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "public/video/loop_galleons.jpg"
    W, H = 1200, 630
    img = Image.open(poster).convert("RGB")
    s = max(W / img.width, H / img.height)
    img = img.resize((round(img.width * s), round(img.height * s)), Image.NEAREST)
    # Keep the action (right of centre) in frame.
    x0 = min(img.width - W, max(0, round(img.width * 0.62 - W * 0.62)))
    img = img.crop((x0, (img.height - H) // 2, x0 + W, (img.height - H) // 2 + H)).convert("RGBA")
    shade = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(shade)
    for x in range(W):
        a = int(235 * max(0.0, 1 - x / (W * 0.72)) ** 1.2)
        d.line([(x, 0), (x, H)], fill=(6, 15, 26, a))
    img.alpha_composite(shade)

    d = ImageDraw.Draw(img)
    pix = ROOT / "node_modules/@fontsource/pixelify-sans/files/pixelify-sans-latin-700-normal.woff2"
    hud = font(ROOT / "public/fonts/boom-pixel.woff2", 32)
    age = font(pix, 84)
    boom = font(pix, 210)
    ink, abyss = (243, 234, 216), (6, 15, 26)
    d.text((64 + 5, 70 + 5), "AGE OF", font=age, fill=abyss)
    d.text((64, 70), "AGE OF", font=age, fill=ink)
    for dy, col in ((21, abyss), (15, (140, 38, 41)), (10, (192, 58, 50)), (5, (255, 106, 42))):
        d.text((56 + (6 if dy == 21 else 0), 150 + dy), "BOOM", font=boom, fill=col)
    d.text((56, 150), "BOOM", font=boom, fill=(232, 180, 44))
    d.text((66, 440), "OUT-SAIL. OUT-GUN.", font=hud, fill=ink)
    w = d.textlength("OUT-SAIL. OUT-GUN. ", font=hud)
    d.text((66 + w, 440), "SINK THEM.", font=hud, fill=(255, 106, 42))
    d.text((66, 520), "PIXEL-ART NAVAL COMBAT  -  COMING TO STEAM", font=font(ROOT / "public/fonts/boom-pixel.woff2", 16), fill=(196, 186, 168))
    img.convert("RGB").save(ROOT / "public/img/og.png", optimize=True)
    print("wrote public/img/og.png")


if __name__ == "__main__":
    main()
