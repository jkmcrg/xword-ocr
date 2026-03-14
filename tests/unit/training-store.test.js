class TrainingStore {
  constructor() {
    this.db = null;
  }

  async open() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('crossword-training-data', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
    });
  }

  async saveSample(sample) {
    const db = await this.open();
    const imageArray = Array.from(sample.imageData.data);
    const record = {
      imageData: imageArray,
      width: sample.imageData.width,
      height: sample.imageData.height,
      label: sample.label.toUpperCase(),
      timestamp: sample.timestamp || Date.now()
    };
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['samples'], 'readwrite');
      const store = transaction.objectStore('samples');
      const request = store.add(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getCount() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['samples'], 'readonly');
      const store = transaction.objectStore('samples');
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllSamples() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['samples'], 'readonly');
      const store = transaction.objectStore('samples');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getLabelCounts() {
    const samples = await this.getAllSamples();
    const counts = {};
    for (const sample of samples) {
      counts[sample.label] = (counts[sample.label] || 0) + 1;
    }
    return counts;
  }

  async clearAll() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['samples'], 'readwrite');
      const store = transaction.objectStore('samples');
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

describe('TrainingStore', () => {
  let store;
  let mockDB;
  let mockObjectStore;
  let mockTransaction;
  let mockIndex;

  beforeEach(() => {
    store = new TrainingStore();
    
    mockIndex = {
      getAll: jest.fn()
    };
    
    mockObjectStore = {
      add: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      count: jest.fn(),
      createIndex: jest.fn(),
      index: jest.fn(() => mockIndex)
    };
    
    mockTransaction = {
      objectStore: jest.fn(() => mockObjectStore)
    };
    
    mockDB = {
      transaction: jest.fn(() => mockTransaction),
      objectStoreNames: {
        contains: jest.fn(() => true)
      },
      createObjectStore: jest.fn(() => mockObjectStore)
    };
  });

  describe('constructor', () => {
    it('should initialize with null db', () => {
      expect(store.db).toBeNull();
    });
  });

  describe('open', () => {
    it('should return existing db if already open', async () => {
      store.db = mockDB;
      
      const result = await store.open();
      
      expect(result).toBe(mockDB);
      expect(indexedDB.open).not.toHaveBeenCalled();
    });
  });

  describe('saveSample', () => {
    it('should convert imageData to array before saving', async () => {
      store.db = mockDB;
      store.open = jest.fn().mockResolvedValue(mockDB);
      
      const mockRequest = { 
        onsuccess: null, 
        onerror: null,
        result: 1
      };
      mockObjectStore.add.mockReturnValue(mockRequest);
      
      const sample = {
        imageData: { 
          data: new Uint8ClampedArray([1, 2, 3, 4]),
          width: 1,
          height: 1
        },
        label: 'A',
        timestamp: Date.now()
      };
      
      const savePromise = store.saveSample(sample);
      
      await Promise.resolve();
      mockRequest.onsuccess();
      
      await savePromise;
      
      expect(mockObjectStore.add).toHaveBeenCalled();
      const savedRecord = mockObjectStore.add.mock.calls[0][0];
      expect(savedRecord.label).toBe('A');
      expect(Array.isArray(savedRecord.imageData)).toBe(true);
    });

    it('should uppercase the label', async () => {
      store.db = mockDB;
      store.open = jest.fn().mockResolvedValue(mockDB);
      
      const mockRequest = { onsuccess: null, result: 1 };
      mockObjectStore.add.mockReturnValue(mockRequest);
      
      const sample = {
        imageData: { data: new Uint8ClampedArray([1, 2, 3, 4]) },
        label: 'a'
      };
      
      const savePromise = store.saveSample(sample);
      await Promise.resolve();
      mockRequest.onsuccess();
      await savePromise;
      
      const savedRecord = mockObjectStore.add.mock.calls[0][0];
      expect(savedRecord.label).toBe('A');
    });
  });

  describe('getCount', () => {
    it('should return the count of samples', async () => {
      store.db = mockDB;
      store.open = jest.fn().mockResolvedValue(mockDB);
      
      const mockRequest = { onsuccess: null, result: 42 };
      mockObjectStore.count.mockReturnValue(mockRequest);
      
      const countPromise = store.getCount();
      await Promise.resolve();
      mockRequest.onsuccess();
      
      const count = await countPromise;
      expect(count).toBe(42);
    });
  });

  describe('getAllSamples', () => {
    it('should return all samples from the store', async () => {
      store.db = mockDB;
      store.open = jest.fn().mockResolvedValue(mockDB);
      
      const mockSamples = [
        { id: 1, label: 'A' },
        { id: 2, label: 'B' }
      ];
      const mockRequest = { onsuccess: null, result: mockSamples };
      mockObjectStore.getAll.mockReturnValue(mockRequest);
      
      const getAllPromise = store.getAllSamples();
      await Promise.resolve();
      mockRequest.onsuccess();
      
      const samples = await getAllPromise;
      expect(samples).toEqual(mockSamples);
    });
  });

  describe('getLabelCounts', () => {
    it('should return counts for each label', async () => {
      const mockSamples = [
        { label: 'A' },
        { label: 'A' },
        { label: 'B' }
      ];
      store.getAllSamples = jest.fn().mockResolvedValue(mockSamples);
      
      const counts = await store.getLabelCounts();
      
      expect(counts).toEqual({ A: 2, B: 1 });
    });

    it('should return empty object for no samples', async () => {
      store.getAllSamples = jest.fn().mockResolvedValue([]);
      
      const counts = await store.getLabelCounts();
      
      expect(counts).toEqual({});
    });
  });

  describe('clearAll', () => {
    it('should clear all samples from the store', async () => {
      store.db = mockDB;
      store.open = jest.fn().mockResolvedValue(mockDB);
      
      const mockRequest = { onsuccess: null };
      mockObjectStore.clear.mockReturnValue(mockRequest);
      
      const clearPromise = store.clearAll();
      await Promise.resolve();
      mockRequest.onsuccess();
      
      await clearPromise;
      expect(mockObjectStore.clear).toHaveBeenCalled();
    });
  });
});
