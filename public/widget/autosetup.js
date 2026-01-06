/**
 * AutoSetup Widget - Embedded tour/setup guide
 * Usage:
 *   AutoSetup.init({ configId: '...', apiKey: '...', position: 'top-bar', autoStart: true });
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

    init: function(options) {
      if (!options.configId || !options.apiKey) {
        console.error('[AutoSetup] configId and apiKey are required');
        return Promise.reject(new Error('configId and apiKey are required'));
      }

      this._config = {
        configId: options.configId,
        apiKey: options.apiKey,
        position: options.position || 'top-bar',
        autoStart: options.autoStart !== false
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
      
      return fetch(url)
        .then(function(res) {
          if (!res.ok) {
            return res.json().then(function(err) {
              throw new Error(err.error || 'Failed to fetch configuration');
            });
          }
          return res.json();
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
        '.autosetup-highlight { position: absolute; border: 3px solid #6366f1; border-radius: 4px; pointer-events: none; z-index: 999998; box-shadow: 0 0 0 4px rgba(99,102,241,0.2); animation: autosetup-pulse 2s infinite; }\n' +
        '@keyframes autosetup-pulse { 0%, 100% { box-shadow: 0 0 0 4px rgba(99,102,241,0.2); } 50% { box-shadow: 0 0 0 8px rgba(99,102,241,0.1); } }\n' +
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
        '.autosetup-close:hover { color: #6b7280; }\n';

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

      return '<div class="autosetup-topbar">' +
        '<div class="autosetup-topbar-content">' +
          '<div class="autosetup-progress-dots">' + dots + '</div>' +
          '<div class="autosetup-step-info">' +
            '<div class="autosetup-step-title">Passo ' + (this._currentIndex + 1) + ': ' + this._escapeHtml(step.title) + '</div>' +
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

    _highlightElement: function(selector) {
      this._removeHighlight();
      
      try {
        var el = document.querySelector(selector);
        if (!el) return;
        
        var rect = el.getBoundingClientRect();
        var highlight = document.createElement('div');
        highlight.className = 'autosetup-highlight';
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
