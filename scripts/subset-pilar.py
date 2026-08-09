#!/usr/bin/env python3
"""
Готовит Pilar Regular к сборке: сабсет «кириллица + цифры + базовая
пунктуация» и упаковка в woff2.

Стилистические наборы ss01–ss03 сохраняются: они нужны витрине на /fonts.

    python3 scripts/subset-pilar.py <исходный.otf>
"""
import sys, pathlib
from fontTools import subset
from fontTools.ttLib import TTFont

SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/pilar/pilar_regular.otf'
OUT = pathlib.Path('public/fonts')
OUT.mkdir(parents=True, exist_ok=True)

# кириллица целиком + украинско-белорусские + ₽ и №, цифры, базовая пунктуация
UNICODES = (
    'U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116,U+20BD,'
    'U+0030-0039,'
    'U+0020,U+0021,U+0022,U+0027,U+0028-0029,U+002C-002F,U+003A-003B,'
    'U+003F,U+00AB,U+00BB,U+2010-2015,U+2018-201F,U+2026,U+00A0,U+002B,U+003D'
)

opts = subset.Options()
opts.layout_features = ['*']          # ss01–ss03, liga, calt, kern — всё сохраняем
opts.name_IDs = ['*']
opts.notdef_outline = True
opts.recalc_bounds = True
opts.drop_tables = []

font = subset.load_font(SRC, opts)
subsetter = subset.Subsetter(options=opts)
subsetter.populate(unicodes=subset.parse_unicodes(UNICODES))
subsetter.subset(font)

dst = OUT / 'pilar-regular.woff2'
opts.flavor = 'woff2'
subset.save_font(font, str(dst), opts)

before = pathlib.Path(SRC).stat().st_size / 1024
after = dst.stat().st_size / 1024
f = TTFont(dst)
feats = sorted({r.FeatureTag for r in f['GSUB'].table.FeatureList.FeatureRecord}) if 'GSUB' in f else []
cm = set()
for t in f['cmap'].tables: cm |= set(t.cmap.keys())
missing = ''.join(c for c in 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя0123456789' if ord(c) not in cm)
print(f'{SRC} {before:.0f} КБ → {dst} {after:.0f} КБ')
print('глифов в cmap:', len(cm), '| фичи:', feats)
print('потеряно из нужного набора:', repr(missing) or 'ничего')
