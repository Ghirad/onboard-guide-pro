import { useState } from 'react';
import { Copy, Check, ExternalLink, Terminal, MousePointer2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { generateCaptureScript } from '@/utils/captureScript';
import { useToast } from '@/hooks/use-toast';

interface CaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUrl: string;
  captureToken: string;
  builderOrigin: string;
  isCaptureReady: boolean;
}

export function CaptureModal({
  open,
  onOpenChange,
  targetUrl,
  captureToken,
  builderOrigin,
  isCaptureReady,
}: CaptureModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

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

  const handleOpenSite = () => {
    window.open(targetUrl, '_blank', 'noopener');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
                <p>Abra o site em uma nova aba</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={handleOpenSite}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Abrir {new URL(targetUrl).hostname}
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">2</span>
              <div className="flex-1">
                <p>Abra o DevTools (F12) e vá para a aba Console</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">3</span>
              <div className="flex-1">
                <p>Cole o script abaixo e pressione Enter</p>
                <Button 
                  variant={copied ? 'secondary' : 'default'}
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
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">4</span>
              <div className="flex-1">
                <p>Passe o mouse e clique nos elementos que deseja capturar</p>
              </div>
            </div>
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
