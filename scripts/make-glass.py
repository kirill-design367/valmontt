#!/usr/bin/env python3
"""
Печёт размытые подложки для линзы.

Зачем: живой `backdrop-filter` пересчитывает размытие в каждом кадре, где под
ним что-то шевельнулось, — а под линзой всё время едет параллакс. Замер (см.
scripts/lens-perf.mjs) показал на этом ровно −10 кадров.

Решение: то же изображение, что лежит в подложке hero, уменьшается и
размывается ОДИН РАЗ здесь. В браузере это обычная картинка без единого
фильтра: композитор растягивает её как текстуру.

Сила размягчения считается от ширины показа: 800 px, растянутые на 1920,
плюс гауссиан 4.5 дают около 11 CSS-пикселей — глаз сквозь стекло читается
отчётливо, а не угадывается. Мобильная версия держит ту же долю от ширины
экрана.

    python3 scripts/make-glass.py
"""
import pathlib
from PIL import Image, ImageFilter

# (исходник, ширина промежуточного кадра, радиус размытия на этой ширине)
PLATES = [
    ('valmont-desktop.jpg', 800, 4.5),
    ('valmont-mobile.jpg', 420, 2.2),
]

pub = pathlib.Path('public')
for name, width, radius in PLATES:
    src = pub / name
    im = Image.open(src).convert('RGB')
    h = round(im.height * width / im.width)
    small = im.resize((width, h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(radius))

    out = pub / src.name.replace('.jpg', '-glass.jpg')
    small.save(out, 'JPEG', quality=82, optimize=True)
    small.save(out.with_suffix('.webp'), 'WEBP', quality=78, method=6)
    small.save(out.with_suffix('.avif'), 'AVIF', quality=60, speed=4)

    sizes = {p.suffix[1:]: p.stat().st_size / 1024 for p in
             (out, out.with_suffix('.webp'), out.with_suffix('.avif'))}
    print(f'{out.name:28} {width}×{h}  ' +
          '  '.join(f'{k} {v:.0f} КБ' for k, v in sizes.items()))
