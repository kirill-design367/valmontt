"""Download Google Fonts variable binaries and audit real Cyrillic coverage."""
import re, subprocess, sys, json, os
from fontTools.ttLib import TTFont

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

# Акцидентные кандидаты на вордмарк и крупные заголовки + текстовые на интерфейс
CANDIDATES = {
    # акцидентные
    "Unbounded":    "Unbounded:wght@200..900",
    "Geologica":    "Geologica:wght@100..900",
    "Oswald":       "Oswald:wght@200..700",
    "Alumni":       "Alumni+Sans:wght@100..900",
    # текстовые
    "Onest":        "Onest:wght@100..900",
    "Inter":        "Inter:wght@100..900",
    "GolosText":    "Golos+Text:wght@400..900",
    "Commissioner": "Commissioner:wght@100..900",
    "Manrope":      "Manrope:wght@200..800",
}

# Full modern Russian alphabet, upper + lower, plus Ё/ё and the tricky ones.
RU_UPPER = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ"
RU_LOWER = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя"
EXTRA = "ІЇЄҐіїєґЎў₽№"   # ukr/bel + currency, "nice to have"
CRITICAL = "ЖФЩЪЫЬЙЦШЭЮЯ"


def fetch(url, out):
    subprocess.run(["curl", "-sSL", "-H", f"User-Agent: {UA}", "-o", out, url], check=True)


def css_for(spec):
    url = f"https://fonts.googleapis.com/css2?family={spec}&display=swap"
    return subprocess.run(
        ["curl", "-sSL", "-H", f"User-Agent: {UA}", url],
        capture_output=True, text=True, check=True).stdout


def audit(name, spec):
    css = css_for(spec)
    blocks = re.split(r"/\*\s*([a-z\-]+)\s*\*/", css)
    faces = {}
    for i in range(1, len(blocks) - 1, 2):
        subset, body = blocks[i], blocks[i + 1]
        m = re.search(r"src:\s*url\((https://[^)]+\.woff2)\)", body)
        if m:
            faces.setdefault(subset, m.group(1))
    if "cyrillic" not in faces:
        return {"name": name, "ok": False, "reason": "no cyrillic subset published"}

    path = f"{name}-cyrillic.woff2"
    fetch(faces["cyrillic"], path)
    f = TTFont(path)
    cmap = set()
    for t in f["cmap"].tables:
        cmap |= set(t.cmap.keys())

    def cover(s):
        return [c for c in s if ord(c) not in cmap]

    axes = {}
    if "fvar" in f:
        for a in f["fvar"].axes:
            axes[a.axisTag] = (a.minValue, a.defaultValue, a.maxValue)

    glyf = f["glyf"] if "glyf" in f else None
    def contours(ch):
        gname = f.getBestCmap().get(ord(ch))
        if not gname or glyf is None:
            return None
        g = glyf[gname]
        return g.numberOfContours

    missing_upper, missing_lower, missing_extra = cover(RU_UPPER), cover(RU_LOWER), cover(EXTRA)
    return {
        "name": name,
        "ok": not missing_upper and not missing_lower,
        "file_kb": round(os.path.getsize(path) / 1024, 1),
        "cmap_size": len(cmap),
        "missing_upper": "".join(missing_upper),
        "missing_lower": "".join(missing_lower),
        "missing_extra": "".join(missing_extra),
        "axes": axes,
        "critical_contours": {c: contours(c) for c in CRITICAL},
        "upm": f["head"].unitsPerEm,
        "capHeight": getattr(f["OS/2"], "sCapHeight", None),
        "xHeight": getattr(f["OS/2"], "sxHeight", None),
    }


if __name__ == "__main__":
    out = []
    for n, s in CANDIDATES.items():
        try:
            out.append(audit(n, s))
        except Exception as e:
            out.append({"name": n, "ok": False, "reason": f"{type(e).__name__}: {e}"})
    print(json.dumps(out, ensure_ascii=False, indent=1))
