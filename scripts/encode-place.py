#!/usr/bin/env python3
"""
Готовит кадры локаций к вебу.

Клиент прислал по два файла на локацию: горизонтальный 2752×1536 и
вертикальный 1536×2752. Пропорции НЕ номинальные: 1.792 вместо 1.778 у
шестнадцати к девяти и 0.558 вместо 0.5625 у девяти к шестнадцати. Кроп в
браузере считается от этих фактических чисел (см. `--ar` в Mesto.module.css),
поэтому здесь мы только уменьшаем и кодируем, ничего не подрезая.

Ширины выбраны по самому большому месту показа: горизонтальный кадр на
2560-м экране занимает 78vw = 1997 px, вертикальный на телефоне — 390 CSS-px
при плотности до 2.75, то есть 1073.

    python3 scripts/encode-place.py
"""
import pathlib
from PIL import Image

ЛОКАЦИИ = [
    # (имя в проекте, горизонтальный исходник, вертикальный исходник)
    ('doroga', 'Mountain_road_at_night_2K_202608101909.jpeg',
     'Headlights_on_empty_mountain_road_202608101909.jpeg'),
    ('vorota', 'Closed_wrought_iron_gates_2K_202608101909.jpeg',
     'Wrought_iron_gates_in_snow_202608101909.jpeg'),
    ('zal', 'Empty_ballroom_with_colored_lights_202608101910.jpeg',
     'Empty_ballroom_illuminated_by_li…_202608101910.jpeg'),
    ('terrasa', 'ht.jpeg',
     'Stone_terrace_on_alpine_mountain_202608101910.jpeg'),
]

ШИРИНА = {'wide': 2048, 'tall': 1080}

# Мастера лежат вне public: в статическом экспорте всё из public уезжает на
# сервер как есть, а восемь исходников — это 22 МБ, сайту не нужных.
исходники = pathlib.Path('source/place')
места = pathlib.Path('public/place')
места.mkdir(parents=True, exist_ok=True)

итого = {'jpg': 0, 'webp': 0, 'avif': 0}
for имя, гор, верт in ЛОКАЦИИ:
    for вид, исходник in (('wide', гор), ('tall', верт)):
        src = исходники / исходник
        im = Image.open(src).convert('RGB')
        w = min(ШИРИНА[вид], im.width)
        h = round(im.height * w / im.width)
        кадр = im.resize((w, h), Image.LANCZOS)

        out = места / f'{имя}-{вид}.jpg'
        кадр.save(out, 'JPEG', quality=82, optimize=True, progressive=True)
        кадр.save(out.with_suffix('.webp'), 'WEBP', quality=76, method=6)
        кадр.save(out.with_suffix('.avif'), 'AVIF', quality=55, speed=4)

        размеры = {p.suffix[1:]: p.stat().st_size / 1024 for p in
                   (out, out.with_suffix('.webp'), out.with_suffix('.avif'))}
        for k, v in размеры.items():
            итого[k] += v
        print(f'{out.name:20} {w}×{h}  ' +
              '  '.join(f'{k} {v:5.0f} КБ' for k, v in размеры.items()))

print('\nвсего  jpg {jpg:.0f} КБ   webp {webp:.0f}   avif {avif:.0f}'.format(**итого))
