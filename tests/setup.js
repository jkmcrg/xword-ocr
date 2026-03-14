global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn()
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  scripting: {
    executeScript: jest.fn()
  },
  action: {
    onClicked: {
      addListener: jest.fn()
    }
  }
};

global.indexedDB = {
  open: jest.fn()
};

class MockCanvasRenderingContext2D {
  constructor() {
    this.fillStyle = '';
    this.imageSmoothingEnabled = true;
    this.imageSmoothingQuality = 'low';
  }
  
  fillRect() {}
  drawImage() {}
  getImageData(x, y, width, height) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 200;
      data[i + 1] = 200;
      data[i + 2] = 200;
      data[i + 3] = 255;
    }
    return { data, width, height };
  }
  putImageData() {}
  createImageData(width, height) {
    return {
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height
    };
  }
}

HTMLCanvasElement.prototype.getContext = function(type) {
  if (type === '2d') {
    return new MockCanvasRenderingContext2D();
  }
  return null;
};

HTMLCanvasElement.prototype.toBlob = function(callback, type) {
  callback(new Blob(['mock'], { type: type || 'image/png' }));
};

global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();
