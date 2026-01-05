import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateAction } from "@/hooks/useConfigurations";
import { StepAction, ActionType, HighlightAnimation } from "@/types/database";

interface ActionEditorProps {
  action: StepAction;
  stepId: string;
}

export function ActionEditor({ action, stepId }: ActionEditorProps) {
  const updateAction = useUpdateAction();

  const handleUpdate = (field: string, value: unknown) => {
    updateAction.mutate({
      id: action.id,
      stepId,
      [field]: value,
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
            onValueChange={(value) => handleUpdate("action_type", value as ActionType)}
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
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Descrição</Label>
          <Input
            value={action.description || ""}
            onChange={(e) => handleUpdate("description", e.target.value)}
            placeholder="Descreva esta ação..."
          />
        </div>

        {/* Common Fields */}
        {["click", "input", "highlight", "open_modal", "scroll"].includes(action.action_type) && (
          <div className="space-y-2">
            <Label>Seletor CSS</Label>
            <Input
              value={action.selector || ""}
              onChange={(e) => handleUpdate("selector", e.target.value)}
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
                value={action.delay_ms}
                onChange={(e) => handleUpdate("delay_ms", parseInt(e.target.value) || 0)}
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
                onCheckedChange={(checked) => handleUpdate("scroll_to_element", checked)}
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
                value={action.value || ""}
                onChange={(e) => handleUpdate("value", e.target.value)}
                placeholder="Use {{variavel}} para valores dinâmicos"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Input</Label>
              <Select
                value={action.input_type}
                onValueChange={(value) => handleUpdate("input_type", value)}
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
                onValueChange={(value) => handleUpdate("scroll_behavior", value)}
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
                onValueChange={(value) => handleUpdate("scroll_position", value)}
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
                value={action.delay_ms}
                onChange={(e) => handleUpdate("delay_ms", parseInt(e.target.value) || 0)}
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
                onCheckedChange={(checked) => handleUpdate("wait_for_element", checked)}
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
                  value={action.highlight_color}
                  onChange={(e) => handleUpdate("highlight_color", e.target.value)}
                  className="h-10 w-14 p-1"
                />
                <Input
                  value={action.highlight_color}
                  onChange={(e) => handleUpdate("highlight_color", e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Duração (ms)</Label>
              <Input
                type="number"
                value={action.highlight_duration_ms}
                onChange={(e) => handleUpdate("highlight_duration_ms", parseInt(e.target.value) || 2000)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Animação</Label>
              <Select
                value={action.highlight_animation}
                onValueChange={(value) => handleUpdate("highlight_animation", value as HighlightAnimation)}
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
      </CardContent>
    </Card>
  );
}
