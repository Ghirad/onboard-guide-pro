import { useEffect, useRef, useCallback } from 'react';
import { IFRAME_INJECTION_SCRIPT } from '@/utils/selectorGenerator';
import { SelectedElement } from '@/types/visualBuilder';

interface IframeContainerProps {
  proxyUrl: string;
  isSelectionMode: boolean;
  onElementSelected: (element: SelectedElement) => void;
  onIframeReady: () => void;
  highlightSelector?: string;
}

export function IframeContainer({
  proxyUrl,
  isSelectionMode,
  onElementSelected,
  onIframeReady,
  highlightSelector,
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
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onElementSelected, onIframeReady]);

  useEffect(() => {
    sendMessage({ type: 'SET_SELECTION_MODE', enabled: isSelectionMode });
  }, [isSelectionMode, sendMessage]);

  useEffect(() => {
    if (highlightSelector) {
      sendMessage({ type: 'HIGHLIGHT_ELEMENT', selector: highlightSelector });
    } else {
      sendMessage({ type: 'CLEAR_HIGHLIGHT' });
    }
  }, [highlightSelector, sendMessage]);

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
