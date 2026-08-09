#!/usr/bin/env python3
"""
Готовит AVIF и WebP рядом с каждым JPEG в public/.

Кадр почти чёрный с плавными переходами в тенях — JPEG на низком битрейте
даёт там ступеньки. AVIF держит такие градиенты заметно лучше при вдвое
меньшем весе; WebP — фолбэк для браузеров без AVIF, JPEG остаётся
последним рубежом.

    python3 scripts/encode-images.py
"""
import pathlib
from PIL import Image

total = {'jpg': 0, 'webp': 0, 'avif': 0}
for src in sorted(pathlib.Path('public').rglob('*.jpg')):
    im = Image.open(src).convert('RGB')
    webp = src.with_suffix('.webp')
    avif = src.with_suffix('.avif')
    im.save(webp, 'WEBP', quality=78, method=6)
    im.save(avif, 'AVIF', quality=58, speed=4)
    j, w, a = (p.stat().st_size for p in (src, webp, avif))
    total['jpg'] += j; total['webp'] += w; total['avif'] += a
    print(f'{str(src):42} jpg {j/1024:6.0f}  webp {w/1024:6.0f}  avif {a/1024:6.0f} КБ')

print(f'\nвсего  jpg {total["jpg"]/1024:.0f} КБ → webp {total["webp"]/1024:.0f} → avif {total["avif"]/1024:.0f}')
