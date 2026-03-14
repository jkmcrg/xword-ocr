import Tesseract from 'tesseract.js';

export class OCRWorker {
  constructor() {
    this.worker = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const workerPath = chrome.runtime.getURL('dist/tesseract/worker.min.js');
      const corePath = chrome.runtime.getURL('dist/tesseract/tesseract-core-simd.wasm.js');

      this.worker = await Tesseract.createWorker('eng', 1, {
        workerPath,
        corePath,
        workerBlobURL: false,
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      await this.worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        tessedit_pageseg_mode: '10'
      });

      this.initialized = true;
    } catch (err) {
      throw new Error(`Failed to initialize OCR: ${err.message || err}`);
    }
  }

  async recognizeChar(cellCanvas) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const preprocessed = this.preprocessForOCR(cellCanvas);
      
      const { data } = await this.worker.recognize(preprocessed);
      
      let letter = data.text.trim().toUpperCase();
      letter = letter.replace(/[^A-Z]/g, '');
      
      if (letter.length > 1) {
        letter = letter[0];
      }
      
      const confidence = data.confidence / 100;

      return {
        letter: letter || '',
        confidence: letter ? confidence : 0
      };
    } catch (err) {
      console.error('OCR error:', err);
      return { letter: '', confidence: 0 };
    }
  }

  preprocessForOCR(sourceCanvas) {
    const canvas = document.createElement('canvas');
    const scale = 4;
    canvas.width = sourceCanvas.width * scale;
    canvas.height = sourceCanvas.height * scale;
    
    const ctx = canvas.getContext('2d');
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const binary = gray < 180 ? 0 : 255;
      data[i] = binary;
      data[i + 1] = binary;
      data[i + 2] = binary;
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    return canvas;
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.initialized = false;
    }
  }
}
