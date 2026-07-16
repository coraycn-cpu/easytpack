const DB_NAME = "easytpack_images_v1";
const STORE = "images";
const DB_VERSION = 1;

export const IDB_IMAGE_PREFIX = "idb:";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

export function isIdbImageRef(value: string | undefined | null): boolean {
  return Boolean(value?.startsWith(IDB_IMAGE_PREFIX));
}

export function makeImageKey(projectId: string, slot: string): string {
  return `${projectId}::${slot}`;
}

export function toIdbRef(key: string): string {
  return `${IDB_IMAGE_PREFIX}${key}`;
}

export function keyFromIdbRef(ref: string): string | null {
  if (!isIdbImageRef(ref)) return null;
  return ref.slice(IDB_IMAGE_PREFIX.length);
}

export async function idbPutImage(key: string, dataUrl: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB put failed"));
    tx.objectStore(STORE).put(dataUrl, key);
  });
  db.close();
}

export async function idbGetImage(key: string): Promise<string | null> {
  const db = await openDb();
  const value = await new Promise<string | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () =>
      resolve(typeof req.result === "string" ? req.result : null);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB get failed"));
  });
  db.close();
  return value;
}

export async function idbDeleteKeys(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
    const store = tx.objectStore(STORE);
    for (const key of keys) store.delete(key);
  });
  db.close();
}

export async function idbDeleteProjectImages(projectId: string): Promise<void> {
  const db = await openDb();
  const prefix = `${projectId}::`;
  const keys = await new Promise<string[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAllKeys();
    req.onsuccess = () => {
      const all = (req.result as IDBValidKey[]).filter(
        (k): k is string => typeof k === "string" && k.startsWith(prefix),
      );
      resolve(all);
    };
    req.onerror = () => reject(req.error ?? new Error("IndexedDB keys failed"));
  });
  db.close();
  await idbDeleteKeys(keys);
}

/** Resolve a data URL or idb: ref to a usable data URL (pass-through if already data). */
export async function resolveImageRef(
  value: string | undefined | null,
): Promise<string | undefined> {
  if (!value) return undefined;
  if (!isIdbImageRef(value)) return value;
  const key = keyFromIdbRef(value);
  if (!key) return undefined;
  return (await idbGetImage(key)) ?? undefined;
}
