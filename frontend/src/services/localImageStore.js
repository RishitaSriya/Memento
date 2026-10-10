const DB_NAME = 'memento_store';
const STORE_NAME = 'photos';
const DB_VERSION = 1;

let dbPromise = null;

function getDB() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        console.warn('Failed to open IndexedDB:', req.error);
        resolve(null);
      };
    });
  }
  return dbPromise;
}

const urlCache = new Map();

export async function storeImageBlob(id, fileOrBlob) {
  try {
    const db = await getDB();
    if (!db) {
      const url = URL.createObjectURL(fileOrBlob);
      urlCache.set(id, url);
      return url;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(fileOrBlob, id);
      tx.oncomplete = () => {
        const url = URL.createObjectURL(fileOrBlob);
        urlCache.set(id, url);
        resolve(url);
      };
      tx.onerror = () => {
        const url = URL.createObjectURL(fileOrBlob);
        urlCache.set(id, url);
        resolve(url);
      };
    });
  } catch (e) {
    const url = URL.createObjectURL(fileOrBlob);
    urlCache.set(id, url);
    return url;
  }
}

export async function getImageBlobUrl(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  try {
    const db = await getDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => {
        if (req.result) {
          const url = URL.createObjectURL(req.result);
          urlCache.set(id, url);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

export async function deleteImageBlob(id) {
  if (urlCache.has(id)) {
    try {
      URL.revokeObjectURL(urlCache.get(id));
    } catch (e) {}
    urlCache.delete(id);
  }
  try {
    const db = await getDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
  } catch (e) {}
}
