import { useState } from 'react';
import { Copy, Check, ExternalLink, Terminal, MousePointer2, ClipboardPaste, AlertCircle, Settings, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { generateCaptureScript } from '@/utils/captureScript';
import { useToast } from '@/hooks/use-toast';

interface CapturedElement {
  selector: string;
  label: string;
  tagName: string;
  rect?: { top: number; left: number; width: number; height: number };
}

interface CaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUrl: string;
  captureToken: string;
  builderOrigin: string;
  isCaptureReady: boolean;
  selectedElement: CapturedElement | null;
  onImportElement: (element: CapturedElement) => void;
  onConfigureStep: () => void;
}

export function CaptureModal({
  open,
  onOpenChange,
  targetUrl,
  captureToken,
  builderOrigin,
  isCaptureReady,
  selectedElement,
  onImportElement,
  onConfigureStep,
}: CaptureModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [importValue, setImportValue] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const captureScript = generateCaptureScript(captureToken, builderOrigin);

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(captureScript);
      setCopied(true);
      toast({
        title: 'Script copiado!',
        description: 'Cole no console do DevTools (F12) na aba do site.',
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Tente selecionar e copiar manualmente.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenSiteWithOpener = () => {
    window.open(targetUrl, '_blank', 'noopener=no');
    toast({
      title: 'Portal aberto',
      description: 'Cole o script no console (F12) e clique nos elementos.',
    });
  };

  const handleImportElement = () => {
    setImportError(null);
    const value = importValue.trim();
    
    if (!value) {
      setImportError('Cole o JSON ou seletor copiado do portal.');
      return;
    }

    try {
      const parsed = JSON.parse(value);
      
      if (parsed.element) {
        onImportElement(parsed.element);
        setImportValue('');
        toast({
          title: 'Elemento importado!',
          description: `${parsed.element.tagName}: ${parsed.element.label?.slice(0, 30) || parsed.element.selector}`,
        });
      } else if (parsed.selector) {
        onImportElement(parsed);
        setImportValue('');
        toast({
          title: 'Elemento importado!',
          description: `${parsed.tagName}: ${parsed.label?.slice(0, 30) || parsed.selector}`,
        });
      } else {
        setImportError('JSON inválido. Deve conter "selector" ou "element".');
      }
    } catch {
      if (value.startsWith('#') || value.startsWith('.') || value.startsWith('[') || /^[a-z]/i.test(value)) {
        onImportElement({
          selector: value,
          label: value,
          tagName: 'element',
          rect: { top: 0, left: 0, width: 0, height: 0 },
        });
        setImportValue('');
        toast({
          title: 'Seletor importado!',
          description: value.slice(0, 50),
        });
      } else {
        setImportError('Formato inválido. Cole o JSON ou um seletor CSS válido.');
      }
    }
  };

  const handleConfigureClick = () => {
    onConfigureStep();
    onOpenChange(false);
  };

  const getElementTypeLabel = (tagName: string) => {
    const tag = tagName.toLowerCase();
    if (tag === 'button') return 'Botão';
    if (tag === 'a') return 'Link';
    if (tag === 'input') return 'Campo de entrada';
    if (tag === 'textarea') return 'Área de texto';
    if (tag === 'select') return 'Seletor';
    return tagName;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MousePointer2 className="h-5 w-5" />
            Capturar Elemento
          </DialogTitle>
          <DialogDescription>
            Capture elementos do site real para criar passos do tour.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Captured Element Preview */}
          {selectedElement && (
            <div className="p-4 rounded-lg border-2 border-primary bg-primary/5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Elemento Capturado!
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Tipo:
                  </span>
                  <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                    {getElementTypeLabel(selectedElement.tagName)}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex-shrink-0">
                    Seletor:
                  </span>
                  <code className="text-xs font-mono break-all text-muted-foreground">
                    {selectedElement.selector}
                  </code>
                </div>
                {selectedElement.label && selectedElement.label !== selectedElement.selector && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex-shrink-0">
                      Texto:
                    </span>
                    <span className="text-sm truncate">
                      "{selectedElement.label.slice(0, 50)}"
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1"
                  onClick={handleConfigureClick}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar Passo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Keep modal open to capture another
                  }}
                >
                  Capturar Outro
                </Button>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
            <div className={`w-2 h-2 rounded-full ${isCaptureReady ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
            <span className="text-sm">
              {isCaptureReady 
                ? 'Captura ativa - clique em elementos no site' 
                : 'Aguardando ativação do script...'}
            </span>
          </div>

          {/* Instructions */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Instruções:</h4>
            
            <div className="flex items-start gap-3 text-sm">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">1</span>
              <div className="flex-1">
                <p>Abra o site clicando no botão abaixo</p>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="mt-2"
                  onClick={handleOpenSiteWithOpener}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Abrir {new URL(targetUrl).hostname}
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">2</span>
              <div className="flex-1">
                <p>Copie o script e cole no Console (F12)</p>
                <Button 
                  variant={copied ? 'secondary' : 'outline'}
                  size="sm" 
                  className="mt-2"
                  onClick={handleCopyScript}
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar Script
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">3</span>
              <div className="flex-1">
                <p>Clique nos elementos que deseja capturar</p>
                <p className="text-xs text-muted-foreground mt-1">
                  O elemento aparecerá automaticamente acima, ou cole abaixo se não aparecer.
                </p>
              </div>
            </div>
          </div>

          {/* Manual Import Section */}
          <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ClipboardPaste className="h-4 w-4" />
              Importar Manualmente
            </div>
            <p className="text-xs text-muted-foreground">
              Se o elemento não aparecer automaticamente, cole o JSON ou seletor aqui:
            </p>
            <Textarea
              value={importValue}
              onChange={(e) => {
                setImportValue(e.target.value);
                setImportError(null);
              }}
              placeholder='Cole o JSON copiado ou um seletor CSS (ex: #meu-botao, .classe-elemento)'
              className="min-h-[80px] font-mono text-xs"
            />
            {importError && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {importError}
              </div>
            )}
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleImportElement}
              disabled={!importValue.trim()}
              className="w-full"
            >
              <ClipboardPaste className="h-3 w-3 mr-1" />
              Importar Elemento
            </Button>
          </div>

          {/* Script Preview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Terminal className="h-3 w-3" />
              Script de Captura (clique para copiar)
            </div>
            <pre 
              onClick={handleCopyScript}
              className="p-3 bg-muted rounded-lg text-xs font-mono max-h-24 overflow-y-auto cursor-pointer hover:bg-muted/80 transition-colors"
            >
              {captureScript.slice(0, 200)}...
            </pre>
          </div>

          {/* Chrome Extension Hint */}
          <div className="p-3 border rounded-lg text-sm bg-muted/50">
            <p className="font-medium mb-1">💡 Dica: Use a Extensão Chrome</p>
            <p className="text-muted-foreground text-xs">
              Para uma experiência mais fluida, instale a extensão Tour Builder Capture.
              Ela permite capturar elementos com um clique, sem precisar colar scripts.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
