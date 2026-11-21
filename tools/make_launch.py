"""Run from the project folder: python3 tools/make_launch.py static

Launch images, and the lockup inside app.html's launch overlay: the app's ember backdrop with
"hb" and "home base" under it at the same width, 30% of the screen's width, centred. Both come
from one SVG of outlines (tools/lockup_svg.py), so what iOS shows first and what the app shows
next are the same drawing in the same place, and the overlay needs no image request (which
used to arrive a moment late and flick). Needs: pip install fonttools brotli uharfbuzz"""
import re, sys, pathlib
from playwright.sync_api import sync_playwright

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from lockup_svg import lockup_svg

LOCKUP = lockup_svg()

here = pathlib.Path(__file__).parent
static = pathlib.Path(sys.argv[1])
GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.85 0 0 0 -0.38'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
PAGE = f"""<!doctype html><html><head><style>
html, body {{ margin: 0; height: 100%; }}
body {{ background-color: #0b0807;
  background-image: {GRAIN}, radial-gradient(65% 42% at 92% 6%, rgb(218 100 36 / 0.6), transparent 72%),
    radial-gradient(60% 42% at 0% 68%, rgb(112 26 40 / 0.55), transparent 70%),
    radial-gradient(70% 36% at 60% 104%, rgb(160 72 30 / 0.28), transparent 72%);
  background-size: 240px 240px, 100% 100%, 100% 100%, 100% 100%; background-repeat: repeat, no-repeat, no-repeat, no-repeat; }}
body.bare {{ background: none; }}
.lockup {{ position: fixed; left: 50%; top: 50%; width: 30vw; transform: translate(-50%, -50%); }}
.lockup svg {{ display: block; width: 100%; height: auto; }}
</style></head><body data-ready="1"><div class="lockup">{LOCKUP}</div></body></html>"""
page = here / ".launch.html"
page.write_text(PAGE)
SIZES = [(1320,2868,3),(1206,2622,3),(1290,2796,3),(1179,2556,3),(1284,2778,3),(1170,2532,3),(1125,2436,3),(1242,2688,3),(828,1792,2),(750,1334,2)]
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h, dpr in SIZES:
        pg = b.new_page(viewport={"width": w // dpr, "height": h // dpr}, device_scale_factor=dpr)
        pg.goto(page.as_uri()); pg.wait_for_selector("body[data-ready]")
        pg.screenshot(path=str(static / "splash" / f"splash-{w}x{h}.png"))
        pg.close()
# Shrink: 256 colours with dithering (the grain hides it), about a third of the size.
from PIL import Image
for w, h, _ in SIZES:
    f = static / "splash" / f"splash-{w}x{h}.png"
    Image.open(f).convert("RGB").quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(f, optimize=True)
page.unlink()

# The same drawing into the launch overlay, between its markers in app.html.
app = pathlib.Path('src/app.html')
html = app.read_text()
html, count = re.subn(
    r'(<!-- launch-lockup -->).*?(<!-- /launch-lockup -->)',
    lambda m: m.group(1) + LOCKUP.replace('<svg ', '<svg class="launch-logo" ', 1) + m.group(2),
    html,
    flags=re.S,
)
assert count == 1, 'launch-lockup markers not found in app.html'
app.write_text(html)
print("ok")
