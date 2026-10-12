#!/usr/bin/env python3
"""Generate WordTab's extension icons.

The mark is a rounded square in the app accent colour carrying a white "W"
underlined by a short rule -- a "word" plus the tab it sits on. Rendered at 8x
and downsampled so the diagonals stay smooth at 16px.
"""
from PIL import Image, ImageDraw
import os

ACCENT_TOP = (79, 70, 229)     # indigo-600
ACCENT_BOTTOM = (99, 102, 241)  # indigo-500
INK = (255, 255, 255)

SS = 8  # supersampling factor
SIZES = (16, 32, 48, 128)
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')


def render(size: int) -> Image.Image:
    s = size * SS
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))

    # Vertical gradient body, clipped to a rounded square.
    grad = Image.new('RGBA', (s, s))
    gd = ImageDraw.Draw(grad)
    for y in range(s):
        t = y / max(s - 1, 1)
        gd.line(
            [(0, y), (s, y)],
            fill=tuple(round(a + (b - a) * t) for a, b in zip(ACCENT_TOP, ACCENT_BOTTOM)) + (255,),
        )
    mask = Image.new('L', (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.24), fill=255)
    img.paste(grad, (0, 0), mask)

    d = ImageDraw.Draw(img)

    # "W" as four strokes of a single polyline.
    top, bottom = s * 0.30, s * 0.63
    left, right = s * 0.22, s * 0.78
    mid_y = s * 0.47
    span = right - left
    points = [
        (left, top),
        (left + span * 0.25, bottom),
        (left + span * 0.50, mid_y),
        (left + span * 0.75, bottom),
        (right, top),
    ]
    d.line(points, fill=INK + (255,), width=max(int(s * 0.085), SS), joint='curve')

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
