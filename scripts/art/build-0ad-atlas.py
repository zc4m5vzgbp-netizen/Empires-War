#!/usr/bin/env python3
"""Empaqueta los renders de 0 A.D. (rama «renders-0ad») en el atlas militar del juego.

Uso: python3 scripts/art/build-0ad-atlas.py <carpeta_renders> [carpeta_salida] [prefijo]
  militar: … renders/zeroad-config            public/assets/0ad          mil
  aldeano: … renders/zeroad-villager          public/assets/0ad-villager eco
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


def clean(im: Image.Image) -> Image.Image:
    """Quita el ruido casi invisible del suelo que recoge sombras (alfa < 12): si no, el recorte no reduce nada."""
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v < 12 else v)
    return Image.merge('RGBA', (r, g, b, a))


def main(src: Path, out: Path, prefix: str = 'mil') -> None:
    meta = json.loads((src / 'meta.json').read_text())
    items = []  # (clave, imagen, pivote x/y en píxeles de la imagen final)
    touches_top = {}
    touches_edge = {}
    for key, m in meta.items():
        if 'anims' in m:
            paths = [(f'{prefix}/{key}/{a}/{d}/{i}', src / key / a / str(d) / f'{i}.png')
                     for a, n in m['anims'].items() for d in DIRS for i in range(n)]
        else:
            paths = [(f'{prefix}/{key}', src / key / 'idle.png')]
        ims = [(k, clean(Image.open(p).convert('RGBA'))) for k, p in paths]
        # ¿Algún fotograma toca el borde superior del render? Entonces la figura está cortada.
        touches_top[key] = any(im.split()[3].crop((0, 0, im.width, 1)).getbbox() is not None for _, im in ims)
        # Cualquier borde (izquierda, derecha, abajo): la imagen estaría recortada.
        edges = lambda a: [a.crop((0, 0, 1, a.height)), a.crop((a.width - 1, 0, a.width, a.height)), a.crop((0, a.height - 1, a.width, a.height))]
        touches_edge[key] = any(e.getbbox() is not None for _, im in ims for e in edges(im.split()[3]))
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

    # Ancho del atlas: 2048, o menos si hay pocas imágenes (potencia de 2 que quepa en una fila).
    W = min(2048, 1 << (sum(im.width + 1 for _, im, _ in items) - 1).bit_length())
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
    # Comprobación de regresión: los fotogramas de andar deben ser distintos entre sí.
    by_key = {k: im for k, im, _ in items}
    # Tamaño de la figura (dirección 270, primer fotograma) por animación: deben parecerse.
    figure_heights = {}
    for u, n in units.items():
        figure_heights[u] = {}
        for a in n:
            if a == 'death' or a not in ('idle', 'walk', 'attack'):
                continue  # tumbado o agachado (tareas): otra altura por naturaleza
            # Tamaño lineal = raíz del número de píxeles casi opacos (la sombra es semitransparente y no cuenta).
            alpha = by_key[f'{prefix}/{u}/{a}/270/0'].split()[3]
            figure_heights[u][a] = round(sum(alpha.histogram()[201:]) ** 0.5, 1)
    # Animaciones distintas entre sí: el primer fotograma (dirección 270) no puede repetirse entre dos animaciones.
    duplicates = []
    for u, n in units.items():
        seen = {}
        for a in n:
            b = by_key[f'{prefix}/{u}/{a}/270/0'].tobytes()
            if b in seen:
                duplicates.append(f'{u}: {a} = {seen[b]}')
            seen[b] = a
    walk_distinct = all(
        len({by_key[f'{prefix}/{u}/walk/270/{i}'].tobytes() for i in range(n['walk'])}) > 1 for u, n in units.items())
    (out / 'atlas.json').write_text(json.dumps({'frames': frames, 'meta': {
        'image': 'atlas.png', 'size': {'w': W, 'h': H}, 'scale': '1', 'source': commit,
        'license': 'CC-BY-SA-3.0', 'units': units, 'walkDistinct': walk_distinct, 'figureHeights': figure_heights, 'touchesTop': touches_top, 'duplicateAnims': duplicates, 'touchesEdge': touches_edge}}, separators=(',', ':')), encoding='utf-8')
    if (src / 'LICENSE-0AD.txt').exists():
        shutil.copy(src / 'LICENSE-0AD.txt', out / 'LICENSE-0AD.txt')
    print(f'{len(placed)} fotogramas · atlas {W}x{H} · {(out / "atlas.png").stat().st_size // 1024} KiB')


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[2]
    out = root / (sys.argv[2] if len(sys.argv) > 2 else 'public/assets/0ad')
    main(Path(sys.argv[1]), out, sys.argv[3] if len(sys.argv) > 3 else 'mil')
