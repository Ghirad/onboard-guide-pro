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
    _navigationTarget: null,
    _clientId: null,
    _saveProgressDebounce: null,
    _baseUrl: 'https://ukjpxeptefznpwduwled.supabase.co',

    init: function(options) {
      var self = this;
      this._config = {
        configId: options.configId,
        apiKey: options.apiKey,
        position: options.position || 'top-bar',
        autoStart: options.autoStart !== false,
        autoExecuteActions: options.autoExecuteActions !== false,
        actionDelay: options.actionDelay || 300,
        allowedRoutes: options.allowedRoutes || null,
        autoAdvanceOnClick: options.autoAdvanceOnClick !== false
      };

      // Generate or load client ID for tracking
      this._clientId = this._getOrCreateClientId();
      console.log('[AutoSetup] Client ID:', this._clientId);

      this._loadProgress();
      
      console.log('[AutoSetup] Initializing with configId:', this._config.configId);
      
      // Fetch configuration first to get allowed_routes from backend
      this._fetchConfiguration().then(function() {
        // Now check if widget should show on current route
        if (!self._shouldShowOnCurrentRoute()) {
          console.log('[AutoSetup] Widget not configured for this route:', window.location.pathname);
          console.log('[AutoSetup] Allowed routes:', self._config.allowedRoutes);
          // Setup route observer to show widget when navigating to allowed route
          self._setupRouteObserver();
          return;
        }

        // Ensure body is ready before initializing widget
        self._ensureBodyReady(function() {
          self._initializeWidget();
        });
      }).catch(function(error) {
        console.error('[AutoSetup] Failed to initialize:', error);
        self._emit('error', { error: error });
      });

      return this;
    },

    _ensureBodyReady: function(callback) {
      if (document.body) {
        console.log('[AutoSetup] Body is ready, initializing immediately');
        callback();
      } else {
        console.log('[AutoSetup] Waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', function() {
          console.log('[AutoSetup] DOMContentLoaded fired, initializing now');
          callback();
        }, { once: true });
      }
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

    // Navigate to step with guidance for pending steps
    navigateToStep: function(targetIndex) {
      if (targetIndex < 0 || targetIndex >= this._steps.length) return;
      
      // If going backwards or to current step, just go directly
      if (targetIndex <= this._currentStepIndex) {
        this.goToStep(targetIndex);
        return;
      }
      
      var pendingSteps = this._getPendingStepsBefore(targetIndex);
      
      if (pendingSteps.length === 0) {
        // No pending steps, go directly
        this.goToStep(targetIndex);
        return;
      }
      
      // Show navigation modal
      this._renderNavigationModal(targetIndex, pendingSteps);
    },

    _getPendingStepsBefore: function(targetIndex) {
      var pending = [];
      for (var i = this._currentStepIndex; i < targetIndex; i++) {
        var step = this._steps[i];
        var progress = this._progress[step.id];
        if (!progress || (progress.status !== 'completed' && progress.status !== 'skipped')) {
          pending.push({ index: i, step: step });
        }
      }
      return pending;
    },

    _skipAllToStep: function(targetIndex) {
      for (var i = this._currentStepIndex; i < targetIndex; i++) {
        var step = this._steps[i];
        if (!this._progress[step.id] || this._progress[step.id].status === 'pending') {
          this._progress[step.id] = { status: 'skipped', skippedAt: new Date().toISOString() };
        }
      }
      this._saveProgress();
      this._closeNavigationModal();
      this.goToStep(targetIndex);
    },

    _startGuidedNavigation: function(targetIndex) {
      this._navigationTarget = targetIndex;
      var pendingSteps = this._getPendingStepsBefore(targetIndex);
      this._closeNavigationModal();
      
      if (pendingSteps.length > 0) {
        this.goToStep(pendingSteps[0].index);
      } else {
        this.goToStep(targetIndex);
      }
    },

    _renderNavigationModal: function(targetIndex, pendingSteps) {
      var self = this;
      var targetStep = this._steps[targetIndex];
      
      var existingModal = document.getElementById('autosetup-navigation-modal');
      if (existingModal) existingModal.remove();
      
      var modal = document.createElement('div');
      modal.id = 'autosetup-navigation-modal';
      modal.className = 'autosetup-navigation-modal';
      modal.onclick = function(e) { if (e.target === modal) self._closeNavigationModal(); };
      
      var pendingListHtml = '<div class="autosetup-navigation-pending-list">';
      for (var i = 0; i < pendingSteps.length; i++) {
        var ps = pendingSteps[i];
        pendingListHtml += '<div class="autosetup-navigation-pending-item"><span class="autosetup-navigation-pending-icon">⏳</span><span class="autosetup-navigation-pending-text">Passo ' + (ps.index + 1) + ': ' + this._escapeHtml(ps.step.title) + '</span></div>';
      }
      pendingListHtml += '</div>';
      
      var firstPendingIndex = pendingSteps[0].index;
      
      modal.innerHTML = 
        '<div class="autosetup-navigation-content">' +
          '<div class="autosetup-navigation-header">' +
            '<h3>🚀 Navegação para Passo ' + (targetIndex + 1) + '</h3>' +
            '<p>Para chegar ao passo "<strong>' + this._escapeHtml(targetStep.title) + '</strong>", você precisa passar por:</p>' +
          '</div>' +
          '<div class="autosetup-navigation-body">' +
            pendingListHtml +
          '</div>' +
          '<div class="autosetup-navigation-question">Como deseja prosseguir?</div>' +
          '<div class="autosetup-navigation-footer">' +
            '<button class="autosetup-btn autosetup-btn-modal-secondary" onclick="AutoSetup._closeNavigationModal()">Cancelar</button>' +
            '<button class="autosetup-btn autosetup-btn-modal-secondary" onclick="AutoSetup._skipAllToStep(' + targetIndex + ')">Pular todos</button>' +
            '<button class="autosetup-btn autosetup-btn-modal-primary" onclick="AutoSetup._startGuidedNavigation(' + targetIndex + ')">Começar pelo Passo ' + (firstPendingIndex + 1) + ' →</button>' +
          '</div>' +
        '</div>';
      
      document.body.appendChild(modal);
    },

    _closeNavigationModal: function() {
      var modal = document.getElementById('autosetup-navigation-modal');
      if (modal) modal.remove();
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
          
          // Check if we reached navigation target
          if (this._navigationTarget !== null && this._currentStepIndex >= this._navigationTarget) {
            this._emit('navigationComplete', { targetStep: this._navigationTarget });
            this._navigationTarget = null;
          }
          
          this._render();
        } else {
          this._navigationTarget = null;
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
          
          // Check if we reached navigation target
          if (this._navigationTarget !== null && this._currentStepIndex >= this._navigationTarget) {
            this._emit('navigationComplete', { targetStep: this._navigationTarget });
            this._navigationTarget = null;
          }
          
          this._render();
        } else {
          this._navigationTarget = null;
          this._emit('complete', { progress: this._progress });
          this._renderComplete();
        }
      }
    },

    // Reset all progress and go back to first step
    resetProgress: function() {
      this._progress = {};
      this._saveProgress();
      this._currentStepIndex = 0;
      this._closeRoadmap();
      this._render();
      this._emit('reset', { type: 'full' });
    },

    // Reset progress from a specific step onwards
    resetFromStep: function(stepIndex) {
      for (var i = stepIndex; i < this._steps.length; i++) {
        delete this._progress[this._steps[i].id];
      }
      this._saveProgress();
      this._currentStepIndex = stepIndex;
      this._closeRoadmap();
      this._render();
      this._emit('reset', { type: 'partial', fromStep: stepIndex });
    },

    // Toggle roadmap visibility
    toggleRoadmap: function() {
      this._isRoadmapOpen = !this._isRoadmapOpen;
      this._renderRoadmapOverlay();
    },

    _closeRoadmap: function() {
      this._isRoadmapOpen = false;
      var overlay = document.getElementById('autosetup-roadmap-overlay');
      if (overlay) overlay.remove();
    },

    // Show step preview modal
    previewStep: function(stepIndex) {
      this._closeRoadmap();
      this._renderStepPreviewModal(stepIndex);
    },

    _closePreviewModal: function() {
      var modal = document.getElementById('autosetup-preview-modal');
      if (modal) modal.remove();
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
      var cacheBuster = '_t=' + Date.now();
      var url = this._baseUrl + '/functions/v1/get-configuration?configId=' + encodeURIComponent(this._config.configId) + '&apiKey=' + encodeURIComponent(this._config.apiKey) + '&clientId=' + encodeURIComponent(this._clientId) + '&' + cacheBuster;
      
      console.log('[AutoSetup] Fetching configuration with clientId:', this._clientId);
      
      return fetch(url, {
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      })
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to fetch configuration');
        return response.json();
      })
      .then(function(data) {
        self._steps = data.steps || [];
        
        // Load progress from backend if available, otherwise use localStorage
        if (data.progress && Object.keys(data.progress).length > 0) {
          console.log('[AutoSetup] Loading progress from backend:', Object.keys(data.progress).length, 'entries');
          for (var stepId in data.progress) {
            var p = data.progress[stepId];
            self._progress[stepId] = {
              status: p.status,
              completedAt: p.completed_at || undefined,
              skippedAt: p.skipped_at || undefined
            };
          }
          // Save to localStorage as backup
          self._saveProgressLocal();
        }
        
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

    _buildStepperHtml: function() {
      var html = '<div class="autosetup-stepper">';
      var maxDotsToShow = Math.min(this._steps.length, 7);
      var startIndex = 0;
      var endIndex = this._steps.length;
      
      // If too many steps, show a window around current step
      if (this._steps.length > maxDotsToShow) {
        var halfWindow = Math.floor(maxDotsToShow / 2);
        startIndex = Math.max(0, this._currentStepIndex - halfWindow);
        endIndex = Math.min(this._steps.length, startIndex + maxDotsToShow);
        
        // Adjust if we're near the end
        if (endIndex - startIndex < maxDotsToShow) {
          startIndex = Math.max(0, endIndex - maxDotsToShow);
        }
      }
      
      for (var i = startIndex; i < endIndex; i++) {
        var step = this._steps[i];
        var stepProgress = this._progress[step.id];
        var status = 'pending';
        
        if (stepProgress) {
          status = stepProgress.status;
        }
        if (i === this._currentStepIndex && status === 'pending') {
          status = 'current';
        }
        
        // Determine icon
        var icon = '';
        if (status === 'completed') {
          icon = '✓';
        } else if (status === 'skipped') {
          icon = '⏭';
        } else {
          icon = (i + 1);
        }
        
        // Connector line (before dot, except first)
        if (i > startIndex) {
          var lineStatus = '';
          var prevProgress = this._progress[this._steps[i - 1].id];
          if (prevProgress && prevProgress.status === 'completed') {
            lineStatus = 'completed';
          } else if (prevProgress && prevProgress.status === 'skipped') {
            lineStatus = 'skipped';
          }
          html += '<div class="autosetup-stepper-line ' + lineStatus + '"></div>';
        }
        
        // Dot with hover preview
        html += '<div class="autosetup-stepper-item">' +
          '<div class="autosetup-stepper-dot ' + status + '" onclick="AutoSetup.navigateToStep(' + i + ')" title="' + this._escapeHtml(step.title) + '">' +
            icon +
            '<div class="autosetup-stepper-preview">' + this._escapeHtml(step.title) + '</div>' +
          '</div>' +
        '</div>';
      }
      
      html += '</div>';
      return html;
    },

    _loadProgress: function() {
      try {
        var saved = localStorage.getItem('autosetup_progress_' + this._config.configId);
        if (saved) this._progress = JSON.parse(saved);
      } catch (e) { this._progress = {}; }
    },

    _saveProgressLocal: function() {
      try {
        localStorage.setItem('autosetup_progress_' + this._config.configId, JSON.stringify(this._progress));
      } catch (e) { console.error('[AutoSetup] Failed to save progress locally:', e); }
    },

    _saveProgress: function() {
      var self = this;
      
      // Save to localStorage immediately
      this._saveProgressLocal();
      
      // Debounce backend save
      if (this._saveProgressDebounce) {
        clearTimeout(this._saveProgressDebounce);
      }
      
      this._saveProgressDebounce = setTimeout(function() {
        self._saveProgressToBackend();
      }, 500);
    },

    _saveProgressToBackend: function() {
      var self = this;
      
      // Save each step's progress to backend
      for (var stepId in this._progress) {
        var p = this._progress[stepId];
        
        var payload = {
          client_id: this._clientId,
          configuration_id: this._config.configId,
          step_id: stepId,
          status: p.status,
          api_key: this._config.apiKey
        };
        
        if (p.completedAt) payload.completed_at = p.completedAt;
        if (p.skippedAt) payload.skipped_at = p.skippedAt;
        
        fetch(this._baseUrl + '/functions/v1/save-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function(res) {
          if (!res.ok) {
            console.warn('[AutoSetup] Failed to save progress to backend');
          }
        }).catch(function(err) {
          console.warn('[AutoSetup] Error saving progress to backend:', err);
        });
      }
    },

    _getOrCreateClientId: function() {
      var storageKey = 'autosetup_client_id';
      var existingId = null;
      
      try {
        existingId = localStorage.getItem(storageKey);
      } catch (e) {}
      
      if (existingId) return existingId;
      
      // Generate UUID v4
      var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      
      try {
        localStorage.setItem(storageKey, uuid);
      } catch (e) {}
      
      return uuid;
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
        
        /* Mini floating bar for tooltip mode - doesn't block page elements */
        .autosetup-minibar { position: fixed; top: 12px; right: 12px; z-index: 2147483647; background: linear-gradient(135deg, var(--autosetup-primary) 0%, var(--autosetup-secondary) 100%); color: white; padding: 8px 14px; border-radius: 24px; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 20px rgba(var(--autosetup-primary-rgb),0.35); animation: autosetup-minibar-appear 0.3s ease-out; }
        .autosetup-minibar:hover { box-shadow: 0 6px 24px rgba(var(--autosetup-primary-rgb),0.45); }
        @keyframes autosetup-minibar-appear { from { opacity: 0; transform: translateY(-10px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .autosetup-minibar .step-badge { background: rgba(255,255,255,0.25); padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .autosetup-minibar .step-title { font-size: 13px; font-weight: 500; max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .autosetup-minibar-btn { background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .autosetup-minibar-btn:hover { background: rgba(255,255,255,0.35); transform: scale(1.1); }
        .autosetup-minibar-btn svg { width: 14px; height: 14px; }
        .autosetup-highlight { position: fixed; pointer-events: none; border: 3px solid var(--autosetup-highlight, #ff9f0d); border-radius: 8px; z-index: 2147483646; transition: all 0.3s ease; }
        .autosetup-highlight-pulse { animation: autosetup-pulse 2s infinite; }
        .autosetup-highlight-glow { box-shadow: 0 0 20px rgba(255,159,13,0.6); animation: autosetup-glow 1.5s ease-in-out infinite; }
        .autosetup-highlight-border { animation: autosetup-border 1s ease-in-out infinite; }
        .autosetup-highlight-shake { animation: autosetup-shake 0.6s ease-in-out infinite; }
        .autosetup-highlight-bounce { animation: autosetup-bounce 0.8s ease-in-out infinite; }
        .autosetup-highlight-fade { animation: autosetup-fade 2s ease-in-out infinite; }
        @keyframes autosetup-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.02); } }
        @keyframes autosetup-glow { 0%, 100% { box-shadow: 0 0 10px rgba(255,159,13,0.4); } 50% { box-shadow: 0 0 30px rgba(255,159,13,0.8); } }
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
        .autosetup-tooltip-arrow.arrow-left { left: -6px; top: 50%; margin-top: -6px; box-shadow: -2px 2px 4px rgba(0,0,0,0.05); }
        .autosetup-tooltip-arrow.arrow-right { right: -6px; top: 50%; margin-top: -6px; box-shadow: 2px -2px 4px rgba(0,0,0,0.05); }
        .autosetup-tooltip-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .autosetup-tooltip-step { background: linear-gradient(135deg, var(--autosetup-primary) 0%, var(--autosetup-secondary) 100%); color: white; font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 4px; }
        .autosetup-tooltip-title { font-weight: 600; font-size: 15px; flex: 1; }
        .autosetup-tooltip-desc { font-size: 13px; opacity: 0.8; margin-bottom: 16px; line-height: 1.5; }
        .autosetup-tooltip-image { width: 100%; border-radius: 8px; margin-bottom: 12px; max-height: 150px; object-fit: cover; }
        .autosetup-tooltip-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .autosetup-tooltip-actions .autosetup-btn { padding: 8px 14px; font-size: 12px; }
        
        /* Modern Compact Topbar with Stepper */
        .autosetup-topbar-compact { position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647; background: linear-gradient(135deg, var(--autosetup-primary) 0%, var(--autosetup-secondary) 100%); color: white; padding: 0; display: flex; align-items: center; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
        .autosetup-topbar-left { display: flex; align-items: center; gap: 12px; padding: 10px 16px; }
        .autosetup-topbar-center { flex: 1; display: flex; align-items: center; justify-content: center; padding: 10px 0; }
        .autosetup-topbar-right { display: flex; align-items: center; gap: 8px; padding: 10px 16px; }
        
        /* Stepper styles */
        .autosetup-stepper { display: flex; align-items: center; gap: 0; }
        .autosetup-stepper-item { display: flex; align-items: center; position: relative; }
        .autosetup-stepper-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; border: 2px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); position: relative; }
        .autosetup-stepper-dot:hover { transform: scale(1.1); border-color: rgba(255,255,255,0.6); }
        .autosetup-stepper-dot.completed { background: #10b981; border-color: #10b981; color: white; }
        .autosetup-stepper-dot.skipped { background: #6b7280; border-color: #6b7280; color: white; }
        .autosetup-stepper-dot.current { background: white; border-color: white; color: var(--autosetup-primary); box-shadow: 0 0 0 4px rgba(255,255,255,0.3); animation: autosetup-current-pulse 2s infinite; }
        .autosetup-stepper-dot.pending { background: transparent; border-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.5); }
        .autosetup-stepper-line { width: 20px; height: 2px; background: rgba(255,255,255,0.2); margin: 0 2px; }
        .autosetup-stepper-line.completed { background: #10b981; }
        .autosetup-stepper-line.skipped { background: #6b7280; }
        @keyframes autosetup-current-pulse { 0%, 100% { box-shadow: 0 0 0 4px rgba(255,255,255,0.3); } 50% { box-shadow: 0 0 0 8px rgba(255,255,255,0.15); } }
        
        /* Stepper tooltip on hover */
        .autosetup-stepper-preview { position: absolute; top: 40px; left: 50%; transform: translateX(-50%); background: white; color: #1f2937; padding: 8px 12px; border-radius: 8px; font-size: 12px; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.15); opacity: 0; visibility: hidden; transition: all 0.2s; z-index: 10; }
        .autosetup-stepper-preview::before { content: ''; position: absolute; top: -6px; left: 50%; transform: translateX(-50%); border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 6px solid white; }
        .autosetup-stepper-dot:hover .autosetup-stepper-preview { opacity: 1; visibility: visible; }
        
        /* Current step info */
        .autosetup-current-step-info { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 20px; font-size: 12px; max-width: 250px; }
        .autosetup-current-step-info .step-badge { background: white; color: var(--autosetup-primary); padding: 2px 8px; border-radius: 10px; font-weight: 600; font-size: 11px; }
        .autosetup-current-step-info .step-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
        
        /* Roadmap button */
        .autosetup-roadmap-btn-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.15); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .autosetup-roadmap-btn-icon:hover { background: rgba(255,255,255,0.25); }
        .autosetup-roadmap-btn-icon svg { width: 16px; height: 16px; }
        
        /* Close button */
        .autosetup-close-btn { width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.15); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all 0.2s; }
        .autosetup-close-btn:hover { background: rgba(255,255,255,0.3); }
        
        /* Client ID badge */
        .autosetup-client-badge { font-size: 10px; opacity: 0.7; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; }
        
        /* Roadmap styles */
        .autosetup-roadmap-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2147483648; }
        .autosetup-roadmap { position: fixed; top: 60px; left: 20px; z-index: 2147483649; background: var(--autosetup-bg); border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.25); max-width: 400px; width: calc(100% - 40px); max-height: calc(100vh - 100px); display: flex; flex-direction: column; color: var(--autosetup-text); }
        .autosetup-roadmap-header { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid #e5e7eb; }
        .autosetup-roadmap-header h3 { margin: 0; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .autosetup-roadmap-body { flex: 1; overflow-y: auto; padding: 12px; }
        .autosetup-roadmap-step { display: flex; gap: 12px; padding: 12px; border-radius: 8px; margin-bottom: 4px; position: relative; }
        .autosetup-roadmap-step.current { background: rgba(var(--autosetup-primary-rgb), 0.1); border-left: 3px solid var(--autosetup-primary); }
        .autosetup-roadmap-step.completed { opacity: 0.7; }
        .autosetup-roadmap-step.pending { opacity: 0.6; }
        .autosetup-roadmap-step.skipped { opacity: 0.5; }
        .autosetup-roadmap-icon { flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
        .autosetup-roadmap-icon.completed { background: #10b981; color: white; }
        .autosetup-roadmap-icon.skipped { background: #9ca3af; color: white; }
        .autosetup-roadmap-icon.current { background: var(--autosetup-primary); color: white; box-shadow: 0 0 0 3px rgba(var(--autosetup-primary-rgb), 0.3); }
        .autosetup-roadmap-icon.pending { background: #e5e7eb; color: #6b7280; }
        .autosetup-roadmap-content { flex: 1; min-width: 0; }
        .autosetup-roadmap-title { font-weight: 500; font-size: 14px; margin-bottom: 2px; display: flex; align-items: center; gap: 6px; }
        .autosetup-roadmap-title .badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #f3f4f6; color: #6b7280; }
        .autosetup-roadmap-desc { font-size: 12px; color: #6b7280; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .autosetup-roadmap-actions-summary { font-size: 11px; color: #9ca3af; display: flex; align-items: center; gap: 4px; }
        .autosetup-roadmap-btn { flex-shrink: 0; }
        .autosetup-roadmap-btn button { padding: 4px 10px; font-size: 11px; border-radius: 4px; cursor: pointer; border: 1px solid #e5e7eb; background: white; color: #374151; transition: all 0.2s; }
        .autosetup-roadmap-btn button:hover { background: #f3f4f6; border-color: #d1d5db; }
        .autosetup-roadmap-connector { position: absolute; left: 25px; top: 40px; width: 2px; height: calc(100% - 20px); background: #e5e7eb; }
        .autosetup-roadmap-connector.completed { background: #10b981; }
        .autosetup-roadmap-footer { padding: 12px 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; }
        
        /* Preview Modal styles */
        .autosetup-preview-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2147483650; backdrop-filter: blur(4px); }
        .autosetup-preview-content { background: var(--autosetup-bg); border-radius: 16px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; color: var(--autosetup-text); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
        .autosetup-preview-header { padding: 20px; border-bottom: 1px solid #e5e7eb; }
        .autosetup-preview-header .meta { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #6b7280; margin-bottom: 8px; }
        .autosetup-preview-header h3 { margin: 0; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
        .autosetup-preview-header p { margin: 8px 0 0; font-size: 14px; color: #6b7280; line-height: 1.5; }
        .autosetup-preview-body { padding: 20px; }
        .autosetup-preview-section { margin-bottom: 16px; }
        .autosetup-preview-section h4 { font-size: 13px; font-weight: 600; margin: 0 0 8px; display: flex; align-items: center; gap: 6px; }
        .autosetup-preview-actions-list { list-style: none; padding: 0; margin: 0; }
        .autosetup-preview-actions-list li { display: flex; align-items: center; gap: 8px; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
        .autosetup-preview-actions-list li:last-child { border-bottom: none; }
        .autosetup-preview-actions-list .num { width: 20px; height: 20px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; color: #6b7280; }
        .autosetup-preview-prereqs { background: #f0fdf4; border-radius: 8px; padding: 12px; }
        .autosetup-preview-prereqs.pending { background: #fef3c7; }
        .autosetup-preview-prereq-item { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 4px 0; }
        .autosetup-preview-prereq-item.completed { color: #10b981; }
        .autosetup-preview-prereq-item.skipped { color: #9ca3af; }
        .autosetup-preview-prereq-item.pending { color: #f59e0b; }
        .autosetup-preview-footer { padding: 16px 20px; border-top: 1px solid #e5e7eb; display: flex; gap: 12px; justify-content: flex-end; }
        
        /* Navigation Modal styles */
        .autosetup-navigation-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2147483651; backdrop-filter: blur(4px); }
        .autosetup-navigation-content { background: var(--autosetup-bg); border-radius: 16px; max-width: 480px; width: 90%; color: var(--autosetup-text); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; }
        .autosetup-navigation-header { padding: 20px; border-bottom: 1px solid #e5e7eb; }
        .autosetup-navigation-header h3 { margin: 0 0 8px; font-size: 18px; font-weight: 600; }
        .autosetup-navigation-header p { margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5; }
        .autosetup-navigation-header strong { color: var(--autosetup-text); }
        .autosetup-navigation-body { padding: 16px 20px; }
        .autosetup-navigation-pending-list { display: flex; flex-direction: column; gap: 8px; }
        .autosetup-navigation-pending-item { padding: 10px 12px; background: #f3f4f6; border-radius: 8px; font-size: 13px; display: flex; align-items: center; gap: 10px; border-left: 3px solid var(--autosetup-primary); }
        .autosetup-navigation-pending-icon { font-size: 16px; flex-shrink: 0; }
        .autosetup-navigation-pending-text { color: #374151; }
        .autosetup-navigation-question { padding: 0 20px 16px; font-size: 14px; font-weight: 500; color: #374151; }
        .autosetup-navigation-footer { padding: 16px 20px; border-top: 1px solid #e5e7eb; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
        .autosetup-navigation-footer .autosetup-btn { font-size: 13px; }
      \`;
    },

    _createContainer: function() {
      // Reuse existing container if present
      var existing = document.getElementById('autosetup-widget');
      if (existing) {
        console.log('[AutoSetup] Reusing existing container');
        this._container = existing;
        return;
      }
      
      // Ensure body exists
      if (!document.body) {
        console.warn('[AutoSetup] document.body not available, will retry');
        var self = this;
        setTimeout(function() { self._createContainer(); }, 50);
        return;
      }
      
      this._container = document.createElement('div');
      this._container.className = 'autosetup-container';
      this._container.id = 'autosetup-widget';
      document.body.appendChild(this._container);
      console.log('[AutoSetup] Container created and appended to body');
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
      
      var showNextBtn = step.show_next_button !== false;
      
      this._container.innerHTML = '<div class="autosetup-modal-overlay">' +
        '<div class="autosetup-modal" style="' + modalStyle + '">' +
          (step.image_url ? '<img src="' + step.image_url + '" class="autosetup-modal-image" alt=""/>' : '') +
          '<h3>' + this._escapeHtml(step.title) + '</h3>' +
          '<p>' + this._escapeHtml(step.description || '') + '</p>' +
          '<div class="autosetup-modal-progress">Passo ' + (this._currentStepIndex + 1) + ' de ' + progress.total + '</div>' +
          '<div class="autosetup-modal-actions">' +
            (!step.is_required ? '<button class="autosetup-btn autosetup-btn-modal-secondary" onclick="AutoSetup.skipStep()">Pular</button>' : '') +
            (showNextBtn ? '<button class="autosetup-btn autosetup-btn-modal-primary" style="' + buttonStyle + '" onclick="AutoSetup.completeStep()">' + buttonText + '</button>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
    },

    _renderTooltipMode: function(step) {
      var self = this;
      var progress = this.getProgress();
      
      // Use mini floating bar instead of full topbar to avoid blocking page elements
      this._container.innerHTML = '<div class="autosetup-minibar">' +
        '<span class="step-badge">' + (this._currentStepIndex + 1) + '/' + progress.total + '</span>' +
        '<span class="step-title">' + this._escapeHtml(step.title) + '</span>' +
        '<button class="autosetup-minibar-btn" onclick="AutoSetup.toggleRoadmap()" title="Ver todos os passos">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>' +
        '</button>' +
        '<button class="autosetup-minibar-btn" onclick="AutoSetup.pause()" title="Minimizar">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
        '</button>' +
      '</div>';
      
      // Render tooltip near element
      if (step.target_selector) {
        // Get step theme for highlight
        var stepTheme = this._getStepTheme(step);
        
        setTimeout(function() {
          self._renderTooltip(step);
          // Use step-specific animation and color if overridden
          var animation = stepTheme.isOverride ? stepTheme.animation : null;
          var color = stepTheme.isOverride ? stepTheme.primaryColor : null;
          self._highlightElement(step.target_selector, animation, color);
          
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
      
      // Log tooltip position for debugging
      console.log('[AutoSetup] Rendering tooltip for step:', step.title, '| Position from DB:', step.tooltip_position);
      
      // Scroll element into view first
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      var self = this;
      
      // Get step theme (with override support)
      var stepTheme = this._getStepTheme(step);
      
      // Small delay to allow scroll to complete
      setTimeout(function() {
        var rect = el.getBoundingClientRect();
        console.log('[AutoSetup] Element rect:', rect, '| Preferred position:', step.tooltip_position);
        var position = self._calculateTooltipPosition(rect, step.tooltip_position);
        console.log('[AutoSetup] Calculated position:', position);
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
        
        var showNextBtn = step.show_next_button !== false;
        
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
            (showNextBtn ? '<button class="autosetup-btn autosetup-btn-modal-primary" style="' + buttonStyle + '" onclick="AutoSetup.completeStep()">' + buttonText + '</button>' : '') +
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

    _calculateTooltipPosition: function(rect, preferredPosition) {
      var viewportWidth = window.innerWidth;
      var viewportHeight = window.innerHeight;
      var tooltipWidth = 320;
      var tooltipHeight = 200; // slightly larger estimate
      var gap = 16;
      
      console.log('[AutoSetup] _calculateTooltipPosition called with preferredPosition:', preferredPosition);
      
      var position = preferredPosition || 'auto';
      var left, top;
      var arrowPosition = 'top';
      var arrowOffset = null; // For custom arrow positioning when clamped
      
      // Helper to check if position fits
      var fitsBottom = function() { return rect.bottom + tooltipHeight + gap < viewportHeight; };
      var fitsTop = function() { return rect.top - tooltipHeight - gap > 0; };
      var fitsRight = function() { return rect.right + tooltipWidth + gap < viewportWidth; };
      var fitsLeft = function() { return rect.left - tooltipWidth - gap > 0; };
      
      // Calculate position based on preference
      if (position === 'left') {
        // Position to the left of element, vertically centered
        left = rect.left - tooltipWidth - gap;
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        arrowPosition = 'right'; // Arrow points RIGHT toward the element
        
        // If doesn't fit left, try fallback
        if (!fitsLeft()) {
          console.log('[AutoSetup] Left doesnt fit, trying right. rect.left:', rect.left, 'needed:', tooltipWidth + gap);
          if (fitsRight()) {
            left = rect.right + gap;
            arrowPosition = 'left'; // Arrow points LEFT toward the element
            position = 'right';
          } else if (fitsBottom()) {
            top = rect.bottom + gap;
            left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            arrowPosition = 'top'; // Arrow points UP toward the element
            position = 'bottom';
          } else {
            top = rect.top - tooltipHeight - gap;
            left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            arrowPosition = 'bottom'; // Arrow points DOWN toward the element
            position = 'top';
          }
        }
      } else if (position === 'right') {
        left = rect.right + gap;
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        arrowPosition = 'left'; // Arrow points LEFT toward the element
        
        if (!fitsRight()) {
          console.log('[AutoSetup] Right doesnt fit, trying left');
          if (fitsLeft()) {
            left = rect.left - tooltipWidth - gap;
            arrowPosition = 'right'; // Arrow points RIGHT toward the element
            position = 'left';
          } else if (fitsBottom()) {
            top = rect.bottom + gap;
            left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            arrowPosition = 'top'; // Arrow points UP toward the element
            position = 'bottom';
          } else {
            top = rect.top - tooltipHeight - gap;
            left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            arrowPosition = 'bottom'; // Arrow points DOWN toward the element
            position = 'top';
          }
        }
      } else if (position === 'top') {
        top = rect.top - tooltipHeight - gap;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        arrowPosition = 'bottom'; // Arrow points DOWN toward the element
        
        if (!fitsTop()) {
          console.log('[AutoSetup] Top doesnt fit, trying bottom');
          if (fitsBottom()) {
            top = rect.bottom + gap;
            arrowPosition = 'top'; // Arrow points UP toward the element
            position = 'bottom';
          }
        }
      } else if (position === 'bottom') {
        top = rect.bottom + gap;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        arrowPosition = 'top'; // Arrow points UP toward the element
        
        if (!fitsBottom()) {
          console.log('[AutoSetup] Bottom doesnt fit, trying top');
          if (fitsTop()) {
            top = rect.top - tooltipHeight - gap;
            arrowPosition = 'bottom'; // Arrow points DOWN toward the element
            position = 'top';
          }
        }
      } else {
        // Auto mode: choose best position based on available space
        if (fitsBottom()) {
          position = 'bottom';
          top = rect.bottom + gap;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          arrowPosition = 'top'; // Arrow points UP toward the element
        } else if (fitsTop()) {
          position = 'top';
          top = rect.top - tooltipHeight - gap;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          arrowPosition = 'bottom'; // Arrow points DOWN toward the element
        } else if (fitsRight()) {
          position = 'right';
          left = rect.right + gap;
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          arrowPosition = 'left'; // Arrow points LEFT toward the element
        } else if (fitsLeft()) {
          position = 'left';
          left = rect.left - tooltipWidth - gap;
          top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
          arrowPosition = 'right'; // Arrow points RIGHT toward the element
        } else {
          // Fallback: place below even if it might overflow
          position = 'bottom';
          top = rect.bottom + gap;
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          arrowPosition = 'top'; // Arrow points UP toward the element
        }
      }
      
      // Calculate arrow offset before clamping (for accurate arrow pointing)
      var originalTop = top;
      var originalLeft = left;
      
      // Clamp to viewport
      left = Math.max(10, Math.min(left, viewportWidth - tooltipWidth - 10));
      top = Math.max(10, Math.min(top, viewportHeight - tooltipHeight - 10));
      
      // Calculate arrow offset if tooltip was clamped (for horizontal positions)
      if (arrowPosition === 'left' || arrowPosition === 'right') {
        var verticalShift = top - originalTop;
        if (Math.abs(verticalShift) > 5) {
          // Calculate where arrow should point (element center relative to tooltip)
          var elementCenterY = rect.top + rect.height / 2;
          var tooltipTop = top;
          arrowOffset = Math.max(20, Math.min(tooltipHeight - 20, elementCenterY - tooltipTop));
        }
      } else if (arrowPosition === 'top' || arrowPosition === 'bottom') {
        var horizontalShift = left - originalLeft;
        if (Math.abs(horizontalShift) > 5) {
          // Calculate where arrow should point
          var elementCenterX = rect.left + rect.width / 2;
          var tooltipLeft = left;
          arrowOffset = Math.max(20, Math.min(tooltipWidth - 20, elementCenterX - tooltipLeft));
        }
      }
      
      console.log('[AutoSetup] Final position:', position, '| Arrow:', arrowPosition, '| left:', left, '| top:', top);
      
      return {
        position: position,
        arrowPosition: arrowPosition,
        arrowOffset: arrowOffset,
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

      // Highlight target element if exists (with step theme)
      if (step.target_selector) {
        setTimeout(function() { 
          var stepTheme = self._getStepTheme(step);
          var animation = stepTheme.isOverride ? stepTheme.animation : null;
          var color = stepTheme.isOverride ? stepTheme.primaryColor : null;
          self._highlightElement(step.target_selector, animation, color); 
        }, 100);
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

    _renderRoadmapOverlay: function() {
      var existing = document.getElementById('autosetup-roadmap-overlay');
      if (existing) existing.remove();
      
      if (!this._isRoadmapOpen) return;
      
      var self = this;
      var overlay = document.createElement('div');
      overlay.id = 'autosetup-roadmap-overlay';
      overlay.className = 'autosetup-roadmap-overlay';
      overlay.onclick = function(e) { if (e.target === overlay) self._closeRoadmap(); };
      
      var roadmap = document.createElement('div');
      roadmap.className = 'autosetup-roadmap';
      
      var completedCount = 0;
      for (var key in this._progress) {
        if (this._progress[key].status === 'completed') completedCount++;
      }
      
      var stepsHtml = '';
      for (var i = 0; i < this._steps.length; i++) {
        var step = this._steps[i];
        var stepProgress = this._progress[step.id];
        var status = stepProgress ? stepProgress.status : 'pending';
        if (i === this._currentStepIndex && status === 'pending') status = 'current';
        
        var iconContent = status === 'completed' ? '✓' : status === 'skipped' ? '⏭' : (i + 1);
        var actionBtn = status === 'completed' || status === 'skipped' 
          ? '<button onclick="AutoSetup.resetFromStep(' + i + ')">Refazer</button>'
          : status === 'current' 
            ? '<button onclick="AutoSetup._closeRoadmap()">Continuar</button>'
            : '<button onclick="AutoSetup.previewStep(' + i + ')">Pré-ver</button>';
        
        var connector = i < this._steps.length - 1 
          ? '<div class="autosetup-roadmap-connector ' + (status === 'completed' ? 'completed' : '') + '"></div>' 
          : '';
        
        stepsHtml += '<div class="autosetup-roadmap-step ' + status + '">' +
          connector +
          '<div class="autosetup-roadmap-icon ' + status + '">' + iconContent + '</div>' +
          '<div class="autosetup-roadmap-content">' +
            '<div class="autosetup-roadmap-title">' + this._escapeHtml(step.title) + 
              (!step.is_required ? '<span class="badge">Opcional</span>' : '') + 
            '</div>' +
            (step.description ? '<div class="autosetup-roadmap-desc">' + this._escapeHtml(step.description) + '</div>' : '') +
          '</div>' +
          '<div class="autosetup-roadmap-btn">' + actionBtn + '</div>' +
        '</div>';
      }
      
      roadmap.innerHTML = 
        '<div class="autosetup-roadmap-header">' +
          '<h3>📋 Roadmap do Onboarding</h3>' +
          '<button class="autosetup-btn autosetup-btn-modal-secondary" style="padding:6px 12px;font-size:12px" onclick="AutoSetup.resetProgress()">↺ Reiniciar</button>' +
        '</div>' +
        '<div class="autosetup-roadmap-body">' + stepsHtml + '</div>' +
        '<div class="autosetup-roadmap-footer">' + completedCount + ' de ' + this._steps.length + ' passos concluídos</div>';
      
      overlay.appendChild(roadmap);
      document.body.appendChild(overlay);
    },

    _renderStepPreviewModal: function(stepIndex) {
      var step = this._steps[stepIndex];
      if (!step) return;
      
      var self = this;
      var modal = document.createElement('div');
      modal.id = 'autosetup-preview-modal';
      modal.className = 'autosetup-preview-modal';
      modal.onclick = function(e) { if (e.target === modal) self._closePreviewModal(); };
      
      var prereqsHtml = '';
      if (stepIndex > 0) {
        prereqsHtml = '<div class="autosetup-preview-section"><h4>🔗 Passos anteriores:</h4><div class="autosetup-preview-prereqs">';
        for (var i = 0; i < stepIndex; i++) {
          var prev = this._steps[i];
          var prevProgress = this._progress[prev.id];
          var prevStatus = prevProgress ? prevProgress.status : 'pending';
          var icon = prevStatus === 'completed' ? '✓' : prevStatus === 'skipped' ? '⏭' : '⏳';
          prereqsHtml += '<div class="autosetup-preview-prereq-item ' + prevStatus + '">' + icon + ' ' + this._escapeHtml(prev.title) + '</div>';
        }
        prereqsHtml += '</div></div>';
      }
      
      var actionsHtml = '';
      if (step.actions && step.actions.length > 0) {
        actionsHtml = '<div class="autosetup-preview-section"><h4>📋 O que você vai fazer:</h4><ol class="autosetup-preview-actions-list">';
        for (var j = 0; j < step.actions.length; j++) {
          var action = step.actions[j];
          var actionLabel = {click:'Clicar',input:'Preencher',scroll:'Rolar',wait:'Aguardar',highlight:'Destacar',open_modal:'Abrir'}[action.action_type] || action.action_type;
          actionsHtml += '<li><span class="num">' + (j+1) + '</span>' + actionLabel + '</li>';
        }
        actionsHtml += '</ol></div>';
      }
      
      modal.innerHTML = 
        '<div class="autosetup-preview-content">' +
          '<div class="autosetup-preview-header">' +
            '<div class="meta">👁️ Pré-visualização: Passo ' + (stepIndex + 1) + ' de ' + this._steps.length + '</div>' +
            '<h3>📌 ' + this._escapeHtml(step.title) + '</h3>' +
            (step.description ? '<p>' + this._escapeHtml(step.description) + '</p>' : '') +
          '</div>' +
          '<div class="autosetup-preview-body">' +
            (step.image_url ? '<img src="' + step.image_url + '" style="width:100%;border-radius:8px;margin-bottom:16px"/>' : '') +
            actionsHtml +
            prereqsHtml +
          '</div>' +
          '<div class="autosetup-preview-footer">' +
            '<button class="autosetup-btn autosetup-btn-modal-secondary" onclick="AutoSetup._closePreviewModal()">Fechar</button>' +
            '<button class="autosetup-btn autosetup-btn-modal-primary" onclick="AutoSetup._closePreviewModal();AutoSetup.navigateToStep(' + stepIndex + ')">Ir para este passo →</button>' +
          '</div>' +
        '</div>';
      
      document.body.appendChild(modal);
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
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  });
});
