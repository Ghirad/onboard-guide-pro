import { useEffect, useRef, useCallback } from 'react';
import { IFRAME_INJECTION_SCRIPT } from '@/utils/selectorGenerator';
import { SelectedElement, TourStep } from '@/types/visualBuilder';

interface IframeContainerProps {
  proxyUrl: string;
  isSelectionMode: boolean;
  onElementSelected: (element: SelectedElement) => void;
  onIframeReady: () => void;
  highlightSelector?: string;
  isPreviewMode?: boolean;
  previewStep?: TourStep | null;
  onPreviewAction?: (action: 'next' | 'skip') => void;
}

export function IframeContainer({
  proxyUrl,
  isSelectionMode,
  onElementSelected,
  onIframeReady,
  highlightSelector,
  isPreviewMode = false,
  previewStep,
  onPreviewAction,
}: IframeContainerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isReadyRef = useRef(false);

  const sendMessage = useCallback((message: object) => {
    if (iframeRef.current?.contentWindow && isReadyRef.current) {
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'IFRAME_READY') {
        isReadyRef.current = true;
        onIframeReady();
      } else if (event.data.type === 'ELEMENT_SELECTED') {
        onElementSelected(event.data.data as SelectedElement);
      } else if (event.data.type === 'PREVIEW_ACTION') {
        onPreviewAction?.(event.data.action as 'next' | 'skip');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onElementSelected, onIframeReady, onPreviewAction]);

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
        // Wait steps auto-advance via PreviewOverlay
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

  const handleLoad = () => {
    try {
      const iframe = iframeRef.current;
      if (iframe?.contentDocument) {
        const script = iframe.contentDocument.createElement('script');
        script.textContent = IFRAME_INJECTION_SCRIPT;
        iframe.contentDocument.body.appendChild(script);
      }
    } catch (e) {
      // Cross-origin - script should be injected by proxy
      console.log('Cross-origin iframe, relying on proxy injection');
    }
  };

  return (
    <div className="relative w-full h-full bg-muted/20 rounded-lg overflow-hidden border">
      {proxyUrl ? (
        <iframe
          ref={iframeRef}
          src={proxyUrl}
          className="w-full h-full border-0"
          onLoad={handleLoad}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="Visual Builder Preview"
        />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>Configure a URL to start building your tour</p>
        </div>
      )}
    </div>
  );
}
