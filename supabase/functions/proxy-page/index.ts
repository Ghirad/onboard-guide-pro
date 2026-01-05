import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Script to inject into the proxied page for element selection
const INJECTION_SCRIPT = `
<script>
(function() {
  let selectedElement = null;
  let hoveredElement = null;
  let selectionMode = false;
  
  const overlay = document.createElement('div');
  overlay.id = '__tour_builder_overlay__';
  overlay.style.cssText = 'position: fixed; pointer-events: none; z-index: 999999; border: 2px solid #3b82f6; background: rgba(59, 130, 246, 0.1); transition: all 0.15s ease; display: none;';
  document.body.appendChild(overlay);
  
  const tooltip = document.createElement('div');
  tooltip.id = '__tour_builder_tooltip__';
  tooltip.style.cssText = 'position: fixed; z-index: 999999; background: #1e293b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-family: monospace; pointer-events: none; display: none; max-width: 300px; word-break: break-all;';
  document.body.appendChild(tooltip);

  function generateSelector(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    
    const testId = el.getAttribute('data-testid');
    if (testId) return '[data-testid="' + CSS.escape(testId) + '"]';
    
    const path = [];
    let current = el;
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
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

  function handleMouseMove(e) {
    if (!selectionMode) return;
    hoveredElement = e.target;
    if (hoveredElement.id === '__tour_builder_overlay__' || hoveredElement.id === '__tour_builder_tooltip__') {
      return;
    }
    updateOverlay(hoveredElement);
  }

  function handleClick(e) {
    if (!selectionMode) return;
    e.preventDefault();
    e.stopPropagation();
    
    const el = e.target;
    if (el.id === '__tour_builder_overlay__' || el.id === '__tour_builder_tooltip__') return;
    
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
  
  window.parent.postMessage({ type: 'IFRAME_READY' }, '*');
})();
</script>
`;

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing url parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Proxying request to: ${targetUrl}`);

    // Fetch the target page
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch page: ${response.status}` }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let html = await response.text();

    // Parse the base URL for rewriting relative URLs
    const baseUrl = new URL(targetUrl);
    const baseHref = `${baseUrl.protocol}//${baseUrl.host}`;

    // Add base tag for relative URLs
    if (!html.includes('<base')) {
      html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}/">`);
    }

    // Inject our selection script before closing body tag
    html = html.replace(/<\/body>/i, `${INJECTION_SCRIPT}</body>`);

    // Rewrite relative URLs for assets
    html = html.replace(/href="\/(?!\/)/g, `href="${baseHref}/`);
    html = html.replace(/src="\/(?!\/)/g, `src="${baseHref}/`);

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': "frame-ancestors *;",
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
