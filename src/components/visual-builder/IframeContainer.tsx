import { useEffect, useRef, useCallback, useState } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
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

type LoadingState = 'loading' | 'ready' | 'error';

export function IframeContainer({
  proxyUrl,
  isSelectionMode,
  onElementSelected,
  onIframeReady,
  highlightSelector,
  isPreviewMode = false,
  previewStep,
  onPreviewAction,
  onElementsScanned,
}: IframeContainerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isReadyRef = useRef(false);
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sendMessage = useCallback((message: object) => {
    if (iframeRef.current?.contentWindow && isReadyRef.current) {
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  }, []);

  const scanElements = useCallback(() => {
    sendMessage({ type: 'SCAN_ELEMENTS' });
  }, [sendMessage]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'IFRAME_READY') {
        isReadyRef.current = true;
        setLoadingState('ready');
        setErrorMessage(null);
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
        onIframeReady();
        // Auto-scan elements when iframe is ready
        setTimeout(() => scanElements(), 500);
      } else if (event.data.type === 'ELEMENT_SELECTED') {
        onElementSelected(event.data.data as SelectedElement);
      } else if (event.data.type === 'PREVIEW_ACTION') {
        onPreviewAction?.(event.data.action as 'next' | 'skip');
      } else if (event.data.type === 'ELEMENTS_SCANNED') {
        onElementsScanned?.(event.data.elements as ScannedElement[]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onElementSelected, onIframeReady, onPreviewAction, onElementsScanned, scanElements]);

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
      setLoadingState('loading');
      setErrorMessage(null);
      isReadyRef.current = false;

      // Set a timeout for loading
      loadTimeoutRef.current = setTimeout(() => {
        if (!isReadyRef.current) {
          setLoadingState('error');
          setErrorMessage('A página demorou muito para carregar. Verifique se a URL está correta e acessível.');
        }
      }, 15000);
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [proxyUrl]);

  const handleRetry = () => {
    if (iframeRef.current) {
      setLoadingState('loading');
      setErrorMessage(null);
      isReadyRef.current = false;
      iframeRef.current.src = proxyUrl;
    }
  };

  const handleIframeError = () => {
    setLoadingState('error');
    setErrorMessage('Erro ao carregar a página. A página pode bloquear carregamento em iframe ou estar inacessível.');
  };

  return (
    <div className="relative w-full h-full bg-muted/20 rounded-lg overflow-hidden border">
      {proxyUrl ? (
        <>
          {/* Loading Overlay */}
          {loadingState === 'loading' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Carregando página...</p>
              <p className="text-xs text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
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
              </div>
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
}
