#!/usr/bin/env python3
"""Empaqueta los renders de 0 A.D. (rama «renders-0ad») en el atlas militar del juego.

Uso: python3 scripts/art/build-0ad-atlas.py <carpeta_renders>
Salida: public/assets/0ad/atlas.png + atlas.json (JSON Hash de Phaser con anclas) + CREDITS.md + LICENSE-0AD.txt

Los renders salen al doble de densidad; aquí se reducen a la escala del juego (64 px por casilla).
Cada unidad se recorta con un mismo rectángulo para todos sus fotogramas, así el ancla (los pies) no salta.
"""
import json
import shutil
import sys
from pathlib import Path

from PIL import Image

SCALE = 0.5
DIRS = list(range(0, 360, 45))


def main(src: Path, out: Path) -> None:
    meta = json.loads((src / 'meta.json').read_text())
    items = []  # (clave, imagen, pivote x/y en píxeles de la imagen final)
    for key, m in meta.items():
        if 'anims' in m:
            paths = [(f'mil/{key}/{a}/{d}/{i}', src / key / a / str(d) / f'{i}.png')
                     for a, n in m['anims'].items() for d in DIRS for i in range(n)]
        else:
            paths = [(f'mil/{key}', src / key / 'idle.png')]
        ims = [(k, Image.open(p).convert('RGBA')) for k, p in paths]
        w, h = ims[0][1].size
        box = None
        for _, im in ims:
            b = im.getbbox()
            if b:
                box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
        px, py = m['pivot']['x'] * w, m['pivot']['y'] * h
        # El recorte siempre incluye el ancla.
        box = (min(box[0], int(px) - 1), min(box[1], int(py) - 1), max(box[2], int(px) + 1), max(box[3], int(py) + 1))
        for k, im in ims:
            c = im.crop(box)
            c = c.resize((max(1, round(c.width * SCALE)), max(1, round(c.height * SCALE))), Image.LANCZOS)
            items.append((k, c, ((px - box[0]) * SCALE, (py - box[1]) * SCALE)))

    W = 2048
    items.sort(key=lambda t: (-t[1].height, t[0]))
    x = y = shelf = 0
    placed = []
    for k, im, pv in items:
        if x + im.width > W:
            x, y, shelf = 0, y + shelf + 1, 0
        placed.append((k, im, pv, x, y))
        x += im.width + 1
        shelf = max(shelf, im.height)
    H = 1 << (y + shelf - 1).bit_length()
    sheet = Image.new('RGBA', (W, H))
    frames = {}
    for k, im, (pvx, pvy), px, py in placed:
        sheet.alpha_composite(im, (px, py))
        frames[k] = {
            'frame': {'x': px, 'y': py, 'w': im.width, 'h': im.height},
            'rotated': False, 'trimmed': False,
            'spriteSourceSize': {'x': 0, 'y': 0, 'w': im.width, 'h': im.height},
            'sourceSize': {'w': im.width, 'h': im.height},
            'pivot': {'x': round(pvx / im.width, 4), 'y': round(pvy / im.height, 4)},
        }
    out.mkdir(parents=True, exist_ok=True)
    sheet.save(out / 'atlas.png', optimize=True)
    commit = (src / 'zeroad-commit.txt').read_text().strip() if (src / 'zeroad-commit.txt').exists() else '?'
    units = {k: m['anims'] for k, m in meta.items() if 'anims' in m}
    (out / 'atlas.json').write_text(json.dumps({'frames': frames, 'meta': {
        'image': 'atlas.png', 'size': {'w': W, 'h': H}, 'scale': '1', 'source': commit,
        'license': 'CC-BY-SA-3.0', 'units': units}}, separators=(',', ':')), encoding='utf-8')
    if (src / 'LICENSE-0AD.txt').exists():
        shutil.copy(src / 'LICENSE-0AD.txt', out / 'LICENSE-0AD.txt')
    print(f'{len(placed)} fotogramas · atlas {W}x{H} · {(out / "atlas.png").stat().st_size // 1024} KiB')


if __name__ == '__main__':
    main(Path(sys.argv[1]), Path(__file__).resolve().parents[2] / 'public' / 'assets' / '0ad')
