#!/usr/bin/env python3
"""Renderiza unidades y edificios de 0 A.D. (Wildfire Games, CC-BY-SA 3.0) como sprites isométricos de Empires-War.

Dos fases (las ejecuta .github/workflows/render-0ad.yml):
  python3 scripts/art/zeroad.py fetch  <repo_0ad> <config.json>            # descarga solo los ficheros necesarios
  blender -b -P scripts/art/zeroad.py -- render <repo_0ad> <config.json> <salida>

El actor de 0 A.D. (XML) se resuelve a: malla con esqueleto, texturas, accesorios (cabeza, casco, arma, escudo…)
enganchados a sus puntos («prop-…») y animaciones (Idle, Walk, attack_*, Death). Se renderiza con Cycles en
proyección ortográfica 2:1 (la misma de la cuadrícula del juego), en 8 direcciones, con sombra sobre el suelo.
"""
import json
import math
import os
import subprocess
import sys
import xml.etree.ElementTree as ET

ART = 'binaries/data/mods/public/art'

# ---------------------------------------------------------------------------------------------- resolución de actores


class Resolver:
    def __init__(self, repo: str, fetch: bool):
        self.repo = repo
        self.fetch = fetch
        self.needed: set[str] = set()

    def path(self, rel: str) -> str:
        return os.path.join(self.repo, ART, rel)

    def ensure(self, rel: str) -> str | None:
        """Devuelve la ruta local; en modo fetch descarga el fichero (clon parcial de git)."""
        full = self.path(rel)
        if not os.path.exists(full) and self.fetch:
            subprocess.run(['git', '-C', self.repo, 'checkout', 'HEAD', '--', f'{ART}/{rel}'],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if os.path.exists(full):
            self.needed.add(rel)
            return full
        return None

    def texture(self, rel: str) -> str | None:
        base, _ = os.path.splitext(rel)
        for ext in ('.png', '.dds', '.tga'):
            p = self.ensure(f'textures/skins/{base}{ext}')
            if p:
                return p
        return None

    def xml(self, rel: str):
        p = self.ensure(rel)
        if not p:
            raise SystemExit(f'falta {rel}')
        return ET.parse(p).getroot()

    def variant_nodes(self, v):
        """Una variante y las que incluye con file= (recursivo)."""
        out = [v]
        f = v.get('file')
        if f:
            out += self.variant_nodes(self.xml(f'variants/{f}'))
        return out

    def actor(self, rel: str) -> dict:
        root = self.xml(f'actors/{rel}')
        a = {'mesh': None, 'textures': {}, 'color': None, 'props': [], 'anims': {},
             'material': (root.findtext('material') or '').strip()}
        for group in root.findall('group'):
            variants = group.findall('variant')
            if not variants:
                continue
            # Animaciones: de todas las variantes (estados), la primera de cada nombre.
            for v in variants:
                for node in self.variant_nodes(v):
                    for an in node.iter('animation'):
                        name = (an.get('name') or '').lower()
                        if name and name not in a['anims'] and an.get('file'):
                            a['anims'][name] = an.get('file')
            # Aspecto: la primera variante del grupo (la predeterminada).
            for node in self.variant_nodes(variants[0]):
                m = node.findtext('mesh')
                if m:
                    a['mesh'] = m.strip()
                for t in node.iter('texture'):
                    if t.get('file'):
                        a['textures'][t.get('name') or 'baseTex'] = t.get('file')
                c = node.findtext('color')
                if c:
                    a['color'] = [int(x) / 255 for x in c.split()]
                props = node.find('props')
                if props is not None:
                    for p in props.findall('prop'):
                        # Las capas llevan su propio esqueleto animado: sin él quedarían rígidas, se omiten.
                        if p.get('actor') and 'capes/' not in p.get('actor'):
                            a['props'].append({'point': p.get('attachpoint'), 'actor': p.get('actor')})
        return a

    def collect(self, rel: str, wanted_anims: list[str] | None = None) -> dict:
        """Actor con accesorios resueltos (recursivo) y ficheros descargados."""
        a = self.actor(rel)
        if a['mesh']:
            self.ensure(f"meshes/{a['mesh']}")
        if 'baseTex' in a['textures']:
            a['tex_path'] = self.texture(a['textures']['baseTex'])
        a['props'] = [dict(p, data=self.collect(p['actor'])) for p in a['props']]
        if wanted_anims:
            for key in wanted_anims:
                f = a['anims'].get(key.lower())
                if f:
                    self.ensure(f'animation/{f}')
        return a


# ---------------------------------------------------------------------------------------------------- renderizado

PX_PER_M = 11.3137 * 2  # 64 px de rombo = casilla de 4 m; se renderiza al doble y el juego lo muestra a 0,5
PLAYER = (0x2F / 255, 0x63 / 255, 0xC9 / 255)  # azul del jugador 1 (provisional: el color va «horneado»)


def render(repo: str, cfg: dict, out: str) -> None:
    import bpy
    from bpy_extras.object_utils import world_to_camera_view
    from mathutils import Matrix, Vector

    res = Resolver(repo, fetch=False)
    meta = {}

    def reset():
        bpy.ops.wm.read_factory_settings(use_empty=True)
        sc = bpy.context.scene
        sc.render.engine = 'CYCLES'
        sc.cycles.device = 'CPU'
        sc.cycles.samples = cfg.get('samples', 24)
        sc.cycles.use_denoising = False
        sc.render.film_transparent = True
        sc.render.image_settings.color_mode = 'RGBA'
        sc.view_settings.view_transform = 'Standard'
        world = bpy.data.worlds.new('w')
        world.use_nodes = True
        world.node_tree.nodes['Background'].inputs[0].default_value = (0.55, 0.58, 0.62, 1)
        world.node_tree.nodes['Background'].inputs[1].default_value = 0.9
        sc.world = world
        sun = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
        sun.data.energy = 3.2
        sun.data.angle = math.radians(8)
        # Luz desde arriba a la izquierda de la pantalla, como el arte de Unknown Horizons.
        sun.rotation_euler = (math.radians(45), 0, math.radians(-100))
        sc.collection.objects.link(sun)
        bpy.ops.mesh.primitive_plane_add(size=200)
        ground = bpy.context.object
        ground.is_shadow_catcher = True
        cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
        cam.data.type = 'ORTHO'
        # Ortográfica 2:1: elevación 30° (sin 30° = 0,5) y vista en diagonal (45°).
        cam.rotation_euler = (math.radians(60), 0, math.radians(45))
        d = Vector((0, 0, 1))
        d.rotate(cam.rotation_euler)
        cam.location = d * 100
        cam.data.clip_end = 1000
        sc.collection.objects.link(cam)
        sc.camera = cam
        return sc, cam

    def material(name, tex_path, mat_kind, color):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        nt = m.node_tree
        bsdf = nt.nodes['Principled BSDF']
        bsdf.inputs['Roughness'].default_value = 0.8
        if tex_path:
            img = nt.nodes.new('ShaderNodeTexImage')
            img.image = bpy.data.images.load(tex_path, check_existing=True)
            rgb = img.outputs['Color']
            if 'player' in mat_kind or 'objectcolor' in mat_kind:
                # Zonas con alfa < 1 llevan el color del jugador (u objeto, p. ej. el pelo).
                mix = nt.nodes.new('ShaderNodeMix')
                mix.data_type = 'RGBA'
                tint = color if 'objectcolor' in mat_kind and color else PLAYER
                mix.inputs['A'].default_value = (*tint, 1)
                nt.links.new(img.outputs['Alpha'], mix.inputs['Factor'])
                nt.links.new(rgb, mix.inputs['B'])
                if 'objectcolor' in mat_kind:
                    mul = nt.nodes.new('ShaderNodeMix')
                    mul.data_type = 'RGBA'
                    mul.blend_type = 'MULTIPLY'
                    mul.inputs['Factor'].default_value = 1
                    nt.links.new(rgb, mul.inputs['A'])
                    mul.inputs['B'].default_value = (*tint, 1)
                    nt.links.new(mul.outputs['Result'], mix.inputs['A'])
                rgb = mix.outputs['Result']
            elif 'trans' in mat_kind:
                nt.links.new(img.outputs['Alpha'], bsdf.inputs['Alpha'])
                m.blend_method = 'CLIP' if hasattr(m, 'blend_method') else None
            nt.links.new(rgb, bsdf.inputs['Base Color'])
        return m

    def import_dae(rel):
        before = set(bpy.data.objects)
        bpy.ops.wm.collada_import(filepath=res.path(rel), fix_orientation=False, find_chains=False,
                                  auto_connect=False, keep_bind_info=True)
        return [o for o in bpy.data.objects if o not in before]

    def find_point(objs, point):
        names = {f'prop-{point}', f'prop_{point}', point}
        for o in objs:
            if o.type == 'ARMATURE':
                for b in o.data.bones:
                    if b.name in names:
                        return o, b.name
        for o in objs:
            base = o.name.split('.')[0]
            if base in names or base.endswith(f'prop-{point}') or base.endswith(f'prop_{point}'):
                return o, None
        return None, None

    def build(actor, parent_objs=None, point=None, depth=0):
        objs = import_dae(f"meshes/{actor['mesh']}") if actor['mesh'] else []
        mat = material(f'm{len(bpy.data.materials)}', actor.get('tex_path'), actor['material'], actor['color'])
        for o in objs:
            if o.type == 'MESH':
                o.data.materials.clear()
                o.data.materials.append(mat)
        roots = [o for o in objs if o.parent is None]
        if parent_objs is not None and point and point != 'root':
            target, bone = find_point(parent_objs, point)
            if target is not None:
                for r in roots:
                    c = r.constraints.new('CHILD_OF')
                    c.target = target
                    if bone:
                        c.subtarget = bone
                    c.inverse_matrix = Matrix.Identity(4)
        elif parent_objs is not None:
            host = next((o for o in parent_objs if o.parent is None), None)
            for r in roots:
                if host is not None and r is not host:
                    r.parent = host
        for p in actor['props']:
            objs += build(p['data'], objs, p['point'], depth + 1)
        return objs

    def frame_box(cam, objs, size):
        bpy.context.scene.render.resolution_x, bpy.context.scene.render.resolution_y = size
        cam.data.ortho_scale = max(size) / PX_PER_M

    def save(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        bpy.context.scene.render.filepath = path
        bpy.ops.render.render(write_still=True)

    def debug(tag, objs):
        bpy.context.view_layer.update()
        for o in objs:
            if o.type != 'MESH':
                continue
            pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
            lo = [round(min(p[i] for p in pts), 2) for i in range(3)]
            hi = [round(max(p[i] for p in pts), 2) for i in range(3)]
            par = (o.parent.name if o.parent else '-') + ('/' + o.constraints[0].subtarget if o.constraints else '')
            print('OBJ', tag, o.name, par, lo, hi, flush=True)

    def pivot(cam):
        p = world_to_camera_view(bpy.context.scene, cam, Vector((0, 0, 0)))
        return {'x': round(p.x, 4), 'y': round(1 - p.y, 4)}

    for u in cfg.get('units', []):
        sc, cam = reset()
        actor = res.collect(u['actor'])
        objs = build(actor)
        arm = next(o for o in objs if o.type == 'ARMATURE')
        root = arm
        while root.parent is not None:
            root = root.parent
        root.scale = (u.get('scale', 2.0),) * 3
        size = tuple(u.get('size', [128, 128]))
        debug(u['key'], objs)
        frame_box(cam, objs, size)
        cam.data.shift_y = u.get('shift_y', 0.25)
        meta[u['key']] = {'pivot': pivot(cam), 'anims': {}}
        for key, name in u['anims'].items():
            f = actor['anims'].get(name.lower())
            if not f:
                print('sin animación', u['key'], name)
                continue
            anim_objs = import_dae(f'animation/{f}')
            src = next((o for o in anim_objs if o.type == 'ARMATURE' and o.animation_data and o.animation_data.action), None)
            if src is None:
                print('animación vacía', f)
                continue
            action = src.animation_data.action
            for o in anim_objs:
                bpy.data.objects.remove(o, do_unlink=True)
            arm.animation_data_create()
            arm.animation_data.action = action
            start, end = action.frame_range
            n = u['frames'].get(key, 8)
            loop = key not in ('death',)
            frames = [start + (end - start) * i / (n if loop else max(1, n - 1)) for i in range(n)]
            meta[u['key']]['anims'][key] = n
            print('RENDER', u['key'], key, f, f'{start}-{end}', flush=True)
            for d in range(8):
                ang = d * 45
                # El modelo mira a −Y; se gira para que mire a la dirección de pantalla «ang» (0 = derecha).
                root.rotation_euler = (0, 0, math.radians(ang + u.get('face_offset', 135)))
                for i, fr in enumerate(frames):
                    sc.frame_set(int(fr), subframe=fr - int(fr))
                    save(os.path.join(out, u['key'], key, str(ang), f'{i}.png'))

    for b in cfg.get('buildings', []):
        sc, cam = reset()
        actor = res.collect(b['actor'])
        objs = build(actor)
        meshes = [o for o in objs if o.type == 'MESH']
        bpy.context.view_layer.update()
        xs, ys = [], []
        for o in meshes:
            for c in o.bound_box:
                w = o.matrix_world @ Vector(c)
                xs.append(w.x)
                ys.append(w.y)
        extent = max(max(xs) - min(xs), max(ys) - min(ys))
        scale = b['tiles'] * 4.0 / extent * b.get('fill', 1.0)
        for o in objs:
            if o.parent is None:
                o.scale = (scale,) * 3
                o.rotation_euler = (0, 0, math.radians(b.get('rotate', 0)))
        size = tuple(b.get('size', [384, 384]))
        debug(b['key'], objs)
        frame_box(cam, objs, size)
        cam.data.shift_y = b.get('shift_y', 0.15)
        meta[b['key']] = {'pivot': pivot(cam), 'tiles': b['tiles']}
        save(os.path.join(out, b['key'], 'idle.png'))

    os.makedirs(out, exist_ok=True)
    print('META', json.dumps(meta), flush=True)
    with open(os.path.join(out, 'meta.json'), 'w') as f:
        json.dump(meta, f, indent=1)


if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    mode, repo, cfg_path = argv[0], argv[1], argv[2]
    cfg = json.load(open(cfg_path))
    if mode == 'fetch':
        r = Resolver(repo, fetch=True)
        for u in cfg.get('units', []):
            r.collect(u['actor'], list(u['anims'].values()))
        for b in cfg.get('buildings', []):
            r.collect(b['actor'])
        print(f'{len(r.needed)} ficheros de 0 A.D.')
        for n in sorted(r.needed):
            print(' ', n)
    else:
        render(os.path.abspath(repo), cfg, os.path.abspath(argv[3]))
