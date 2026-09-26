// Local persistence for "visited" status (localStorage) and photo memories (IndexedDB).
// Everything lives in the browser — no backend required.

const VISITED_KEY = "castelos:visited";

const Storage = {
  // ---------- visited ----------

  _readVisited() {
    try {
      return JSON.parse(localStorage.getItem(VISITED_KEY) || "{}");
    } catch {
      return {};
    }
  },

  isVisited(castleId) {
    return Boolean(this._readVisited()[castleId]);
  },

  visitedIds() {
    return Object.keys(this._readVisited());
  },

  visitedCount() {
    return this.visitedIds().length;
  },

  setVisited(castleId, visited) {
    const data = this._readVisited();
    if (visited) {
      data[castleId] = { visitedAt: new Date().toISOString() };
    } else {
      delete data[castleId];
    }
    localStorage.setItem(VISITED_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent("visited-changed", { detail: { castleId, visited } }));
  },

  toggleVisited(castleId) {
    const next = !this.isVisited(castleId);
    this.setVisited(castleId, next);
    return next;
  },

  // ---------- photos (IndexedDB) ----------

  _dbPromise: null,

  _openDB() {
    if (this._dbPromise) return this._dbPromise;
    this._dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open("castelos-photos", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("photos")) {
          const store = db.createObjectStore("photos", { keyPath: "id", autoIncrement: true });
          store.createIndex("castleId", "castleId", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this._dbPromise;
  },

  async addPhoto(castleId, file) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("photos", "readwrite");
      const store = tx.objectStore("photos");
      const record = { castleId, dataUrl, addedAt: new Date().toISOString() };
      const req = store.add(record);
      req.onsuccess = () => resolve({ ...record, id: req.result });
      req.onerror = () => reject(req.error);
    });
  },

  async getPhotos(castleId) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("photos", "readonly");
      const store = tx.objectStore("photos");
      const index = store.index("castleId");
      const req = index.getAll(castleId);
      req.onsuccess = () => resolve(req.result.sort((a, b) => a.addedAt.localeCompare(b.addedAt)));
      req.onerror = () => reject(req.error);
    });
  },

  async deletePhoto(photoId) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("photos", "readwrite");
      tx.objectStore("photos").delete(photoId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async photoCountsByCastle() {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("photos", "readonly");
      const req = tx.objectStore("photos").getAll();
      req.onsuccess = () => {
        const counts = {};
        for (const p of req.result) counts[p.castleId] = (counts[p.castleId] || 0) + 1;
        resolve(counts);
      };
      req.onerror = () => reject(req.error);
    });
  },
};
