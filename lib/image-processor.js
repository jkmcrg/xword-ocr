export class ImageProcessor {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  async preprocess(sourceCanvas) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    this.ctx.drawImage(sourceCanvas, 0, 0);
    
    const imageData = this.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    
    this.adjustContrast(data, 1.5);
    
    this.ctx.putImageData(imageData, 0, 0);
    
    return this.canvas;
  }

  adjustContrast(data, factor) {
    const intercept = 128 * (1 - factor);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = this.clamp(data[i] * factor + intercept);
      data[i + 1] = this.clamp(data[i + 1] * factor + intercept);
      data[i + 2] = this.clamp(data[i + 2] * factor + intercept);
    }
  }

  clamp(value) {
    return Math.max(0, Math.min(255, value));
  }

  detectGrid(sourceCanvas) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const ctx = sourceCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    const horizontalProfile = new Array(height).fill(0);
    const verticalProfile = new Array(width).fill(0);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const gray = data[idx];
        
        if (gray < 128) {
          horizontalProfile[y]++;
          verticalProfile[x]++;
        }
      }
    }
    
    const horizontalPeaks = this.findPeaks(horizontalProfile, height * 0.1);
    const verticalPeaks = this.findPeaks(verticalProfile, width * 0.1);
    
    let gridBounds;
    
    if (horizontalPeaks.length >= 2 && verticalPeaks.length >= 2) {
      const top = Math.min(...horizontalPeaks);
      const bottom = Math.max(...horizontalPeaks);
      const left = Math.min(...verticalPeaks);
      const right = Math.max(...verticalPeaks);
      
      gridBounds = {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top
      };
    } else {
      const margin = Math.min(width, height) * 0.05;
      const size = Math.min(width, height) - margin * 2;
      
      gridBounds = {
        x: (width - size) / 2,
        y: (height - size) / 2,
        width: size,
        height: size
      };
    }
    
    return gridBounds;
  }

  findPeaks(profile, threshold) {
    const peaks = [];
    const smoothed = this.smoothArray(profile, 5);
    
    for (let i = 1; i < smoothed.length - 1; i++) {
      if (smoothed[i] > threshold &&
          smoothed[i] > smoothed[i - 1] &&
          smoothed[i] > smoothed[i + 1]) {
        peaks.push(i);
      }
    }
    
    return peaks;
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
}
