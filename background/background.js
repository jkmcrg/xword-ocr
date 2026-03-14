chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fillProgress' || 
      message.action === 'fillComplete' || 
      message.action === 'fillError') {
    chrome.runtime.sendMessage(message).catch(() => {
    });
  }
  return false;
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url?.includes('nytimes.com/crosswords')) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });
    } catch (err) {
      console.error('Failed to inject content script:', err);
    }
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('NYT Crossword Paper Filler installed');
});
