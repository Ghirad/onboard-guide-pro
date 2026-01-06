// Tour Builder Capture - Background Service Worker

// Handle extension icon click when popup is not available
chrome.action.onClicked.addListener((tab) => {
  // This won't fire if popup.html is defined, but kept for completeness
  console.log('[Tour Capture] Extension clicked');
});

// Handle install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Tour Capture] Extension installed');
  } else if (details.reason === 'update') {
    console.log('[Tour Capture] Extension updated');
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Tour Capture] Background received:', message.type);
  
  if (message.type === 'CAPTURE_ELEMENT') {
    // Could be used for cross-tab communication in the future
    sendResponse({ received: true });
  }
  
  return true;
});

console.log('[Tour Capture] Service worker loaded');
