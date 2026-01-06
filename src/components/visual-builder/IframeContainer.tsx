import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from 'react';
import { Loader2, AlertCircle, RefreshCw, ExternalLink, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SelectedElement, TourStep } from '@/types/visualBuilder';
import { ScannedElement } from './ElementsPanel';

interface IframeContainerProps {
  url: string;
  mode?: 'direct' | 'proxy';
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

type LoadingState = 'loading' | 'ready' | 'error';

// Generate proxy URL for the iframe
const getProxyUrl = (targetUrl: string) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/proxy-page?url=${encodeURIComponent(targetUrl)}`;
};

export const IframeContainer = forwardRef<IframeContainerRef, IframeContainerProps>(({
  url,
  mode = 'direct',
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
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [iframeMode, setIframeMode] = useState<'direct' | 'proxy'>(mode);

  // Determine actual iframe URL based on mode
  const iframeUrl = iframeMode === 'proxy' && url ? getProxyUrl(url) : url;

  // PostMessage to iframe (for proxy mode)
  const sendToIframe = useCallback((type: string, data: Record<string, unknown> = {}) => {
    if (iframeRef.current?.contentWindow && iframeMode === 'proxy') {
      iframeRef.current.contentWindow.postMessage({ type, ...data }, '*');
    }
  }, [iframeMode]);

  // Scan elements in the iframe
  const scanElements = useCallback(() => {
    if (iframeMode === 'proxy') {
      sendToIframe('SCAN_ELEMENTS');
    } else {
      console.log('[IframeContainer] Scan not available in direct mode - use Capture button');
    }
  }, [iframeMode, sendToIframe]);

  useImperativeHandle(ref, () => ({
    scanElements,
  }), [scanElements]);

  // Listen for messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, ...data } = event.data || {};
      
      switch (type) {
        case 'IFRAME_READY':
          console.log('[IframeContainer] Iframe ready');
          setLoadingState('ready');
          onIframeReady();
          break;
          
        case 'ELEMENT_SELECTED':
          if (data.element) {
            const element: SelectedElement = {
              tagName: data.element.tagName || 'div',
              id: data.element.id || null,
              classList: data.element.classList || [],
              textContent: data.element.label || '',
              selector: data.element.selector,
              rect: data.element.rect || { top: 0, left: 0, width: 0, height: 0 },
            };
            onElementSelected(element);
          }
          break;
          
        case 'ELEMENTS_SCANNED':
          if (data.elements && onElementsScanned) {
            const scanned: ScannedElement[] = data.elements.map((el: { selector: string; label: string; tagName: string; rect: { top: number; left: number; width: number; height: number } }) => ({
              type: getElementType(el.tagName),
              selector: el.selector,
              label: el.label,
              tagName: el.tagName,
              rect: el.rect,
            }));
            onElementsScanned(scanned);
          }
          break;
          
        case 'PREVIEW_ACTION':
          if (onPreviewAction && data.action) {
            onPreviewAction(data.action as 'next' | 'skip');
          }
          break;
          
        case 'TOUR_DEBUG':
          console.log('[IframeContainer] Debug:', data.message);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onIframeReady, onElementSelected, onElementsScanned, onPreviewAction]);

  // Send selection mode to iframe
  useEffect(() => {
    if (loadingState === 'ready' && iframeMode === 'proxy') {
      sendToIframe('SET_SELECTION_MODE', { enabled: isSelectionMode });
    }
  }, [isSelectionMode, loadingState, iframeMode, sendToIframe]);

  // Send highlight selector to iframe
  useEffect(() => {
    if (loadingState === 'ready' && iframeMode === 'proxy' && highlightSelector) {
      sendToIframe('SHOW_HIGHLIGHT', { 
        config: { 
          selector: highlightSelector,
          animation: 'pulse',
          color: '#3b82f6',
        } 
      });
    }
  }, [highlightSelector, loadingState, iframeMode, sendToIframe]);

  // Send preview step to iframe
  useEffect(() => {
    if (loadingState === 'ready' && iframeMode === 'proxy' && isPreviewMode && previewStep) {
      const stepType = previewStep.type;
      
      if (stepType === 'modal') {
        sendToIframe('SHOW_MODAL', {
          config: {
            title: previewStep.config.title || 'Passo',
            description: previewStep.config.description || '',
            imageUrl: previewStep.config.imageUrl,
            buttonText: previewStep.config.buttonText || 'Próximo',
            showSkip: previewStep.config.showSkip ?? true,
            skipButtonText: previewStep.config.skipButtonText || 'Pular',
          }
        });
      } else if (stepType === 'highlight') {
        sendToIframe('SHOW_HIGHLIGHT', {
          config: {
            selector: previewStep.selector,
            animation: previewStep.config.highlightAnimation || 'pulse',
            color: previewStep.config.highlightColor || '#ff9f0d',
          }
        });
      } else {
        // tooltip, click, input, wait
        sendToIframe('SHOW_TOOLTIP', {
          config: {
            selector: previewStep.selector,
            title: previewStep.config.title || '',
            description: previewStep.config.description || '',
            position: previewStep.config.position || 'auto',
            buttonText: previewStep.config.buttonText || 'Próximo',
            showSkip: previewStep.config.showSkip ?? true,
            skipButtonText: previewStep.config.skipButtonText || 'Pular',
            imageUrl: previewStep.config.imageUrl,
          }
        });
      }
    }
  }, [previewStep, isPreviewMode, loadingState, iframeMode, sendToIframe]);

  // Helper to get element type
  const getElementType = (tagName: string): ScannedElement['type'] => {
    const tag = tagName.toLowerCase();
    if (tag === 'button') return 'button';
    if (tag === 'a') return 'link';
    if (tag === 'input') return 'input';
    if (tag === 'select') return 'select';
    if (tag === 'textarea') return 'input';
    if (tag === 'nav') return 'navigation';
    return 'other';
  };

  // Reset state when URL changes
  useEffect(() => {
    if (url) {
      setLoadingState('loading');
      setErrorMessage(null);
    }
  }, [url]);

  // Keep iframe mode consistent with prop (don't auto-switch on preview)
  useEffect(() => {
    if (mode !== iframeMode) {
      setIframeMode(mode);
    }
  }, [mode, iframeMode]);

  const handleIframeLoad = useCallback(() => {
    // For direct mode, mark as ready on load
    if (iframeMode === 'direct') {
      setLoadingState('ready');
      onIframeReady();
    }
    // For proxy mode, wait for IFRAME_READY message
  }, [iframeMode, onIframeReady]);

  const handleIframeError = useCallback(() => {
    setLoadingState('error');
    setErrorMessage('Erro ao carregar a página. A página pode bloquear carregamento em iframe ou estar inacessível.');
  }, []);

  const handleRetry = () => {
    if (iframeRef.current && url) {
      setLoadingState('loading');
      setErrorMessage(null);
      const newUrl = iframeMode === 'proxy' ? getProxyUrl(url) : url;
      iframeRef.current.src = newUrl + (newUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
    }
  };

  const handleSwitchToProxy = () => {
    setIframeMode('proxy');
    setLoadingState('loading');
    setErrorMessage(null);
  };

  return (
    <div className="relative w-full h-full bg-muted/20 rounded-lg overflow-hidden border">
      {url ? (
        <>
          {/* Loading Overlay */}
          {loadingState === 'loading' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Carregando página...</p>
              {iframeMode === 'proxy' && (
                <p className="text-xs text-muted-foreground mt-1">Modo proxy ativo</p>
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
                {iframeMode === 'direct' && (
                  <Button variant="outline" onClick={handleSwitchToProxy}>
                    Usar modo proxy
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir em nova aba
                  </a>
                </Button>
              </div>
            </div>
          )}

          {/* Direct Mode Info Banner */}
          {loadingState === 'ready' && iframeMode === 'direct' && !isPreviewMode && (
            <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-2 px-3 py-2 bg-muted/90 backdrop-blur-sm rounded-lg text-xs">
              <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">
                Para selecionar elementos, use o botão <strong>"Capturar"</strong> na barra de ferramentas.
              </span>
            </div>
          )}

          {/* Proxy Mode Info Banner */}
          {loadingState === 'ready' && iframeMode === 'proxy' && isPreviewMode && (
            <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-2 px-3 py-2 bg-primary/10 backdrop-blur-sm rounded-lg text-xs">
              <Info className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-foreground">
                <strong>Preview ativo</strong> - Navegue pelo tour usando os controles abaixo.
              </span>
            </div>
          )}

          {/* Iframe */}
          {loadingState !== 'error' && (
            <iframe
              ref={iframeRef}
              src={iframeUrl}
              className={`w-full h-full border-0 transition-opacity duration-300 ${
                loadingState === 'ready' ? 'opacity-100' : 'opacity-30'
              }`}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title="Visual Builder Preview"
            />
          )}
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
