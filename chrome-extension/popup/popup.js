// State
let isCapturing = false;

// DOM Elements
const builderUrlInput = document.getElementById('builderUrl');
const startCaptureBtn = document.getElementById('startCapture');
const scanElementsBtn = document.getElementById('scanElements');
const statusEl = document.getElementById('status');
const statusText = statusEl.querySelector('.status-text');

// Load saved builder URL
chrome.storage.local.get(['builderUrl'], (result) => {
  if (result.builderUrl) {
    builderUrlInput.value = result.builderUrl;
  }
});

// Save builder URL on change
builderUrlInput.addEventListener('change', () => {
  chrome.storage.local.set({ builderUrl: builderUrlInput.value });
});

// Update status
function updateStatus(text, type = 'default') {
  statusText.textContent = text;
  statusEl.className = 'status';
  if (type === 'active') {
    statusEl.classList.add('active');
  } else if (type === 'error') {
    statusEl.classList.add('error');
  }
}

// Start capture
startCaptureBtn.addEventListener('click', async () => {
  const builderUrl = builderUrlInput.value.trim();
  
  if (!builderUrl) {
    updateStatus('Insira a URL do Builder', 'error');
    builderUrlInput.focus();
    return;
  }
  
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.id) {
      updateStatus('Erro ao acessar aba', 'error');
      return;
    }
    
    // Generate token
    const token = crypto.randomUUID();
    
    // Save to storage for content script
    await chrome.storage.local.set({ 
      builderUrl,
      captureToken: token,
      isCapturing: true
    });
    
    // Send message to content script
    chrome.tabs.sendMessage(tab.id, {
      type: 'START_CAPTURE',
      token,
      builderUrl
    });
    
    isCapturing = true;
    updateStatus('Captura ativa', 'active');
    startCaptureBtn.textContent = 'Captura Ativa...';
    startCaptureBtn.disabled = true;
    
    // Close popup after short delay
    setTimeout(() => window.close(), 500);
    
  } catch (error) {
    console.error('Error starting capture:', error);
    updateStatus('Erro ao iniciar captura', 'error');
  }
});

// Scan elements
scanElementsBtn.addEventListener('click', async () => {
  const builderUrl = builderUrlInput.value.trim();
  
  if (!builderUrl) {
    updateStatus('Insira a URL do Builder', 'error');
    builderUrlInput.focus();
    return;
  }
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.id) {
      updateStatus('Erro ao acessar aba', 'error');
      return;
    }
    
    const token = crypto.randomUUID();
    
    await chrome.storage.local.set({ 
      builderUrl,
      captureToken: token
    });
    
    chrome.tabs.sendMessage(tab.id, {
      type: 'SCAN_ELEMENTS',
      token,
      builderUrl
    });
    
    updateStatus('Escaneando elementos...', 'active');
    
    setTimeout(() => {
      updateStatus('Scan enviado ao Builder', 'default');
    }, 2000);
    
  } catch (error) {
    console.error('Error scanning:', error);
    updateStatus('Erro ao escanear', 'error');
  }
});

// Help link
document.getElementById('helpLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://docs.lovable.dev' });
});
