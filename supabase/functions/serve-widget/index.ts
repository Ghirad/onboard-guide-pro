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
    _routeObserverActive: false,
    _isInitialized: false,
    _targetClickHandler: null,

    init: function(options) {
      this._config = {
        configId: options.configId,
        apiKey: options.apiKey,
        position: options.position || 'top-bar',
        autoStart: options.autoStart !== false,
        autoExecuteActions: options.autoExecuteActions !== false,
        actionDelay: options.actionDelay || 300,
        allowedRoutes: options.allowedRoutes || null, // null means "use backend config"
        autoAdvanceOnClick: options.autoAdvanceOnClick !== false // auto-advance when clicking target element
      };

      this._loadProgress();
      
      // Fetch configuration first to get allowed_routes from backend
      this._fetchConfiguration().then(function() {
        // Now check if widget should show on current route
        if (!this._shouldShowOnCurrentRoute()) {
          console.log('[AutoSetup] Widget not configured for this route:', window.location.pathname);
          console.log('[AutoSetup] Allowed routes:', this._config.allowedRoutes);
          // Setup route observer to show widget when navigating to allowed route
          this._setupRouteObserver();
          return;
        }

        this._initializeWidget();
      }.bind(this)).catch(function(error) {
        console.error('[AutoSetup] Failed to initialize:', error);
        this._emit('error', { error: error });
      }.bind(this));

      return this;
    },

    _initializeWidget: function() {
      if (this._isInitialized) return;
      this._isInitialized = true;
      
      this._injectStyles();
      this._createContainer();
      if (this._config.autoStart) {
        this._render();
      }
      this._setupRouteObserver();
      this._emit('ready', { config: this._config });
    },

    _setupRouteObserver: function() {
      if (this._routeObserverActive) return;
      this._routeObserverActive = true;
      
      var self = this;
      
      // Listen for popstate (back/forward navigation)
      window.addEventListener('popstate', function() {
        self._handleRouteChange();
      });
      
      // Intercept pushState and replaceState for SPA navigation
      var originalPushState = history.pushState;
      var originalReplaceState = history.replaceState;
      
      history.pushState = function() {
        originalPushState.apply(history, arguments);
        self._handleRouteChange();
      };
      
      history.replaceState = function() {
        originalReplaceState.apply(history, arguments);
        self._handleRouteChange();
      };
      
      console.log('[AutoSetup] Route observer active');
    },

    _handleRouteChange: function() {
      var shouldShow = this._shouldShowOnCurrentRoute();
      console.log('[AutoSetup] Route changed to:', window.location.pathname, '| Should show:', shouldShow);
      
      if (shouldShow && !this._isInitialized) {
        // Widget should show and is not initialized yet
        this._initializeWidget();
      } else if (shouldShow && this._container && !this._container.innerHTML) {
        // Widget is initialized but hidden, render it
        this._render();
      } else if (!shouldShow && this._container) {
        // Widget should not show, hide it
        this._container.innerHTML = '';
        this._removeHighlight();
        this._removeTooltip();
      }
    },

    _shouldShowOnCurrentRoute: function() {
      var routes = this._config.allowedRoutes;
      
      // If no routes specified or empty array, show on all pages
      if (!routes || routes.length === 0) {
        console.log('[AutoSetup] No route restrictions, showing on all pages');
        return true;
      }
      
      var currentPath = window.location.pathname.toLowerCase();
      console.log('[AutoSetup] Checking route:', currentPath, 'against allowed:', routes);
      
      for (var i = 0; i < routes.length; i++) {
        var route = routes[i].toLowerCase();
        
        // Wildcard support: /painel/*
        if (route.endsWith('/*')) {
          var prefix = route.slice(0, -1); // Remove the *
          if (currentPath.startsWith(prefix)) {
            console.log('[AutoSetup] Route matched wildcard:', route);
            return true;
          }
        } 
        // Exact match (with or without trailing slash)
        else {
          if (currentPath === route || 
              currentPath === route + '/' ||
              currentPath + '/' === route) {
            console.log('[AutoSetup] Route matched exactly:', route);
            return true;
          }
        }
      }
      
      console.log('[AutoSetup] No route matched');
      return false;
    },

    start: function() {
      this._isMinimized = false;
      this._render();
      this._emit('start', { step: this._currentStepIndex });
    },

    pause: function() {
      this._isMinimized = true;
      this._abortActions();
      this._removeTargetClickListener();
      this._removeTooltip();
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
        this._removeTargetClickListener();
        this._removeTooltip();
        this._currentStepIndex = index;
        this._render();
        this._emit('stepChange', { step: index, stepData: this._steps[index] });
      }
    },

    completeStep: function() {
      var step = this._steps[this._currentStepIndex];
      if (step) {
        this._removeTargetClickListener();
        this._progress[step.id] = { status: 'completed', completedAt: new Date().toISOString() };
        this._saveProgress();
        this._removeTooltip();
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
        this._removeTargetClickListener();
        this._progress[step.id] = { status: 'skipped', skippedAt: new Date().toISOString() };
        this._saveProgress();
        this._removeTooltip();
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
      this._removeTargetClickListener();
      this._removeHighlight();
      this._removeTooltip();
      this._hideActionIndicator();
      if (this._container) {
        this._container.remove();
        this._container = null;
      }
      this._isInitialized = false;
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
      var url = baseUrl + '/functions/v1/get-configuration?configId=' + encodeURIComponent(this._config.configId) + '&apiKey=' + encodeURIComponent(this._config.apiKey);
      
      return fetch(url, {
        headers: {
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
        
        // Use backend allowed_routes if not overridden in init options
        if (self._config.allowedRoutes === null && data.configuration && data.configuration.allowed_routes) {
          self._config.allowedRoutes = data.configuration.allowed_routes;
          console.log('[AutoSetup] Using allowed_routes from backend:', self._config.allowedRoutes);
        } else if (self._config.allowedRoutes === null) {
          self._config.allowedRoutes = [];
        }
        
        // Load theme from backend
        if (data.configuration && data.configuration.theme) {
          self._config.theme = data.configuration.theme;
          console.log('[AutoSetup] Loaded theme from backend:', self._config.theme);
        }
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
      var theme = this._config.theme || {};
      var primary = theme.primaryColor || '#6366f1';
      var secondary = theme.secondaryColor || '#8b5cf6';
      var bg = theme.backgroundColor || '#ffffff';
      var text = theme.textColor || '#1f2937';
      var animation = theme.highlightAnimation || 'pulse';
      
      // Convert hex to RGB for rgba usage
      var hexToRgb = function(hex) {
        var result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
        return result ? parseInt(result[1], 16) + ',' + parseInt(result[2], 16) + ',' + parseInt(result[3], 16) : '99,102,241';
      };
      var primaryRgb = hexToRgb(primary);
      
      return \`
        :root {
          --autosetup-primary: \${primary};
          --autosetup-secondary: \${secondary};
          --autosetup-bg: \${bg};
          --autosetup-text: \${text};
          --autosetup-primary-rgb: \${primaryRgb};
        }
        .autosetup-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; z-index: 2147483647; position: relative; }
        .autosetup-topbar { position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647; background: linear-gradient(135deg, var(--autosetup-primary) 0%, var(--autosetup-secondary) 100%); color: white; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 10px rgba(0,0,0,0.15); }
        .autosetup-topbar-content { display: flex; align-items: center; gap: 16px; flex: 1; }
        .autosetup-step-info { display: flex; flex-direction: column; gap: 2px; }
        .autosetup-step-title { font-weight: 600; font-size: 14px; }
        .autosetup-step-desc { font-size: 12px; opacity: 0.9; }
        .autosetup-progress { display: flex; align-items: center; gap: 8px; font-size: 12px; }
        .autosetup-progress-bar { width: 120px; height: 6px; background: rgba(255,255,255,0.3); border-radius: 3px; overflow: hidden; }
        .autosetup-progress-fill { height: 100%; background: white; border-radius: 3px; transition: width 0.3s ease; }
        .autosetup-actions { display: flex; gap: 8px; }
        .autosetup-btn { padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: all 0.2s; }
        .autosetup-btn-primary { background: white; color: var(--autosetup-primary); }
        .autosetup-btn-primary:hover { background: #f0f0ff; }
        .autosetup-btn-secondary { background: rgba(255,255,255,0.2); color: white; }
        .autosetup-btn-secondary:hover { background: rgba(255,255,255,0.3); }
        .autosetup-btn-modal-primary { background: linear-gradient(135deg, var(--autosetup-primary) 0%, var(--autosetup-secondary) 100%); color: white; }
        .autosetup-btn-modal-primary:hover { opacity: 0.9; }
        .autosetup-btn-modal-secondary { background: #f3f4f6; color: #6b7280; }
        .autosetup-btn-modal-secondary:hover { background: #e5e7eb; }
        .autosetup-minimized { position: fixed; top: 20px; right: 20px; z-index: 2147483647; background: linear-gradient(135deg, var(--autosetup-primary) 0%, var(--autosetup-secondary) 100%); color: white; padding: 12px 20px; border-radius: 50px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(var(--autosetup-primary-rgb),0.4); }
        .autosetup-minimized:hover { transform: scale(1.05); }
        .autosetup-highlight { position: fixed; pointer-events: none; border: 3px solid var(--autosetup-primary); border-radius: 8px; z-index: 2147483646; transition: all 0.3s ease; }
        .autosetup-highlight-pulse { animation: autosetup-pulse 2s infinite; }
        .autosetup-highlight-glow { box-shadow: 0 0 20px rgba(var(--autosetup-primary-rgb),0.6); animation: autosetup-glow 1.5s ease-in-out infinite; }
        .autosetup-highlight-border { animation: autosetup-border 1s ease-in-out infinite; }
        .autosetup-highlight-shake { animation: autosetup-shake 0.6s ease-in-out infinite; }
        .autosetup-highlight-bounce { animation: autosetup-bounce 0.8s ease-in-out infinite; }
        .autosetup-highlight-fade { animation: autosetup-fade 2s ease-in-out infinite; }
        @keyframes autosetup-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.02); } }
        @keyframes autosetup-glow { 0%, 100% { box-shadow: 0 0 10px rgba(var(--autosetup-primary-rgb),0.4); } 50% { box-shadow: 0 0 30px rgba(var(--autosetup-primary-rgb),0.8); } }
        @keyframes autosetup-border { 0%, 100% { border-width: 2px; } 50% { border-width: 4px; } }
        @keyframes autosetup-shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); } 20%, 40%, 60%, 80% { transform: translateX(3px); } }
        @keyframes autosetup-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes autosetup-fade { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0; } }
        .autosetup-action-indicator { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 8px; font-size: 13px; display: flex; align-items: center; gap: 8px; z-index: 2147483647; }
        .autosetup-action-indicator .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .autosetup-complete { position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 20px; text-align: center; }
        .autosetup-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2147483647; backdrop-filter: blur(4px); }
        .autosetup-modal { background: var(--autosetup-bg); border-radius: 16px; padding: 32px; max-width: 420px; width: 90%; color: var(--autosetup-text); text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        .autosetup-modal h3 { margin: 0 0 12px; font-size: 22px; font-weight: 700; }
        .autosetup-modal p { margin: 0 0 20px; opacity: 0.8; font-size: 15px; line-height: 1.6; }
        .autosetup-modal-image { width: 100%; max-height: 200px; object-fit: cover; border-radius: 12px; margin-bottom: 20px; }
        .autosetup-modal-progress { font-size: 13px; opacity: 0.6; margin-bottom: 24px; }
        .autosetup-modal-actions { display: flex; gap: 12px; justify-content: center; }
        .autosetup-modal-actions .autosetup-btn { padding: 12px 24px; font-size: 14px; }
        
        /* Tooltip styles */
        .autosetup-tooltip { position: fixed; z-index: 2147483647; background: var(--autosetup-bg); border-radius: 12px; padding: 16px; max-width: 320px; min-width: 260px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); color: var(--autosetup-text); animation: autosetup-tooltip-appear 0.2s ease-out; }
        @keyframes autosetup-tooltip-appear { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .autosetup-tooltip-arrow { position: absolute; width: 12px; height: 12px; background: var(--autosetup-bg); transform: rotate(45deg); box-shadow: -2px -2px 4px rgba(0,0,0,0.05); }
        .autosetup-tooltip-arrow.arrow-top { bottom: -6px; left: 50%; margin-left: -6px; }
        .autosetup-tooltip-arrow.arrow-bottom { top: -6px; left: 50%; margin-left: -6px; box-shadow: 2px 2px 4px rgba(0,0,0,0.05); }
        .autosetup-tooltip-arrow.arrow-left { right: -6px; top: 50%; margin-top: -6px; box-shadow: 2px -2px 4px rgba(0,0,0,0.05); }
        .autosetup-tooltip-arrow.arrow-right { left: -6px; top: 50%; margin-top: -6px; box-shadow: -2px 2px 4px rgba(0,0,0,0.05); }
        .autosetup-tooltip-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .autosetup-tooltip-step { background: linear-gradient(135deg, var(--autosetup-primary) 0%, var(--autosetup-secondary) 100%); color: white; font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 4px; }
        .autosetup-tooltip-title { font-weight: 600; font-size: 15px; flex: 1; }
        .autosetup-tooltip-desc { font-size: 13px; opacity: 0.8; margin-bottom: 16px; line-height: 1.5; }
        .autosetup-tooltip-image { width: 100%; border-radius: 8px; margin-bottom: 12px; max-height: 150px; object-fit: cover; }
        .autosetup-tooltip-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .autosetup-tooltip-actions .autosetup-btn { padding: 8px 14px; font-size: 12px; }
        
        /* Compact topbar for tooltip mode */
        .autosetup-topbar-compact { position: fixed; top: 0; right: 0; z-index: 2147483647; background: linear-gradient(135deg, var(--autosetup-primary) 0%, var(--autosetup-secondary) 100%); color: white; padding: 8px 16px; display: flex; align-items: center; gap: 12px; border-radius: 0 0 0 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.15); }
        .autosetup-topbar-compact .autosetup-progress-bar { width: 80px; height: 4px; }
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
      
      // Clean up any existing tooltip and listeners
      this._removeTargetClickListener();
      this._removeTooltip();
      this._removeHighlight();
      
      if (this._isMinimized) {
        this._renderMinimized();
        return;
      }
      
      var step = this._steps[this._currentStepIndex];
      if (!step) return;
      
      console.log('[AutoSetup] Rendering step:', step.title, 'target_type:', step.target_type);
      
      // Decide rendering based on target_type
      if (step.target_type === 'modal') {
        this._renderModal(step);
      } else {
        this._renderTooltipMode(step);
      }
    },

    _renderMinimized: function() {
      var progress = this.getProgress();
      this._container.innerHTML = '<div class="autosetup-minimized" onclick="AutoSetup.resume()">' +
        '<span>📋</span>' +
        '<span>Setup: ' + progress.percentage + '%</span>' +
      '</div>';
    },

    _renderModal: function(step) {
      var progress = this.getProgress();
      var isLastStep = this._currentStepIndex === this._steps.length - 1;
      var buttonText = this._currentStepIndex === 0 ? 'Começar' : (isLastStep ? 'Finalizar' : 'Próximo');
      
      // Get step theme (with override support)
      var stepTheme = this._getStepTheme(step);
      
      var modalStyle = stepTheme.isOverride
        ? 'background:' + stepTheme.backgroundColor + '; color:' + stepTheme.textColor + ';'
        : '';
      
      var buttonStyle = stepTheme.isOverride
        ? 'background:' + stepTheme.primaryColor + '; color: white;'
        : '';
      
      this._container.innerHTML = '<div class="autosetup-modal-overlay">' +
        '<div class="autosetup-modal" style="' + modalStyle + '">' +
          (step.image_url ? '<img src="' + step.image_url + '" class="autosetup-modal-image" alt=""/>' : '') +
          '<h3>' + this._escapeHtml(step.title) + '</h3>' +
          '<p>' + this._escapeHtml(step.description || '') + '</p>' +
          '<div class="autosetup-modal-progress">Passo ' + (this._currentStepIndex + 1) + ' de ' + progress.total + '</div>' +
          '<div class="autosetup-modal-actions">' +
            (!step.is_required ? '<button class="autosetup-btn autosetup-btn-modal-secondary" onclick="AutoSetup.skipStep()">Pular</button>' : '') +
            '<button class="autosetup-btn autosetup-btn-modal-primary" style="' + buttonStyle + '" onclick="AutoSetup.completeStep()">' + buttonText + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    },

    _renderTooltipMode: function(step) {
      var self = this;
      var progress = this.getProgress();
      
      // Render compact top bar for progress and controls
      this._container.innerHTML = '<div class="autosetup-topbar-compact">' +
        '<div class="autosetup-progress">' +
          '<div class="autosetup-progress-bar"><div class="autosetup-progress-fill" style="width:' + progress.percentage + '%"></div></div>' +
          '<span>' + (this._currentStepIndex + 1) + '/' + progress.total + '</span>' +
        '</div>' +
        '<button class="autosetup-btn autosetup-btn-secondary" style="padding:4px 8px;font-size:12px" onclick="AutoSetup.pause()">✕</button>' +
      '</div>';
      
      // Render tooltip near element
      if (step.target_selector) {
        // Get step theme for highlight
        var stepTheme = this._getStepTheme(step);
        
        setTimeout(function() {
          self._renderTooltip(step);
          // Use step-specific animation if overridden
          var animation = stepTheme.isOverride ? stepTheme.animation : null;
          self._highlightElement(step.target_selector, animation);
          
          // Auto-advance when clicking on target element
          if (self._config.autoAdvanceOnClick) {
            self._attachTargetClickListener(step.target_selector);
          }
        }, 150);
      } else {
        // No selector, fall back to modal
        this._renderModal(step);
      }
      
      // Execute actions if configured
      if (this._config.autoExecuteActions && step.actions && step.actions.length > 0) {
        setTimeout(function() { self._executeStepActions(step); }, 500);
      }
    },

    _renderTooltip: function(step) {
      var el = document.querySelector(step.target_selector);
      if (!el) {
        console.warn('[AutoSetup] Element not found for tooltip:', step.target_selector);
        return;
      }
      
      // Scroll element into view first
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      var self = this;
      
      // Get step theme (with override support)
      var stepTheme = this._getStepTheme(step);
      
      // Small delay to allow scroll to complete
      setTimeout(function() {
        var rect = el.getBoundingClientRect();
        var position = self._calculateTooltipPosition(rect);
        var isLastStep = self._currentStepIndex === self._steps.length - 1;
        var buttonText = isLastStep ? 'Finalizar' : 'Próximo';
        
        var tooltip = document.createElement('div');
        tooltip.id = 'autosetup-tooltip';
        tooltip.className = 'autosetup-tooltip';
        
        // Apply step-specific theme if enabled
        if (stepTheme.isOverride) {
          tooltip.style.backgroundColor = stepTheme.backgroundColor;
          tooltip.style.color = stepTheme.textColor;
          if (stepTheme.borderRadius) {
            var radiusMap = { none: '0', sm: '4px', rounded: '12px', lg: '16px', xl: '20px' };
            tooltip.style.borderRadius = radiusMap[stepTheme.borderRadius] || '12px';
          }
        }
        
        var stepBadgeStyle = stepTheme.isOverride 
          ? 'background:' + stepTheme.primaryColor + ';' 
          : 'background: linear-gradient(135deg, var(--autosetup-primary) 0%, var(--autosetup-secondary) 100%);';
        
        var buttonStyle = stepTheme.isOverride
          ? 'background:' + stepTheme.primaryColor + '; color: white;'
          : '';
        
        tooltip.innerHTML = 
          '<div class="autosetup-tooltip-arrow arrow-' + position.arrowPosition + '"></div>' +
          (step.image_url ? '<img src="' + step.image_url + '" class="autosetup-tooltip-image" alt=""/>' : '') +
          '<div class="autosetup-tooltip-header">' +
            '<span class="autosetup-tooltip-step" style="' + stepBadgeStyle + '">Passo ' + (self._currentStepIndex + 1) + '</span>' +
            '<span class="autosetup-tooltip-title">' + self._escapeHtml(step.title) + '</span>' +
          '</div>' +
          '<div class="autosetup-tooltip-desc">' + self._escapeHtml(step.description || '') + '</div>' +
          '<div class="autosetup-tooltip-actions">' +
            (!step.is_required ? '<button class="autosetup-btn autosetup-btn-modal-secondary" onclick="AutoSetup.skipStep()">Pular</button>' : '') +
            '<button class="autosetup-btn autosetup-btn-modal-primary" style="' + buttonStyle + '" onclick="AutoSetup.completeStep()">' + buttonText + '</button>' +
          '</div>';
        
        tooltip.style.cssText += position.style;
        document.body.appendChild(tooltip);
      }, 300);
    },

    _getStepTheme: function(step) {
      // Start with global theme
      var globalTheme = this._config.theme || {};
      var theme = {
        primaryColor: globalTheme.primaryColor || '#6366f1',
        secondaryColor: globalTheme.secondaryColor || '#8b5cf6',
        backgroundColor: globalTheme.backgroundColor || '#ffffff',
        textColor: globalTheme.textColor || '#1f2937',
        animation: globalTheme.highlightAnimation || 'pulse',
        borderRadius: globalTheme.borderRadius || 'rounded',
        isOverride: false
      };
      
      // Apply step theme override if enabled
      if (step.theme_override && step.theme_override.enabled) {
        theme.isOverride = true;
        if (step.theme_override.primaryColor) theme.primaryColor = step.theme_override.primaryColor;
        if (step.theme_override.backgroundColor) theme.backgroundColor = step.theme_override.backgroundColor;
        if (step.theme_override.textColor) theme.textColor = step.theme_override.textColor;
        if (step.theme_override.animation) theme.animation = step.theme_override.animation;
        if (step.theme_override.borderRadius) theme.borderRadius = step.theme_override.borderRadius;
      }
      
      return theme;
    },

    _calculateTooltipPosition: function(rect) {
      var viewportWidth = window.innerWidth;
      var viewportHeight = window.innerHeight;
      var tooltipWidth = 320;
      var tooltipHeight = 180; // estimated
      var gap = 16;
      
      var position = 'bottom';
      var left, top;
      var arrowPosition = 'top';
      
      // Check space below
      if (rect.bottom + tooltipHeight + gap < viewportHeight) {
        position = 'bottom';
        top = rect.bottom + gap;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        arrowPosition = 'bottom';
      } 
      // Check space above
      else if (rect.top - tooltipHeight - gap > 0) {
        position = 'top';
        top = rect.top - tooltipHeight - gap;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        arrowPosition = 'top';
      }
      // Check space right
      else if (rect.right + tooltipWidth + gap < viewportWidth) {
        position = 'right';
        left = rect.right + gap;
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        arrowPosition = 'right';
      }
      // Default to left
      else {
        position = 'left';
        left = rect.left - tooltipWidth - gap;
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        arrowPosition = 'left';
      }
      
      // Keep within viewport
      left = Math.max(10, Math.min(left, viewportWidth - tooltipWidth - 10));
      top = Math.max(10, Math.min(top, viewportHeight - tooltipHeight - 10));
      
      return {
        position: position,
        arrowPosition: arrowPosition,
        style: 'left:' + left + 'px;top:' + top + 'px;'
      };
    },

    _removeTooltip: function() {
      var el = document.getElementById('autosetup-tooltip');
      if (el) el.remove();
    },

    _attachTargetClickListener: function(selector) {
      var self = this;
      var el = document.querySelector(selector);
      if (!el) {
        console.log('[AutoSetup] Target element not found for auto-advance:', selector);
        return;
      }
      
      console.log('[AutoSetup] Attaching click listener to target element:', selector);
      
      var clickHandler = function(e) {
        console.log('[AutoSetup] Target element clicked, auto-advancing to next step');
        
        // Remove listener to prevent multiple triggers
        el.removeEventListener('click', clickHandler, true);
        self._targetClickHandler = null;
        
        // Small delay to allow the natural click action to happen first
        setTimeout(function() {
          self.completeStep();
        }, 100);
      };
      
      // Store reference for cleanup
      this._targetClickHandler = { element: el, handler: clickHandler };
      
      // Use capture phase to catch click before other handlers might stop propagation
      el.addEventListener('click', clickHandler, true);
    },

    _removeTargetClickListener: function() {
      if (this._targetClickHandler) {
        console.log('[AutoSetup] Removing target click listener');
        var target = this._targetClickHandler;
        target.element.removeEventListener('click', target.handler, true);
        this._targetClickHandler = null;
      }
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
      this._removeTooltip();
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
          el = document.querySelector(selector);
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
      return new Promise(function(resolve) { setTimeout(resolve, ms); });
    },

    _scrollToElement: function(selector, behavior, position) {
      var self = this;
      return new Promise(function(resolve) {
        var el = document.querySelector(selector);
        if (el) {
          el.scrollIntoView({ behavior: behavior || 'smooth', block: position || 'center' });
        }
        setTimeout(resolve, 500);
      });
    },

    _clickElement: function(selector) {
      var self = this;
      return new Promise(function(resolve, reject) {
        var el = document.querySelector(selector);
        if (el) {
          el.click();
          resolve();
        } else {
          reject(new Error('Element not found: ' + selector));
        }
      });
    },

    _inputValue: function(selector, value, inputType) {
      var self = this;
      return new Promise(function(resolve, reject) {
        var el = document.querySelector(selector);
        if (el) {
          el.focus();
          el.value = value || '';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          resolve();
        } else {
          reject(new Error('Element not found: ' + selector));
        }
      });
    },

    _highlightAction: function(action) {
      var self = this;
      return new Promise(function(resolve) {
        self._highlightElement(action.selector, action.highlight_animation, action.highlight_color);
        setTimeout(function() {
          self._removeHighlight();
          resolve();
        }, action.highlight_duration_ms || 2000);
      });
    },

    _openModal: function(selector) {
      var self = this;
      return new Promise(function(resolve, reject) {
        var el = document.querySelector(selector);
        if (el) {
          el.click();
          resolve();
        } else {
          reject(new Error('Modal trigger not found: ' + selector));
        }
      });
    },

    _highlightElement: function(selector, animation, color) {
      this._removeHighlight();
      var el = document.querySelector(selector);
      if (!el) return;

      var rect = el.getBoundingClientRect();
      var highlight = document.createElement('div');
      highlight.id = 'autosetup-highlight';
      highlight.className = 'autosetup-highlight';
      if (animation) highlight.classList.add('autosetup-highlight-' + animation);
      
      highlight.style.cssText = 'left:' + (rect.left + window.scrollX - 4) + 'px;' +
        'top:' + (rect.top + window.scrollY - 4) + 'px;' +
        'width:' + (rect.width + 8) + 'px;' +
        'height:' + (rect.height + 8) + 'px;';
      
      if (color) highlight.style.borderColor = color;
      
      document.body.appendChild(highlight);
    },

    _removeHighlight: function() {
      var el = document.getElementById('autosetup-highlight');
      if (el) el.remove();
    },

    _showActionIndicator: function(message) {
      this._hideActionIndicator();
      var indicator = document.createElement('div');
      indicator.id = 'autosetup-action-indicator';
      indicator.className = 'autosetup-action-indicator';
      indicator.innerHTML = '<div class="spinner"></div><span>' + this._escapeHtml(message) + '</span>';
      document.body.appendChild(indicator);
    },

    _hideActionIndicator: function() {
      var el = document.getElementById('autosetup-action-indicator');
      if (el) el.remove();
    },

    _abortActions: function() {
      if (this._actionAbortController) {
        this._actionAbortController.aborted = true;
      }
      this._isExecutingActions = false;
      this._hideActionIndicator();
    },

    _escapeHtml: function(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=60', // Reduced cache for easier debugging
    },
  });
});
