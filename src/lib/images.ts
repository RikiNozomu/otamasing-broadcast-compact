/** Pictures (race photo, home background) are Blobs in IndexedDB: localStorage only holds ~5 MB of text. */
import { useEffect, useState } from "react";

const DB = "otamasing-broadcast-compact", STORE = "images";

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export const putImage = (key: string, blob: Blob) => tx("readwrite", (s) => s.put(blob, key));
export const deleteImage = (key: string) => tx("readwrite", (s) => s.delete(key));
export const getImage = (key: string) => tx<Blob | undefined>("readonly", (s) => s.get(key));

/** Key of a race's one picture from before the slideshow (kept as the racecard's first picture). New pictures are `photo:<id>`. */
export const raceImageKey = (id: string) => `race:${id}`;
export const HOME_BG = "home";

/** Object URL of a stored picture; reloads when `rev` changes. */
export function useImage(key: string, rev: number | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true, made: string | null = null;
    if (!rev) { setUrl(null); return; }
    getImage(key).then((b) => {
      if (!alive) return;
      made = b ? URL.createObjectURL(b) : null;
      setUrl(made);
    }).catch(() => alive && setUrl(null));
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [key, rev]);
  return url;
}
