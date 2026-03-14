describe('Extension Messaging', () => {
  let messageListeners;

  beforeEach(() => {
    messageListeners = [];
    
    chrome.runtime.onMessage.addListener.mockImplementation((listener) => {
      messageListeners.push(listener);
    });
    
    chrome.runtime.sendMessage.mockClear();
    chrome.tabs.sendMessage.mockClear();
    chrome.tabs.query.mockClear();
  });

  describe('Popup to Content Script', () => {
    it('should send fillPuzzle message with correct data', async () => {
      const mockTab = { id: 123, url: 'https://www.nytimes.com/crosswords/game/daily' };
      chrome.tabs.query.mockResolvedValue([mockTab]);
      chrome.tabs.sendMessage.mockResolvedValue({ success: true });

      const letters = ['A', 'B', 'C'];
      const delay = 5000;
      const typingSpeed = 50;

      await chrome.tabs.sendMessage(mockTab.id, {
        action: 'fillPuzzle',
        letters,
        delay,
        typingSpeed
      });

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          action: 'fillPuzzle',
          letters: ['A', 'B', 'C'],
          delay: 5000,
          typingSpeed: 50
        })
      );
    });

    it('should query for active tab on NYT crossword domain', async () => {
      chrome.tabs.query.mockResolvedValue([]);

      await chrome.tabs.query({ active: true, currentWindow: true });

      expect(chrome.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true
      });
    });
  });

  describe('Content Script to Popup', () => {
    it('should send progress updates', () => {
      const progressMessage = {
        action: 'fillProgress',
        current: 50,
        total: 100
      };

      chrome.runtime.sendMessage(progressMessage);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(progressMessage);
    });

    it('should send completion message', () => {
      const completeMessage = { action: 'fillComplete' };

      chrome.runtime.sendMessage(completeMessage);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(completeMessage);
    });

    it('should send error message on failure', () => {
      const errorMessage = {
        action: 'fillError',
        error: 'No active element found'
      };

      chrome.runtime.sendMessage(errorMessage);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'fillError',
          error: expect.any(String)
        })
      );
    });
  });

  describe('Message Handler Registration', () => {
    it('should register message listener', () => {
      const mockHandler = jest.fn();
      chrome.runtime.onMessage.addListener(mockHandler);

      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledWith(mockHandler);
      expect(messageListeners).toContain(mockHandler);
    });

    it('should handle ping message for health check', () => {
      const sendResponse = jest.fn();
      
      const handler = (message, sender, sendResponse) => {
        if (message.action === 'ping') {
          sendResponse({ ready: true });
          return true;
        }
      };
      
      handler({ action: 'ping' }, {}, sendResponse);
      
      expect(sendResponse).toHaveBeenCalledWith({ ready: true });
    });
  });

  describe('Grid Data Flow', () => {
    it('should format grid data correctly for transmission', () => {
      const gridData = [
        { letter: 'A', isBlack: false },
        { letter: '', isBlack: true },
        { letter: 'B', isBlack: false }
      ];

      const letters = gridData
        .filter(cell => !cell.isBlack)
        .map(cell => cell.letter || ' ');

      expect(letters).toEqual(['A', 'B']);
    });

    it('should handle empty cells as spaces', () => {
      const gridData = [
        { letter: 'A', isBlack: false },
        { letter: '', isBlack: false },
        { letter: 'C', isBlack: false }
      ];

      const letters = gridData
        .filter(cell => !cell.isBlack)
        .map(cell => cell.letter || ' ');

      expect(letters).toEqual(['A', ' ', 'C']);
    });
  });
});
