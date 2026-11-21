"""The "hb / home base" lockup as one SVG of outlines, so it needs no font and no image request.

Used by make_launch.py: the launch images are rendered from this SVG, and the same SVG is
written into app.html's launch overlay, so what iOS shows first and what the app shows next are
the same drawing. "hb" is Geist 700, "home base" Geist 500 underneath at the same width.
Needs: pip install fonttools brotli uharfbuzz
"""
import io
import pathlib

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

FONT = pathlib.Path('node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2')
INK = '#f5ede6'


def _line(blob, font_bytes, text, weight, tracking):
    """Outlines for one line at its natural size: (path data, width, ascent, descent) in font units."""
    face = hb.Face(font_bytes)
    font = hb.Font(face)
    font.set_variations({'wght': weight})
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {'kern': True})

    tt = TTFont(io.BytesIO(font_bytes))
    from fontTools.varLib.instancer import instantiateVariableFont

    tt = instantiateVariableFont(tt, {'wght': weight})
    glyphs = tt.getGlyphSet()
    upem = tt['head'].unitsPerEm
    pen = SVGPathPen(glyphs, ntos=lambda v: f'{round(v)}')
    x = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = tt.getGlyphName(info.codepoint)
        # Font units, y up; flip to SVG's y down as we go.
        glyphs[name].draw(TransformPen(pen, (1, 0, 0, -1, x + pos.x_offset, -pos.y_offset)))
        x += pos.x_advance + tracking * upem
    width = x - tracking * upem  # no trailing space after the last letter
    bounds = _bounds(glyphs, buf, tt, tracking, upem)
    return pen.getCommands(), width, bounds


def _bounds(glyphs, buf, tt, tracking, upem):
    from fontTools.pens.boundsPen import BoundsPen

    pen = BoundsPen(glyphs)
    x = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = tt.getGlyphName(info.codepoint)
        glyphs[name].draw(TransformPen(pen, (1, 0, 0, -1, x + pos.x_offset, -pos.y_offset)))
        x += pos.x_advance + tracking * upem
    return pen.bounds  # (xMin, yMin, xMax, yMax), y down


def _ttf_bytes():
    """The font as plain TrueType: HarfBuzz can't read woff2."""
    font = TTFont(FONT)
    font.flavor = None
    out = io.BytesIO()
    font.save(out)
    return out.getvalue()


def lockup_svg(width=300, ink=INK):
    """The lockup, `width` units wide, as a standalone <svg> string (viewBox scales freely)."""
    font_bytes = _ttf_bytes()
    top_path, _, top_box = _line(None, font_bytes, 'hb', 700, -0.04)
    name_path, _, name_box = _line(None, font_bytes, 'home base', 500, 0.01)

    # Scale each line so its inked width is exactly `width`, as the launch images had it.
    top_scale = width / (top_box[2] - top_box[0])
    name_scale = width / (name_box[2] - name_box[0])
    top_h = (top_box[3] - top_box[1]) * top_scale
    gap = width * 0.07
    name_h = (name_box[3] - name_box[1]) * name_scale
    height = top_h + gap + name_h

    def place(path, box, scale, y):
        return (
            f'<path transform="translate({-box[0] * scale:.2f} {y - box[1] * scale:.2f}) '
            f'scale({scale:.5f})" d="{path}"/>'
        )

    body = place(top_path, top_box, top_scale, 0) + place(name_path, name_box, name_scale, top_h + gap)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height:.2f}" '
        f'fill="{ink}">{body}</svg>'
    )


if __name__ == '__main__':
    svg = lockup_svg()
    print(len(svg), 'bytes')
    pathlib.Path('/tmp/lockup.svg').write_text(svg)
