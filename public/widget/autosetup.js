/**
 * AutoSetup Widget - Embedded tour/setup guide with automated actions
 * Usage:
 *   AutoSetup.init({ configId: '...', apiKey: '...', position: 'top-bar', autoStart: true, autoExecuteActions: true });
 */
(function(window) {
  'use strict';

  var API_BASE = 'https://ukjpxeptefznpwduwled.supabase.co/functions/v1';
  
  var AutoSetup = {
    _config: null,
    _steps: [],
    _currentIndex: 0,
    _completedSteps: [],
    _skippedSteps: [],
    _listeners: {},
    _container: null,
    _isMinimized: false,
    _isStarted: false,
    _isExecutingActions: false,
    _actionAbortController: null,

    init: function(options) {
      // Verificar se tem.auto.setup foi passado como true
      if (options['tem.auto.setup'] !== true) {
        console.log('[AutoSetup] Widget disabled - tem.auto.setup not set to true');
        return Promise.resolve(null);
      }

      if (!options.configId || !options.apiKey) {
        console.error('[AutoSetup] configId and apiKey are required');
        return Promise.reject(new Error('configId and apiKey are required'));
      }

      this._config = {
        configId: options.configId,
        apiKey: options.apiKey,
        userId: options.userId || null,
        userName: options.userName || null,
        position: options.position || 'top-bar',
        autoStart: options.autoStart !== false,
        autoExecuteActions: options.autoExecuteActions !== false,
        actionDelay: options.actionDelay || 300
      };

      // Load saved progress
      this._loadProgress();

      // Inject styles
      this._injectStyles();

      // Fetch configuration
      var self = this;
      return this._fetchConfiguration()
        .then(function(data) {
          self._steps = data.steps || [];
          self._emit('ready', { steps: self._steps });
          
          // Create widget container
          self._createContainer();
          
          if (self._config.autoStart) {
            self.start();
          }
          
          return self;
        })
        .catch(function(err) {
          console.error('[AutoSetup] Failed to initialize:', err);
          self._emit('error', { error: err });
          throw err;
        });
    },

    start: function() {
      if (!this._steps.length) {
        console.warn('[AutoSetup] No steps to show');
        return;
      }
      this._isStarted = true;
      this._isMinimized = false;
      this._render();
      this._emit('start', { step: this._steps[this._currentIndex] });
    },

    pause: function() {
      this._isMinimized = true;
      this._abortActions();
      this._render();
      this._emit('pause', {});
    },

    resume: function() {
      this._isMinimized = false;
      this._render();
      this._emit('resume', {});
    },

    goToStep: function(index) {
      if (index < 0 || index >= this._steps.length) {
        console.warn('[AutoSetup] Invalid step index:', index);
        return;
      }
      this._abortActions();
      this._currentIndex = index;
      this._render();
      this._emit('stepChange', { step: this._steps[index], index: index });
    },

    completeStep: function() {
      var stepId = this._steps[this._currentIndex].id;
      if (this._completedSteps.indexOf(stepId) === -1) {
        this._completedSteps.push(stepId);
      }
      this._saveProgress();
      this._emit('stepComplete', { step: this._steps[this._currentIndex], index: this._currentIndex });
      
      this._abortActions();
      
      // Go to next step or finish
      if (this._currentIndex < this._steps.length - 1) {
        this._currentIndex++;
        this._render();
      } else {
        this._finish();
      }
    },

    skipStep: function() {
      var stepId = this._steps[this._currentIndex].id;
      if (this._skippedSteps.indexOf(stepId) === -1) {
        this._skippedSteps.push(stepId);
      }
      this._saveProgress();
      this._emit('stepSkip', { step: this._steps[this._currentIndex], index: this._currentIndex });
      
      this._abortActions();
      
      // Go to next step or finish
      if (this._currentIndex < this._steps.length - 1) {
        this._currentIndex++;
        this._render();
      } else {
        this._finish();
      }
    },

    getProgress: function() {
      return {
        currentIndex: this._currentIndex,
        totalSteps: this._steps.length,
        completedSteps: this._completedSteps.slice(),
        skippedSteps: this._skippedSteps.slice(),
        percentage: this._steps.length ? Math.round((this._completedSteps.length / this._steps.length) * 100) : 0
      };
    },

    on: function(event, callback) {
      if (!this._listeners[event]) {
        this._listeners[event] = [];
      }
      this._listeners[event].push(callback);
    },

    off: function(event, callback) {
      if (!this._listeners[event]) return;
      if (!callback) {
        this._listeners[event] = [];
      } else {
        this._listeners[event] = this._listeners[event].filter(function(cb) {
          return cb !== callback;
        });
      }
    },

    destroy: function() {
      this._abortActions();
      if (this._container) {
        this._container.remove();
        this._container = null;
      }
      this._removeHighlight();
      this._emit('destroy', {});
    },

    // Private methods
    _emit: function(event, data) {
      var listeners = this._listeners[event] || [];
      listeners.forEach(function(cb) {
        try {
          cb(data);
        } catch (e) {
          console.error('[AutoSetup] Event listener error:', e);
        }
      });
    },

    _fetchConfiguration: function() {
      var url = API_BASE + '/get-configuration?configId=' + encodeURIComponent(this._config.configId) + '&apiKey=' + encodeURIComponent(this._config.apiKey);
      
      // Se tiver userId, envia como clientId para buscar progresso do servidor
      if (this._config.userId) {
        url += '&clientId=' + encodeURIComponent(this._config.userId);
      }
      
      var self = this;
      return fetch(url)
        .then(function(res) {
          if (!res.ok) {
            return res.json().then(function(err) {
              throw new Error(err.error || 'Failed to fetch configuration');
            });
          }
          return res.json();
        })
        .then(function(data) {
          // Restaurar progresso do servidor se existir e tiver userId
          if (self._config.userId && data.progress && Object.keys(data.progress).length > 0) {
            self._restoreProgressFromServer(data.progress);
          }
          return data;
        });
    },

    _restoreProgressFromServer: function(progress) {
      this._completedSteps = [];
      this._skippedSteps = [];
      
      for (var stepId in progress) {
        if (progress[stepId].status === 'completed') {
          this._completedSteps.push(stepId);
        } else if (progress[stepId].status === 'skipped') {
          this._skippedSteps.push(stepId);
        }
      }
      
      console.log('[AutoSetup] Restored progress from server:', {
        completed: this._completedSteps.length,
        skipped: this._skippedSteps.length
      });
    },

    _loadProgress: function() {
      try {
        var key = 'autosetup_progress_' + this._config.configId;
        var saved = localStorage.getItem(key);
        if (saved) {
          var data = JSON.parse(saved);
          this._completedSteps = data.completedSteps || [];
          this._skippedSteps = data.skippedSteps || [];
          this._currentIndex = data.currentIndex || 0;
        }
      } catch (e) {
        console.warn('[AutoSetup] Failed to load progress:', e);
      }
    },

    _saveProgress: function() {
      try {
        var key = 'autosetup_progress_' + this._config.configId;
        localStorage.setItem(key, JSON.stringify({
          completedSteps: this._completedSteps,
          skippedSteps: this._skippedSteps,
          currentIndex: this._currentIndex
        }));
      } catch (e) {
        console.warn('[AutoSetup] Failed to save progress:', e);
      }
      
      // Se tiver userId, sincroniza com o servidor
      if (this._config.userId) {
        this._syncProgressToServer();
      }
    },

    _syncProgressToServer: function() {
      var self = this;
      var currentStep = this._steps[this._currentIndex > 0 ? this._currentIndex - 1 : 0];
      
      if (!currentStep) return;
      
      var stepId = currentStep.id;
      var isCompleted = this._completedSteps.indexOf(stepId) !== -1;
      var isSkipped = this._skippedSteps.indexOf(stepId) !== -1;
      
      if (!isCompleted && !isSkipped) return;
      
      var status = isCompleted ? 'completed' : 'skipped';
      
      fetch(API_BASE + '/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this._config.userId,
          configuration_id: this._config.configId,
          step_id: stepId,
          status: status,
          api_key: this._config.apiKey,
          completed_at: isCompleted ? new Date().toISOString() : null,
          skipped_at: isSkipped ? new Date().toISOString() : null
        })
      }).then(function(res) {
        if (res.ok) {
          console.log('[AutoSetup] Progress synced to server');
        }
      }).catch(function(err) {
        console.warn('[AutoSetup] Failed to sync progress:', err);
      });
    },

    _finish: function() {
      this._emit('complete', { progress: this.getProgress() });
      this.pause();
    },

    _injectStyles: function() {
      if (document.getElementById('autosetup-styles')) return;
      
      var css = '\n' +
        '.autosetup-container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; z-index: 999999; }\n' +
        '.autosetup-topbar { position: fixed; top: 0; left: 0; right: 0; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 10px rgba(0,0,0,0.15); }\n' +
        '.autosetup-topbar-content { display: flex; align-items: center; gap: 16px; flex: 1; }\n' +
        '.autosetup-progress-dots { display: flex; gap: 6px; }\n' +
        '.autosetup-dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.3); transition: all 0.2s; }\n' +
        '.autosetup-dot.completed { background: #22c55e; }\n' +
        '.autosetup-dot.current { background: white; transform: scale(1.2); }\n' +
        '.autosetup-dot.skipped { background: #fbbf24; }\n' +
        '.autosetup-step-info { flex: 1; }\n' +
        '.autosetup-step-title { font-weight: 600; font-size: 14px; }\n' +
        '.autosetup-step-desc { font-size: 12px; opacity: 0.9; margin-top: 2px; }\n' +
        '.autosetup-actions { display: flex; gap: 8px; }\n' +
        '.autosetup-btn { padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: all 0.2s; }\n' +
        '.autosetup-btn-primary { background: white; color: #6366f1; }\n' +
        '.autosetup-btn-primary:hover { background: #f0f0ff; }\n' +
        '.autosetup-btn-secondary { background: rgba(255,255,255,0.2); color: white; }\n' +
        '.autosetup-btn-secondary:hover { background: rgba(255,255,255,0.3); }\n' +
        '.autosetup-btn-icon { padding: 8px; background: transparent; }\n' +
        '.autosetup-minimized { position: fixed; top: 16px; right: 16px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 12px 16px; border-radius: 50px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(99,102,241,0.4); }\n' +
        '.autosetup-minimized:hover { transform: scale(1.05); }\n' +
        '.autosetup-highlight { position: absolute; border: 3px solid #6366f1; border-radius: 4px; pointer-events: none; z-index: 999998; }\n' +
        '.autosetup-highlight-pulse { animation: autosetup-pulse 2s infinite; }\n' +
        '.autosetup-highlight-glow { box-shadow: 0 0 20px var(--autosetup-highlight-color, #6366f1); animation: autosetup-glow 1.5s ease-in-out infinite; }\n' +
        '.autosetup-highlight-border { animation: autosetup-border 1s ease-in-out infinite; }\n' +
        '@keyframes autosetup-pulse { 0%, 100% { box-shadow: 0 0 0 4px rgba(99,102,241,0.2); } 50% { box-shadow: 0 0 0 8px rgba(99,102,241,0.1); } }\n' +
        '@keyframes autosetup-glow { 0%, 100% { box-shadow: 0 0 10px var(--autosetup-highlight-color, #6366f1); } 50% { box-shadow: 0 0 30px var(--autosetup-highlight-color, #6366f1); } }\n' +
        '@keyframes autosetup-border { 0%, 100% { border-width: 2px; } 50% { border-width: 4px; } }\n' +
        '.autosetup-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 999999; display: flex; align-items: center; justify-content: center; }\n' +
        '.autosetup-modal { background: white; border-radius: 12px; max-width: 480px; width: 90%; max-height: 80vh; overflow: auto; box-shadow: 0 20px 50px rgba(0,0,0,0.3); }\n' +
        '.autosetup-modal-header { padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }\n' +
        '.autosetup-modal-title { font-size: 18px; font-weight: 600; color: #1f2937; }\n' +
        '.autosetup-modal-step { font-size: 13px; color: #6b7280; }\n' +
        '.autosetup-modal-body { padding: 20px; }\n' +
        '.autosetup-modal-image { width: 100%; border-radius: 8px; margin-bottom: 16px; }\n' +
        '.autosetup-modal-desc { color: #4b5563; line-height: 1.6; margin-bottom: 16px; }\n' +
        '.autosetup-modal-tip { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 0 8px 8px 0; font-size: 13px; color: #92400e; }\n' +
        '.autosetup-modal-footer { padding: 16px 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; gap: 12px; }\n' +
        '.autosetup-modal-btn { padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; transition: all 0.2s; }\n' +
        '.autosetup-modal-btn-skip { background: #f3f4f6; color: #4b5563; }\n' +
        '.autosetup-modal-btn-skip:hover { background: #e5e7eb; }\n' +
        '.autosetup-modal-btn-complete { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; flex: 1; }\n' +
        '.autosetup-modal-btn-complete:hover { opacity: 0.9; }\n' +
        '.autosetup-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #9ca3af; padding: 0; line-height: 1; }\n' +
        '.autosetup-close:hover { color: #6b7280; }\n' +
        '.autosetup-action-indicator { position: fixed; bottom: 20px; left: 20px; background: #1f2937; color: white; padding: 10px 16px; border-radius: 8px; font-size: 13px; z-index: 999999; display: flex; align-items: center; gap: 8px; }\n' +
        '.autosetup-action-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: autosetup-spin 0.8s linear infinite; }\n' +
        '@keyframes autosetup-spin { to { transform: rotate(360deg); } }\n';

      var style = document.createElement('style');
      style.id = 'autosetup-styles';
      style.textContent = css;
      document.head.appendChild(style);
    },

    _createContainer: function() {
      if (this._container) return;
      this._container = document.createElement('div');
      this._container.className = 'autosetup-container';
      document.body.appendChild(this._container);
    },

    _render: function() {
      if (!this._container) return;
      
      var step = this._steps[this._currentIndex];
      var self = this;

      if (this._isMinimized) {
        this._container.innerHTML = this._renderMinimized();
        this._container.querySelector('.autosetup-minimized').onclick = function() {
          self.resume();
        };
        this._removeHighlight();
        return;
      }

      if (this._config.position === 'top-bar') {
        this._container.innerHTML = this._renderTopBar(step);
        this._bindTopBarEvents();
      } else {
        this._container.innerHTML = this._renderModal(step);
        this._bindModalEvents();
      }

      // Highlight target element if selector exists
      if (step.target_selector) {
        this._highlightElement(step.target_selector);
      } else {
        this._removeHighlight();
      }

      // Execute step actions if enabled
      if (this._config.autoExecuteActions && step.actions && step.actions.length > 0) {
        this._executeStepActions(step);
      }
    },

    _renderMinimized: function() {
      var progress = this.getProgress();
      return '<div class="autosetup-minimized">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
        '<span>' + progress.completedSteps.length + '/' + progress.totalSteps + '</span>' +
      '</div>';
    },

    _renderTopBar: function(step) {
      var self = this;
      var dots = this._steps.map(function(s, i) {
        var cls = 'autosetup-dot';
        if (self._completedSteps.indexOf(s.id) !== -1) cls += ' completed';
        else if (self._skippedSteps.indexOf(s.id) !== -1) cls += ' skipped';
        else if (i === self._currentIndex) cls += ' current';
        return '<div class="' + cls + '"></div>';
      }).join('');

      // Saudação personalizada com nome do usuário
      var greeting = this._config.userName 
        ? 'Olá, ' + this._escapeHtml(this._config.userName) + '! ' 
        : '';

      return '<div class="autosetup-topbar">' +
        '<div class="autosetup-topbar-content">' +
          '<div class="autosetup-progress-dots">' + dots + '</div>' +
          '<div class="autosetup-step-info">' +
            '<div class="autosetup-step-title">' + greeting + 'Passo ' + (this._currentIndex + 1) + ': ' + this._escapeHtml(step.title) + '</div>' +
            (step.description ? '<div class="autosetup-step-desc">' + this._escapeHtml(step.description) + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="autosetup-actions">' +
          (this._currentIndex > 0 ? '<button class="autosetup-btn autosetup-btn-secondary" data-action="prev">← Anterior</button>' : '') +
          (!step.is_required ? '<button class="autosetup-btn autosetup-btn-secondary" data-action="skip">Pular</button>' : '') +
          '<button class="autosetup-btn autosetup-btn-primary" data-action="complete">' + 
            (this._currentIndex < this._steps.length - 1 ? 'Concluir →' : 'Finalizar ✓') + 
          '</button>' +
          '<button class="autosetup-btn autosetup-btn-icon" data-action="minimize" title="Minimizar">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>';
    },

    _renderModal: function(step) {
      // Saudação personalizada com nome do usuário
      var welcomeMsg = this._config.userName 
        ? '<p style="color: #6366f1; font-weight: 500; margin-bottom: 12px;">Olá, ' + this._escapeHtml(this._config.userName) + '!</p>'
        : '';

      return '<div class="autosetup-modal-overlay">' +
        '<div class="autosetup-modal">' +
          '<div class="autosetup-modal-header">' +
            '<div>' +
              '<div class="autosetup-modal-step">Passo ' + (this._currentIndex + 1) + ' de ' + this._steps.length + '</div>' +
              '<div class="autosetup-modal-title">' + this._escapeHtml(step.title) + '</div>' +
            '</div>' +
            '<button class="autosetup-close" data-action="minimize">&times;</button>' +
          '</div>' +
          '<div class="autosetup-modal-body">' +
            welcomeMsg +
            (step.image_url ? '<img class="autosetup-modal-image" src="' + this._escapeHtml(step.image_url) + '" alt="">' : '') +
            (step.description ? '<p class="autosetup-modal-desc">' + this._escapeHtml(step.description) + '</p>' : '') +
            (step.instructions ? '<p class="autosetup-modal-desc">' + this._escapeHtml(step.instructions) + '</p>' : '') +
            (step.tips ? '<div class="autosetup-modal-tip">💡 ' + this._escapeHtml(step.tips) + '</div>' : '') +
          '</div>' +
          '<div class="autosetup-modal-footer">' +
            (!step.is_required ? '<button class="autosetup-modal-btn autosetup-modal-btn-skip" data-action="skip">Pular</button>' : '<div></div>') +
            '<button class="autosetup-modal-btn autosetup-modal-btn-complete" data-action="complete">' +
              (this._currentIndex < this._steps.length - 1 ? 'Concluir e Próximo →' : 'Finalizar ✓') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    },

    _bindTopBarEvents: function() {
      var self = this;
      this._container.querySelectorAll('[data-action]').forEach(function(btn) {
        btn.onclick = function() {
          var action = btn.getAttribute('data-action');
          if (action === 'prev') self.goToStep(self._currentIndex - 1);
          else if (action === 'skip') self.skipStep();
          else if (action === 'complete') self.completeStep();
          else if (action === 'minimize') self.pause();
        };
      });
    },

    _bindModalEvents: function() {
      var self = this;
      this._container.querySelectorAll('[data-action]').forEach(function(btn) {
        btn.onclick = function(e) {
          e.stopPropagation();
          var action = btn.getAttribute('data-action');
          if (action === 'skip') self.skipStep();
          else if (action === 'complete') self.completeStep();
          else if (action === 'minimize') self.pause();
        };
      });
      
      // Close on overlay click
      var overlay = this._container.querySelector('.autosetup-modal-overlay');
      if (overlay) {
        overlay.onclick = function(e) {
          if (e.target === overlay) self.pause();
        };
      }
    },

    // ==================== ACTION EXECUTION SYSTEM ====================

    _abortActions: function() {
      if (this._actionAbortController) {
        this._actionAbortController.abort();
        this._actionAbortController = null;
      }
      this._isExecutingActions = false;
      this._hideActionIndicator();
    },

    _executeStepActions: function(step) {
      var self = this;
      var actions = step.actions || [];
      
      if (!actions.length) return;

      this._abortActions();
      this._actionAbortController = { aborted: false, abort: function() { this.aborted = true; } };
      this._isExecutingActions = true;

      this._emit('actionsStart', { step: step, actionsCount: actions.length });

      var executeNext = function(index) {
        if (self._actionAbortController.aborted || index >= actions.length) {
          self._isExecutingActions = false;
          self._hideActionIndicator();
          if (!self._actionAbortController.aborted) {
            self._emit('actionsComplete', { step: step, actionsCount: actions.length });
          }
          return;
        }

        var action = actions[index];
        self._showActionIndicator(action);
        self._emit('actionStart', { action: action, step: step, index: index });

        self._executeAction(action)
          .then(function() {
            self._emit('actionExecuted', { action: action, step: step, index: index, success: true });
            // Wait before next action
            return self._waitDelay(self._config.actionDelay);
          })
          .then(function() {
            executeNext(index + 1);
          })
          .catch(function(err) {
            console.warn('[AutoSetup] Action failed:', action, err);
            self._emit('actionError', { action: action, step: step, index: index, error: err });
            // Continue to next action even on error
            executeNext(index + 1);
          });
      };

      executeNext(0);
    },

    _executeAction: function(action) {
      var self = this;

      return new Promise(function(resolve, reject) {
        // Wait for element if configured
        var waitForElement = action.wait_for_element && action.selector;
        var elementPromise = waitForElement 
          ? self._waitForElement(action.selector, 5000)
          : Promise.resolve(null);

        elementPromise.then(function() {
          // Apply delay if configured
          var delayMs = action.delay_ms || 0;
          return self._waitDelay(delayMs);
        }).then(function() {
          // Scroll to element if configured
          if (action.scroll_to_element && action.selector) {
            self._scrollToElement(action.selector, action.scroll_behavior, action.scroll_position);
            return self._waitDelay(300); // Wait for scroll
          }
          return Promise.resolve();
        }).then(function() {
          // Execute the main action
          switch (action.action_type) {
            case 'click':
              return self._clickElement(action.selector);
            case 'input':
              return self._inputValue(action.selector, action.value, action.input_type);
            case 'scroll':
              return self._scrollAction(action);
            case 'wait':
              return self._waitDelay(action.delay_ms || 1000);
            case 'highlight':
              return self._highlightAction(action);
            case 'open_modal':
              return self._openModal(action.selector);
            default:
              console.warn('[AutoSetup] Unknown action type:', action.action_type);
              return Promise.resolve();
          }
        }).then(resolve).catch(reject);
      });
    },

    _waitForElement: function(selector, timeout) {
      var self = this;
      timeout = timeout || 5000;

      return new Promise(function(resolve, reject) {
        var el = document.querySelector(selector);
        if (el) {
          resolve(el);
          return;
        }

        var startTime = Date.now();
        var observer = new MutationObserver(function() {
          var el = document.querySelector(selector);
          if (el) {
            observer.disconnect();
            resolve(el);
          } else if (Date.now() - startTime > timeout) {
            observer.disconnect();
            reject(new Error('Element not found: ' + selector));
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });

        // Also check with interval as backup
        var interval = setInterval(function() {
          var el = document.querySelector(selector);
          if (el) {
            clearInterval(interval);
            observer.disconnect();
            resolve(el);
          } else if (Date.now() - startTime > timeout) {
            clearInterval(interval);
            observer.disconnect();
            reject(new Error('Element not found: ' + selector));
          }
        }, 100);
      });
    },

    _waitDelay: function(ms) {
      return new Promise(function(resolve) {
        setTimeout(resolve, ms || 0);
      });
    },

    _scrollToElement: function(selector, behavior, position) {
      try {
        var el = document.querySelector(selector);
        if (el) {
          el.scrollIntoView({
            behavior: behavior || 'smooth',
            block: position || 'center'
          });
        }
      } catch (e) {
        console.warn('[AutoSetup] Failed to scroll to element:', e);
      }
    },

    _scrollAction: function(action) {
      var self = this;
      return new Promise(function(resolve) {
        if (action.selector) {
          self._scrollToElement(action.selector, action.scroll_behavior, action.scroll_position);
        }
        // Give time for scroll to complete
        setTimeout(resolve, 500);
      });
    },

    _clickElement: function(selector) {
      return new Promise(function(resolve, reject) {
        try {
          var el = document.querySelector(selector);
          if (!el) {
            reject(new Error('Element not found: ' + selector));
            return;
          }
          
          // Trigger click events for React/Vue compatibility
          el.focus();
          el.click();
          
          // Also dispatch events manually for better framework compatibility
          var mouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
          var mouseUp = new MouseEvent('mouseup', { bubbles: true, cancelable: true });
          var click = new MouseEvent('click', { bubbles: true, cancelable: true });
          
          el.dispatchEvent(mouseDown);
          el.dispatchEvent(mouseUp);
          el.dispatchEvent(click);
          
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    },

    _inputValue: function(selector, value, inputType) {
      return new Promise(function(resolve, reject) {
        try {
          var el = document.querySelector(selector);
          if (!el) {
            reject(new Error('Element not found: ' + selector));
            return;
          }
          
          el.focus();
          
          // Set value directly
          el.value = value || '';
          
          // Dispatch events for React/Vue/Angular compatibility
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          
          // For React specifically, also set native value
          var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          var nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          
          if (el.tagName === 'INPUT' && nativeInputValueSetter) {
            nativeInputValueSetter.call(el, value || '');
            el.dispatchEvent(new Event('input', { bubbles: true }));
          } else if (el.tagName === 'TEXTAREA' && nativeTextareaValueSetter) {
            nativeTextareaValueSetter.call(el, value || '');
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
          
          resolve();
        } catch (e) {
          reject(e);
        }
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
        
        // Wait for highlight duration, then resolve
        var duration = action.highlight_duration_ms || 2000;
        setTimeout(function() {
          self._removeHighlight();
          resolve();
        }, duration);
      });
    },

    _highlightWithAnimation: function(selector, color, duration, animation) {
      this._removeHighlight();
      
      try {
        var el = document.querySelector(selector);
        if (!el) return;
        
        var rect = el.getBoundingClientRect();
        var highlight = document.createElement('div');
        highlight.id = 'autosetup-highlight';
        highlight.className = 'autosetup-highlight autosetup-highlight-' + (animation || 'pulse');
        
        var highlightColor = color || '#6366f1';
        highlight.style.cssText = 
          'top:' + (rect.top + window.scrollY - 4) + 'px;' +
          'left:' + (rect.left + window.scrollX - 4) + 'px;' +
          'width:' + (rect.width + 8) + 'px;' +
          'height:' + (rect.height + 8) + 'px;' +
          '--autosetup-highlight-color:' + highlightColor + ';' +
          'border-color:' + highlightColor + ';';
        
        document.body.appendChild(highlight);
        
        // Scroll into view
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {
        console.warn('[AutoSetup] Failed to highlight element:', e);
      }
    },

    _openModal: function(selector) {
      var self = this;
      return new Promise(function(resolve, reject) {
        try {
          var el = document.querySelector(selector);
          if (!el) {
            reject(new Error('Element not found: ' + selector));
            return;
          }
          
          // Trigger click to open modal
          el.click();
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    },

    _showActionIndicator: function(action) {
      this._hideActionIndicator();
      
      var indicator = document.createElement('div');
      indicator.id = 'autosetup-action-indicator';
      indicator.className = 'autosetup-action-indicator';
      
      var label = action.description || this._getActionLabel(action.action_type);
      indicator.innerHTML = '<div class="autosetup-action-spinner"></div><span>' + this._escapeHtml(label) + '</span>';
      
      document.body.appendChild(indicator);
    },

    _hideActionIndicator: function() {
      var existing = document.getElementById('autosetup-action-indicator');
      if (existing) existing.remove();
    },

    _getActionLabel: function(type) {
      var labels = {
        'click': 'Clicando...',
        'input': 'Preenchendo...',
        'scroll': 'Rolando...',
        'wait': 'Aguardando...',
        'highlight': 'Destacando...',
        'open_modal': 'Abrindo modal...'
      };
      return labels[type] || 'Executando...';
    },

    // ==================== HIGHLIGHT SYSTEM ====================

    _highlightElement: function(selector) {
      this._removeHighlight();
      
      try {
        var el = document.querySelector(selector);
        if (!el) return;
        
        var rect = el.getBoundingClientRect();
        var highlight = document.createElement('div');
        highlight.className = 'autosetup-highlight autosetup-highlight-pulse';
        highlight.id = 'autosetup-highlight';
        highlight.style.cssText = 'top:' + (rect.top + window.scrollY - 4) + 'px;' +
          'left:' + (rect.left + window.scrollX - 4) + 'px;' +
          'width:' + (rect.width + 8) + 'px;' +
          'height:' + (rect.height + 8) + 'px;';
        
        document.body.appendChild(highlight);
        
        // Scroll element into view
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {
        console.warn('[AutoSetup] Failed to highlight element:', e);
      }
    },

    _removeHighlight: function() {
      var existing = document.getElementById('autosetup-highlight');
      if (existing) existing.remove();
    },

    _escapeHtml: function(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  };

  // Expose globally
  window.AutoSetup = AutoSetup;

})(window);
