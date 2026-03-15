import { CloudOCR } from '../lib/cloud-ocr.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'cloudOCR') {
    performCloudOCR(message.imageBase64, message.settings)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'testOCR') {
    CloudOCR.test(message.settings)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'fillProgress' || 
      message.action === 'fillComplete' || 
      message.action === 'fillError') {
    chrome.runtime.sendMessage(message).catch(() => {});
  }
  
  return false;
});

async function performCloudOCR(imageBase64, settings) {
  const ocr = new CloudOCR(settings);
  return await ocr.recognize(imageBase64);
}

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
