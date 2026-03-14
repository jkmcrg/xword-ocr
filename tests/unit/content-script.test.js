describe('CrosswordFiller', () => {
  let CrosswordFiller;
  let filler;
  let mockActiveElement;

  beforeEach(() => {
    jest.resetModules();
    
    mockActiveElement = {
      dispatchEvent: jest.fn()
    };
    
    Object.defineProperty(document, 'activeElement', {
      get: () => mockActiveElement,
      configurable: true
    });

    const contentScript = `
      class CrosswordFiller {
        constructor() {
          this.isRunning = false;
        }

        async fillPuzzle(letters, delayBeforeLast, typingSpeed) {
          if (this.isRunning) {
            throw new Error('Fill operation already in progress');
          }
          this.isRunning = true;
          
          try {
            for (let i = 0; i < letters.length; i++) {
              const isLast = i === letters.length - 1;
              if (isLast && delayBeforeLast > 0) {
                await this.sleep(delayBeforeLast);
              }
              this.typeKey(letters[i]);
              if (!isLast) {
                await this.sleep(typingSpeed);
              }
            }
          } finally {
            this.isRunning = false;
          }
        }

        typeKey(letter) {
          const activeElement = document.activeElement;
          if (!activeElement) {
            throw new Error('No active element found');
          }
          const key = letter.toUpperCase();
          activeElement.dispatchEvent(new KeyboardEvent('keydown', { key }));
          activeElement.dispatchEvent(new KeyboardEvent('keypress', { key }));
          activeElement.dispatchEvent(new KeyboardEvent('keyup', { key }));
        }

        sleep(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }
      }
      module.exports = { CrosswordFiller };
    `;
    
    CrosswordFiller = eval(`(function() { ${contentScript} return CrosswordFiller; })()`);
    filler = new CrosswordFiller();
  });

  describe('constructor', () => {
    it('should initialize with isRunning as false', () => {
      expect(filler.isRunning).toBe(false);
    });
  });

  describe('typeKey', () => {
    it('should dispatch keyboard events to active element', () => {
      filler.typeKey('A');
      
      expect(mockActiveElement.dispatchEvent).toHaveBeenCalledTimes(3);
    });

    it('should uppercase the letter', () => {
      filler.typeKey('a');
      
      const calls = mockActiveElement.dispatchEvent.mock.calls;
      expect(calls[0][0].key).toBe('A');
    });

    it('should throw if no active element', () => {
      Object.defineProperty(document, 'activeElement', {
        get: () => null,
        configurable: true
      });
      
      expect(() => filler.typeKey('A')).toThrow('No active element found');
    });
  });

  describe('sleep', () => {
    it('should resolve after specified milliseconds', async () => {
      jest.useFakeTimers();
      
      const promise = filler.sleep(1000);
      jest.advanceTimersByTime(1000);
      
      await expect(promise).resolves.toBeUndefined();
      
      jest.useRealTimers();
    });
  });

  describe('fillPuzzle', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should type all letters in sequence', async () => {
      const letters = ['A', 'B', 'C'];
      
      const fillPromise = filler.fillPuzzle(letters, 0, 0);
      
      await jest.runAllTimersAsync();
      await fillPromise;
      
      expect(mockActiveElement.dispatchEvent).toHaveBeenCalledTimes(9);
    });

    it('should prevent concurrent fills', async () => {
      filler.isRunning = true;
      
      await expect(filler.fillPuzzle(['A'], 0, 0))
        .rejects.toThrow('Fill operation already in progress');
    });

    it('should reset isRunning after completion', async () => {
      const fillPromise = filler.fillPuzzle(['A'], 0, 0);
      await jest.runAllTimersAsync();
      await fillPromise;
      
      expect(filler.isRunning).toBe(false);
    });
  });
});
