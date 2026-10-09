// Todo dato de contenido o balance declara su procedencia (documento maestro v2, §4).
export type DataStatus = 'verified' | 'provisional';

export interface Sourced {
  /** Versión de referencia del dato, p. ej. una versión de balance de AoE II DE, o 'n/a'. */
  sourceVersion: string;
  /** De dónde sale el dato y por qué tiene este valor. */
  sourceNote: string;
  status: DataStatus;
}

export const PROVISIONAL_BLOCK0: Sourced = {
  sourceVersion: 'n/a',
  sourceNote: 'Contenido de prueba original del Bloque 0. No es un dato de AoE II DE.',
  status: 'provisional',
};
