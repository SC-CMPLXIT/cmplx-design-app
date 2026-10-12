const DB_NAME = "cmplx-design-discovery-files";
const STORE = "files";

const urls = new Map<string, string>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open demo files."));
  });
}

export async function putDemoFile(id: string, blob: Blob): Promise<void> {
  const existing = urls.get(id);
  if (existing) URL.revokeObjectURL(existing);
  urls.delete(id);
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not store the demo file."));
  });
  db.close();
}

export async function getDemoFileUrl(id: string): Promise<string | null> {
  const cached = urls.get(id);
  if (cached) return cached;
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => {
      const value = request.result;
      resolve(value instanceof Blob ? value : null);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not read the demo file."));
  });
  db.close();
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  return url;
}

export function clearDemoFiles(): void {
  for (const url of urls.values()) URL.revokeObjectURL(url);
  urls.clear();
  const request = indexedDB.deleteDatabase(DB_NAME);
  request.onerror = () => undefined;
}
