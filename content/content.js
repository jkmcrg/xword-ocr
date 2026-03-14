class CrosswordFiller {
  constructor() {
    this.isRunning = false;
  }

  async fillPuzzle(letters, delayBeforeLast, typingSpeed) {
    if (this.isRunning) {
      throw new Error('Fill operation already in progress');
    }

    this.isRunning = true;
    const total = letters.length;

    try {
      for (let i = 0; i < letters.length; i++) {
        const letter = letters[i];
        const isLast = i === letters.length - 1;

        if (isLast && delayBeforeLast > 0) {
          chrome.runtime.sendMessage({
            action: 'fillProgress',
            current: i,
            total,
            waiting: true
          });

          await this.sleep(delayBeforeLast);
        }

        this.typeKey(letter);

        chrome.runtime.sendMessage({
          action: 'fillProgress',
          current: i + 1,
          total,
          waiting: false
        });

        if (!isLast) {
          await this.sleep(typingSpeed);
        }
      }

      chrome.runtime.sendMessage({ action: 'fillComplete' });
    } catch (err) {
      chrome.runtime.sendMessage({
        action: 'fillError',
        error: err.message
      });
    } finally {
      this.isRunning = false;
    }
  }

  typeKey(letter) {
    const activeElement = document.activeElement;
    
    if (!activeElement) {
      throw new Error('No active element found. Click on the crossword grid first.');
    }

    const key = letter.toUpperCase();
    
    const keydownEvent = new KeyboardEvent('keydown', {
      key: key,
      code: `Key${key}`,
      keyCode: key.charCodeAt(0),
      which: key.charCodeAt(0),
      bubbles: true,
      cancelable: true
    });

    const keypressEvent = new KeyboardEvent('keypress', {
      key: key,
      code: `Key${key}`,
      keyCode: key.charCodeAt(0),
      which: key.charCodeAt(0),
      charCode: key.charCodeAt(0),
      bubbles: true,
      cancelable: true
    });

    const keyupEvent = new KeyboardEvent('keyup', {
      key: key,
      code: `Key${key}`,
      keyCode: key.charCodeAt(0),
      which: key.charCodeAt(0),
      bubbles: true,
      cancelable: true
    });

    activeElement.dispatchEvent(keydownEvent);
    activeElement.dispatchEvent(keypressEvent);
    activeElement.dispatchEvent(keyupEvent);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const filler = new CrosswordFiller();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fillPuzzle') {
    filler.fillPuzzle(message.letters, message.delay, message.typingSpeed)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'ping') {
    sendResponse({ ready: true });
    return true;
  }
});

console.log('NYT Crossword Filler: Content script loaded');
