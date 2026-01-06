import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SetupConfiguration } from "@/types/database";
import { Check, Copy, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CodeGeneratorProps {
  config: SetupConfiguration;
}

export function CodeGenerator({ config }: CodeGeneratorProps) {
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
    // allowedRoutes is configured in the dashboard and fetched automatically
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
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Código de Integração
          </CardTitle>
          <CardDescription>
            Copie e cole este código no HTML da sua aplicação, antes do fechamento da tag &lt;/body&gt;
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <h4 className="mb-2 font-medium">Informações da Configuração</h4>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Config ID:</span>
                <code className="rounded bg-muted px-2 py-0.5">{config.id}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">API Key:</span>
                <code className="rounded bg-muted px-2 py-0.5">{config.api_key}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Posição:</span>
                <span>{config.widget_position}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Auto-iniciar:</span>
                <span>{config.auto_start ? "Sim" : "Não"}</span>
              </div>
              {config.allowed_routes && config.allowed_routes.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rotas Permitidas:</span>
                  <span>{config.allowed_routes.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Métodos da API</CardTitle>
          <CardDescription>
            Métodos disponíveis para controlar o widget programaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-muted p-3">
              <code className="text-primary">AutoSetup.start()</code>
              <p className="mt-1 text-muted-foreground">Inicia o setup</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <code className="text-primary">AutoSetup.pause()</code>
              <p className="mt-1 text-muted-foreground">Pausa o setup</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <code className="text-primary">AutoSetup.resume()</code>
              <p className="mt-1 text-muted-foreground">Retoma o setup pausado</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <code className="text-primary">AutoSetup.goToStep(index)</code>
              <p className="mt-1 text-muted-foreground">Vai para um passo específico</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <code className="text-primary">AutoSetup.completeStep()</code>
              <p className="mt-1 text-muted-foreground">Completa o passo atual</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <code className="text-primary">AutoSetup.skipStep()</code>
              <p className="mt-1 text-muted-foreground">Pula o passo atual</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <code className="text-primary">AutoSetup.getProgress()</code>
              <p className="mt-1 text-muted-foreground">Retorna objeto com progresso atual</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <code className="text-primary">AutoSetup.on('event', callback)</code>
              <p className="mt-1 text-muted-foreground">Escuta eventos do widget</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <code className="text-primary">AutoSetup.destroy()</code>
              <p className="mt-1 text-muted-foreground">Remove completamente o widget</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
