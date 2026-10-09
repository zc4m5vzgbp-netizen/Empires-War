// Almacenamiento de partidas en IndexedDB (solo navegador).
// Las partidas viven en este navegador: si el usuario borra los datos del sitio, se pierden.
const DB_NAME = 'empires-war';
const DB_VERSION = 1;
const STORE = 'saves';
export const DEFAULT_SLOT = 'partida-1';

export interface StoredSave {
  slot: string;
  savedAt: string;
  data: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Este navegador no permite guardar partidas (IndexedDB no disponible).'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'slot' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('No se pudo abrir el almacenamiento de partidas.'));
  });
}

/** Escribe la partida. La transacción solo se confirma si la escritura completa termina (atómica). */
export async function writeSave(save: StoredSave): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(save);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('No se pudo guardar la partida.'));
      tx.onabort = () => reject(tx.error ?? new Error('Se canceló el guardado.'));
    });
  } finally {
    db.close();
  }
}

export async function readSave(slot: string): Promise<StoredSave | null> {
  const db = await openDb();
  try {
    return await new Promise<StoredSave | null>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(slot);
      req.onsuccess = () => resolve((req.result as StoredSave | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error('No se pudo leer la partida.'));
    });
  } finally {
    db.close();
  }
}
