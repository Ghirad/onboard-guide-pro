import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDebouncedValue } from "@/hooks/useDebouncedUpdate";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateAction } from "@/hooks/useConfigurations";
import { StepAction, ActionType, HighlightAnimation, RedirectType } from "@/types/database";

interface ActionEditorProps {
  action: StepAction;
  stepId: string;
}

export function ActionEditor({ action, stepId }: ActionEditorProps) {
  const updateAction = useUpdateAction();

  // Debounced handlers for text fields
  const handleDescriptionUpdate = useCallback((value: string) => {
    updateAction.mutate({ id: action.id, stepId, description: value });
  }, [action.id, stepId, updateAction]);

  const handleSelectorUpdate = useCallback((value: string) => {
    updateAction.mutate({ id: action.id, stepId, selector: value });
  }, [action.id, stepId, updateAction]);

  const handleValueUpdate = useCallback((value: string) => {
    updateAction.mutate({ id: action.id, stepId, value });
  }, [action.id, stepId, updateAction]);

  const handleDelayUpdate = useCallback((value: string) => {
    updateAction.mutate({ id: action.id, stepId, delay_ms: parseInt(value) || 0 });
  }, [action.id, stepId, updateAction]);

  const handleHighlightColorUpdate = useCallback((value: string) => {
    updateAction.mutate({ id: action.id, stepId, highlight_color: value });
  }, [action.id, stepId, updateAction]);

  const handleHighlightDurationUpdate = useCallback((value: string) => {
    updateAction.mutate({ id: action.id, stepId, highlight_duration_ms: parseInt(value) || 2000 });
  }, [action.id, stepId, updateAction]);

  const handleRedirectUrlUpdate = useCallback((value: string) => {
    updateAction.mutate({ id: action.id, stepId, redirect_url: value });
  }, [action.id, stepId, updateAction]);

  const handleRedirectDelayUpdate = useCallback((value: string) => {
    updateAction.mutate({ id: action.id, stepId, redirect_delay_ms: parseInt(value) || 0 });
  }, [action.id, stepId, updateAction]);

  const [description, setDescription] = useDebouncedValue(action.description || "", handleDescriptionUpdate);
  const [selector, setSelector] = useDebouncedValue(action.selector || "", handleSelectorUpdate);
  const [value, setValue] = useDebouncedValue(action.value || "", handleValueUpdate);
  const [delayMs, setDelayMs] = useDebouncedValue(String(action.delay_ms || 0), handleDelayUpdate);
  const [highlightColor, setHighlightColor] = useDebouncedValue(action.highlight_color || "#ff9f0d", handleHighlightColorUpdate);
  const [highlightDuration, setHighlightDuration] = useDebouncedValue(String(action.highlight_duration_ms || 2000), handleHighlightDurationUpdate);
  const [redirectUrl, setRedirectUrl] = useDebouncedValue(action.redirect_url || "", handleRedirectUrlUpdate);
  const [redirectDelay, setRedirectDelay] = useDebouncedValue(String(action.redirect_delay_ms || 0), handleRedirectDelayUpdate);

  // Non-debounced update for selects/switches
  const handleImmediateUpdate = (field: string, fieldValue: unknown) => {
    updateAction.mutate({
      id: action.id,
      stepId,
      [field]: fieldValue,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Configurar Ação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo de Ação</Label>
          <Select
            value={action.action_type}
            onValueChange={(val) => handleImmediateUpdate("action_type", val as ActionType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="click">Click</SelectItem>
              <SelectItem value="input">Input/Preenchimento</SelectItem>
              <SelectItem value="scroll">Scroll</SelectItem>
              <SelectItem value="wait">Aguardar</SelectItem>
              <SelectItem value="highlight">Destaque</SelectItem>
              <SelectItem value="open_modal">Abrir Modal</SelectItem>
              <SelectItem value="redirect">Redirecionar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Descrição</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva esta ação..."
          />
        </div>

        {/* Common Fields */}
        {["click", "input", "highlight", "open_modal", "scroll"].includes(action.action_type) && (
          <div className="space-y-2">
            <Label>Seletor CSS</Label>
            <Input
              value={selector}
              onChange={(e) => setSelector(e.target.value)}
              placeholder="#meu-botao, .minha-classe"
            />
          </div>
        )}

        {/* Click specific */}
        {action.action_type === "click" && (
          <>
            <div className="space-y-2">
              <Label>Delay antes do click (ms)</Label>
              <Input
                type="number"
                value={delayMs}
                onChange={(e) => setDelayMs(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Scroll automático</Label>
                <p className="text-xs text-muted-foreground">
                  Rolar até o elemento antes de clicar
                </p>
              </div>
              <Switch
                checked={action.scroll_to_element}
                onCheckedChange={(checked) => handleImmediateUpdate("scroll_to_element", checked)}
              />
            </div>
          </>
        )}

        {/* Input specific */}
        {action.action_type === "input" && (
          <>
            <div className="space-y-2">
              <Label>Valor a preencher</Label>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Use {{variavel}} para valores dinâmicos"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Input</Label>
              <Select
                value={action.input_type}
                onValueChange={(val) => handleImmediateUpdate("input_type", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="password">Senha</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Scroll specific */}
        {action.action_type === "scroll" && (
          <>
            <div className="space-y-2">
              <Label>Comportamento do Scroll</Label>
              <Select
                value={action.scroll_behavior}
                onValueChange={(val) => handleImmediateUpdate("scroll_behavior", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smooth">Suave</SelectItem>
                  <SelectItem value="auto">Instantâneo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Posição do Scroll</Label>
              <Select
                value={action.scroll_position}
                onValueChange={(val) => handleImmediateUpdate("scroll_position", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">Topo</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="end">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Wait specific */}
        {action.action_type === "wait" && (
          <>
            <div className="space-y-2">
              <Label>Tempo de espera (ms)</Label>
              <Input
                type="number"
                value={delayMs}
                onChange={(e) => setDelayMs(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Aguardar elemento</Label>
                <p className="text-xs text-muted-foreground">
                  Espera até o elemento aparecer no DOM
                </p>
              </div>
              <Switch
                checked={action.wait_for_element}
                onCheckedChange={(checked) => handleImmediateUpdate("wait_for_element", checked)}
              />
            </div>
          </>
        )}

        {/* Highlight specific */}
        {action.action_type === "highlight" && (
          <>
            <div className="space-y-2">
              <Label>Cor do Destaque</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={highlightColor}
                  onChange={(e) => setHighlightColor(e.target.value)}
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={highlightColor}
                  onChange={(e) => setHighlightColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Duração (ms)</Label>
              <Input
                type="number"
                value={highlightDuration}
                onChange={(e) => setHighlightDuration(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Animação</Label>
              <Select
                value={action.highlight_animation}
                onValueChange={(val) => handleImmediateUpdate("highlight_animation", val as HighlightAnimation)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pulse">Pulse</SelectItem>
                  <SelectItem value="glow">Glow</SelectItem>
                  <SelectItem value="border">Border</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Redirect specific */}
        {action.action_type === "redirect" && (
          <>
            <div className="space-y-2">
              <Label>URL ou Rota de Destino</Label>
              <Input
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="/dashboard ou https://site.com/pagina"
              />
              <p className="text-xs text-muted-foreground">
                Use caminho relativo (/pagina) para rotas internas ou URL completa para externas
              </p>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Redirecionamento</Label>
              <Select
                value={action.redirect_type || "push"}
                onValueChange={(val) => handleImmediateUpdate("redirect_type", val as RedirectType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="push">Push (mantém histórico)</SelectItem>
                  <SelectItem value="replace">Replace (substitui histórico)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Delay antes do redirect (ms)</Label>
              <Input
                type="number"
                value={redirectDelay}
                onChange={(e) => setRedirectDelay(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Aguardar página carregar</Label>
                <p className="text-xs text-muted-foreground">
                  Pausa o onboarding até a nova página carregar
                </p>
              </div>
              <Switch
                checked={action.redirect_wait_for_load !== false}
                onCheckedChange={(checked) => handleImmediateUpdate("redirect_wait_for_load", checked)}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
