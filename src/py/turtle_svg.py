"""Render only the bounded turtle command vocabulary as an inert SVG MIME image."""
import html
import math

def number(value):
    try:
        value=float(value)
        return str(max(-1e7,min(1e7,value))) if math.isfinite(value) else '0'
    except (ValueError,TypeError):return '0'
def esc(value):return html.escape(str(value),quote=True)
def render(item):
    width,height=number(item.get('width',800)),number(item.get('height',600))
    parts=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-float(width)/2} {-float(height)/2} {width} {height}" width="{width}" height="{height}">']
    for c in item.get('commands',[])[:200000]:
        op=c.get('op');color=esc(c.get('color','black'))
        if op=='bg':parts.append(f'<rect x="{-float(width)/2}" y="{-float(height)/2}" width="{width}" height="{height}" fill="{color}"/>')
        elif op=='line':parts.append(f'<path d="M{number(c.get("x1"))} {number(-c.get("y1",0))}L{number(c.get("x2"))} {number(-c.get("y2",0))}" fill="none" stroke="{color}" stroke-width="{number(c.get("width",1))}"/>')
        elif op=='dot':parts.append(f'<circle cx="{number(c.get("x"))}" cy="{number(-c.get("y",0))}" r="{number(c.get("size",1)/2)}" fill="{color}"/>')
        elif op=='fill':
            points=' '.join(f'{number(p[0])},{number(-p[1])}' for p in c.get('points',[]))
            parts.append(f'<polygon points="{points}" fill="{color}"/>')
        elif op=='text':parts.append(f'<text x="{number(c.get("x"))}" y="{number(-c.get("y",0))}" fill="{color}">{esc(c.get("text",""))}</text>')
    return ''.join(parts)+'</svg>'
