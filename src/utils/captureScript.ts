/**
 * Generates a capture script that can be pasted into the browser console
 * to enable element selection and send data back to the Tour Builder.
 * Now includes an inline step configuration panel and auto-save to API.
 */
export function generateCaptureScript(
  token: string, 
  builderOrigin: string,
  configurationId: string,
  apiKey: string,
  supabaseUrl: string
): string {
  return `
(function() {
  // Configuration
  const CAPTURE_TOKEN = '${token}';
  const BUILDER_ORIGIN = '${builderOrigin}';
  const CONFIGURATION_ID = '${configurationId}';
  const API_KEY = '${apiKey}';
  const SUPABASE_URL = '${supabaseUrl}';
  
  // State
  let isActive = true;
  let isPaused = false;
  let hoveredElement = null;
  let configPanel = null;
  let currentElement = null;
  
  // Create overlay element
  const overlay = document.createElement('div');
  overlay.id = 'tour-capture-overlay';
  overlay.style.cssText = \`
    position: fixed;
    pointer-events: none;
    border: 2px solid #3b82f6;
    background: rgba(59, 130, 246, 0.1);
    z-index: 999999;
    transition: all 0.15s ease;
    border-radius: 4px;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
  \`;
  document.body.appendChild(overlay);
  
  // Create info tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'tour-capture-tooltip';
  tooltip.style.cssText = \`
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
  \`;
  document.body.appendChild(tooltip);
  
  // Create control panel
  const panel = document.createElement('div');
  panel.id = 'tour-capture-panel';
  
  function updatePanelUI() {
    const statusIndicator = isPaused ? '⏸' : '●';
    const statusColor = isPaused ? '#eab308' : '#22c55e';
    const statusText = isPaused ? 'Pausado' : 'Ativo';
    const pauseButtonText = isPaused ? '▶ Retomar' : '⏸ Pausar';
    const pauseButtonBg = isPaused ? '#22c55e' : '#6b7280';
    
    panel.innerHTML = \`
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: \${statusColor};">\${statusIndicator}</span>
        <span>Tour Capture \${statusText}</span>
        <button id="tour-capture-scan" style="
          background: #3b82f6;
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
        ">Scan</button>
        <button id="tour-capture-pause" style="
          background: \${pauseButtonBg};
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
        ">\${pauseButtonText}</button>
        <button id="tour-capture-exit" style="
          background: #ef4444;
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
        ">Sair</button>
      </div>
      <div style="font-size: 10px; color: #9ca3af; margin-top: 6px;">
        Pressione <kbd style="background: #374151; padding: 1px 4px; border-radius: 3px;">P</kbd> para \${isPaused ? 'retomar' : 'pausar'}
      </div>
    \`;
    
    // Re-attach event listeners after innerHTML update
    document.getElementById('tour-capture-scan').addEventListener('click', scanElements);
    document.getElementById('tour-capture-pause').addEventListener('click', togglePause);
    document.getElementById('tour-capture-exit').addEventListener('click', cleanup);
  }
  
  function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
      overlay.style.display = 'none';
      tooltip.style.display = 'none';
      console.log('[Tour Capture] Pausado - interaja com a página normalmente');
    } else {
      console.log('[Tour Capture] Retomado - captura ativa');
    }
    updatePanelUI();
  }
  
  panel.style.cssText = \`
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
  \`;
  document.body.appendChild(panel);
  updatePanelUI();
  
  // Generate CSS selector
  function generateSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return 'body';
    
    // Priority 1: ID
    if (el.id) {
      return '#' + CSS.escape(el.id);
    }
    
    // Priority 2: data-testid
    if (el.dataset.testid) {
      return '[data-testid="' + el.dataset.testid + '"]';
    }
    
    // Priority 3: Unique class combination
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\\s+/).filter(c => c && !c.match(/^(hover|active|focus|disabled)/i));
      if (classes.length > 0) {
        const selector = el.tagName.toLowerCase() + '.' + classes.map(c => CSS.escape(c)).join('.');
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      }
    }
    
    // Priority 4: nth-of-type path
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
  
  // Get element label
  function getElementLabel(el) {
    const text = (el.textContent || '').trim().slice(0, 50);
    const ariaLabel = el.getAttribute('aria-label');
    const placeholder = el.getAttribute('placeholder');
    const title = el.getAttribute('title');
    const alt = el.getAttribute('alt');
    
    return ariaLabel || title || alt || placeholder || text || el.tagName.toLowerCase();
  }
  
  // Get suggested step type based on element
  function getSuggestedType(tagName) {
    const tag = tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return 'input';
    if (tag === 'button' || tag === 'a') return 'click';
    if (tag === 'select') return 'click';
    return 'tooltip';
  }
  
  // Get element type label in Portuguese
  function getElementTypeLabel(tagName) {
    const tag = tagName.toLowerCase();
    if (tag === 'button') return 'Botão';
    if (tag === 'a') return 'Link';
    if (tag === 'input') return 'Campo de entrada';
    if (tag === 'textarea') return 'Área de texto';
    if (tag === 'select') return 'Seletor';
    if (tag === 'img') return 'Imagem';
    if (tag === 'div') return 'Container';
    if (tag === 'span') return 'Texto';
    return tagName;
  }
  
  // Send message to builder - returns { sent: boolean }
  function sendToBuilder(data) {
    const message = { ...data, token: CAPTURE_TOKEN };
    let sent = false;
    
    // Try window.opener first (works if opened via window.open)
    if (window.opener) {
      try {
        window.opener.postMessage(message, BUILDER_ORIGIN);
        console.log('[Tour Capture] Enviado para builder via postMessage:', data.type);
        sent = true;
      } catch (e) {
        console.log('[Tour Capture] postMessage falhou');
      }
    }
    
    return { sent };
  }
  
  // Show step configuration panel
  function showStepConfig(elementData) {
    // Remove existing config panel if any
    if (configPanel) {
      configPanel.remove();
    }
    
    currentElement = elementData;
    const suggestedType = getSuggestedType(elementData.tagName);
    
    configPanel = document.createElement('div');
    configPanel.id = 'tour-step-config';
    configPanel.innerHTML = \`
      <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #374151;">
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
          🎯 Configurar Passo
        </div>
        <div style="background: #374151; padding: 8px; border-radius: 6px; font-size: 12px;">
          <div style="display: flex; gap: 8px; margin-bottom: 4px;">
            <span style="color: #9ca3af;">Tipo:</span>
            <span style="color: #60a5fa;">\${getElementTypeLabel(elementData.tagName)}</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <span style="color: #9ca3af;">Seletor:</span>
            <span style="color: #a5b4fc; font-family: monospace; font-size: 11px; word-break: break-all;">\${elementData.selector.slice(0, 40)}\${elementData.selector.length > 40 ? '...' : ''}</span>
          </div>
          \${elementData.label && elementData.label !== elementData.selector ? \`
          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <span style="color: #9ca3af;">Texto:</span>
            <span style="color: #fbbf24;">"\${elementData.label.slice(0, 30)}"</span>
          </div>
          \` : ''}
        </div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 12px; color: #9ca3af; margin-bottom: 6px;">Tipo de Ação:</label>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
          <button class="step-type-btn" data-type="tooltip" style="padding: 8px 4px; border: 1px solid #374151; background: \${suggestedType === 'tooltip' ? '#3b82f6' : '#1f2937'}; color: white; border-radius: 6px; cursor: pointer; font-size: 11px;">
            💬 Tooltip
          </button>
          <button class="step-type-btn" data-type="modal" style="padding: 8px 4px; border: 1px solid #374151; background: \${suggestedType === 'modal' ? '#3b82f6' : '#1f2937'}; color: white; border-radius: 6px; cursor: pointer; font-size: 11px;">
            📋 Modal
          </button>
          <button class="step-type-btn" data-type="highlight" style="padding: 8px 4px; border: 1px solid #374151; background: \${suggestedType === 'highlight' ? '#3b82f6' : '#1f2937'}; color: white; border-radius: 6px; cursor: pointer; font-size: 11px;">
            ✨ Highlight
          </button>
          <button class="step-type-btn" data-type="click" style="padding: 8px 4px; border: 1px solid #374151; background: \${suggestedType === 'click' ? '#3b82f6' : '#1f2937'}; color: white; border-radius: 6px; cursor: pointer; font-size: 11px;">
            👆 Click
          </button>
          <button class="step-type-btn" data-type="input" style="padding: 8px 4px; border: 1px solid #374151; background: \${suggestedType === 'input' ? '#3b82f6' : '#1f2937'}; color: white; border-radius: 6px; cursor: pointer; font-size: 11px;">
            ⌨️ Input
          </button>
          <button class="step-type-btn" data-type="wait" style="padding: 8px 4px; border: 1px solid #374151; background: \${suggestedType === 'wait' ? '#3b82f6' : '#1f2937'}; color: white; border-radius: 6px; cursor: pointer; font-size: 11px;">
            ⏳ Esperar
          </button>
        </div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 12px; color: #9ca3af; margin-bottom: 4px;">Título:</label>
        <input id="step-title" type="text" placeholder="Ex: Clique aqui para continuar" value="" style="width: 100%; padding: 8px 10px; border: 1px solid #374151; background: #1f2937; color: white; border-radius: 6px; font-size: 13px; box-sizing: border-box;" />
      </div>
      
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 12px; color: #9ca3af; margin-bottom: 4px;">Descrição (opcional):</label>
        <textarea id="step-description" placeholder="Descrição detalhada do passo..." rows="2" style="width: 100%; padding: 8px 10px; border: 1px solid #374151; background: #1f2937; color: white; border-radius: 6px; font-size: 13px; resize: none; box-sizing: border-box;"></textarea>
      </div>
      
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 12px; color: #9ca3af; margin-bottom: 4px;">Posição:</label>
        <select id="step-position" style="width: 100%; padding: 8px 10px; border: 1px solid #374151; background: #1f2937; color: white; border-radius: 6px; font-size: 13px;">
          <option value="auto">Automático</option>
          <option value="top">Acima</option>
          <option value="bottom">Abaixo</option>
          <option value="left">Esquerda</option>
          <option value="right">Direita</option>
        </select>
      </div>
      
      <div style="display: flex; gap: 8px;">
        <button id="step-cancel" style="flex: 1; padding: 10px; border: 1px solid #374151; background: transparent; color: #9ca3af; border-radius: 6px; cursor: pointer; font-size: 13px;">
          Cancelar
        </button>
        <button id="step-save" style="flex: 2; padding: 10px; border: none; background: #22c55e; color: white; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">
          ✓ Adicionar Passo
        </button>
      </div>
    \`;
    
    configPanel.style.cssText = \`
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #111827;
      color: white;
      padding: 16px;
      border-radius: 12px;
      font-family: system-ui, sans-serif;
      z-index: 1000002;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      width: 340px;
      max-width: 90vw;
    \`;
    document.body.appendChild(configPanel);
    
    // Pause capture while config is open
    isActive = false;
    overlay.style.display = 'none';
    tooltip.style.display = 'none';
    
    // Store selected type
    let selectedType = suggestedType;
    
    // Type selection handlers
    configPanel.querySelectorAll('.step-type-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedType = btn.dataset.type;
        configPanel.querySelectorAll('.step-type-btn').forEach(b => {
          b.style.background = b.dataset.type === selectedType ? '#3b82f6' : '#1f2937';
        });
      });
    });
    
    // Cancel handler
    configPanel.querySelector('#step-cancel').addEventListener('click', (e) => {
      e.stopPropagation();
      configPanel.remove();
      configPanel = null;
      isActive = true;
    });
    
    // Save handler
    configPanel.querySelector('#step-save').addEventListener('click', async (e) => {
      e.stopPropagation();
      const title = configPanel.querySelector('#step-title').value.trim();
      const description = configPanel.querySelector('#step-description').value.trim();
      const position = configPanel.querySelector('#step-position').value;
      
      const saveButton = configPanel.querySelector('#step-save');
      saveButton.disabled = true;
      saveButton.innerHTML = '⏳ Salvando...';
      
      try {
        // Call the Edge Function to save the step
        const response = await fetch(SUPABASE_URL + '/functions/v1/create-step', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
          },
          body: JSON.stringify({
            configuration_id: CONFIGURATION_ID,
            step_type: selectedType,
            selector: elementData.selector,
            title: title || 'Passo ' + (Date.now() % 1000),
            description: description || null,
            position: position,
            element_data: {
              tagName: elementData.tagName,
              label: elementData.label,
              rect: elementData.rect
            }
          })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          configPanel.innerHTML = \`
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 40px; margin-bottom: 12px;">✅</div>
              <div style="font-weight: 600; margin-bottom: 8px;">Passo #\${result.step_number} Adicionado!</div>
              <div style="font-size: 13px; color: #9ca3af;">Salvo automaticamente no tour.</div>
            </div>
          \`;
          
          setTimeout(() => {
            configPanel.remove();
            configPanel = null;
            isActive = true;
          }, 1500);
        } else {
          throw new Error(result.error || 'Erro ao salvar');
        }
      } catch (error) {
        console.error('[Tour Capture] Erro ao salvar:', error);
        
        // Show error with JSON for manual copy
        const stepData = {
          type: 'TOUR_CAPTURE_STEP',
          token: CAPTURE_TOKEN,
          step: {
            stepType: selectedType,
            selector: elementData.selector,
            element: {
              tagName: elementData.tagName,
              label: elementData.label,
              rect: elementData.rect
            },
            config: {
              title: title || 'Passo ' + (Date.now() % 1000),
              description: description || null,
              position: position
            }
          }
        };
        
        const jsonStr = JSON.stringify(stepData, null, 2);
        
        configPanel.innerHTML = \`
          <div style="padding: 16px;">
            <div style="text-align: center; margin-bottom: 12px;">
              <div style="font-size: 32px; margin-bottom: 8px;">⚠️</div>
              <div style="font-weight: 600; margin-bottom: 4px;">Erro ao salvar</div>
              <div style="font-size: 12px; color: #9ca3af;">\${error.message || 'Tente novamente'}</div>
            </div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 8px;">Copie o JSON abaixo e cole no builder:</div>
            <textarea id="step-json" readonly style="width: 100%; height: 80px; padding: 8px; border: 1px solid #374151; background: #1f2937; color: #a5b4fc; border-radius: 6px; font-size: 10px; font-family: monospace; resize: none; box-sizing: border-box;">\${jsonStr}</textarea>
            <div style="display: flex; gap: 8px; margin-top: 12px;">
              <button id="step-copy" style="flex: 1; padding: 8px; border: 1px solid #374151; background: #374151; color: white; border-radius: 6px; cursor: pointer; font-size: 12px;">Copiar JSON</button>
              <button id="step-ok" style="flex: 1; padding: 8px; border: none; background: #3b82f6; color: white; border-radius: 6px; cursor: pointer; font-size: 12px;">Fechar</button>
            </div>
          </div>
        \`;
        configPanel.querySelector('#step-copy').addEventListener('click', () => {
          const textarea = configPanel.querySelector('#step-json');
          textarea.select();
          document.execCommand('copy');
          configPanel.querySelector('#step-copy').textContent = 'Copiado!';
        });
        configPanel.querySelector('#step-ok').addEventListener('click', () => {
          configPanel.remove();
          configPanel = null;
          isActive = true;
        });
      }
    });
    
    // Focus title input
    setTimeout(() => {
      configPanel.querySelector('#step-title').focus();
    }, 100);
  }
  
  // Update overlay position
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
    
    const selector = generateSelector(el);
    const label = getElementLabel(el);
    tooltip.innerHTML = \`
      <div style="font-weight: 600; margin-bottom: 4px;">\${el.tagName.toLowerCase()}</div>
      <div style="opacity: 0.8; font-size: 11px; word-break: break-all;">\${selector}</div>
      <div style="margin-top: 4px; color: #93c5fd;">\${label}</div>
    \`;
    tooltip.style.display = 'block';
    
    // Position tooltip
    let tooltipTop = rect.bottom + 10;
    if (tooltipTop + 80 > window.innerHeight) {
      tooltipTop = rect.top - 80;
    }
    tooltip.style.top = Math.max(10, tooltipTop) + 'px';
    tooltip.style.left = Math.max(10, Math.min(rect.left, window.innerWidth - 320)) + 'px';
  }
  
  // Mouse handlers
  function handleMouseMove(e) {
    if (!isActive || isPaused) return;
    
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el !== overlay && el !== tooltip && el !== panel && !panel.contains(el) && (!configPanel || !configPanel.contains(el))) {
      hoveredElement = el;
      updateOverlay(el);
    }
  }
  
  function handleClick(e) {
    if (!isActive || isPaused || !hoveredElement) return;
    if (e.target === panel || panel.contains(e.target)) return;
    if (configPanel && configPanel.contains(e.target)) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const el = hoveredElement;
    const rect = el.getBoundingClientRect();
    
    const elementData = {
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
    
    // Visual feedback
    overlay.style.borderColor = '#22c55e';
    overlay.style.background = 'rgba(34, 197, 94, 0.2)';
    
    // Show step configuration panel
    showStepConfig(elementData);
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
    
    console.log('[Tour Capture] Scanned', elements.length, 'elements');
  }
  
  // Cleanup
  function cleanup() {
    isActive = false;
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    overlay.remove();
    tooltip.remove();
    panel.remove();
    if (configPanel) configPanel.remove();
    console.log('[Tour Capture] Desativado');
  }
  
  // Event listeners
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  
  // Escape key to close config panel or exit, P to pause/resume
  document.addEventListener('keydown', (e) => {
    // P key to toggle pause (only when not in config panel and not typing)
    if ((e.key === 'p' || e.key === 'P') && !configPanel && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      togglePause();
      return;
    }
    
    if (e.key === 'Escape') {
      if (configPanel) {
        configPanel.remove();
        configPanel = null;
        isActive = true;
        overlay.style.borderColor = '#3b82f6';
        overlay.style.background = 'rgba(59, 130, 246, 0.1)';
      } else {
        cleanup();
      }
    }
  });
  
  // Notify builder
  sendToBuilder({ type: 'TOUR_CAPTURE_READY' });
  
  console.log('[Tour Capture] Ativo! Passe o mouse sobre elementos e clique para capturar.');
})();
`;
}

export function generateCaptureScriptMinified(
  token: string, 
  builderOrigin: string,
  configurationId: string,
  apiKey: string,
  supabaseUrl: string
): string {
  return generateCaptureScript(token, builderOrigin, configurationId, apiKey, supabaseUrl)
    .replace(/\/\/.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}
