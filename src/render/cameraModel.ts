// Modelo de cámara puro: centro (cx, cy) en coordenadas de mundo y zoom.
// Phaser solo copia estos valores a su cámara; así la lógica se prueba sin navegador.
export interface CameraModel {
  cx: number;
  cy: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export function createCameraModel(
  bounds: CameraModel['bounds'],
  options: { minZoom: number; maxZoom: number; zoom: number },
): CameraModel {
  const cam: CameraModel = {
    cx: (bounds.minX + bounds.maxX) / 2,
    cy: (bounds.minY + bounds.maxY) / 2,
    zoom: options.zoom,
    minZoom: options.minZoom,
    maxZoom: options.maxZoom,
    bounds,
  };
  clampCamera(cam);
  return cam;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** El centro de la cámara nunca sale del rectángulo del mapa. */
export function clampCamera(cam: CameraModel): void {
  cam.zoom = clamp(cam.zoom, cam.minZoom, cam.maxZoom);
  cam.cx = clamp(cam.cx, cam.bounds.minX, cam.bounds.maxX);
  cam.cy = clamp(cam.cy, cam.bounds.minY, cam.bounds.maxY);
}

/** Mueve el mapa como si se arrastrara (dx, dy en píxeles de pantalla). */
export function panCamera(cam: CameraModel, dx: number, dy: number): void {
  cam.cx -= dx / cam.zoom;
  cam.cy -= dy / cam.zoom;
  clampCamera(cam);
}

/** Convierte un punto de pantalla (relativo al centro de la vista) en coordenadas de mundo. */
export function screenToWorld(cam: CameraModel, sx: number, sy: number, viewW: number, viewH: number) {
  return { x: cam.cx + (sx - viewW / 2) / cam.zoom, y: cam.cy + (sy - viewH / 2) / cam.zoom };
}

/** Zoom manteniendo fijo bajo el dedo/ratón el punto de pantalla (sx, sy). */
export function zoomCameraAt(
  cam: CameraModel,
  factor: number,
  sx: number,
  sy: number,
  viewW: number,
  viewH: number,
): void {
  const before = screenToWorld(cam, sx, sy, viewW, viewH);
  cam.zoom = clamp(cam.zoom * factor, cam.minZoom, cam.maxZoom);
  const after = screenToWorld(cam, sx, sy, viewW, viewH);
  cam.cx += before.x - after.x;
  cam.cy += before.y - after.y;
  clampCamera(cam);
}
