import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bootstrap script - runs IMMEDIATELY in <head> before any other scripts
// Sends IFRAME_READY early and sets up message listener
// Full initialization happens when body is available
const INJECTION_SCRIPT = `
<script>
(function() {
  'use strict';
  
  // ====== PHASE 1: IMMEDIATE BOOTSTRAP (runs before other scripts) ======
  
  var readySent = false;
  var messageQueue = [];
  var bodyReady = false;
  var initComplete = false;
  
  // Debug logging function - sends to parent immediately
  function tourDebugLog(msg, data) {
    console.log('[TourBuilder] ' + msg, data || '');
    try {
      window.parent.postMessage({ 
        type: 'TOUR_DEBUG', 
        message: msg,
        data: data,
        timestamp: Date.now()
      }, '*');
    } catch (e) {}
  }
  
  // Send IFRAME_READY immediately to unblock parent UI
  function sendReadyMessage(withError) {
    if (readySent) return;
    readySent = true;
    try {
      var msg = { type: 'IFRAME_READY' };
      if (withError) msg.error = withError;
      tourDebugLog('Sending IFRAME_READY' + (withError ? ' with error: ' + withError : ''));
      window.parent.postMessage(msg, '*');
    } catch (e) {
      tourDebugLog('Failed to send IFRAME_READY', e.message);
    }
  }
  
  // Queue messages until full init is complete
  function queueOrHandle(handler, data) {
    if (initComplete && handler) {
      handler(data);
    } else {
      messageQueue.push({ handler: handler, data: data });
    }
  }
  
  // Process queued messages after init
  function processQueue() {
    messageQueue.forEach(function(item) {
      if (item.handler) item.handler(item.data);
    });
    messageQueue = [];
  }
  
  tourDebugLog('Script loaded (bootstrap)', { readyState: document.readyState, url: location.href });
  
  // Send ready IMMEDIATELY - don't wait for anything
  // This unblocks the parent iframe UI
  sendReadyMessage();
  
  // ====== PHASE 2: SETUP MESSAGE LISTENER (before body) ======
  
  var handlers = {};
  
  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.type) return;
    
    var type = e.data.type;
    tourDebugLog('Received message: ' + type);
    
    if (handlers[type]) {
      if (initComplete) {
        handlers[type](e.data);
      } else {
        // Queue for later if init not complete
        messageQueue.push({ handler: handlers[type], data: e.data });
      }
    }
  });
  
  // ====== PHASE 3: FULL INITIALIZATION (when body available) ======
  
  function initTourBuilder() {
    if (initComplete) return;
    initComplete = true;
    
    tourDebugLog('Full initialization starting');
    
    var selectedElement = null;
    var hoveredElement = null;
    var selectionMode = false;
    var previewMode = false;
    
    // Create or get overlay elements with unique IDs
    function getOrCreateElement(id, cssText) {
      var el = document.getElementById(id);
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        el.style.cssText = cssText;
        (document.body || document.documentElement).appendChild(el);
      }
      return el;
    }
    
    tourDebugLog('Creating overlay elements');
    
    // Selection overlay
    var overlay = getOrCreateElement('__tour_builder_overlay__', 
      'position: fixed; pointer-events: none; z-index: 999999; border: 2px solid #3b82f6; background: rgba(59, 130, 246, 0.1); transition: all 0.15s ease; display: none;');
    
    // Selector tooltip
    var tooltip = getOrCreateElement('__tour_builder_tooltip__', 
      'position: fixed; z-index: 999999; background: #1e293b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-family: monospace; pointer-events: none; display: none; max-width: 300px; word-break: break-all;');

    // Preview tooltip container
    var previewTooltip = getOrCreateElement('__tour_preview_tooltip__', 
      'position: fixed; z-index: 9999999; display: none;');

    // Preview modal container
    var previewModal = getOrCreateElement('__tour_preview_modal__', 
      'position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999998; display: none; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);');

    // Highlight overlay for preview
    var highlightOverlay = getOrCreateElement('__tour_highlight_overlay__', 
      'position: fixed; pointer-events: none; z-index: 9999997; display: none;');

    // CSS styles
    var styles = document.getElementById('__tour_builder_styles__');
    if (!styles) {
      styles = document.createElement('style');
      styles.id = '__tour_builder_styles__';
      styles.textContent = '\\
        @keyframes __tour_pulse__ { 0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); } 50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); } }\\
        @keyframes __tour_glow__ { 0%, 100% { box-shadow: 0 0 10px 2px rgba(59, 130, 246, 0.6); } 50% { box-shadow: 0 0 20px 4px rgba(59, 130, 246, 0.8); } }\\
        @keyframes __tour_border__ { 0% { border-color: #3b82f6; } 50% { border-color: #60a5fa; } 100% { border-color: #3b82f6; } }\\
        @keyframes __tour_fadeIn__ { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }\\
        .__tour_tooltip__ { background: white; border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); padding: 16px; max-width: 320px; animation: __tour_fadeIn__ 0.2s ease-out; font-family: system-ui, -apple-system, sans-serif; }\\
        .__tour_tooltip__ h3 { margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e293b; }\\
        .__tour_tooltip__ p { margin: 0 0 12px 0; font-size: 14px; color: #64748b; line-height: 1.5; }\\
        .__tour_tooltip__ img { width: 100%; border-radius: 4px; margin-bottom: 12px; }\\
        .__tour_tooltip_buttons__ { display: flex; gap: 8px; justify-content: flex-end; }\\
        .__tour_tooltip_buttons__ button { padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s; }\\
        .__tour_btn_primary__ { background: #3b82f6; color: white; }\\
        .__tour_btn_primary__:hover { background: #2563eb; }\\
        .__tour_btn_secondary__ { background: transparent; color: #64748b; }\\
        .__tour_btn_secondary__:hover { background: #f1f5f9; }\\
        .__tour_arrow__ { position: absolute; width: 12px; height: 12px; background: white; transform: rotate(45deg); }\\
        .__tour_modal_content__ { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); padding: 24px; max-width: 480px; width: 90%; animation: __tour_fadeIn__ 0.3s ease-out; font-family: system-ui, -apple-system, sans-serif; }\\
        .__tour_modal_content__ h3 { margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #1e293b; }\\
        .__tour_modal_content__ p { margin: 0 0 20px 0; font-size: 15px; color: #64748b; line-height: 1.6; }\\
        .__tour_highlight_pulse__ { animation: __tour_pulse__ 1.5s infinite; }\\
        .__tour_highlight_glow__ { animation: __tour_glow__ 1.5s infinite; }\\
        .__tour_highlight_border__ { border: 2px dashed #3b82f6; animation: __tour_border__ 1s infinite; }\\
      ';
      document.head.appendChild(styles);
    }

    function generateSelector(el) {
      if (el.id && !el.id.startsWith('__tour_')) return '#' + CSS.escape(el.id);
      
      var testId = el.getAttribute('data-testid');
      if (testId) return '[data-testid="' + CSS.escape(testId) + '"]';
      
      var path = [];
      var current = el;
      while (current && current !== document.body && current !== document.documentElement) {
        var selector = current.tagName.toLowerCase();
        if (current.id && !current.id.startsWith('__tour_')) {
          path.unshift('#' + CSS.escape(current.id));
          break;
        }
        var parent = current.parentElement;
        if (parent) {
          var siblings = Array.from(parent.children).filter(function(c) { return c.tagName === current.tagName; });
          if (siblings.length > 1) {
            selector += ':nth-of-type(' + (siblings.indexOf(current) + 1) + ')';
          }
        }
        path.unshift(selector);
        current = parent;
      }
      return path.join(' > ');
    }

    function getElementLabel(el) {
      if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
      if (el.title) return el.title;
      if (el.placeholder) return el.placeholder;
      if (el.innerText && el.innerText.trim().length < 50) return el.innerText.trim();
      if (el.value && el.value.trim().length < 50) return el.value.trim();
      if (el.name) return el.name;
      if (el.id) return el.id;
      if (el.className && typeof el.className === 'string') {
        var classes = el.className.split(' ').filter(function(c) { return c && !c.match(/^(hover|active|focus|disabled)/); });
        if (classes.length > 0) return classes[0];
      }
      return el.tagName.toLowerCase();
    }

    function getElementType(el) {
      var tag = el.tagName.toLowerCase();
      if (tag === 'button' || el.getAttribute('role') === 'button') return 'button';
      if (tag === 'a') return 'link';
      if (tag === 'input') {
        var type = el.type || 'text';
        if (['text', 'email', 'password', 'tel', 'search', 'url', 'number'].indexOf(type) !== -1) return 'input';
        if (type === 'submit' || type === 'button') return 'button';
        if (type === 'checkbox') return 'checkbox';
        if (type === 'radio') return 'radio';
        return 'input';
      }
      if (tag === 'select') return 'select';
      if (tag === 'textarea') return 'input';
      if (el.getAttribute('role') === 'menuitem') return 'menu';
      if (el.getAttribute('role') === 'tab') return 'navigation';
      if (tag === 'nav' || el.closest('nav')) return 'navigation';
      return 'other';
    }

    function scanInteractiveElements() {
      tourDebugLog('Scanning interactive elements');
      var selectors = [
        'button:not([disabled]):not([aria-hidden="true"])',
        'a[href]:not([aria-hidden="true"])',
        'input:not([type="hidden"]):not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[role="button"]:not([disabled])',
        '[role="link"]',
        '[role="menuitem"]',
        '[role="tab"]',
        '[onclick]',
        '[tabindex]:not([tabindex="-1"])',
      ];

      var elements = [];
      var seen = {};

      selectors.forEach(function(selector) {
        try {
          document.querySelectorAll(selector).forEach(function(el) {
            var rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            
            var computed = window.getComputedStyle(el);
            if (computed.display === 'none' || computed.visibility === 'hidden' || computed.opacity === '0') return;
            
            if (el.id && el.id.startsWith('__tour_')) return;

            var uniqueSelector = generateSelector(el);
            if (seen[uniqueSelector]) return;
            seen[uniqueSelector] = true;

            elements.push({
              type: getElementType(el),
              selector: uniqueSelector,
              label: getElementLabel(el),
              tagName: el.tagName.toLowerCase(),
              rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
            });
          });
        } catch (e) {
          console.warn('Selector error:', selector, e);
        }
      });

      tourDebugLog('Found elements', elements.length);
      return elements;
    }

    function updateOverlay(el) {
      if (!el) {
        overlay.style.display = 'none';
        tooltip.style.display = 'none';
        return;
      }
      var rect = el.getBoundingClientRect();
      overlay.style.display = 'block';
      overlay.style.top = rect.top + 'px';
      overlay.style.left = rect.left + 'px';
      overlay.style.width = rect.width + 'px';
      overlay.style.height = rect.height + 'px';
      
      tooltip.style.display = 'block';
      tooltip.textContent = generateSelector(el);
      tooltip.style.top = Math.max(0, rect.top - 28) + 'px';
      tooltip.style.left = rect.left + 'px';
    }

    function getPosition(rect, position) {
      var padding = 12;
      
      switch(position) {
        case 'top':
          return { top: rect.top - padding, left: rect.left + rect.width / 2, arrowPos: 'bottom' };
        case 'bottom':
          return { top: rect.bottom + padding, left: rect.left + rect.width / 2, arrowPos: 'top' };
        case 'left':
          return { top: rect.top + rect.height / 2, left: rect.left - padding, arrowPos: 'right' };
        case 'right':
          return { top: rect.top + rect.height / 2, left: rect.right + padding, arrowPos: 'left' };
        default:
          var spaceAbove = rect.top;
          var spaceBelow = window.innerHeight - rect.bottom;
          if (spaceBelow > 150) return { top: rect.bottom + padding, left: rect.left + rect.width / 2, arrowPos: 'top' };
          if (spaceAbove > 150) return { top: rect.top - padding, left: rect.left + rect.width / 2, arrowPos: 'bottom' };
          return { top: rect.top + rect.height / 2, left: rect.right + padding, arrowPos: 'left' };
      }
    }

    function showTooltip(config) {
      var selector = config.selector;
      var title = config.title;
      var description = config.description;
      var position = config.position;
      var buttonText = config.buttonText;
      var showSkip = config.showSkip;
      var skipButtonText = config.skipButtonText;
      var imageUrl = config.imageUrl;
      
      var target = document.querySelector(selector);
      
      if (!target) {
        tourDebugLog('Element not found for tooltip', selector);
        return;
      }

      var rect = target.getBoundingClientRect();
      var pos = getPosition(rect, position || 'auto');
      
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function() { showTooltip(config); }, 300);
        return;
      }

      var html = '<div class="__tour_tooltip__">';
      if (imageUrl) html += '<img src="' + imageUrl + '" alt="" />';
      if (title) html += '<h3>' + title + '</h3>';
      if (description) html += '<p>' + description + '</p>';
      html += '<div class="__tour_tooltip_buttons__">';
      if (showSkip) html += '<button class="__tour_btn_secondary__" data-action="skip">' + (skipButtonText || 'Skip') + '</button>';
      html += '<button class="__tour_btn_primary__" data-action="next">' + (buttonText || 'Next') + '</button>';
      html += '</div></div>';

      previewTooltip.innerHTML = html;
      previewTooltip.style.display = 'block';

      var tooltipEl = previewTooltip.querySelector('.__tour_tooltip__');
      var tooltipRect = tooltipEl.getBoundingClientRect();
      
      var top = pos.top;
      var left = pos.left;

      if (pos.arrowPos === 'top') {
        top = pos.top;
        left = pos.left - tooltipRect.width / 2;
      } else if (pos.arrowPos === 'bottom') {
        top = pos.top - tooltipRect.height;
        left = pos.left - tooltipRect.width / 2;
      } else if (pos.arrowPos === 'left') {
        left = pos.left;
        top = pos.top - tooltipRect.height / 2;
      } else {
        left = pos.left - tooltipRect.width;
        top = pos.top - tooltipRect.height / 2;
      }

      left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));
      top = Math.max(8, Math.min(top, window.innerHeight - tooltipRect.height - 8));

      previewTooltip.style.top = top + 'px';
      previewTooltip.style.left = left + 'px';

      var arrow = document.createElement('div');
      arrow.className = '__tour_arrow__';
      if (pos.arrowPos === 'top') {
        arrow.style.cssText = 'top: -6px; left: 50%; margin-left: -6px;';
      } else if (pos.arrowPos === 'bottom') {
        arrow.style.cssText = 'bottom: -6px; left: 50%; margin-left: -6px;';
      } else if (pos.arrowPos === 'left') {
        arrow.style.cssText = 'left: -6px; top: 50%; margin-top: -6px;';
      } else {
        arrow.style.cssText = 'right: -6px; top: 50%; margin-top: -6px;';
      }
      tooltipEl.appendChild(arrow);

      showHighlight({ selector: selector, animation: 'pulse' });

      previewTooltip.querySelectorAll('button').forEach(function(btn) {
        btn.onclick = function() {
          var action = btn.getAttribute('data-action');
          window.parent.postMessage({ type: 'PREVIEW_ACTION', action: action }, '*');
        };
      });
    }

    function showModal(config) {
      var title = config.title;
      var description = config.description;
      var buttonText = config.buttonText;
      var showSkip = config.showSkip;
      var skipButtonText = config.skipButtonText;
      var imageUrl = config.imageUrl;

      var html = '<div class="__tour_modal_content__">';
      if (imageUrl) html += '<img src="' + imageUrl + '" alt="" style="width:100%;border-radius:8px;margin-bottom:16px;" />';
      if (title) html += '<h3>' + title + '</h3>';
      if (description) html += '<p>' + description + '</p>';
      html += '<div class="__tour_tooltip_buttons__">';
      if (showSkip) html += '<button class="__tour_btn_secondary__" data-action="skip">' + (skipButtonText || 'Skip') + '</button>';
      html += '<button class="__tour_btn_primary__" data-action="next">' + (buttonText || 'Next') + '</button>';
      html += '</div></div>';

      previewModal.innerHTML = html;
      previewModal.style.display = 'block';

      previewModal.querySelectorAll('button').forEach(function(btn) {
        btn.onclick = function() {
          var action = btn.getAttribute('data-action');
          window.parent.postMessage({ type: 'PREVIEW_ACTION', action: action }, '*');
        };
      });
    }

    function showHighlight(config) {
      var selector = config.selector;
      var animation = config.animation;
      var color = config.color;
      
      var target = document.querySelector(selector);
      
      if (!target) return;

      var rect = target.getBoundingClientRect();
      highlightOverlay.style.display = 'block';
      highlightOverlay.style.top = rect.top + 'px';
      highlightOverlay.style.left = rect.left + 'px';
      highlightOverlay.style.width = rect.width + 'px';
      highlightOverlay.style.height = rect.height + 'px';
      highlightOverlay.style.borderRadius = '4px';
      
      highlightOverlay.className = '';
      if (animation === 'pulse') {
        highlightOverlay.classList.add('__tour_highlight_pulse__');
      } else if (animation === 'glow') {
        highlightOverlay.classList.add('__tour_highlight_glow__');
      } else if (animation === 'border') {
        highlightOverlay.classList.add('__tour_highlight_border__');
      }

      if (color) {
        highlightOverlay.style.boxShadow = '0 0 0 4px ' + color;
      }
    }

    function hideAll() {
      previewTooltip.style.display = 'none';
      previewTooltip.innerHTML = '';
      previewModal.style.display = 'none';
      previewModal.innerHTML = '';
      highlightOverlay.style.display = 'none';
      highlightOverlay.className = '';
    }

    function handleMouseMove(e) {
      if (!selectionMode || previewMode) return;
      hoveredElement = e.target;
      if (hoveredElement.id && hoveredElement.id.startsWith('__tour_')) return;
      updateOverlay(hoveredElement);
    }

    function handleClick(e) {
      if (!selectionMode || previewMode) return;
      e.preventDefault();
      e.stopPropagation();
      
      var el = e.target;
      if (el.id && el.id.startsWith('__tour_')) return;
      
      selectedElement = el;
      var rect = el.getBoundingClientRect();
      
      window.parent.postMessage({
        type: 'ELEMENT_SELECTED',
        data: {
          tagName: el.tagName.toLowerCase(),
          id: el.id || null,
          classList: Array.from(el.classList),
          textContent: (el.textContent || '').trim().substring(0, 100),
          selector: generateSelector(el),
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
        }
      }, '*');
    }

    // Register handlers
    handlers['SET_SELECTION_MODE'] = function(data) {
      selectionMode = data.enabled;
      if (document.body) document.body.style.cursor = selectionMode ? 'crosshair' : '';
      if (!selectionMode) {
        overlay.style.display = 'none';
        tooltip.style.display = 'none';
      }
    };
    
    handlers['SET_PREVIEW_MODE'] = function(data) {
      previewMode = data.enabled;
      if (!previewMode) hideAll();
    };
    
    handlers['SCAN_ELEMENTS'] = function() {
      var elements = scanInteractiveElements();
      window.parent.postMessage({ type: 'ELEMENTS_SCANNED', elements: elements }, '*');
    };
    
    handlers['SHOW_TOOLTIP'] = function(data) {
      hideAll();
      showTooltip(data.config);
    };
    
    handlers['SHOW_MODAL'] = function(data) {
      hideAll();
      showModal(data.config);
    };
    
    handlers['SHOW_HIGHLIGHT'] = function(data) {
      hideAll();
      showHighlight(data.config);
    };
    
    handlers['HIDE_ALL'] = function() {
      hideAll();
    };
    
    handlers['HIGHLIGHT_ELEMENT'] = function(data) {
      var el = document.querySelector(data.selector);
      if (el) updateOverlay(el);
    };
    
    handlers['CLEAR_HIGHLIGHT'] = function() {
      overlay.style.display = 'none';
      tooltip.style.display = 'none';
    };

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    
    tourDebugLog('Full initialization complete, processing queue');
    processQueue();
  }
  
  // ====== PHASE 4: WAIT FOR BODY AND INITIALIZE ======
  
  function waitForBody() {
    if (document.body) {
      tourDebugLog('Body found, initializing');
      initTourBuilder();
    } else {
      tourDebugLog('Waiting for body...');
      var observer = new MutationObserver(function() {
        if (document.body) {
          observer.disconnect();
          tourDebugLog('Body appeared via observer');
          initTourBuilder();
        }
      });
      observer.observe(document.documentElement, { childList: true });
      
      // Also use DOMContentLoaded as backup
      document.addEventListener('DOMContentLoaded', function() {
        tourDebugLog('DOMContentLoaded fired');
        if (!initComplete) initTourBuilder();
      });
    }
  }
  
  // Start waiting for body
  if (document.readyState === 'loading') {
    waitForBody();
  } else {
    // DOM already loaded
    setTimeout(initTourBuilder, 100);
  }
  
  // Fallback: ensure init happens even for slow SPAs
  setTimeout(function() {
    if (!initComplete) {
      tourDebugLog('Fallback init at 2s');
      initTourBuilder();
    }
  }, 2000);
  
  // Catch errors and report
  window.addEventListener('error', function(e) {
    tourDebugLog('Page error', { message: e.message, filename: e.filename, lineno: e.lineno });
  });
  
})();
<\/script>
`;

// Generate error HTML page that communicates with parent
function generateErrorHtml(errorMessage: string, targetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erro ao carregar página</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 480px;
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 24px;
      background: #ef4444;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon svg {
      width: 32px;
      height: 32px;
      stroke: white;
      stroke-width: 2;
      fill: none;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    p {
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 8px;
    }
    .error-detail {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      padding: 12px;
      margin: 20px 0;
      font-family: monospace;
      font-size: 13px;
      color: #fca5a5;
      word-break: break-all;
    }
    .url {
      background: rgba(255,255,255,0.05);
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 13px;
      color: #64748b;
      margin-top: 16px;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </div>
    <h1>Não foi possível carregar a página</h1>
    <p>O Visual Builder não conseguiu processar esta URL.</p>
    <div class="error-detail">${errorMessage}</div>
    <p>Verifique se a URL está correta e aponta para uma página HTML válida.</p>
    <div class="url">${targetUrl}</div>
  </div>
  <script>
    // Send IFRAME_READY with error to parent
    try {
      window.parent.postMessage({ 
        type: 'IFRAME_READY', 
        error: ${JSON.stringify(errorMessage)}
      }, '*');
    } catch (e) {
      console.error('Failed to notify parent:', e);
    }
  <\/script>
</body>
</html>`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      console.error('Missing url parameter');
      const errorHtml = generateErrorHtml('Parâmetro URL não fornecido', 'N/A');
      return new Response(errorHtml, { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    console.log(`Proxying request to: ${targetUrl}`);

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        redirect: 'follow',
      });
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      const errorHtml = generateErrorHtml(
        `Não foi possível conectar: ${fetchError instanceof Error ? fetchError.message : 'Erro de rede'}`,
        targetUrl
      );
      return new Response(errorHtml, { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    console.log(`Response status: ${response.status}, content-type: ${response.headers.get('content-type')}`);

    if (!response.ok) {
      console.error(`Fetch failed with status: ${response.status}`);
      const errorHtml = generateErrorHtml(
        `A página retornou erro ${response.status} (${response.statusText})`,
        targetUrl
      );
      return new Response(errorHtml, { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      console.error(`Invalid content type: ${contentType}`);
      const errorHtml = generateErrorHtml(
        `A URL não retorna HTML (content-type: ${contentType || 'não especificado'})`,
        targetUrl
      );
      return new Response(errorHtml, { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    let html = await response.text();
    console.log(`Received HTML: ${html.length} bytes`);
    
    // Get actual final URL after redirects
    const finalUrl = response.url || targetUrl;
    const baseUrl = new URL(finalUrl);
    const baseHref = `${baseUrl.protocol}//${baseUrl.host}`;

    // Remove CSP meta tags that might block our script
    html = html.replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '');
    html = html.replace(/<meta[^>]*content-security-policy[^>]*>/gi, '');
    
    // Remove nonces from existing scripts (they won't match our injected script)
    html = html.replace(/\s+nonce="[^"]*"/gi, '');
    html = html.replace(/\s+nonce='[^']*'/gi, '');

    // CRITICAL: Inject our script at the START of <head> (before any other scripts)
    // This ensures our script runs first, before blocking scripts
    if (html.includes('<head>')) {
      html = html.replace(/<head>/i, `<head>${INJECTION_SCRIPT}`);
    } else if (html.match(/<head\s[^>]*>/i)) {
      html = html.replace(/<head\s([^>]*)>/i, `<head $1>${INJECTION_SCRIPT}`);
    } else if (html.includes('<body')) {
      // No head tag, inject before body
      html = html.replace(/<body/i, `<head>${INJECTION_SCRIPT}</head><body`);
    } else {
      // No standard structure, prepend
      html = INJECTION_SCRIPT + html;
    }

    // Add base tag for relative URLs if not present
    if (!html.includes('<base')) {
      // Insert base tag after our script injection
      if (html.includes(INJECTION_SCRIPT)) {
        html = html.replace(INJECTION_SCRIPT, `${INJECTION_SCRIPT}<base href="${baseHref}/">`);
      }
    }

    // Rewrite relative URLs for assets
    html = html.replace(/href="\/(?!\/)/g, `href="${baseHref}/`);
    html = html.replace(/src="\/(?!\/)/g, `src="${baseHref}/`);

    console.log(`Returning modified HTML: ${html.length} bytes`);

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        // Fully permissive CSP to allow injected scripts and inline styles
        'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src * data: blob:; font-src * data:; connect-src *; frame-ancestors *;",
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const errorHtml = generateErrorHtml(`Erro interno do proxy: ${errorMessage}`, 'N/A');
    return new Response(errorHtml, {
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
});
