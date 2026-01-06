import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { Loader2, AlertCircle, RefreshCw, ExternalLink, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SelectedElement, TourStep } from '@/types/visualBuilder';
import { ScannedElement } from './ElementsPanel';

interface IframeContainerProps {
  proxyUrl: string;
  isSelectionMode: boolean;
  onElementSelected: (element: SelectedElement) => void;
  onIframeReady: () => void;
  highlightSelector?: string;
  isPreviewMode?: boolean;
  previewStep?: TourStep | null;
  onPreviewAction?: (action: 'next' | 'skip') => void;
  onElementsScanned?: (elements: ScannedElement[]) => void;
}

export interface IframeContainerRef {
  scanElements: () => void;
}

type LoadingState = 'connecting' | 'loading' | 'waiting_script' | 'ready' | 'error';

export const IframeContainer = forwardRef<IframeContainerRef, IframeContainerProps>(({
  proxyUrl,
  isSelectionMode,
  onElementSelected,
  onIframeReady,
  highlightSelector,
  isPreviewMode = false,
  previewStep,
  onPreviewAction,
  onElementsScanned,
}, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isReadyRef = useRef(false);
  const [loadingState, setLoadingState] = useState<LoadingState>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addDebugLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[IframeContainer] ${message}`);
    setDebugInfo(prev => [...prev.slice(-19), `${timestamp}: ${message}`]);
  }, []);

  const sendMessage = useCallback((message: object) => {
    if (iframeRef.current?.contentWindow && isReadyRef.current) {
      addDebugLog(`Sending: ${JSON.stringify(message).slice(0, 100)}`);
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  }, [addDebugLog]);

  const scanElements = useCallback(() => {
    addDebugLog('Triggering element scan');
    sendMessage({ type: 'SCAN_ELEMENTS' });
  }, [sendMessage, addDebugLog]);

  // Expose scanElements to parent
  useImperativeHandle(ref, () => ({
    scanElements,
  }), [scanElements]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data?.type) return;
      
      addDebugLog(`Received: ${event.data.type}`);
      
      if (event.data.type === 'IFRAME_READY') {
        isReadyRef.current = true;
        setLoadingState('ready');
        setErrorMessage(null);
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        if (scriptTimeoutRef.current) clearTimeout(scriptTimeoutRef.current);
        
        if (event.data.error) {
          addDebugLog(`Script error: ${event.data.error}`);
        }
        
        onIframeReady();
        // Auto-scan elements when iframe is ready
        setTimeout(() => scanElements(), 500);
      } else if (event.data.type === 'ELEMENT_SELECTED') {
        onElementSelected(event.data.data as SelectedElement);
      } else if (event.data.type === 'PREVIEW_ACTION') {
        onPreviewAction?.(event.data.action as 'next' | 'skip');
      } else if (event.data.type === 'ELEMENTS_SCANNED') {
        addDebugLog(`Scanned ${event.data.elements?.length || 0} elements`);
        onElementsScanned?.(event.data.elements as ScannedElement[]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onElementSelected, onIframeReady, onPreviewAction, onElementsScanned, scanElements, addDebugLog]);

  useEffect(() => {
    sendMessage({ type: 'SET_SELECTION_MODE', enabled: isSelectionMode });
  }, [isSelectionMode, sendMessage]);

  useEffect(() => {
    sendMessage({ type: 'SET_PREVIEW_MODE', enabled: isPreviewMode });
  }, [isPreviewMode, sendMessage]);

  useEffect(() => {
    if (!isPreviewMode || !previewStep) {
      sendMessage({ type: 'HIDE_ALL' });
      return;
    }

    const { type, selector, config } = previewStep;

    switch (type) {
      case 'tooltip':
        sendMessage({
          type: 'SHOW_TOOLTIP',
          config: {
            selector,
            title: config.title,
            description: config.description,
            position: config.position,
            buttonText: config.buttonText || 'Next',
            showSkip: config.showSkip,
            skipButtonText: config.skipButtonText,
            imageUrl: config.imageUrl,
          },
        });
        break;
      case 'modal':
        sendMessage({
          type: 'SHOW_MODAL',
          config: {
            title: config.title,
            description: config.description,
            buttonText: config.buttonText || 'Next',
            showSkip: config.showSkip,
            skipButtonText: config.skipButtonText,
            imageUrl: config.imageUrl,
          },
        });
        break;
      case 'highlight':
      case 'click':
      case 'input':
        sendMessage({
          type: 'SHOW_HIGHLIGHT',
          config: {
            selector,
            animation: config.highlightAnimation || 'pulse',
            color: config.highlightColor,
          },
        });
        break;
      case 'wait':
        break;
    }
  }, [isPreviewMode, previewStep, sendMessage]);

  useEffect(() => {
    if (highlightSelector && !isPreviewMode) {
      sendMessage({ type: 'HIGHLIGHT_ELEMENT', selector: highlightSelector });
    } else if (!isPreviewMode) {
      sendMessage({ type: 'CLEAR_HIGHLIGHT' });
    }
  }, [highlightSelector, isPreviewMode, sendMessage]);

  // Reset state when URL changes
  useEffect(() => {
    if (proxyUrl) {
      addDebugLog(`Loading URL: ${proxyUrl.slice(0, 80)}...`);
      setLoadingState('connecting');
      setErrorMessage(null);
      setDebugInfo([]);
      isReadyRef.current = false;

      // Set a timeout for initial load
      loadTimeoutRef.current = setTimeout(() => {
        if (!isReadyRef.current && loadingState !== 'error') {
          addDebugLog('Load timeout reached');
          setLoadingState('error');
          setErrorMessage('A página demorou muito para carregar. Verifique se a URL está correta e acessível.');
        }
      }, 20000);
    }

    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      if (scriptTimeoutRef.current) clearTimeout(scriptTimeoutRef.current);
    };
  }, [proxyUrl, addDebugLog]);

  const handleIframeLoad = useCallback(() => {
    addDebugLog('Iframe onload fired');
    setLoadingState('waiting_script');
    
    // Wait for the injection script to send IFRAME_READY
    scriptTimeoutRef.current = setTimeout(() => {
      if (!isReadyRef.current) {
        addDebugLog('Script timeout - IFRAME_READY not received');
        setLoadingState('error');
        setErrorMessage('O script de comunicação não respondeu. A página pode ter políticas de segurança restritivas.');
      }
    }, 8000);
  }, [addDebugLog]);

  const handleRetry = () => {
    if (iframeRef.current) {
      addDebugLog('Retrying...');
      setLoadingState('connecting');
      setErrorMessage(null);
      setDebugInfo([]);
      isReadyRef.current = false;
      iframeRef.current.src = proxyUrl + '&t=' + Date.now();
    }
  };

  const handleIframeError = () => {
    addDebugLog('Iframe onerror fired');
    setLoadingState('error');
    setErrorMessage('Erro ao carregar a página. A página pode bloquear carregamento em iframe ou estar inacessível.');
  };

  const getTargetUrl = () => {
    try {
      const url = new URL(proxyUrl);
      return url.searchParams.get('url') || '';
    } catch {
      return '';
    }
  };

  const loadingMessages: Record<LoadingState, { title: string; subtitle: string }> = {
    connecting: { title: 'Conectando ao proxy...', subtitle: 'Iniciando conexão' },
    loading: { title: 'Carregando página...', subtitle: 'Buscando conteúdo' },
    waiting_script: { title: 'Aguardando comunicação...', subtitle: 'Inicializando script' },
    ready: { title: '', subtitle: '' },
    error: { title: '', subtitle: '' },
  };

  return (
    <div className="relative w-full h-full bg-muted/20 rounded-lg overflow-hidden border">
      {proxyUrl ? (
        <>
          {/* Loading Overlay */}
          {(loadingState === 'connecting' || loadingState === 'loading' || loadingState === 'waiting_script') && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">{loadingMessages[loadingState].title}</p>
              <p className="text-xs text-muted-foreground mt-1">{loadingMessages[loadingState].subtitle}</p>
              
              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={() => setShowDebug(!showDebug)}
              >
                <Bug className="h-4 w-4 mr-1" />
                {showDebug ? 'Ocultar Debug' : 'Mostrar Debug'}
              </Button>
              
              {showDebug && (
                <div className="mt-4 p-3 bg-muted rounded-lg max-w-md max-h-32 overflow-y-auto text-xs font-mono">
                  {debugInfo.length === 0 ? (
                    <p className="text-muted-foreground">Aguardando logs...</p>
                  ) : (
                    debugInfo.map((log, i) => <p key={i} className="text-muted-foreground">{log}</p>)
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error Overlay */}
          {loadingState === 'error' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-8">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">Erro ao carregar página</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                {errorMessage}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
                <Button variant="outline" asChild>
                  <a href={getTargetUrl()} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir em nova aba
                  </a>
                </Button>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="mt-4"
                onClick={() => setShowDebug(!showDebug)}
              >
                <Bug className="h-4 w-4 mr-1" />
                {showDebug ? 'Ocultar Debug' : 'Mostrar Debug'}
              </Button>
              
              {showDebug && (
                <div className="mt-2 p-3 bg-muted rounded-lg max-w-lg max-h-40 overflow-y-auto text-xs font-mono">
                  <p className="font-semibold mb-1">Debug Info:</p>
                  <p className="text-muted-foreground break-all">Proxy: {proxyUrl}</p>
                  <p className="text-muted-foreground">Target: {getTargetUrl()}</p>
                  <p className="font-semibold mt-2 mb-1">Logs:</p>
                  {debugInfo.map((log, i) => <p key={i} className="text-muted-foreground">{log}</p>)}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mt-4 text-center max-w-md">
                Algumas páginas bloqueiam carregamento em iframe por motivos de segurança. 
                Verifique se a URL está correta e tente acessar diretamente.
              </p>
            </div>
          )}

          <iframe
            ref={iframeRef}
            src={proxyUrl}
            className={`w-full h-full border-0 ${loadingState !== 'ready' ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title="Visual Builder Preview"
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
          <p>Configure uma URL para começar a construir seu tour</p>
        </div>
      )}
    </div>
  );
});

IframeContainer.displayName = 'IframeContainer';
