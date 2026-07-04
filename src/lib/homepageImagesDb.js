/**
 * homepageImagesDb.js
 * Frontend-only IndexedDB storage for homepage Collection & Poster images.
 * No backend interaction. Stores raw base64 image data at full quality.
 */

const DB_NAME = 'devi_times_homepage_db';
const DB_VERSION = 1;
const STORE_IMAGES = 'homepage_images';
const STORE_LISTS  = 'homepage_lists';

let _db = null;

function openDb() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES); // keyed by custom key strings
      }
      if (!db.objectStoreNames.contains(STORE_LISTS)) {
        db.createObjectStore(STORE_LISTS);
      }
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror  = (e) => reject(e.target.error);
  });
}

/** Save raw base64 image data under a unique key */
export async function saveImage(key, base64Data) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_IMAGES, 'readwrite');
    tx.objectStore(STORE_IMAGES).put(base64Data, key);
    tx.oncomplete = () => resolve();
    tx.onerror    = (e) => reject(e.target.error);
  });
}

/** Retrieve image data by key. Returns null if not found. */
export async function getImage(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_IMAGES, 'readonly');
    const req = tx.objectStore(STORE_IMAGES).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror   = (e) => reject(e.target.error);
  });
}

/** Delete image data by key */
export async function deleteImage(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_IMAGES, 'readwrite');
    tx.objectStore(STORE_IMAGES).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror    = (e) => reject(e.target.error);
  });
}

/** Save a JSON-serializable list under a name key */
export async function saveList(key, list) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LISTS, 'readwrite');
    tx.objectStore(STORE_LISTS).put(JSON.stringify(list), key);
    tx.oncomplete = () => resolve();
    tx.onerror    = (e) => reject(e.target.error);
  });
}

/** Retrieve a JSON list by name key. Returns null if not found. */
export async function getList(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_LISTS, 'readonly');
    const req = tx.objectStore(STORE_LISTS).get(key);
    req.onsuccess = () => {
      try { resolve(req.result ? JSON.parse(req.result) : null); }
      catch { resolve(null); }
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

/** Delete a list by key */
export async function deleteList(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_LISTS, 'readwrite');
    tx.objectStore(STORE_LISTS).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror    = (e) => reject(e.target.error);
  });
}

/** Read a File as base64 data URL at full quality (no compression) */
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e.target.error);
    reader.readAsDataURL(file);
  });
}

// ─── Named List Keys ────────────────────────────────────────────────────────
export const LIST_KEYS = {
  COLLECTIONS: 'custom_collections',
  POSTERS:     'custom_posters',
};

// ─── Image Key Helpers ───────────────────────────────────────────────────────
export const collectionImageKey = (id) => `collection_img_${id}`;
export const posterImageKey     = (id) => `poster_img_${id}`;
