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

  // In direct mode, we can't interact with iframe content (cross-origin)
  // Selection is handled via the external capture system
  const scanElements = useCallback(() => {
    // In direct mode, scanning is not available via iframe
    // Elements are captured via the external capture script
    console.log('[IframeContainer] Scan not available in direct mode - use Capture button');
  }, []);

  useImperativeHandle(ref, () => ({
    scanElements,
  }), [scanElements]);

  // Reset state when URL changes
  useEffect(() => {
    if (url) {
      setLoadingState('loading');
      setErrorMessage(null);
    }
  }, [url]);

  const handleIframeLoad = useCallback(() => {
    setLoadingState('ready');
    onIframeReady();
  }, [onIframeReady]);

  const handleIframeError = useCallback(() => {
    setLoadingState('error');
    setErrorMessage('Erro ao carregar a página. A página pode bloquear carregamento em iframe ou estar inacessível.');
  }, []);

  const handleRetry = () => {
    if (iframeRef.current && url) {
      setLoadingState('loading');
      setErrorMessage(null);
      iframeRef.current.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
    }
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
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir em nova aba
                  </a>
                </Button>
              </div>
            </div>
          )}

          {/* Direct Mode Info Banner */}
          {loadingState === 'ready' && mode === 'direct' && (
            <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-2 px-3 py-2 bg-muted/90 backdrop-blur-sm rounded-lg text-xs">
              <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">
                Para selecionar elementos, use o botão <strong>"Capturar"</strong> na barra de ferramentas.
              </span>
            </div>
          )}

          {/* Iframe */}
          {loadingState !== 'error' && (
            <iframe
              ref={iframeRef}
              src={url}
              className={`w-full h-full border-0 transition-opacity duration-300 ${
                loadingState === 'ready' ? 'opacity-100' : 'opacity-30'
              }`}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              // In direct mode, we remove sandbox to allow full site functionality
              // This means we can't interact with the iframe content, but the site works normally
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
