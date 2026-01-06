// Tour Builder Capture - Content Script
(function() {
  'use strict';
  
  // State
  let isCapturing = false;
  let captureToken = null;
  let builderUrl = null;
  let hoveredElement = null;
  let overlay = null;
  let tooltip = null;
  let panel = null;
  
  // Generate CSS selector for an element
  function generateSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return 'body';
    
    // Priority 1: ID
    if (el.id) {
      return '#' + CSS.escape(el.id);
    }
    
    // Priority 2: data-testid
    if (el.dataset && el.dataset.testid) {
      return '[data-testid="' + el.dataset.testid + '"]';
    }
    
    // Priority 3: Unique class combination
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\s+/).filter(c => 
        c && !c.match(/^(hover|active|focus|disabled|selected)/i)
      );
      if (classes.length > 0) {
        const selector = el.tagName.toLowerCase() + '.' + classes.map(c => CSS.escape(c)).join('.');
        try {
          if (document.querySelectorAll(selector).length === 1) {
            return selector;
          }
        } catch (e) {}
      }
    }
    
    // Priority 4: Build path with nth-of-type
    const path = [];
    let current = el;
    while (current && current !== document.body && path.length < 5) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        path.unshift('#' + CSS.escape(current.id));
        break;
      }
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += ':nth-of-type(' + index + ')';
        }
      }
      path.unshift(selector);
      current = parent;
    }
    return path.join(' > ');
  }
  
  // Get readable label for element
  function getElementLabel(el) {
    const text = (el.textContent || '').trim().slice(0, 50);
    const ariaLabel = el.getAttribute('aria-label');
    const placeholder = el.getAttribute('placeholder');
    const title = el.getAttribute('title');
    const alt = el.getAttribute('alt');
    
    return ariaLabel || title || alt || placeholder || text || el.tagName.toLowerCase();
  }
  
  // Send message to builder
  function sendToBuilder(data) {
    const message = { ...data, token: captureToken };
    
    // Try to find builder window
    if (window.opener) {
      try {
        window.opener.postMessage(message, builderUrl);
        console.log('[Tour Capture] Sent to opener:', data.type);
        return;
      } catch (e) {}
    }
    
    // Try broadcast channel
    try {
      const channel = new BroadcastChannel('tour-builder-capture');
      channel.postMessage(message);
      channel.close();
      console.log('[Tour Capture] Sent via BroadcastChannel:', data.type);
      return;
    } catch (e) {}
    
    // Fallback: copy to clipboard
    const json = JSON.stringify({ selector: data.element?.selector }, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      showNotification('Selector copiado para clipboard!');
    }).catch(() => {
      console.log('[Tour Capture] Data:', data);
    });
  }
  
  // Show notification
  function showNotification(text) {
    const notif = document.createElement('div');
    notif.textContent = text;
    notif.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #1f2937;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      z-index: 1000001;
      animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  }
  
  // Create UI elements
  function createUI() {
    // Overlay for highlighting
    overlay = document.createElement('div');
    overlay.id = 'tour-capture-overlay';
    overlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      border: 2px solid #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      z-index: 999999;
      transition: all 0.15s ease;
      border-radius: 4px;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
      display: none;
    `;
    document.body.appendChild(overlay);
    
    // Tooltip
    tooltip = document.createElement('div');
    tooltip.id = 'tour-capture-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      background: #1f2937;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-family: system-ui, sans-serif;
      z-index: 1000000;
      pointer-events: none;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: none;
    `;
    document.body.appendChild(tooltip);
    
    // Control panel
    panel = document.createElement('div');
    panel.id = 'tour-capture-panel';
    panel.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: #22c55e;">●</span>
        <span>Tour Capture Ativo</span>
        <button id="tour-capture-scan-btn" style="
          background: #3b82f6;
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
        ">Scan</button>
        <button id="tour-capture-exit-btn" style="
          background: #ef4444;
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
        ">Sair</button>
      </div>
    `;
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #1f2937;
      color: white;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-family: system-ui, sans-serif;
      z-index: 1000001;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(panel);
    
    // Panel button handlers
    document.getElementById('tour-capture-scan-btn').addEventListener('click', scanElements);
    document.getElementById('tour-capture-exit-btn').addEventListener('click', stopCapture);
  }
  
  // Remove UI elements
  function removeUI() {
    overlay?.remove();
    tooltip?.remove();
    panel?.remove();
    overlay = null;
    tooltip = null;
    panel = null;
  }
  
  // Update overlay position
  function updateOverlay(el) {
    if (!el || !overlay || !tooltip) {
      if (overlay) overlay.style.display = 'none';
      if (tooltip) tooltip.style.display = 'none';
      return;
    }
    
    const rect = el.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    
    const selector = generateSelector(el);
    const label = getElementLabel(el);
    tooltip.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">${el.tagName.toLowerCase()}</div>
      <div style="opacity: 0.8; font-size: 11px; word-break: break-all;">${selector}</div>
      <div style="margin-top: 4px; color: #93c5fd;">${label}</div>
    `;
    tooltip.style.display = 'block';
    
    // Position tooltip
    let tooltipTop = rect.bottom + 10;
    if (tooltipTop + 80 > window.innerHeight) {
      tooltipTop = rect.top - 80;
    }
    tooltip.style.top = Math.max(10, tooltipTop) + 'px';
    tooltip.style.left = Math.max(10, Math.min(rect.left, window.innerWidth - 320)) + 'px';
  }
  
  // Mouse move handler
  function handleMouseMove(e) {
    if (!isCapturing) return;
    
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el !== overlay && el !== tooltip && el !== panel && !panel?.contains(el)) {
      hoveredElement = el;
      updateOverlay(el);
    }
  }
  
  // Click handler
  function handleClick(e) {
    if (!isCapturing || !hoveredElement) return;
    if (e.target === panel || panel?.contains(e.target)) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const el = hoveredElement;
    const rect = el.getBoundingClientRect();
    
    sendToBuilder({
      type: 'TOUR_CAPTURE_ELEMENT',
      element: {
        selector: generateSelector(el),
        label: getElementLabel(el),
        tagName: el.tagName.toLowerCase(),
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        }
      }
    });
    
    // Visual feedback
    if (overlay) {
      overlay.style.borderColor = '#22c55e';
      overlay.style.background = 'rgba(34, 197, 94, 0.2)';
      setTimeout(() => {
        if (overlay) {
          overlay.style.borderColor = '#3b82f6';
          overlay.style.background = 'rgba(59, 130, 246, 0.1)';
        }
      }, 300);
    }
  }
  
  // Scan all interactive elements
  function scanElements() {
    const selectors = 'button, a, input, select, textarea, [role="button"], [onclick], [data-action]';
    const elements = Array.from(document.querySelectorAll(selectors))
      .filter(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               rect.width > 0 && 
               rect.height > 0;
      })
      .slice(0, 50)
      .map(el => {
        const rect = el.getBoundingClientRect();
        return {
          selector: generateSelector(el),
          label: getElementLabel(el),
          tagName: el.tagName.toLowerCase(),
          rect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          }
        };
      });
    
    sendToBuilder({
      type: 'TOUR_CAPTURE_SCAN',
      elements
    });
    
    showNotification(`Escaneados ${elements.length} elementos`);
  }
  
  // Start capture mode
  function startCapture(token, url) {
    if (isCapturing) return;
    
    captureToken = token;
    builderUrl = url;
    isCapturing = true;
    
    createUI();
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    
    sendToBuilder({ type: 'TOUR_CAPTURE_READY' });
    console.log('[Tour Capture] Ativado');
  }
  
  // Stop capture mode
  function stopCapture() {
    if (!isCapturing) return;
    
    isCapturing = false;
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    removeUI();
    
    console.log('[Tour Capture] Desativado');
  }
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_CAPTURE') {
      startCapture(message.token, message.builderUrl);
      sendResponse({ success: true });
    } else if (message.type === 'STOP_CAPTURE') {
      stopCapture();
      sendResponse({ success: true });
    } else if (message.type === 'SCAN_ELEMENTS') {
      captureToken = message.token;
      builderUrl = message.builderUrl;
      scanElements();
      sendResponse({ success: true });
    }
    return true;
  });
  
  // Keyboard shortcut to exit
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isCapturing) {
      stopCapture();
    }
  });
  
  console.log('[Tour Capture] Content script loaded');
})();
