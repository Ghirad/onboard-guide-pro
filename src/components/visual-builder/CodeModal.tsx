import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SetupConfiguration } from '@/types/database';
import { Check, Copy, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SetupConfiguration;
}

export function CodeModal({ open, onOpenChange, config }: CodeModalProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const widgetUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/serve-widget`;

  const scriptCode = `<!-- Auto-Setup Widget -->
<script src="${widgetUrl}"></script>
<script>
  AutoSetup.init({
    configId: '${config.id}',
    apiKey: '${config.api_key}',
    position: '${config.widget_position}',
    autoStart: ${config.auto_start}
  });
</script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(scriptCode);
      setCopied(true);
      toast({ title: "Código copiado!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ 
        variant: "destructive", 
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código" 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Código de Integração
          </DialogTitle>
          <DialogDescription>
            Copie e cole este código no HTML da sua aplicação, antes do fechamento da tag &lt;/body&gt;
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Code Block */}
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                <code className="text-foreground">{scriptCode}</code>
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="absolute right-2 top-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar
                  </>
                )}
              </Button>
            </div>

            {/* Config Info */}
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <h4 className="mb-2 font-medium">Informações da Configuração</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Config ID:</span>
                  <code className="rounded bg-muted px-2 py-0.5 text-xs">{config.id}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">API Key:</span>
                  <code className="rounded bg-muted px-2 py-0.5 text-xs">{config.api_key}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Posição:</span>
                  <span>{config.widget_position}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auto-iniciar:</span>
                  <span>{config.auto_start ? "Sim" : "Não"}</span>
                </div>
              </div>
            </div>

            {/* API Methods */}
            <div className="space-y-3">
              <h4 className="font-medium">Métodos da API</h4>
              <div className="grid gap-2 text-sm">
                <div className="rounded-lg bg-muted p-3">
                  <code className="text-primary">AutoSetup.start()</code>
                  <p className="mt-1 text-muted-foreground">Inicia o setup</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <code className="text-primary">AutoSetup.pause()</code>
                  <p className="mt-1 text-muted-foreground">Pausa o setup</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <code className="text-primary">AutoSetup.goToStep(index)</code>
                  <p className="mt-1 text-muted-foreground">Vai para um passo específico</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <code className="text-primary">AutoSetup.on('event', callback)</code>
                  <p className="mt-1 text-muted-foreground">Escuta eventos do widget</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
