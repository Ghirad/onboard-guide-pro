// Utility to generate unique CSS selectors for elements

export interface ElementInfo {
  tagName: string;
  id?: string;
  classList: string[];
  attributes: Record<string, string>;
  textContent?: string;
  rect: DOMRect | { top: number; left: number; width: number; height: number };
  selector: string;
  xpath: string;
}

export function generateUniqueSelector(element: Element): string {
  // Priority 1: ID
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  // Priority 2: data-testid or data-* attributes
  const testId = element.getAttribute('data-testid');
  if (testId) {
    return `[data-testid="${CSS.escape(testId)}"]`;
  }

  const dataAttributes = Array.from(element.attributes)
    .filter(attr => attr.name.startsWith('data-') && attr.value)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (dataAttributes.length > 0) {
    const attr = dataAttributes[0];
    return `[${attr.name}="${CSS.escape(attr.value)}"]`;
  }

  // Priority 3: Unique class combination
  const classes = Array.from(element.classList).filter(c => !c.match(/^(hover|active|focus|disabled)/));
  if (classes.length > 0) {
    const selector = `${element.tagName.toLowerCase()}.${classes.map(c => CSS.escape(c)).join('.')}`;
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }

  // Priority 4: Build path from ancestors
  const path: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      path.unshift(`#${CSS.escape(current.id)}`);
      break;
    }

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = parent;
  }

  return path.join(' > ');
}

export function generateXPath(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let sibling: Element | null = current.previousElementSibling;

    while (sibling) {
      if (sibling.tagName === current.tagName) {
        index++;
      }
      sibling = sibling.previousElementSibling;
    }

    const tagName = current.tagName.toLowerCase();
    const part = index > 0 ? `${tagName}[${index + 1}]` : tagName;
    parts.unshift(part);

    if (current === document.body) break;
    current = current.parentElement;
  }

  return '/' + parts.join('/');
}

export function getElementInfo(element: Element): ElementInfo {
  const rect = element.getBoundingClientRect();
  
  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id || undefined,
    classList: Array.from(element.classList),
    attributes: Object.fromEntries(
      Array.from(element.attributes).map(attr => [attr.name, attr.value])
    ),
    textContent: element.textContent?.trim().substring(0, 100) || undefined,
    rect: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    },
    selector: generateUniqueSelector(element),
    xpath: generateXPath(element),
  };
}

// Script that will be injected into the iframe
export const IFRAME_INJECTION_SCRIPT = `
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
`;
