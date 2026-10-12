#!/usr/bin/env python3
"""Generate PhraseTab's extension icons.

The mark is a black rounded square carrying a white "P" underlined by a short
rule -- a "phrase" plus the tab it sits on -- matching the black-and-white
interface. Rendered at 8x and downsampled so the curves stay smooth at 16px.
"""
from PIL import Image, ImageDraw
import os

GROUND = (0, 0, 0)
INK = (255, 255, 255)

SS = 8  # supersampling factor
SIZES = (16, 32, 48, 128)
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')


def render(size: int) -> Image.Image:
    s = size * SS
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))

    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.24), fill=GROUND + (255,))

    # "P": a stem plus a bowl, drawn as a ring with its left half covered by
    # the stem so the joins stay crisp.
    stroke = s * 0.105
    top, bottom = s * 0.20, s * 0.64
    stem_left = s * 0.32
    bowl_bottom = s * 0.475
    bowl_right = s * 0.70
    bowl_h = bowl_bottom - top
    d.rounded_rectangle(
        [stem_left, top, bowl_right, bowl_bottom],
        radius=bowl_h / 2,
        fill=INK + (255,),
    )
    d.rounded_rectangle(
        [stem_left + stroke, top + stroke, bowl_right - stroke, bowl_bottom - stroke],
        radius=max(bowl_h / 2 - stroke, 1),
        fill=GROUND + (255,),
    )
    d.rectangle([stem_left, top, stem_left + stroke, bottom], fill=INK + (255,))
    # Square off the bowl's left side so it meets the stem flush.
    d.rectangle([stem_left, top, stem_left + bowl_h / 2, top + stroke], fill=INK + (255,))
    d.rectangle(
        [stem_left, bowl_bottom - stroke, stem_left + bowl_h / 2, bowl_bottom],
        fill=INK + (255,),
    )
    d.rectangle(
        [stem_left + stroke, top + stroke, stem_left + bowl_h / 2, bowl_bottom - stroke],
        fill=GROUND + (255,),
    )
    left, right = s * 0.22, s * 0.78

    # Underline: the "tab" the word rests on.
    rule_y = s * 0.74
    d.rounded_rectangle(
        [left, rule_y, right, rule_y + s * 0.075],
        radius=s * 0.04,
        fill=INK + (215,),
    )

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    for size in SIZES:
        path = os.path.join(OUT_DIR, f'icon{size}.png')
        render(size).save(path, 'PNG', optimize=True)
        print(f'wrote {os.path.relpath(path)}')


if __name__ == '__main__':
    main()
