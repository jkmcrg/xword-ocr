import { ImageProcessor } from '../lib/image-processor.js';
import { OCRWorker } from '../lib/ocr-worker.js';
import { TrainingStore } from '../lib/training-store.js';
import { exportDataset } from '../lib/dataset-export.js';

class PopupApp {
  constructor() {
    this.imageProcessor = new ImageProcessor();
    this.ocrWorker = new OCRWorker();
    this.trainingStore = new TrainingStore();
    
    this.capturedImage = null;
    this.gridData = null;
    this.cellImages = [];
    this.gridSize = 15;
    
    this.initElements();
    this.initEventListeners();
    this.initWebcam();
    this.updateTrainingStats();
  }

  initElements() {
    this.statusBar = document.getElementById('status-bar');
    this.statusMessage = document.getElementById('status-message');
    
    this.webcamPreview = document.getElementById('webcam-preview');
    this.captureCanvas = document.getElementById('capture-canvas');
    this.imagePreview = document.getElementById('image-preview');
    this.previewContainer = document.getElementById('preview-container');
    
    this.captureBtn = document.getElementById('capture-btn');
    this.processBtn = document.getElementById('process-btn');
    this.retakeBtn = document.getElementById('retake-btn');
    this.fillBtn = document.getElementById('fill-btn');
    this.backBtn = document.getElementById('back-btn');
    this.exportBtn = document.getElementById('export-btn');
    
    this.dropzone = document.getElementById('dropzone');
    this.fileInput = document.getElementById('file-input');
    
    this.gridSection = document.getElementById('grid-section');
    this.fillSection = document.getElementById('fill-section');
    this.ocrGrid = document.getElementById('ocr-grid');
    this.gridSizeSelect = document.getElementById('grid-size');
    
    this.delayInput = document.getElementById('delay-input');
    this.typingSpeedInput = document.getElementById('typing-speed');
    
    this.progressContainer = document.getElementById('progress-container');
    this.progressFill = document.getElementById('progress-fill');
    this.progressText = document.getElementById('progress-text');
    
    this.sampleCount = document.getElementById('sample-count');
  }

  initEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    this.captureBtn.addEventListener('click', () => this.capturePhoto());
    this.processBtn.addEventListener('click', () => this.processImage());
    this.retakeBtn.addEventListener('click', () => this.retake());
    this.fillBtn.addEventListener('click', () => this.fillPuzzle());
    this.backBtn.addEventListener('click', () => this.backToEdit());
    this.exportBtn.addEventListener('click', () => this.exportTrainingData());

    this.dropzone.addEventListener('click', () => this.fileInput.click());
    this.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropzone.classList.add('dragover');
    });
    this.dropzone.addEventListener('dragleave', () => {
      this.dropzone.classList.remove('dragover');
    });
    this.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.handleFileUpload(e.target.files[0]);
      }
    });

    this.gridSizeSelect.addEventListener('change', (e) => {
      this.gridSize = parseInt(e.target.value);
      if (this.capturedImage) {
        this.processImage();
      }
    });
  }

  async initWebcam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 }
      });
      this.webcamPreview.srcObject = stream;
      this.webcamStream = stream;
    } catch (err) {
      console.error('Webcam error:', err);
      this.showStatus('Camera not available. Use file upload instead.', 'error');
    }
  }

  switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
  }

  capturePhoto() {
    const video = this.webcamPreview;
    const canvas = this.captureCanvas;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    this.capturedImage = canvas;
    this.showImagePreview(canvas);
  }

  handleFileUpload(file) {
    if (!file.type.startsWith('image/')) {
      this.showStatus('Please upload an image file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        this.capturedImage = canvas;
        this.showImagePreview(canvas);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  showImagePreview(canvas) {
    const preview = this.imagePreview;
    preview.width = canvas.width;
    preview.height = canvas.height;
    const ctx = preview.getContext('2d');
    ctx.drawImage(canvas, 0, 0);
    
    this.previewContainer.classList.remove('hidden');
    this.showStatus('Image captured. Click "Process Grid" to continue.', 'info');
  }

  async processImage() {
    if (!this.capturedImage) {
      this.showStatus('No image captured', 'error');
      return;
    }

    this.showStatus('Processing image...', 'processing');
    this.processBtn.disabled = true;

    try {
      const preprocessed = await this.imageProcessor.preprocess(this.capturedImage);
      
      this.cellImages = await this.imageProcessor.extractCells(
        preprocessed, 
        this.gridSize
      );

      this.showStatus('Running OCR on cells...', 'processing');
      
      await this.ocrWorker.initialize();
      
      this.gridData = [];
      const totalCells = this.gridSize * this.gridSize;
      
      for (let i = 0; i < this.cellImages.length; i++) {
        const cell = this.cellImages[i];
        
        if (cell.isBlack) {
          this.gridData.push({ letter: '', isBlack: true, confidence: 1 });
        } else {
          const result = await this.ocrWorker.recognizeChar(cell.canvas);
          this.gridData.push({
            letter: result.letter,
            isBlack: false,
            confidence: result.confidence
          });
        }
        
        if (i % 10 === 0) {
          this.showStatus(`OCR: ${Math.round((i / totalCells) * 100)}% complete`, 'processing');
        }
      }

      this.renderGrid();
      this.showStatus('OCR complete! Review and correct any errors.', 'success');
      this.gridSection.classList.remove('hidden');
      this.fillSection.classList.remove('hidden');
      
    } catch (err) {
      console.error('Processing error:', err);
      this.showStatus(`Error: ${err.message || err || 'Unknown error'}`, 'error');
    } finally {
      this.processBtn.disabled = false;
    }
  }

  renderGrid() {
    this.ocrGrid.innerHTML = '';
    this.ocrGrid.className = `ocr-grid size-${this.gridSize}`;

    for (let i = 0; i < this.gridData.length; i++) {
      const cell = this.gridData[i];
      const button = document.createElement('button');
      button.className = 'grid-cell';
      button.dataset.index = i;
      
      if (cell.isBlack) {
        button.classList.add('black');
      } else {
        button.textContent = cell.letter;
        if (cell.confidence < 0.7) {
          button.classList.add('low-confidence');
        }
        button.addEventListener('click', () => this.editCell(i));
        button.addEventListener('keydown', (e) => this.handleCellKeydown(e, i));
      }
      
      this.ocrGrid.appendChild(button);
    }
  }

  editCell(index) {
    const cell = this.gridData[index];
    if (cell.isBlack) return;

    const button = this.ocrGrid.children[index];
    button.focus();
  }

  handleCellKeydown(e, index) {
    const cell = this.gridData[index];
    if (cell.isBlack) return;

    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      cell.letter = e.key.toUpperCase();
      cell.edited = true;
      const button = this.ocrGrid.children[index];
      button.textContent = cell.letter;
      button.classList.add('edited');
      button.classList.remove('low-confidence');
      
      const nextIndex = index + 1;
      if (nextIndex < this.gridData.length && !this.gridData[nextIndex].isBlack) {
        this.ocrGrid.children[nextIndex].focus();
      }
      
      e.preventDefault();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      cell.letter = '';
      const button = this.ocrGrid.children[index];
      button.textContent = '';
      e.preventDefault();
    } else if (e.key === ' ') {
      cell.isBlack = true;
      const button = this.ocrGrid.children[index];
      button.classList.add('black');
      button.textContent = '';
      e.preventDefault();
    }
  }

  retake() {
    this.capturedImage = null;
    this.previewContainer.classList.add('hidden');
    this.gridSection.classList.add('hidden');
    this.fillSection.classList.add('hidden');
    this.hideStatus();
  }

  backToEdit() {
    this.fillSection.classList.add('hidden');
    this.gridSection.scrollIntoView({ behavior: 'smooth' });
  }

  async fillPuzzle() {
    const delay = parseInt(this.delayInput.value) || 0;
    const typingSpeed = parseInt(this.typingSpeedInput.value) || 50;

    const letters = this.gridData
      .filter(cell => !cell.isBlack)
      .map(cell => cell.letter || ' ');

    if (letters.length === 0) {
      this.showStatus('No letters to fill', 'error');
      return;
    }

    this.fillBtn.disabled = true;
    this.progressContainer.classList.remove('hidden');

    try {
      await this.saveTrainingData();

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url?.includes('nytimes.com/crosswords')) {
        this.showStatus('Please navigate to the NYT crossword page first', 'error');
        return;
      }

      await chrome.tabs.sendMessage(tab.id, {
        action: 'fillPuzzle',
        letters,
        delay: delay * 1000,
        typingSpeed
      });

      chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'fillProgress') {
          const percent = Math.round((message.current / message.total) * 100);
          this.progressFill.style.width = `${percent}%`;
          this.progressText.textContent = `${percent}%`;
        } else if (message.action === 'fillComplete') {
          this.showStatus('Puzzle filled successfully!', 'success');
          this.fillBtn.disabled = false;
        } else if (message.action === 'fillError') {
          this.showStatus(`Error: ${message.error}`, 'error');
          this.fillBtn.disabled = false;
        }
      });

    } catch (err) {
      console.error('Fill error:', err);
      this.showStatus(`Error: ${err.message || err || 'Unknown error'}`, 'error');
      this.fillBtn.disabled = false;
    }
  }

  async saveTrainingData() {
    for (let i = 0; i < this.gridData.length; i++) {
      const cell = this.gridData[i];
      if (cell.isBlack || !cell.letter) continue;

      const cellImage = this.cellImages[i];
      if (!cellImage || cellImage.isBlack) continue;

      const resized = this.imageProcessor.resizeTo28x28(cellImage.canvas);
      
      await this.trainingStore.saveSample({
        imageData: resized,
        label: cell.letter,
        timestamp: Date.now()
      });
    }
    
    this.updateTrainingStats();
  }

  async updateTrainingStats() {
    const count = await this.trainingStore.getCount();
    this.sampleCount.textContent = `${count} samples collected`;
  }

  async exportTrainingData() {
    this.showStatus('Exporting dataset...', 'processing');
    try {
      await exportDataset(this.trainingStore);
      this.showStatus('Dataset exported!', 'success');
    } catch (err) {
      console.error('Export error:', err);
      this.showStatus(`Export error: ${err.message || err || 'Unknown error'}`, 'error');
    }
  }

  showStatus(message, type = 'info') {
    this.statusBar.className = `status-bar ${type}`;
    this.statusMessage.textContent = message;
    this.statusBar.classList.remove('hidden');
  }

  hideStatus() {
    this.statusBar.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupApp();
});
