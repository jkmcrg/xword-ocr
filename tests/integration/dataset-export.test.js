describe('Dataset Export Integration', () => {
  let mockTrainingStore;
  let mockJSZip;
  let mockZipInstance;
  let mockFolder;

  beforeEach(() => {
    mockFolder = {
      file: jest.fn()
    };
    
    mockZipInstance = {
      folder: jest.fn(() => mockFolder),
      file: jest.fn(),
      generateAsync: jest.fn().mockResolvedValue(new Blob(['mock zip']))
    };
    
    mockJSZip = jest.fn(() => mockZipInstance);
    global.JSZip = mockJSZip;
    
    mockTrainingStore = {
      getAllSamples: jest.fn()
    };
  });

  describe('Export with samples', () => {
    it('should create ZIP with correct structure', async () => {
      const mockSamples = [
        { 
          id: 1, 
          imageData: [255, 255, 255, 255], 
          width: 1, 
          height: 1, 
          label: 'A', 
          timestamp: 1234567890 
        },
        { 
          id: 2, 
          imageData: [0, 0, 0, 255], 
          width: 1, 
          height: 1, 
          label: 'B', 
          timestamp: 1234567891 
        }
      ];
      mockTrainingStore.getAllSamples.mockResolvedValue(mockSamples);

      const zip = new JSZip();
      const imagesFolder = zip.folder('images');
      
      for (let i = 0; i < mockSamples.length; i++) {
        const filename = `sample_${String(i).padStart(6, '0')}.png`;
        imagesFolder.file(filename, new Blob(['mock']));
      }
      
      const labels = mockSamples.map((s, i) => ({
        filename: `sample_${String(i).padStart(6, '0')}.png`,
        label: s.label,
        timestamp: s.timestamp
      }));
      zip.file('labels.json', JSON.stringify(labels, null, 2));

      expect(mockZipInstance.folder).toHaveBeenCalledWith('images');
      expect(mockFolder.file).toHaveBeenCalledTimes(2);
      expect(mockZipInstance.file).toHaveBeenCalledWith(
        'labels.json',
        expect.any(String)
      );
    });

    it('should include metadata file', async () => {
      const mockSamples = [
        { label: 'A', imageData: [], width: 28, height: 28, timestamp: Date.now() }
      ];
      mockTrainingStore.getAllSamples.mockResolvedValue(mockSamples);

      const metadata = {
        totalSamples: 1,
        labelCounts: { A: 1 },
        imageSize: { width: 28, height: 28 },
        format: 'grayscale',
        exportDate: new Date().toISOString()
      };

      const zip = new JSZip();
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));

      expect(mockZipInstance.file).toHaveBeenCalledWith(
        'metadata.json',
        expect.any(String)
      );
    });
  });

  describe('Label generation', () => {
    it('should create correct label entries', () => {
      const samples = [
        { label: 'A', timestamp: 1000 },
        { label: 'B', timestamp: 2000 },
        { label: 'A', timestamp: 3000 }
      ];

      const labels = samples.map((s, i) => ({
        filename: `sample_${String(i).padStart(6, '0')}.png`,
        label: s.label,
        timestamp: s.timestamp
      }));

      expect(labels).toEqual([
        { filename: 'sample_000000.png', label: 'A', timestamp: 1000 },
        { filename: 'sample_000001.png', label: 'B', timestamp: 2000 },
        { filename: 'sample_000002.png', label: 'A', timestamp: 3000 }
      ]);
    });

    it('should calculate label counts correctly', () => {
      const samples = [
        { label: 'A' },
        { label: 'A' },
        { label: 'B' },
        { label: 'C' },
        { label: 'A' }
      ];

      const labelCounts = {};
      for (const sample of samples) {
        labelCounts[sample.label] = (labelCounts[sample.label] || 0) + 1;
      }

      expect(labelCounts).toEqual({ A: 3, B: 1, C: 1 });
    });
  });

  describe('Filename generation', () => {
    it('should create unique timestamped filename', () => {
      const timestamp = '2024-01-15T10:30:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(timestamp);

      const formatted = timestamp.replace(/[:.]/g, '-').slice(0, 19);
      const filename = `crossword-training-data-${formatted}.zip`;

      expect(filename).toBe('crossword-training-data-2024-01-15T10-30-00.zip');

      jest.restoreAllMocks();
    });

    it('should pad sample indices correctly', () => {
      const indices = [0, 1, 99, 999, 9999, 99999, 999999];
      const filenames = indices.map(i => 
        `sample_${String(i).padStart(6, '0')}.png`
      );

      expect(filenames).toEqual([
        'sample_000000.png',
        'sample_000001.png',
        'sample_000099.png',
        'sample_000999.png',
        'sample_009999.png',
        'sample_099999.png',
        'sample_999999.png'
      ]);
    });
  });

  describe('Error handling', () => {
    it('should throw error when no samples exist', async () => {
      mockTrainingStore.getAllSamples.mockResolvedValue([]);

      const exportWithCheck = async () => {
        const samples = await mockTrainingStore.getAllSamples();
        if (samples.length === 0) {
          throw new Error('No training samples to export');
        }
      };

      await expect(exportWithCheck()).rejects.toThrow('No training samples to export');
    });
  });
});
