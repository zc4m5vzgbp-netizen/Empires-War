#!/usr/bin/env python3
"""Construye el atlas de arte de Empires-War a partir de los gráficos de Unknown Horizons.

Licencia de los gráficos: CC-BY-SA 3.0 (Unknown Horizons team, doc/LICENSE del repositorio).
Este script solo recorta/empaqueta: no modifica los dibujos. Ver public/assets/uh/CREDITS.md.

Uso:
  git clone --depth 1 https://github.com/unknown-horizons/unknown-horizons.git /ruta/uh
  python3 scripts/art/build-uh-atlas.py /ruta/uh

Salida: public/assets/uh/atlas.png + atlas.json (formato JSON Hash de Phaser, con anclas por fotograma).
"""
import json
import sys
from pathlib import Path

import random

from PIL import Image, ImageChops, ImageDraw, ImageFilter

UH_COMMIT = '702203736ef3bcf1884a2256a11152b2f372366c'
DIRS = [0, 45, 90, 135, 180, 225, 270, 315]


def frames(folder: Path):
    return sorted(p for p in folder.glob('*.png'))


def main(uh: Path, out: Path) -> None:
    g = uh / 'content' / 'gfx'
    # (clave, imagen, tipo de ancla)
    items: list[tuple[str, Path, str]] = []

    def add(key, path, kind):
        if not path.exists():
            raise SystemExit(f'falta {path}')
        items.append((key, path, kind))

    for i in range(6):
        add(f'tile/grass/{i}', g / f'base/moderate/ts_grass{i}/straight/45/0.png', 'tile')
    add('tile/dirt/0', g / 'base/moderate/ts_beach0/straight/45/0.png', 'tile')
    add('tile/water/0', g / 'base/moderate/ts_shallow0/straight/45/0.png', 'tile')

    # Transiciones: tierra con borde de hierba (sobre casillas de arena) y agua con orilla de arena.
    for name, folder in (('gb', 'ts_grass-beach0'), ('bs', 'ts_beach-shallow0')):
        for t in ('straight', 'curve_in', 'curve_out'):
            for r in (45, 135, 225, 315):
                add(f'{name}/{t}/{r}', next((g / f'base/moderate/{folder}/{t}/{r}').glob('*.png')), 'tile')

    trees = ['maple0', 'maple1', 'maple2', 'maple3', 'spruce0', 'spruce1', 'tupelo0', 'tupelo1', 'tupelo2', 'birch0']
    for t in trees:
        add(f'tree/{t}', g / f'terrain/trees/as_{t}/idle_full/45/0.png', 'foot')

    add('bld/townCenter', g / 'buildings/settlers/barracks/as_barracks0/idle/45/000.png', 'bld3')
    mill = frames(g / 'buildings/citizens/as_windmill0/work/45/tm_2000') or frames(g / 'buildings/citizens/as_windmill0/work/45')
    for n, p in enumerate(mill[::2]):
        add(f'bld/mill/{n}', p, 'bld2')

    def unit(prefix, base, anim):
        for d in DIRS:
            for n, p in enumerate(frames(base / anim / str(d))):
                add(f'{prefix}/{d}/{n}', p, 'foot')

    unit('vil/idle', g / 'units/farmer/as_farmer0', 'idle')
    unit('vil/walk', g / 'units/farmer/as_farmer0', 'move')
    unit('vil/carryidle', g / 'units/carrier/as_carrier0', 'idle_full')
    unit('vil/carry', g / 'units/carrier/as_carrier0', 'move_full')
    unit('sol/idle', g / 'units/army/as_groundunit0', 'idle')
    unit('sol/walk', g / 'units/army/as_groundunit0', 'move')
    unit('sol/attack', g / 'units/army/as_groundunit0', 'attack_melee')

    # Galería (solo para evaluar el estilo; no lo usa la partida).
    add('gal/stone', g / 'terrain/resources/as_stonedeposit0/idle/45/0.png', 'bld3')
    add('gal/tower', next(g.glob('buildings/pioneers/tower_wooden/*/idle/45/*.png')), 'bld2')
    add('gal/church', next(g.glob('buildings/settlers/clinker_church/*/idle/45/*.png')), 'bld2')
    add('gal/tavern', next(g.glob('buildings/settlers/tavern/*/idle/45/*.png')), 'bld2')
    add('gal/warehouse', next(g.glob('buildings/settlers/warehouse/*/idle/45/*.png')), 'bld3')

    images = [(k, Image.open(p).convert('RGBA'), kind, p) for k, p, kind in items]
    images += derived(g)

    # Empaquetado por estantes (sin recortar, así el origen del sprite es exacto). 1 px de separación.
    W = 1024
    images.sort(key=lambda t: (-t[1].height, t[0]))
    x = y = shelf = 0
    placed = []
    for k, im, kind, p in images:
        if x + im.width > W:
            x, y, shelf = 0, y + shelf + 1, 0
        placed.append((k, im, kind, p, x, y))
        x += im.width + 1
        shelf = max(shelf, im.height)
    H = y + shelf
    H = 1 << (H - 1).bit_length()
    if H > 4096:
        raise SystemExit(f'atlas demasiado alto: {H}')

    sheet = Image.new('RGBA', (W, H))
    meta = {}
    for k, im, kind, p, px, py in placed:
        sheet.alpha_composite(im, (px, py))
        meta[k] = {
            'frame': {'x': px, 'y': py, 'w': im.width, 'h': im.height},
            'rotated': False,
            'trimmed': False,
            'spriteSourceSize': {'x': 0, 'y': 0, 'w': im.width, 'h': im.height},
            'sourceSize': {'w': im.width, 'h': im.height},
            'pivot': anchor(im, kind),
            'source': str(p.relative_to(uh)) + (' (derivado)' if k.startswith('res/') else ''),
        }

    out.mkdir(parents=True, exist_ok=True)
    sheet.save(out / 'atlas.png', optimize=True)
    (out / 'atlas.json').write_text(
        json.dumps({'frames': meta, 'meta': {'image': 'atlas.png', 'size': {'w': W, 'h': H}, 'scale': '1',
                    'source': f'unknown-horizons@{UH_COMMIT}', 'license': 'CC-BY-SA-3.0'}}, indent=0),
        encoding='utf-8')
    print(f'{len(placed)} fotogramas · atlas {W}x{H} · {(out / "atlas.png").stat().st_size // 1024} KiB')


def derived(g: Path):
    """Sprites derivados (misma licencia CC-BY-SA 3.0): recortes y recoloreado de arte de UH."""
    out = []
    # Piedra: montón central del yacimiento de piedra, con bordes difuminados para fundirse con la hierba.
    src = g / 'terrain/resources/as_stonedeposit0/idle/45/0.png'
    dep = Image.open(src).convert('RGBA')
    crop = dep.crop((56, 60, 136, 116))
    mask = Image.new('L', crop.size, 0)
    ImageDraw.Draw(mask).ellipse((4, 6, crop.width - 4, crop.height - 2), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(5))
    alpha = ImageChops.multiply(crop.split()[3], mask)
    stone = crop.copy()
    stone.putalpha(alpha)
    out.append(('res/stone', stone, ('pivot', 44 / 80, 32 / 56), src))
    # Oro: el mismo montón con las rocas teñidas de oro (luminancia → degradado marrón-oro-amarillo pálido).
    gray = crop.convert('L')
    lut_r = [min(255, int(60 + v * 1.0)) for v in range(256)]
    lut_g = [min(255, int(40 + v * 0.82)) for v in range(256)]
    lut_b = [min(255, int(10 + v * 0.25)) for v in range(256)]
    gold = Image.merge('RGB', (gray.point(lut_r), gray.point(lut_g), gray.point(lut_b))).convert('RGBA')
    # Solo las rocas (zonas claras) se doran; la tierra del hoyo conserva su color.
    rocks = gray.point(lambda v: 255 if v > 120 else int(max(0, v - 70) * 5)).filter(ImageFilter.GaussianBlur(1))
    gold = Image.composite(gold, crop.convert('RGBA'), rocks)
    gold.putalpha(alpha)
    out.append(('res/gold', gold, ('pivot', 44 / 80, 32 / 56), src))
    # Arbusto de bayas: copa de un árbol de UH reducida a arbusto, con bayas rojas sombreadas.
    tsrc = g / 'terrain/trees/as_maple0/idle_full/45/0.png'
    tree = Image.open(tsrc).convert('RGBA')
    a = tree.split()[3]
    bbox = a.getbbox()
    crown = tree.crop((bbox[0], bbox[1], bbox[2], bbox[1] + int((bbox[3] - bbox[1]) * 0.62)))
    w = 38
    # Más ancho que alto: forma de arbusto, no de árbol.
    crown = crown.resize((w, max(1, int(crown.height * w / crown.width * 0.62))), Image.LANCZOS)
    bush = Image.new('RGBA', (44, 40))
    sh = Image.new('RGBA', bush.size)
    ImageDraw.Draw(sh).ellipse((6, 26, 42, 38), fill=(0, 0, 0, 90))
    bush.alpha_composite(sh.filter(ImageFilter.GaussianBlur(2)))
    bush.alpha_composite(crown, (3, 33 - crown.height))
    d = ImageDraw.Draw(bush)
    rnd = random.Random(7)
    ca = bush.split()[3]
    placed = 0
    while placed < 18:
        x, y = rnd.randint(8, 36), rnd.randint(32 - crown.height + 3, 29)
        if ca.getpixel((x, y)) < 200:
            continue
        d.ellipse((x - 1, y - 1, x + 1, y + 1), fill=(150, 18, 34, 255))
        d.point((x - 1, y - 1), fill=(240, 120, 130, 255))
        placed += 1
    out.append(('res/berry', bush, ('pivot', 0.5, 31 / 40), tsrc))
    return out


def anchor(im: Image.Image, kind) -> dict:
    """Punto del sprite que se apoya en el centro de su casilla/huella (fracción del tamaño)."""
    if isinstance(kind, tuple):
        return {'x': kind[1], 'y': kind[2]}
    w, h = im.size
    a = im.split()[3]
    if kind == 'tile':
        # Ancla común (32, 40). UH dibuja la arena y el agua algo más abajo que la hierba (niveles de altura) y sus
        # casillas de transición incluyen ese escalón; por eso entre hierba y agua siempre se pone una orilla de arena.
        return {'x': 0.5, 'y': (h - 8 - 16) / h}
    # Vértice inferior de la huella: el píxel opaco más bajo en la columna central (±2 px).
    bottom = 0
    for x in range(w // 2 - 2, w // 2 + 3):
        for y in range(h - 1, -1, -1):
            if a.getpixel((x, y)) > 8:
                bottom = max(bottom, y)
                break
    half = {'foot': 0, 'bld2': 32, 'bld3': 48}[kind]
    return {'x': 0.5, 'y': round((bottom - half) / h, 4)}


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    main(Path(sys.argv[1]), Path(__file__).resolve().parents[2] / 'public' / 'assets' / 'uh')
