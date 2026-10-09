import type { LocalApi, LocalRecord } from './saveManager.ts';

// Copia de seguridad en el dispositivo (IndexedDB). Protege el progreso si la nube no responde o Safari se cierra
// antes de terminar la subida. No sustituye a la nube: si el usuario borra los datos del sitio, se pierde.
const DB_NAME = 'empires-war';
const DB_VERSION = 2;
const STORE_V1 = 'saves';
const STORE = 'backups';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Este navegador no permite guardar en el dispositivo (IndexedDB no disponible).'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_V1)) db.createObjectStore(STORE_V1, { keyPath: 'slot' });
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'owner' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('No se pudo abrir el almacenamiento del dispositivo.'));
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest | void): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      // Solo se da por escrito cuando la transacción completa termina (atómica).
      t.oncomplete = () => resolve((req ? (req.result as T) : undefined) as T);
      t.onerror = () => reject(t.error ?? new Error('Error de almacenamiento local.'));
      t.onabort = () => reject(t.error ?? new Error('Se canceló la escritura local.'));
    });
  } finally {
    db.close();
  }
}

export const idbLocal: LocalApi = {
  async get(owner) {
    return ((await tx<LocalRecord | undefined>('readonly', (s) => s.get(owner))) ?? null) as LocalRecord | null;
  },
  async put(record) {
    await tx<void>('readwrite', (s) => {
      s.put(record);
    });
  },
  async remove(owner) {
    await tx<void>('readwrite', (s) => {
      s.delete(owner);
    });
  },
};
