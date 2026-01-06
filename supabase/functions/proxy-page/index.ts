import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Complete injection script with selection, preview, and element scanning
// This script is injected into the <head> and waits for DOM to be ready
const INJECTION_SCRIPT = `
<script>
(function() {
  'use strict';
  
  // Debug logging function
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
  
  tourDebugLog('Script loaded', { readyState: document.readyState, url: location.href });
  
  let readySent = false;
  
  function sendReadyMessage() {
    if (readySent) return;
    try {
      tourDebugLog('Sending IFRAME_READY');
      window.parent.postMessage({ type: 'IFRAME_READY' }, '*');
      readySent = true;
    } catch (e) {
      tourDebugLog('Failed to send IFRAME_READY', e.message);
    }
  }
  
  function initTourBuilder() {
    if (window.__tourBuilderInitialized__) {
      tourDebugLog('Already initialized, skipping');
      sendReadyMessage();
      return;
    }
    window.__tourBuilderInitialized__ = true;
    
    tourDebugLog('Initializing tour builder');
    
    let selectedElement = null;
    let hoveredElement = null;
    let selectionMode = false;
    let previewMode = false;
    
    // Create or get overlay elements with unique IDs
    function getOrCreateElement(id, cssText) {
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        el.style.cssText = cssText;
        (document.body || document.documentElement).appendChild(el);
      }
      return el;
    }
    
    // Wait for body to be available
    function ensureBody(callback) {
      if (document.body) {
        callback();
      } else {
        const observer = new MutationObserver(() => {
          if (document.body) {
            observer.disconnect();
            callback();
          }
        });
        observer.observe(document.documentElement, { childList: true });
      }
    }
    
    ensureBody(function() {
      tourDebugLog('Body available, creating elements');
      
      // Selection overlay
      const overlay = getOrCreateElement('__tour_builder_overlay__', 
        'position: fixed; pointer-events: none; z-index: 999999; border: 2px solid #3b82f6; background: rgba(59, 130, 246, 0.1); transition: all 0.15s ease; display: none;');
      
      // Selector tooltip
      const tooltip = getOrCreateElement('__tour_builder_tooltip__', 
        'position: fixed; z-index: 999999; background: #1e293b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-family: monospace; pointer-events: none; display: none; max-width: 300px; word-break: break-all;');

      // Preview tooltip container
      const previewTooltip = getOrCreateElement('__tour_preview_tooltip__', 
        'position: fixed; z-index: 9999999; display: none;');

      // Preview modal container
      const previewModal = getOrCreateElement('__tour_preview_modal__', 
        'position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999998; display: none; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);');

      // Highlight overlay for preview
      const highlightOverlay = getOrCreateElement('__tour_highlight_overlay__', 
        'position: fixed; pointer-events: none; z-index: 9999997; display: none;');

      // CSS styles
      let styles = document.getElementById('__tour_builder_styles__');
      if (!styles) {
        styles = document.createElement('style');
        styles.id = '__tour_builder_styles__';
        styles.textContent = \`
          @keyframes __tour_pulse__ {
            0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
            50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
          }
          @keyframes __tour_glow__ {
            0%, 100% { box-shadow: 0 0 10px 2px rgba(59, 130, 246, 0.6); }
            50% { box-shadow: 0 0 20px 4px rgba(59, 130, 246, 0.8); }
          }
          @keyframes __tour_border__ {
            0% { border-color: #3b82f6; }
            50% { border-color: #60a5fa; }
            100% { border-color: #3b82f6; }
          }
          @keyframes __tour_fadeIn__ {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .__tour_tooltip__ {
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
            padding: 16px;
            max-width: 320px;
            animation: __tour_fadeIn__ 0.2s ease-out;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .__tour_tooltip__ h3 {
            margin: 0 0 8px 0;
            font-size: 16px;
            font-weight: 600;
            color: #1e293b;
          }
          .__tour_tooltip__ p {
            margin: 0 0 12px 0;
            font-size: 14px;
            color: #64748b;
            line-height: 1.5;
          }
          .__tour_tooltip__ img {
            width: 100%;
            border-radius: 4px;
            margin-bottom: 12px;
          }
          .__tour_tooltip_buttons__ {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
          }
          .__tour_tooltip_buttons__ button {
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            border: none;
            transition: all 0.15s;
          }
          .__tour_btn_primary__ {
            background: #3b82f6;
            color: white;
          }
          .__tour_btn_primary__:hover {
            background: #2563eb;
          }
          .__tour_btn_secondary__ {
            background: transparent;
            color: #64748b;
          }
          .__tour_btn_secondary__:hover {
            background: #f1f5f9;
          }
          .__tour_arrow__ {
            position: absolute;
            width: 12px;
            height: 12px;
            background: white;
            transform: rotate(45deg);
          }
          .__tour_modal_content__ {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 24px;
            max-width: 480px;
            width: 90%;
            animation: __tour_fadeIn__ 0.3s ease-out;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .__tour_modal_content__ h3 {
            margin: 0 0 12px 0;
            font-size: 20px;
            font-weight: 600;
            color: #1e293b;
          }
          .__tour_modal_content__ p {
            margin: 0 0 20px 0;
            font-size: 15px;
            color: #64748b;
            line-height: 1.6;
          }
          .__tour_highlight_pulse__ {
            animation: __tour_pulse__ 1.5s infinite;
          }
          .__tour_highlight_glow__ {
            animation: __tour_glow__ 1.5s infinite;
          }
          .__tour_highlight_border__ {
            border: 2px dashed #3b82f6;
            animation: __tour_border__ 1s infinite;
          }
        \`;
        document.head.appendChild(styles);
      }

      function generateSelector(el) {
        if (el.id && !el.id.startsWith('__tour_')) return '#' + CSS.escape(el.id);
        
        const testId = el.getAttribute('data-testid');
        if (testId) return '[data-testid="' + CSS.escape(testId) + '"]';
        
        const path = [];
        let current = el;
        while (current && current !== document.body && current !== document.documentElement) {
          let selector = current.tagName.toLowerCase();
          if (current.id && !current.id.startsWith('__tour_')) {
            path.unshift('#' + CSS.escape(current.id));
            break;
          }
          const parent = current.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
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
          const classes = el.className.split(' ').filter(c => c && !c.match(/^(hover|active|focus|disabled)/));
          if (classes.length > 0) return classes[0];
        }
        return el.tagName.toLowerCase();
      }

      function getElementType(el) {
        const tag = el.tagName.toLowerCase();
        if (tag === 'button' || el.getAttribute('role') === 'button') return 'button';
        if (tag === 'a') return 'link';
        if (tag === 'input') {
          const type = el.type || 'text';
          if (['text', 'email', 'password', 'tel', 'search', 'url', 'number'].includes(type)) return 'input';
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
        const selectors = [
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

        const elements = [];
        const seen = new Set();

        selectors.forEach(selector => {
          try {
            document.querySelectorAll(selector).forEach(el => {
              const rect = el.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) return;
              
              const computed = window.getComputedStyle(el);
              if (computed.display === 'none' || computed.visibility === 'hidden' || computed.opacity === '0') return;
              
              if (el.id && el.id.startsWith('__tour_')) return;

              const uniqueSelector = generateSelector(el);
              if (seen.has(uniqueSelector)) return;
              seen.add(uniqueSelector);

              elements.push({
                type: getElementType(el),
                selector: uniqueSelector,
                label: getElementLabel(el),
                tagName: el.tagName.toLowerCase(),
                rect: {
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                },
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
        const rect = el.getBoundingClientRect();
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
        const padding = 12;
        
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
            const spaceAbove = rect.top;
            const spaceBelow = window.innerHeight - rect.bottom;
            if (spaceBelow > 150) return { top: rect.bottom + padding, left: rect.left + rect.width / 2, arrowPos: 'top' };
            if (spaceAbove > 150) return { top: rect.top - padding, left: rect.left + rect.width / 2, arrowPos: 'bottom' };
            return { top: rect.top + rect.height / 2, left: rect.right + padding, arrowPos: 'left' };
        }
      }

      function showTooltip(config) {
        const { selector, title, description, position, buttonText, showSkip, skipButtonText, imageUrl } = config;
        const target = document.querySelector(selector);
        
        if (!target) {
          tourDebugLog('Element not found for tooltip', selector);
          return;
        }

        const rect = target.getBoundingClientRect();
        const pos = getPosition(rect, position || 'auto');
        
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => showTooltip(config), 300);
          return;
        }

        let html = '<div class="__tour_tooltip__">';
        if (imageUrl) html += '<img src="' + imageUrl + '" alt="" />';
        if (title) html += '<h3>' + title + '</h3>';
        if (description) html += '<p>' + description + '</p>';
        html += '<div class="__tour_tooltip_buttons__">';
        if (showSkip) html += '<button class="__tour_btn_secondary__" data-action="skip">' + (skipButtonText || 'Skip') + '</button>';
        html += '<button class="__tour_btn_primary__" data-action="next">' + (buttonText || 'Next') + '</button>';
        html += '</div></div>';

        previewTooltip.innerHTML = html;
        previewTooltip.style.display = 'block';

        const tooltipEl = previewTooltip.querySelector('.__tour_tooltip__');
        const tooltipRect = tooltipEl.getBoundingClientRect();
        
        let top = pos.top;
        let left = pos.left;

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

        const arrow = document.createElement('div');
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

        showHighlight({ selector, animation: 'pulse' });

        previewTooltip.querySelectorAll('button').forEach(btn => {
          btn.onclick = () => {
            const action = btn.getAttribute('data-action');
            window.parent.postMessage({ type: 'PREVIEW_ACTION', action }, '*');
          };
        });
      }

      function showModal(config) {
        const { title, description, buttonText, showSkip, skipButtonText, imageUrl } = config;

        let html = '<div class="__tour_modal_content__">';
        if (imageUrl) html += '<img src="' + imageUrl + '" alt="" style="width:100%;border-radius:8px;margin-bottom:16px;" />';
        if (title) html += '<h3>' + title + '</h3>';
        if (description) html += '<p>' + description + '</p>';
        html += '<div class="__tour_tooltip_buttons__">';
        if (showSkip) html += '<button class="__tour_btn_secondary__" data-action="skip">' + (skipButtonText || 'Skip') + '</button>';
        html += '<button class="__tour_btn_primary__" data-action="next">' + (buttonText || 'Next') + '</button>';
        html += '</div></div>';

        previewModal.innerHTML = html;
        previewModal.style.display = 'block';

        previewModal.querySelectorAll('button').forEach(btn => {
          btn.onclick = () => {
            const action = btn.getAttribute('data-action');
            window.parent.postMessage({ type: 'PREVIEW_ACTION', action }, '*');
          };
        });
      }

      function showHighlight(config) {
        const { selector, animation, color } = config;
        const target = document.querySelector(selector);
        
        if (!target) return;

        const rect = target.getBoundingClientRect();
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
        
        const el = e.target;
        if (el.id && el.id.startsWith('__tour_')) return;
        
        selectedElement = el;
        const rect = el.getBoundingClientRect();
        
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

      window.addEventListener('message', function(e) {
        if (e.data.type === 'SET_SELECTION_MODE') {
          selectionMode = e.data.enabled;
          document.body.style.cursor = selectionMode ? 'crosshair' : '';
          if (!selectionMode) {
            overlay.style.display = 'none';
            tooltip.style.display = 'none';
          }
        } else if (e.data.type === 'SET_PREVIEW_MODE') {
          previewMode = e.data.enabled;
          if (!previewMode) hideAll();
        } else if (e.data.type === 'SCAN_ELEMENTS') {
          const elements = scanInteractiveElements();
          window.parent.postMessage({ type: 'ELEMENTS_SCANNED', elements }, '*');
        } else if (e.data.type === 'SHOW_TOOLTIP') {
          hideAll();
          showTooltip(e.data.config);
        } else if (e.data.type === 'SHOW_MODAL') {
          hideAll();
          showModal(e.data.config);
        } else if (e.data.type === 'SHOW_HIGHLIGHT') {
          hideAll();
          showHighlight(e.data.config);
        } else if (e.data.type === 'HIDE_ALL') {
          hideAll();
        } else if (e.data.type === 'HIGHLIGHT_ELEMENT') {
          const el = document.querySelector(e.data.selector);
          if (el) updateOverlay(el);
        } else if (e.data.type === 'CLEAR_HIGHLIGHT') {
          overlay.style.display = 'none';
          tooltip.style.display = 'none';
        }
      });

      document.addEventListener('mousemove', handleMouseMove, true);
      document.addEventListener('click', handleClick, true);
      
      tourDebugLog('Event listeners attached');
      sendReadyMessage();
    });
  }
  
  // Initialize with multiple strategies for React/SPA sites
  function startInit() {
    tourDebugLog('Starting initialization', { readyState: document.readyState });
    
    if (document.readyState === 'loading') {
      // DOM still loading, wait for DOMContentLoaded
      document.addEventListener('DOMContentLoaded', function() {
        tourDebugLog('DOMContentLoaded fired');
        // Give React/SPA a moment to hydrate
        setTimeout(initTourBuilder, 500);
      });
    } else {
      // DOM already loaded (interactive or complete)
      // Give React/SPA a moment to hydrate
      setTimeout(initTourBuilder, 300);
    }
    
    // Fallback: try again after more time for slow SPAs
    setTimeout(function() {
      if (!readySent) {
        tourDebugLog('Fallback initialization at 2s');
        initTourBuilder();
      }
    }, 2000);
    
    setTimeout(function() {
      if (!readySent) {
        tourDebugLog('Fallback initialization at 4s');
        initTourBuilder();
      }
    }, 4000);
    
    // Final fallback: send ready anyway after 6s
    setTimeout(function() {
      if (!readySent) {
        tourDebugLog('Final fallback - sending IFRAME_READY anyway');
        sendReadyMessage();
      }
    }, 6000);
  }
  
  startInit();
})();
<\/script>
`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      console.error('Missing url parameter');
      return new Response(
        JSON.stringify({ error: 'Missing url parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Proxying request to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      redirect: 'follow',
    });

    console.log(`Response status: ${response.status}, content-type: ${response.headers.get('content-type')}`);

    if (!response.ok) {
      console.error(`Fetch failed with status: ${response.status}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch page: ${response.status} ${response.statusText}` }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      console.error(`Invalid content type: ${contentType}`);
      return new Response(
        JSON.stringify({ error: `Page is not HTML: ${contentType}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
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

    // Inject our script at the END of <head> (after other scripts, before body)
    // This ensures our script runs after the page's initial scripts are defined
    if (html.includes('</head>')) {
      html = html.replace(/<\/head>/i, `${INJECTION_SCRIPT}</head>`);
    } else if (html.includes('<body')) {
      // No head tag, inject before body
      html = html.replace(/<body/i, `${INJECTION_SCRIPT}<body`);
    } else {
      // No standard structure, prepend
      html = INJECTION_SCRIPT + html;
    }

    // Add base tag for relative URLs if not present
    if (!html.includes('<base')) {
      html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}/">`);
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
        'Content-Security-Policy': "frame-ancestors *;",
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Failed to proxy page', details: errorMessage }),
      {
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
