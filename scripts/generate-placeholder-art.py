#!/usr/bin/env python3
"""
Плейсхолдеры для valmont-desktop.jpg / valmont-mobile.jpg.

Настоящие снимки грифона подставляются поверх этих файлов один в один — важно
только, чтобы глаз остался в тех же нормализованных координатах, потому что к
ним привязана рамка-линза (см. EYE в lib/stage.ts):

    десктоп 16:9  — (0.587, 0.238)
    мобайл  9:16  — (0.505, 0.232)

Палитра снята с герба: почти чёрный фон, малина, бирюза, янтарь, бронза.

    python3 scripts/generate-placeholder-art.py
"""

from __future__ import annotations

import math
import random

import numpy as np

from PIL import Image, ImageChops, ImageDraw, ImageFilter

SS = 2  # суперсэмплинг

VOID = (7, 7, 10)
CRIMSON = (176, 53, 103)
TEAL = (47, 125, 132)
AMBER = (209, 134, 60)
BRONZE = (107, 74, 42)
COAL = (26, 22, 24)

PLUME = [CRIMSON, TEAL, AMBER, BRONZE, COAL, CRIMSON, TEAL, COAL]


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def shade(c, k):
    return tuple(max(0, min(255, int(round(v * k)))) for v in c)


def radial(size, cx, cy, rx, ry, inner, outer, power=1.6):
    """Мягкое радиальное пятно — рисуем кольцами, потом размываем."""
    w, h = size
    layer = Image.new('RGB', size, outer)
    d = ImageDraw.Draw(layer)
    steps = 90
    for i in range(steps, 0, -1):
        t = i / steps
        col = lerp(inner, outer, t**power)
        d.ellipse(
            [cx - rx * t, cy - ry * t, cx + rx * t, cy + ry * t],
            fill=col,
        )
    return layer.filter(ImageFilter.GaussianBlur(min(w, h) * 0.02))


def feather(draw, x, y, length, width, angle, color, taper=0.55):
    """Перо-лист: две дуги от основания к острию, со светлым стержнем."""
    pts_r, pts_l = [], []
    steps = 12
    for i in range(steps + 1):
        t = i / steps
        # ширина: быстро набирает у основания, сходит в остриё
        wq = width * math.sin(math.pi * (t**taper)) * (1 - t * 0.35)
        along = length * t
        pts_r.append((along, wq * 0.5))
        pts_l.append((along, -wq * 0.5))
    outline = pts_r + pts_l[::-1]

    ca, sa = math.cos(angle), math.sin(angle)
    poly = [(x + px * ca - py * sa, y + px * sa + py * ca) for px, py in outline]
    draw.polygon(poly, fill=color)

    # стержень — чуть светлее, даёт объём при 100 % кропе
    spine = [
        (x + length * t * ca, y + length * t * sa) for t in (0.05, 0.35, 0.7, 0.96)
    ]
    draw.line(spine, fill=shade(color, 1.34), width=max(1, int(width * 0.09)))


def plume_pass(draw, rng, origin, spread, count, r0, r1, size_scale, bright, spin):
    """Веер перьев из одной точки — один слой оперения."""
    ox, oy = origin
    a0, a1 = spread
    for _ in range(count):
        t = rng.random()
        ang = a0 + (a1 - a0) * t + rng.uniform(-0.09, 0.09)
        rad = r0 + (r1 - r0) * (rng.random() ** 0.7)
        x = ox + math.cos(ang) * rad
        y = oy + math.sin(ang) * rad * 0.92

        base = PLUME[rng.randrange(len(PLUME))]
        # к краям оперение уходит в бронзу и темноту
        depth = min(1.0, rad / r1)
        col = lerp(base, COAL, depth * 0.66)
        # верхний свет
        lift = bright * (0.45 + 0.55 * max(0.0, math.cos(ang + spin)))
        col = shade(lerp(col, BRONZE, 0.22), 0.42 + 0.72 * lift)

        length = size_scale * rng.uniform(0.7, 1.45)
        feather(
            draw,
            x,
            y,
            length,
            length * rng.uniform(0.2, 0.33),
            ang + rng.uniform(-0.22, 0.22) + spin * 0.15,
            col,
        )


def eye(draw, cx, cy, r):
    """Янтарный глаз — единственная тёплая точка, на неё смотрит линза."""
    draw.ellipse([cx - r * 2.6, cy - r * 2.1, cx + r * 2.6, cy + r * 2.1],
                 fill=shade(BRONZE, 0.55))
    draw.ellipse([cx - r * 1.5, cy - r * 1.35, cx + r * 1.5, cy + r * 1.35],
                 fill=(28, 18, 12))
    for i in range(14, 0, -1):
        t = i / 14
        draw.ellipse(
            [cx - r * t, cy - r * t, cx + r * t, cy + r * t],
            fill=lerp((255, 214, 138), shade(AMBER, 0.55), t),
        )
    draw.ellipse([cx - r * 0.36, cy - r * 0.36, cx + r * 0.36, cy + r * 0.36],
                 fill=(14, 10, 8))
    draw.ellipse([cx - r * 0.62, cy - r * 0.72, cx - r * 0.18, cy - r * 0.3],
                 fill=(255, 250, 238))


def beak(draw, tip, gape, depth_pt):
    d1 = [tip, gape, depth_pt]
    draw.polygon(d1, fill=shade(BRONZE, 1.25))
    draw.polygon(
        [tip, ((tip[0] + gape[0]) / 2, (tip[1] + gape[1]) / 2 + 4), depth_pt],
        fill=shade(BRONZE, 0.72),
    )


def render(w, h, eye_nx, eye_ny, seed, out):
    rng = random.Random(seed)
    W, H = w * SS, h * SS
    ex, ey = eye_nx * W, eye_ny * H
    unit = min(W, H)

    # фон: холодная тьма + тёплый свет сверху-справа, как в оригинале
    img = radial((W, H), W * 0.86, H * 0.12, W * 0.75, H * 0.85,
                 (46, 34, 30), VOID, power=1.25)
    d = ImageDraw.Draw(img)

    # масса тела и шеи — уходит вниз-вправо от головы
    body = radial((W, H), ex + unit * 0.26, ey + unit * 0.72,
                  unit * 0.62, unit * 0.78, shade(BRONZE, 0.85), VOID, power=1.5)
    img = Image.blend(img, body, 0.75)
    d = ImageDraw.Draw(img)

    # дальние маховые — уходят вверх-влево, самые тёмные
    plume_pass(d, rng, (ex - unit * 0.10, ey + unit * 0.06), (math.radians(178), math.radians(268)),
               170, unit * 0.12, unit * 0.72, unit * 0.30, 0.55, -0.25)
    img = img.filter(ImageFilter.GaussianBlur(unit * 0.006))
    d = ImageDraw.Draw(img)

    # воротник — основная цветная масса
    plume_pass(d, rng, (ex + unit * 0.05, ey + unit * 0.16), (math.radians(20), math.radians(200)),
               420, unit * 0.10, unit * 0.52, unit * 0.17, 0.9, 0.35)

    # мелкое перо на голове — самое светлое и контрастное
    plume_pass(d, rng, (ex - unit * 0.01, ey - unit * 0.02), (math.radians(200), math.radians(370)),
               260, unit * 0.03, unit * 0.20, unit * 0.075, 1.15, -0.5)

    # клюв и глаз
    beak(d,
         (ex - unit * 0.245, ey + unit * 0.075),
         (ex - unit * 0.055, ey + unit * 0.115),
         (ex - unit * 0.075, ey - unit * 0.012))
    eye(d, ex, ey, unit * 0.021)

    # тёплый ореол вокруг глаза — складываем, а не смешиваем
    glow = Image.new('RGB', (W, H), (0, 0, 0))
    ImageDraw.Draw(glow).ellipse(
        [ex - unit * 0.085, ey - unit * 0.085, ex + unit * 0.085, ey + unit * 0.085],
        fill=(96, 58, 22))
    glow = glow.filter(ImageFilter.GaussianBlur(unit * 0.05))
    img = ImageChops.add(img, glow)

    # виньетка: маска яркости, затемняющая к краям кадра
    mask = radial((W, H), W * 0.58, H * 0.34, W * 0.80, H * 0.92,
                  (255, 255, 255), (36, 36, 40), power=1.15).convert('L')
    img = ImageChops.multiply(img, Image.merge('RGB', (mask, mask, mask)))

    # приглушаем насыщенность — оперение должно уходить в потемневшую бронзу
    hsv = img.convert('HSV')
    hh, ss_, vv = hsv.split()
    hsv = Image.merge('HSV', (hh, ss_.point(lambda v: int(v * 0.78)), vv))
    img = hsv.convert('RGB')

    img = img.resize((w, h), Image.LANCZOS)
    img = img.filter(ImageFilter.UnsharpMask(radius=1.4, percent=55, threshold=3))

    # Зерно запекаем в кадр, а не вешаем слоем поверх hero: полноэкранный
    # полупрозрачный слой пересобирается композитором каждый кадр параллакса.
    # Шум центрован вокруг нуля — иначе кадр уезжает по яркости.
    arr = np.asarray(img).astype(np.int16)
    grain = np.random.default_rng(seed).normal(0.0, 2.4, arr.shape[:2])
    arr = np.clip(arr + grain[:, :, None], 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    img.save(out, 'JPEG', quality=84, optimize=True, progressive=True)
    print(f'{out}  {w}×{h}  глаз в ({eye_nx}, {eye_ny})')


if __name__ == '__main__':
    render(2560, 1440, 0.587, 0.238, 20260801, 'public/valmont-desktop.jpg')
    render(1170, 2532, 0.505, 0.232, 20260802, 'public/valmont-mobile.jpg')
