#!/usr/bin/env python3
"""
Готовит боевые подложки и заглушки бестиария/локации.

Исходники — detskop.jpeg / mobile.jpeg (настоящий грифон). Отсюда:
  • valmont-desktop.jpg, valmont-mobile.jpg — сжатые подложки hero;
  • placeholder/*.jpg — кропы того же кадра, затемнённые на 30 %,
    чтобы композиция читалась, но было очевидно, что это заглушка.

    python3 scripts/prepare-assets.py
"""
from PIL import Image, ImageEnhance
import pathlib

SRC_D, SRC_M = 'public/valmont-desktop.jpg', 'public/valmont-mobile.jpg'
OUT = pathlib.Path('public')
(OUT / 'placeholder').mkdir(parents=True, exist_ok=True)


def fit(im, target_w):
    if im.width <= target_w:
        return im
    h = round(im.height * target_w / im.width)
    return im.resize((target_w, h), Image.LANCZOS)


def save(im, path, q=82):
    im.save(path, 'JPEG', quality=q, optimize=True, progressive=True)
    kb = pathlib.Path(path).stat().st_size / 1024
    print(f'{str(path):44} {im.width}×{im.height}  {kb:6.0f} КБ')


# --- боевые подложки hero -------------------------------------------------
d = Image.open(SRC_D).convert('RGB')
m = Image.open(SRC_M).convert('RGB')
print(f'подложки: {d.size} / {m.size}')

# --- заглушки: кропы грифона, минус 30 % яркости --------------------------
# (x0, y0, x1, y1) в долях кадра + целевые пропорции
# Все области выбраны ПО ТЕЛУ грифона: слева в кадре чистый чёрный,
# и кроп оттуда даёт пустой прямоугольник, на котором нечего смотреть.
CROPS = {
    'beast-viverna':   (0.34, 0.06, 0.72, 0.78),
    'beast-lamassu':   (0.50, 0.14, 0.88, 0.86),
    'beast-katoblepas':(0.30, 0.28, 0.68, 1.00),
    'place-doroga':    (0.32, 0.42, 0.86, 0.94),
    'place-vorota':    (0.30, 0.12, 0.84, 0.62),
    'place-zal':       (0.48, 0.16, 1.00, 0.66),
    'place-terrasa':   (0.40, 0.45, 0.94, 0.95),
}

for name, (x0, y0, x1, y1) in CROPS.items():
    box = (int(x0 * d.width), int(y0 * d.height), int(x1 * d.width), int(y1 * d.height))
    c = d.crop(box)
    c = ImageEnhance.Brightness(c).enhance(0.70)   # ровно −30 %
    save(fit(c, 1600), OUT / 'placeholder' / f'{name}.jpg', q=78)
