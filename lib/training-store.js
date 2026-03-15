const DB_NAME = 'crossword-training-data';
const DB_VERSION = 2;
const STORE_NAME = 'puzzles';

export class TrainingStore {
  constructor() {
    this.db = null;
  }

  async open() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (db.objectStoreNames.contains('samples')) {
          db.deleteObjectStore('samples');
        }
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
          });
          
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('gridSize', 'gridSize', { unique: false });
        }
      };
    });
  }

  async savePuzzle(puzzle) {
    const db = await this.open();
    
    const record = {
      sourceImage: puzzle.sourceImage,
      gridSize: puzzle.gridSize,
      gridBounds: puzzle.gridBounds,
      labels: puzzle.labels,
      timestamp: puzzle.timestamp || Date.now(),
      ocrProvider: puzzle.ocrProvider || 'unknown'
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(record);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getCount() {
    const db = await this.open();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllPuzzles() {
    const db = await this.open();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPuzzle(id) {
    const db = await this.open();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deletePuzzle(id) {
    const db = await this.open();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll() {
    const db = await this.open();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getStats() {
    const puzzles = await this.getAllPuzzles();
    
    let totalCells = 0;
    let totalLetters = 0;
    const gridSizes = { 15: 0, 21: 0 };

    for (const puzzle of puzzles) {
      const size = puzzle.gridSize || 15;
      gridSizes[size] = (gridSizes[size] || 0) + 1;
      totalCells += size * size;

      if (puzzle.labels) {
        for (const row of puzzle.labels) {
          for (const cell of row) {
            if (cell && cell !== '') {
              totalLetters++;
            }
          }
        }
      }
    }

    return {
      puzzleCount: puzzles.length,
      totalCells,
      totalLetters,
      gridSizes
    };
  }
}
