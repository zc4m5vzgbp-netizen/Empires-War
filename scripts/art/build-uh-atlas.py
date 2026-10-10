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

from PIL import Image

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
            'source': str(p.relative_to(uh)),
        }

    out.mkdir(parents=True, exist_ok=True)
    sheet.save(out / 'atlas.png', optimize=True)
    (out / 'atlas.json').write_text(
        json.dumps({'frames': meta, 'meta': {'image': 'atlas.png', 'size': {'w': W, 'h': H}, 'scale': '1',
                    'source': f'unknown-horizons@{UH_COMMIT}', 'license': 'CC-BY-SA-3.0'}}, indent=0),
        encoding='utf-8')
    print(f'{len(placed)} fotogramas · atlas {W}x{H} · {(out / "atlas.png").stat().st_size // 1024} KiB')


def anchor(im: Image.Image, kind: str) -> dict:
    """Punto del sprite que se apoya en el centro de su casilla/huella (fracción del tamaño)."""
    w, h = im.size
    a = im.split()[3]
    if kind == 'tile':
        # Rombo de 64x32 cuyo vértice inferior está 8 px por encima del borde (convención de UH).
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
