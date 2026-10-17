#!/usr/bin/env python3
"""Nordic/Aurora redesign for the ielts-tracker app. Safe to run more than once.
Usage (from the project root):  python3 nordic_apply.py artifacts/ielts-tracker
"""
import colorsys, os, re, sys

APP = sys.argv[1] if len(sys.argv) > 1 else 'artifacts/ielts-tracker'
ROOT = os.path.join(APP, 'src')
if not os.path.isdir(ROOT):
    sys.exit('Cannot find ' + ROOT + ' - run this from the project root.')

PALETTE = {h.upper() for h in """
17243D 233B63 176B73 19C7B7 42E6B8 7C6CFF C56CFF F2C75C D95757 A9DCE8
F8FAFC FFFFFF DDF4F7 182238 64748B E3EAF0 94A3B8 F2F0FF FBEEEE FDF8EB F1F5F9
B8860B 6A5CE0 DAD6FF F4ECFF 000000 FFFBF1
""".split()}


TAILWIND_GRAY = {"E5E7EB":"E3EAF0","F3F4F6":"F1F5F9","9CA3AF":"94A3B8","6B7280":"64748B","374151":"182238","4B5563":"64748B","111827":"182238","D1D5DB":"E3EAF0","F9FAFB":"F8FAFC","334155":"182238"}


def classify(hexv: str) -> str:
    if hexv in TAILWIND_GRAY:
        return TAILWIND_GRAY[hexv]
    r, g, b = (int(hexv[i:i + 2], 16) / 255 for i in (0, 2, 4))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    h *= 360
    if hexv in PALETTE:
        return hexv
    # neutrals
    if s < 0.12:
        if l >= 0.96: return "F8FAFC"
        if l >= 0.82: return "E3EAF0"
        if l >= 0.5:  return "94A3B8"
        if l >= 0.3:  return "64748B"
        return "182238"
    # slate / blue-grey (already consistent with Secondary Text) - leave alone
    if s < 0.3 and 195 <= h <= 235:
        return hexv
    # warm beiges / sand backgrounds -> neutral frost
    if 25 <= h <= 70 and s < 0.3 and l >= 0.8:
        return "F8FAFC" if l >= 0.93 else "E3EAF0"
    if 75 <= h < 186:                      # green / teal family
        if l >= 0.88: return "DDF4F7"
        if l >= 0.7:  return "A9DCE8"
        if l >= 0.45: return "19C7B7"
        return "176B73"
    if 186 <= h < 225:                     # blue family
        if l >= 0.9:  return "DDF4F7"
        if l >= 0.7:  return "A9DCE8"
        return "233B63" if l >= 0.2 else "17243D"
    if 225 <= h < 301:                     # indigo / violet family
        if l >= 0.9:  return "F2F0FF"
        if l >= 0.72: return "DAD6FF"
        if l >= 0.45: return "7C6CFF"
        return "233B63"
    if 301 <= h < 346:                     # pink / magenta
        if l >= 0.85: return "F4ECFF"
        if l >= 0.35: return "C56CFF"
        return "233B63"
    if h >= 346 or h < 16:                 # red
        if l >= 0.88: return "FBEEEE"
        if l >= 0.78: return "FBEEEE"
        return "D95757"
    # orange / amber / yellow / brown
    if l >= 0.88: return "FDF8EB"
    if l >= 0.55: return "F2C75C"
    return "B8860B"


HEX = re.compile(r"#([0-9a-fA-F]{6})\b")
RGBA = re.compile(r"rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)")

FAMILY = {
    "teal": "teal", "emerald": "green", "green": "green", "lime": "green",
    "cyan": "sky", "sky": "sky", "blue": "blue",
    "indigo": "violet", "violet": "violet", "purple": "violet",
    "fuchsia": "pink", "pink": "pink", "rose": "red", "red": "red",
    "amber": "amber", "yellow": "amber", "orange": "amber",
}
#            soft      mid       main      strong    deep
SCALE = {
    "teal":   ["DDF4F7", "A9DCE8", "19C7B7", "176B73", "19C7B7"],
    "green":  ["E6FAF3", "B5F2DD", "42E6B8", "176B73", "42E6B8"],
    "sky":    ["E8F6FA", "A9DCE8", "A9DCE8", "233B63", "A9DCE8"],
    "blue":   ["E8EEF7", "A9DCE8", "233B63", "233B63", "233B63"],
    "violet": ["F2F0FF", "DAD6FF", "7C6CFF", "6A5CE0", "7C6CFF"],
    "pink":   ["F4ECFF", "EAD4FB", "C56CFF", "A24CE0", "C56CFF"],
    "red":    ["FBEEEE", "F4C4C4", "D95757", "D95757", "D95757"],
    "amber":  ["FDF8EB", "F8E8B3", "F2C75C", "B8860B", "F2C75C"],
}


def bucket(shade: int) -> int:
    if shade <= 100: return 0
    if shade <= 300: return 1
    if shade <= 500: return 2
    if shade <= 800: return 3
    return 4


PREFIX = r"(?:bg|text|border(?:-[trblxy])?|from|to|via|ring|fill|stroke|divide|outline|decoration|shadow|accent|caret|placeholder)"
TW = re.compile(
    r"(?<![\w-])(" + PREFIX + r")-(" + "|".join(FAMILY) + r")-(\d{2,3})((?:/\d+(?:\.\d+)?)?)(?![\w-])"
)


def tw_sub(m):
    pre, fam, shade, op = m.group(1), m.group(2), int(m.group(3)), m.group(4)
    return f"{pre}-[#{SCALE[FAMILY[fam]][bucket(shade)]}]{op}"


def hex_sub(m):
    return "#" + classify(m.group(1).upper())


def rgba_sub(m):
    r, g, b, a = int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4)
    hv = f"{r:02X}{g:02X}{b:02X}"
    new = classify(hv)
    if new == hv:
        return m.group(0)
    nr, ng, nb = (int(new[i:i + 2], 16) for i in (0, 2, 4))
    return f"rgba({nr}, {ng}, {nb}, {a})"


SKIP_FILES = {"index.css"}
changed = 0
for dp, dn, fn in os.walk(ROOT):
    if os.path.join("components", "ui") in dp:
        continue
    for f in fn:
        if not f.endswith((".tsx", ".ts")) or f in SKIP_FILES:
            continue
        p = os.path.join(dp, f)
        src = open(p, encoding="utf-8").read()
        out = TW.sub(tw_sub, src)
        out = HEX.sub(hex_sub, out)
        out = RGBA.sub(rgba_sub, out)
        # shadow-[...rgba(...)] arbitrary classes use rgba too (handled by RGBA above)
        if out != src:
            open(p, "w", encoding="utf-8").write(out)
            changed += 1
            print("updated", os.path.relpath(p, ROOT))
print("files changed:", changed)


# ---------------------------------------------------------------- extras
def edit(path, fn, label):
    p = os.path.join(APP, path)
    if not os.path.exists(p):
        print("SKIP (missing file):", label); return
    s = open(p, encoding="utf-8").read()
    out, n = fn(s)
    if n:
        open(p, "w", encoding="utf-8").write(out); print("ok  :", label)
    else:
        print("note: nothing to change (already done or pattern differs):", label)

# 1. sidebar active item -> aurora gradient
OLD = "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
edit("src/App.tsx", lambda s: (s.replace(OLD, "gradient-aurora text-white font-semibold shadow-sm"), s.count(OLD)), "sidebar active gradient")

# 2. headings Manrope 700
edit("src/index.css", lambda s: (s.replace("  h1, h2, h3, h4, h5, h6 {\n    @apply font-heading;\n  }", "  h1, h2, h3, h4, h5, h6 {\n    @apply font-heading font-bold;\n  }"), s.count("@apply font-heading;")), "heading weight 700")

# 3. hero font
edit("src/components/illustrations/IllustratedPageHero.tsx", lambda s: (s.replace("'Space Grotesk', sans-serif", "'Manrope', sans-serif"), s.count("Space Grotesk")), "hero font")

# 4. unused font links
def fonts(s):
    n = 0
    for pat in [r'[ \t]*<link href="https://fonts.googleapis.com/css2\?family=Space\+Grotesk[^\n]*\n',
                r'[ \t]*<link href="https://fonts.googleapis.com/css2\?family=Bricolage[^\n]*\n',
                r'[ \t]*<link href="https://fonts.googleapis.com/css2\?family=Caveat[^\n]*\n']:
        s, k = re.subn(pat, "", s); n += k
    if "&family=Poppins:wght@600;700;800;900" in s:
        s = s.replace("&family=Poppins:wght@600;700;800;900", ""); n += 1
    return s, n
edit("index.html", fonts, "remove unused fonts")

# 5. sign-in / sign-up restyle
HEADER = ("<div style={{ background: 'linear-gradient(120deg, #17243D, #233B63, #176B73)', padding: '2rem 2rem 1.75rem', textAlign: 'center', position: 'relative' }}>\n"
"          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 90% at 85% 0%, rgba(25,199,183,0.28), transparent 70%), radial-gradient(50% 80% at 10% 100%, rgba(124,108,255,0.22), transparent 70%)', pointerEvents: 'none' }} />\n"
"          <h1 style={{ position: 'relative', color: '#FFFFFF', fontFamily: \"'Manrope', sans-serif\", fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Within a Few Weeks</h1>\n"
"          <p style={{ position: 'relative', color: '#A9DCE8', fontSize: '0.875rem', marginTop: '0.25rem' }}>Master IELTS. Track your future.</p>\n"
"        </div>\n        <div style={{ padding: '2rem' }}>\n")

def auth(s):
    if "Within a Few Weeks</h1>" not in s or "position: 'relative', color: '#FFFFFF'" in s:
        return s, 0
    s = re.sub(r"<div style=\{\{ minHeight: '100vh', background: '#[0-9A-Fa-f]{6}'", "<div style={{ minHeight: '100vh', background: '#F8FAFC'", s)
    s, a = re.subn(r"<div style=\{\{ background: '#fff', borderRadius: '1rem', padding: '2rem', maxWidth: '420px', width: '100%', boxShadow: '0 4px 24px rgba\(0,0,0,0.08\)' \}\}>\n\s*<div style=\{\{ textAlign: 'center', marginBottom: '2rem' \}\}>\n.*?</div>\n",
        lambda m: "<div style={{ background: '#FFFFFF', borderRadius: '1rem', maxWidth: '420px', width: '100%', overflow: 'hidden', border: '1px solid #E3EAF0', boxShadow: '0 8px 30px rgba(23,36,61,0.08)' }}>\n        " + HEADER, s, flags=re.S, count=1)
    s, b = re.subn(r"background: loading \? '#[0-9A-Fa-f]{6}' : '#[0-9A-Fa-f]{6}', color: '#fff'",
        "background: 'linear-gradient(90deg, #19C7B7, #7C6CFF)', opacity: loading ? 0.7 : 1, color: '#17243D'", s)
    s, c = re.subn(r"      </div>\n    </div>\n  \);", "        </div>\n      </div>\n    </div>\n  );", s)
    if not (a and c):
        print("   WARNING: auth page layout differs; header band not applied, colors only")
        return s, b
    return s, a + b + c
edit("src/pages/SignInPage.tsx", auth, "sign-in page")
edit("src/pages/SignUpPage.tsx", auth, "sign-up page")
print("done")
