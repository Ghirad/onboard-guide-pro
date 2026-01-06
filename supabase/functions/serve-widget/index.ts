import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const widgetScript = `
(function() {
  'use strict';

  window.AutoSetup = {
    _config: null,
    _steps: [],
    _currentStepIndex: 0,
    _progress: {},
    _isMinimized: false,
    _container: null,
    _listeners: {},
    _isExecutingActions: false,
    _actionAbortController: null,

    init: function(options) {
      this._config = {
        configId: options.configId,
        apiKey: options.apiKey,
        position: options.position || 'top-bar',
        autoStart: options.autoStart !== false,
        autoExecuteActions: options.autoExecuteActions !== false,
        actionDelay: options.actionDelay || 300
      };

      this._loadProgress();
      this._fetchConfiguration().then(function() {
        this._injectStyles();
        this._createContainer();
        if (this._config.autoStart) {
          this._render();
        }
        this._emit('ready', { config: this._config });
      }.bind(this)).catch(function(error) {
        console.error('[AutoSetup] Failed to initialize:', error);
        this._emit('error', { error: error });
      }.bind(this));

      return this;
    },

    start: function() {
      this._isMinimized = false;
      this._render();
      this._emit('start', { step: this._currentStepIndex });
    },

    pause: function() {
      this._isMinimized = true;
      this._abortActions();
      this._render();
      this._emit('pause', { step: this._currentStepIndex });
    },

    resume: function() {
      this._isMinimized = false;
      this._render();
      this._emit('resume', { step: this._currentStepIndex });
    },

    goToStep: function(index) {
      if (index >= 0 && index < this._steps.length) {
        this._abortActions();
        this._currentStepIndex = index;
        this._render();
        this._emit('stepChange', { step: index, stepData: this._steps[index] });
      }
    },

    completeStep: function() {
      var step = this._steps[this._currentStepIndex];
      if (step) {
        this._progress[step.id] = { status: 'completed', completedAt: new Date().toISOString() };
        this._saveProgress();
        this._emit('stepComplete', { step: this._currentStepIndex, stepData: step });

        if (this._currentStepIndex < this._steps.length - 1) {
          this._currentStepIndex++;
          this._render();
        } else {
          this._emit('complete', { progress: this._progress });
          this._renderComplete();
        }
      }
    },

    skipStep: function() {
      var step = this._steps[this._currentStepIndex];
      if (step) {
        this._progress[step.id] = { status: 'skipped', skippedAt: new Date().toISOString() };
        this._saveProgress();
        this._emit('stepSkip', { step: this._currentStepIndex, stepData: step });

        if (this._currentStepIndex < this._steps.length - 1) {
          this._currentStepIndex++;
          this._render();
        } else {
          this._emit('complete', { progress: this._progress });
          this._renderComplete();
        }
      }
    },

    getProgress: function() {
      var completed = 0;
      var total = this._steps.length;
      for (var key in this._progress) {
        if (this._progress[key].status === 'completed') completed++;
      }
      return { completed: completed, total: total, percentage: total ? Math.round((completed / total) * 100) : 0 };
    },

    on: function(event, callback) {
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(callback);
      return this;
    },

    off: function(event, callback) {
      if (this._listeners[event]) {
        this._listeners[event] = this._listeners[event].filter(function(cb) { return cb !== callback; });
      }
      return this;
    },

    destroy: function() {
      this._abortActions();
      this._removeHighlight();
      this._hideActionIndicator();
      if (this._container) {
        this._container.remove();
        this._container = null;
      }
      this._emit('destroy');
    },

    _emit: function(event, data) {
      if (this._listeners[event]) {
        this._listeners[event].forEach(function(callback) {
          try { callback(data); } catch (e) { console.error('[AutoSetup] Event callback error:', e); }
        });
      }
    },

    _fetchConfiguration: function() {
      var self = this;
      var baseUrl = 'https://ukjpxeptefznpwduwled.supabase.co';
      var url = baseUrl + '/functions/v1/get-configuration?configId=' + this._config.configId;
      
      return fetch(url, {
        headers: {
          'Authorization': 'Bearer ' + this._config.apiKey,
          'Content-Type': 'application/json'
        }
      })
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to fetch configuration');
        return response.json();
      })
      .then(function(data) {
        self._steps = data.steps || [];
        self._currentStepIndex = self._findFirstIncompleteStep();
      });
    },

    _findFirstIncompleteStep: function() {
      for (var i = 0; i < this._steps.length; i++) {
        var stepProgress = this._progress[this._steps[i].id];
        if (!stepProgress || stepProgress.status === 'pending') return i;
      }
      return 0;
    },

    _loadProgress: function() {
      try {
        var saved = localStorage.getItem('autosetup_progress_' + this._config.configId);
        if (saved) this._progress = JSON.parse(saved);
      } catch (e) { this._progress = {}; }
    },

    _saveProgress: function() {
      try {
        localStorage.setItem('autosetup_progress_' + this._config.configId, JSON.stringify(this._progress));
      } catch (e) { console.error('[AutoSetup] Failed to save progress:', e); }
    },

    _injectStyles: function() {
      if (document.getElementById('autosetup-styles')) return;
      var style = document.createElement('style');
      style.id = 'autosetup-styles';
      style.textContent = this._getStyles();
      document.head.appendChild(style);
    },

    _getStyles: function() {
      return \`
        .autosetup-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; z-index: 999999; }
        .autosetup-topbar { position: fixed; top: 0; left: 0; right: 0; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 10px rgba(0,0,0,0.15); }
        .autosetup-topbar-content { display: flex; align-items: center; gap: 16px; flex: 1; }
        .autosetup-step-info { display: flex; flex-direction: column; gap: 2px; }
        .autosetup-step-title { font-weight: 600; font-size: 14px; }
        .autosetup-step-desc { font-size: 12px; opacity: 0.9; }
        .autosetup-progress { display: flex; align-items: center; gap: 8px; font-size: 12px; }
        .autosetup-progress-bar { width: 120px; height: 6px; background: rgba(255,255,255,0.3); border-radius: 3px; overflow: hidden; }
        .autosetup-progress-fill { height: 100%; background: white; border-radius: 3px; transition: width 0.3s ease; }
        .autosetup-actions { display: flex; gap: 8px; }
        .autosetup-btn { padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: all 0.2s; }
        .autosetup-btn-primary { background: white; color: #6366f1; }
        .autosetup-btn-primary:hover { background: #f0f0ff; }
        .autosetup-btn-secondary { background: rgba(255,255,255,0.2); color: white; }
        .autosetup-btn-secondary:hover { background: rgba(255,255,255,0.3); }
        .autosetup-minimized { position: fixed; top: 20px; right: 20px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 12px 20px; border-radius: 50px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(99,102,241,0.4); }
        .autosetup-minimized:hover { transform: scale(1.05); }
        .autosetup-highlight { position: fixed; pointer-events: none; border: 3px solid #6366f1; border-radius: 8px; z-index: 999998; transition: all 0.3s ease; }
        .autosetup-highlight-pulse { animation: autosetup-pulse 2s infinite; }
        .autosetup-highlight-glow { box-shadow: 0 0 20px rgba(99,102,241,0.6); animation: autosetup-glow 1.5s ease-in-out infinite; }
        .autosetup-highlight-border { animation: autosetup-border 1s ease-in-out infinite; }
        @keyframes autosetup-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.02); } }
        @keyframes autosetup-glow { 0%, 100% { box-shadow: 0 0 10px rgba(99,102,241,0.4); } 50% { box-shadow: 0 0 30px rgba(99,102,241,0.8); } }
        @keyframes autosetup-border { 0%, 100% { border-width: 2px; } 50% { border-width: 4px; } }
        .autosetup-action-indicator { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 8px; font-size: 13px; display: flex; align-items: center; gap: 8px; z-index: 999999; }
        .autosetup-action-indicator .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .autosetup-complete { position: fixed; top: 0; left: 0; right: 0; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 20px; text-align: center; }
        .autosetup-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999998; }
        .autosetup-modal { background: white; border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; color: #1f2937; }
        .autosetup-modal h3 { margin: 0 0 8px; font-size: 18px; }
        .autosetup-modal p { margin: 0 0 16px; color: #6b7280; font-size: 14px; }
        .autosetup-modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
      \`;
    },

    _createContainer: function() {
      this._container = document.createElement('div');
      this._container.className = 'autosetup-container';
      this._container.id = 'autosetup-widget';
      document.body.appendChild(this._container);
    },

    _render: function() {
      if (!this._container) return;
      
      if (this._isMinimized) {
        this._renderMinimized();
      } else {
        this._renderTopBar();
      }
    },

    _renderMinimized: function() {
      var progress = this.getProgress();
      this._container.innerHTML = '<div class="autosetup-minimized" onclick="AutoSetup.resume()">' +
        '<span>📋</span>' +
        '<span>Setup: ' + progress.percentage + '%</span>' +
      '</div>';
    },

    _renderTopBar: function() {
      var step = this._steps[this._currentStepIndex];
      if (!step) return;
      
      var progress = this.getProgress();
      var self = this;
      
      this._container.innerHTML = '<div class="autosetup-topbar">' +
        '<div class="autosetup-topbar-content">' +
          '<div class="autosetup-step-info">' +
            '<div class="autosetup-step-title">Passo ' + (this._currentStepIndex + 1) + ': ' + this._escapeHtml(step.title) + '</div>' +
            (step.description ? '<div class="autosetup-step-desc">' + this._escapeHtml(step.description) + '</div>' : '') +
          '</div>' +
          '<div class="autosetup-progress">' +
            '<div class="autosetup-progress-bar"><div class="autosetup-progress-fill" style="width:' + progress.percentage + '%"></div></div>' +
            '<span>' + progress.completed + '/' + progress.total + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="autosetup-actions">' +
          (!step.is_required ? '<button class="autosetup-btn autosetup-btn-secondary" onclick="AutoSetup.skipStep()">Pular</button>' : '') +
          '<button class="autosetup-btn autosetup-btn-primary" onclick="AutoSetup.completeStep()">Concluir</button>' +
          '<button class="autosetup-btn autosetup-btn-secondary" onclick="AutoSetup.pause()">✕</button>' +
        '</div>' +
      '</div>';

      // Highlight target element if exists
      if (step.target_selector) {
        setTimeout(function() { self._highlightElement(step.target_selector); }, 100);
      }

      // Execute actions if configured
      if (this._config.autoExecuteActions && step.actions && step.actions.length > 0) {
        setTimeout(function() { self._executeStepActions(step); }, 500);
      }
    },

    _renderComplete: function() {
      this._removeHighlight();
      this._container.innerHTML = '<div class="autosetup-complete">' +
        '<strong>🎉 Configuração concluída!</strong> Todas as etapas foram finalizadas.' +
        '<button class="autosetup-btn autosetup-btn-secondary" style="margin-left:16px" onclick="AutoSetup.destroy()">Fechar</button>' +
      '</div>';
    },

    _executeStepActions: async function(step) {
      if (!step.actions || step.actions.length === 0) return;
      if (this._isExecutingActions) return;

      this._isExecutingActions = true;
      this._actionAbortController = { aborted: false };
      
      this._emit('actionsStart', { step: step, actionsCount: step.actions.length });
      
      var self = this;
      
      for (var i = 0; i < step.actions.length; i++) {
        if (this._actionAbortController.aborted) break;
        
        var action = step.actions[i];
        try {
          await this._executeAction(action);
          this._emit('actionExecuted', { action: action, step: step, success: true });
        } catch (error) {
          console.error('[AutoSetup] Action error:', error);
          this._emit('actionError', { action: action, step: step, error: error });
        }

        if (i < step.actions.length - 1 && !this._actionAbortController.aborted) {
          await this._waitDelay(this._config.actionDelay);
        }
      }

      this._isExecutingActions = false;
      this._hideActionIndicator();
      this._emit('actionsComplete', { step: step, actionsCount: step.actions.length });
    },

    _executeAction: async function(action) {
      var self = this;

      // Wait for element if configured
      if (action.wait_for_element && action.selector) {
        this._showActionIndicator('Aguardando elemento...');
        await this._waitForElement(action.selector, 10000);
      }

      // Apply delay if configured
      if (action.delay_ms && action.delay_ms > 0) {
        this._showActionIndicator('Aguardando...');
        await this._waitDelay(action.delay_ms);
      }

      // Scroll to element if configured
      if (action.scroll_to_element && action.selector) {
        this._showActionIndicator('Rolando...');
        await this._scrollToElement(action.selector, action.scroll_behavior, action.scroll_position);
        await this._waitDelay(300);
      }

      // Execute the main action
      switch (action.action_type) {
        case 'click':
          this._showActionIndicator('Clicando...');
          await this._clickElement(action.selector);
          break;
        case 'input':
          this._showActionIndicator('Preenchendo...');
          await this._inputValue(action.selector, action.value, action.input_type);
          break;
        case 'scroll':
          this._showActionIndicator('Rolando...');
          await this._scrollToElement(action.selector, action.scroll_behavior, action.scroll_position);
          break;
        case 'wait':
          this._showActionIndicator('Aguardando...');
          await this._waitDelay(action.delay_ms || 1000);
          break;
        case 'highlight':
          this._showActionIndicator('Destacando...');
          await this._highlightAction(action);
          break;
        case 'open_modal':
          this._showActionIndicator('Abrindo...');
          await this._openModal(action.selector);
          break;
      }
    },

    _waitForElement: function(selector, timeout) {
      var self = this;
      timeout = timeout || 10000;
      
      return new Promise(function(resolve, reject) {
        var el = document.querySelector(selector);
        if (el) { resolve(el); return; }

        var startTime = Date.now();
        var interval = setInterval(function() {
          if (self._actionAbortController && self._actionAbortController.aborted) {
            clearInterval(interval);
            reject(new Error('Aborted'));
            return;
          }
          
          var el = document.querySelector(selector);
          if (el) {
            clearInterval(interval);
            resolve(el);
          } else if (Date.now() - startTime > timeout) {
            clearInterval(interval);
            reject(new Error('Element not found: ' + selector));
          }
        }, 100);
      });
    },

    _waitDelay: function(ms) {
      var self = this;
      return new Promise(function(resolve) {
        setTimeout(function() {
          if (self._actionAbortController && self._actionAbortController.aborted) {
            resolve();
            return;
          }
          resolve();
        }, ms || 1000);
      });
    },

    _scrollToElement: function(selector, behavior, position) {
      return new Promise(function(resolve) {
        var el = document.querySelector(selector);
        if (el) {
          el.scrollIntoView({
            behavior: behavior || 'smooth',
            block: position || 'center'
          });
        }
        setTimeout(resolve, 500);
      });
    },

    _clickElement: function(selector) {
      return new Promise(function(resolve) {
        var el = document.querySelector(selector);
        if (el) {
          el.focus();
          el.click();
          // Also dispatch events for frameworks
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
        setTimeout(resolve, 100);
      });
    },

    _inputValue: function(selector, value, inputType) {
      return new Promise(function(resolve) {
        var el = document.querySelector(selector);
        if (el) {
          el.focus();
          
          // Set value
          var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(el, value || '');
          
          // Dispatch events for React/Vue compatibility
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        setTimeout(resolve, 100);
      });
    },

    _highlightAction: function(action) {
      var self = this;
      return new Promise(function(resolve) {
        self._highlightWithAnimation(
          action.selector,
          action.highlight_color,
          action.highlight_duration_ms,
          action.highlight_animation
        );
        setTimeout(resolve, action.highlight_duration_ms || 2000);
      });
    },

    _highlightWithAnimation: function(selector, color, duration, animation) {
      this._removeHighlight();
      
      var el = document.querySelector(selector);
      if (!el) return;
      
      var rect = el.getBoundingClientRect();
      var highlight = document.createElement('div');
      highlight.id = 'autosetup-action-highlight';
      highlight.className = 'autosetup-highlight';
      
      if (animation) {
        highlight.classList.add('autosetup-highlight-' + animation);
      } else {
        highlight.classList.add('autosetup-highlight-pulse');
      }
      
      highlight.style.cssText = 'top:' + (rect.top + window.scrollY - 4) + 'px;' +
        'left:' + (rect.left + window.scrollX - 4) + 'px;' +
        'width:' + (rect.width + 8) + 'px;' +
        'height:' + (rect.height + 8) + 'px;' +
        'border-color:' + (color || '#6366f1') + ';';
      
      document.body.appendChild(highlight);
      
      if (duration) {
        var self = this;
        setTimeout(function() {
          var h = document.getElementById('autosetup-action-highlight');
          if (h) h.remove();
        }, duration);
      }
    },

    _openModal: function(selector) {
      return new Promise(function(resolve) {
        var el = document.querySelector(selector);
        if (el) {
          el.click();
        }
        setTimeout(resolve, 300);
      });
    },

    _highlightElement: function(selector) {
      this._removeHighlight();
      
      var el = document.querySelector(selector);
      if (!el) return;
      
      var rect = el.getBoundingClientRect();
      var highlight = document.createElement('div');
      highlight.id = 'autosetup-highlight';
      highlight.className = 'autosetup-highlight autosetup-highlight-pulse';
      highlight.style.cssText = 'top:' + (rect.top + window.scrollY - 4) + 'px;' +
        'left:' + (rect.left + window.scrollX - 4) + 'px;' +
        'width:' + (rect.width + 8) + 'px;' +
        'height:' + (rect.height + 8) + 'px;';
      
      document.body.appendChild(highlight);
    },

    _removeHighlight: function() {
      var h = document.getElementById('autosetup-highlight');
      if (h) h.remove();
      var ah = document.getElementById('autosetup-action-highlight');
      if (ah) ah.remove();
    },

    _abortActions: function() {
      if (this._actionAbortController) {
        this._actionAbortController.aborted = true;
      }
      this._isExecutingActions = false;
      this._hideActionIndicator();
    },

    _showActionIndicator: function(message) {
      var existing = document.getElementById('autosetup-action-indicator');
      if (existing) existing.remove();
      
      var indicator = document.createElement('div');
      indicator.id = 'autosetup-action-indicator';
      indicator.className = 'autosetup-action-indicator';
      indicator.innerHTML = '<div class="spinner"></div><span>' + this._escapeHtml(message) + '</span>';
      document.body.appendChild(indicator);
    },

    _hideActionIndicator: function() {
      var indicator = document.getElementById('autosetup-action-indicator');
      if (indicator) indicator.remove();
    },

    _escapeHtml: function(text) {
      if (!text) return '';
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  };
})();
`;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[serve-widget] Serving widget script');

  return new Response(widgetScript, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
});
