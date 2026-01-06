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
  let previewMode = false;
  
  // Selection overlay
  const overlay = document.createElement('div');
  overlay.id = '__tour_builder_overlay__';
  overlay.style.cssText = 'position: fixed; pointer-events: none; z-index: 999999; border: 2px solid #3b82f6; background: rgba(59, 130, 246, 0.1); transition: all 0.15s ease; display: none;';
  document.body.appendChild(overlay);
  
  // Selector tooltip
  const tooltip = document.createElement('div');
  tooltip.id = '__tour_builder_tooltip__';
  tooltip.style.cssText = 'position: fixed; z-index: 999999; background: #1e293b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-family: monospace; pointer-events: none; display: none; max-width: 300px; word-break: break-all;';
  document.body.appendChild(tooltip);

  // Preview tooltip container
  const previewTooltip = document.createElement('div');
  previewTooltip.id = '__tour_preview_tooltip__';
  previewTooltip.style.cssText = 'position: fixed; z-index: 9999999; display: none;';
  document.body.appendChild(previewTooltip);

  // Preview modal container
  const previewModal = document.createElement('div');
  previewModal.id = '__tour_preview_modal__';
  previewModal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999998; display: none; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);';
  document.body.appendChild(previewModal);

  // Highlight overlay for preview
  const highlightOverlay = document.createElement('div');
  highlightOverlay.id = '__tour_highlight_overlay__';
  highlightOverlay.style.cssText = 'position: fixed; pointer-events: none; z-index: 9999997; display: none;';
  document.body.appendChild(highlightOverlay);

  // CSS styles
  const styles = document.createElement('style');
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

  function getPosition(rect, position) {
    const padding = 12;
    const arrowSize = 6;
    
    switch(position) {
      case 'top':
        return { top: rect.top - padding, left: rect.left + rect.width / 2, arrowPos: 'bottom' };
      case 'bottom':
        return { top: rect.bottom + padding, left: rect.left + rect.width / 2, arrowPos: 'top' };
      case 'left':
        return { top: rect.top + rect.height / 2, left: rect.left - padding, arrowPos: 'right' };
      case 'right':
        return { top: rect.top + rect.height / 2, left: rect.right + padding, arrowPos: 'left' };
      default: // auto
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
      console.warn('Tour: Element not found:', selector);
      return;
    }

    const rect = target.getBoundingClientRect();
    const pos = getPosition(rect, position || 'auto');
    
    // Scroll element into view if needed
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

    // Position tooltip
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

    // Keep in viewport
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - tooltipRect.height - 8));

    previewTooltip.style.top = top + 'px';
    previewTooltip.style.left = left + 'px';

    // Add arrow
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

    // Show highlight on target
    showHighlight({ selector, animation: 'pulse' });

    // Button handlers
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
  
  window.parent.postMessage({ type: 'IFRAME_READY' }, '*');
})();
`;
