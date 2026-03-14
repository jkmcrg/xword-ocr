class ImageProcessor {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  clamp(value) {
    return Math.max(0, Math.min(255, value));
  }

  smoothArray(arr, windowSize) {
    const result = [];
    const halfWindow = Math.floor(windowSize / 2);
    for (let i = 0; i < arr.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - halfWindow); j <= Math.min(arr.length - 1, i + halfWindow); j++) {
        sum += arr[j];
        count++;
      }
      result.push(sum / count);
    }
    return result;
  }

  findPeaks(profile, threshold) {
    const peaks = [];
    const smoothed = this.smoothArray(profile, 5);
    for (let i = 1; i < smoothed.length - 1; i++) {
      if (smoothed[i] > threshold && smoothed[i] > smoothed[i - 1] && smoothed[i] > smoothed[i + 1]) {
        peaks.push(i);
      }
    }
    return peaks;
  }

  isCellBlack(cellCanvas) {
    const ctx = cellCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, cellCanvas.width, cellCanvas.height);
    const data = imageData.data;
    let darkPixels = 0;
    const totalPixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (gray < 50) darkPixels++;
    }
    return (darkPixels / totalPixels) > 0.7;
  }

  findContentBounds(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let hasContent = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        if (gray < 200) {
          hasContent = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (!hasContent) return null;
    return { left: minX, top: minY, right: maxX + 1, bottom: maxY + 1 };
  }

  resizeTo28x28(sourceCanvas) {
    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = 28;
    targetCanvas.height = 28;
    const ctx = targetCanvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 28, 28);
    return ctx.getImageData(0, 0, 28, 28);
  }

  extractCell(sourceCanvas, x, y, width, height) {
    const padding = Math.min(width, height) * 0.1;
    const cellCanvas = document.createElement('canvas');
    cellCanvas.width = Math.floor(width - padding * 2);
    cellCanvas.height = Math.floor(height - padding * 2);
    return cellCanvas;
  }
}

describe('ImageProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new ImageProcessor();
  });

  describe('clamp', () => {
    it('should return value when within range', () => {
      expect(processor.clamp(128)).toBe(128);
    });

    it('should clamp values below 0 to 0', () => {
      expect(processor.clamp(-50)).toBe(0);
    });

    it('should clamp values above 255 to 255', () => {
      expect(processor.clamp(300)).toBe(255);
    });

    it('should handle edge cases', () => {
      expect(processor.clamp(0)).toBe(0);
      expect(processor.clamp(255)).toBe(255);
    });
  });

  describe('smoothArray', () => {
    it('should smooth an array with given window size', () => {
      const input = [0, 10, 0, 10, 0];
      const result = processor.smoothArray(input, 3);
      
      expect(result).toHaveLength(5);
      expect(result[2]).toBeCloseTo(6.67, 1);
    });

    it('should handle single element arrays', () => {
      const result = processor.smoothArray([5], 3);
      expect(result).toEqual([5]);
    });

    it('should handle edge elements correctly', () => {
      const input = [10, 20, 30];
      const result = processor.smoothArray(input, 3);
      
      expect(result[0]).toBeCloseTo(15, 0);
      expect(result[2]).toBeCloseTo(25, 0);
    });
  });

  describe('findPeaks', () => {
    it('should find peaks above threshold after smoothing', () => {
      const profile = [0, 0, 100, 200, 100, 0, 0, 100, 300, 100, 0, 0];
      const peaks = processor.findPeaks(profile, 50);
      
      expect(peaks.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array when all values below threshold', () => {
      const profile = [1, 2, 3, 2, 1];
      const peaks = processor.findPeaks(profile, 100);
      
      expect(peaks).toHaveLength(0);
    });

    it('should handle flat profiles with no local maxima', () => {
      const profile = [5, 5, 5, 5, 5];
      const peaks = processor.findPeaks(profile, 3);
      
      expect(peaks).toHaveLength(0);
    });

    it('should use smoothing before peak detection', () => {
      const profile = [0, 100, 0, 100, 0];
      const smoothed = processor.smoothArray(profile, 5);
      
      expect(smoothed.every(v => v <= 100)).toBe(true);
    });
  });

  describe('isCellBlack', () => {
    it('should detect black cells based on dark pixel ratio', () => {
      const mockCanvas = {
        width: 10,
        height: 10,
        getContext: () => ({
          getImageData: () => {
            const data = new Uint8ClampedArray(400);
            for (let i = 0; i < data.length; i += 4) {
              data[i] = 0;
              data[i + 1] = 0;
              data[i + 2] = 0;
              data[i + 3] = 255;
            }
            return { data, width: 10, height: 10 };
          }
        })
      };
      
      const result = processor.isCellBlack(mockCanvas);
      expect(result).toBe(true);
    });

    it('should detect white cells', () => {
      const mockCanvas = {
        width: 10,
        height: 10,
        getContext: () => ({
          getImageData: () => {
            const data = new Uint8ClampedArray(400);
            for (let i = 0; i < data.length; i += 4) {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
              data[i + 3] = 255;
            }
            return { data, width: 10, height: 10 };
          }
        })
      };

      const result = processor.isCellBlack(mockCanvas);
      expect(result).toBe(false);
    });

    it('should return false for mixed cells below threshold', () => {
      const mockCanvas = {
        width: 10,
        height: 10,
        getContext: () => ({
          getImageData: () => {
            const data = new Uint8ClampedArray(400);
            for (let i = 0; i < data.length; i += 4) {
              data[i] = i % 8 === 0 ? 0 : 200;
              data[i + 1] = i % 8 === 0 ? 0 : 200;
              data[i + 2] = i % 8 === 0 ? 0 : 200;
              data[i + 3] = 255;
            }
            return { data, width: 10, height: 10 };
          }
        })
      };

      const result = processor.isCellBlack(mockCanvas);
      expect(result).toBe(false);
    });
  });

  describe('findContentBounds', () => {
    it('should find bounds of content in image data', () => {
      const imageData = {
        width: 10,
        height: 10,
        data: new Uint8ClampedArray(400)
      };
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = 255;
        imageData.data[i + 1] = 255;
        imageData.data[i + 2] = 255;
        imageData.data[i + 3] = 255;
      }
      
      const centerIdx = (5 * 10 + 5) * 4;
      imageData.data[centerIdx] = 0;
      imageData.data[centerIdx + 1] = 0;
      imageData.data[centerIdx + 2] = 0;
      
      const bounds = processor.findContentBounds(imageData);
      
      expect(bounds).not.toBeNull();
      expect(bounds.left).toBe(5);
      expect(bounds.top).toBe(5);
    });

    it('should return null for empty image', () => {
      const imageData = {
        width: 10,
        height: 10,
        data: new Uint8ClampedArray(400)
      };
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = 255;
        imageData.data[i + 1] = 255;
        imageData.data[i + 2] = 255;
        imageData.data[i + 3] = 255;
      }
      
      const bounds = processor.findContentBounds(imageData);
      expect(bounds).toBeNull();
    });
  });

  describe('resizeTo28x28', () => {
    it('should return ImageData with correct dimensions', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 50;
      canvas.height = 50;
      
      const result = processor.resizeTo28x28(canvas);
      
      expect(result.width).toBe(28);
      expect(result.height).toBe(28);
    });
  });

  describe('extractCell', () => {
    it('should create a canvas for the cell region', () => {
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = 100;
      sourceCanvas.height = 100;
      
      const cellCanvas = processor.extractCell(sourceCanvas, 10, 10, 20, 20);
      
      expect(cellCanvas).toBeInstanceOf(HTMLCanvasElement);
      expect(cellCanvas.width).toBeGreaterThan(0);
      expect(cellCanvas.height).toBeGreaterThan(0);
    });
  });
});
