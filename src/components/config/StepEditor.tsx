import { useState, useCallback } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedUpdate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateStep, useStepActions, useCreateAction, useDeleteAction } from "@/hooks/useConfigurations";
import { SetupStep, StepTargetType, ActionType } from "@/types/database";
import { ActionEditor } from "./ActionEditor";
import { Plus, Loader2, GripVertical, Trash2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useUpdateAction } from "@/hooks/useConfigurations";
import { cn } from "@/lib/utils";
import { StepAction } from "@/types/database";

const actionTypeLabels: Record<ActionType, string> = {
  click: "Click",
  input: "Input/Preenchimento",
  scroll: "Scroll",
  wait: "Aguardar",
  highlight: "Destaque",
  open_modal: "Abrir Modal",
};

function SortableActionItem({
  action,
  isSelected,
  onSelect,
  onDelete,
}: {
  action: StepAction;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: action.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-lg border bg-card p-3 transition-all cursor-pointer",
        isSelected && "border-primary ring-1 ring-primary",
        isDragging && "opacity-50"
      )}
      onClick={onSelect}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {actionTypeLabels[action.action_type]}
          </Badge>
          <span className="text-sm truncate">
            {action.selector || action.description || "Sem descrição"}
          </span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface StepEditorProps {
  step: SetupStep;
  configurationId: string;
  onClose: () => void;
}

export function StepEditor({ step, configurationId }: StepEditorProps) {
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  
  const updateStep = useUpdateStep();
  const { data: actions = [], isLoading: actionsLoading } = useStepActions(step.id);
  const createAction = useCreateAction();
  const deleteAction = useDeleteAction();
  const updateAction = useUpdateAction();

  // Debounced handlers for text fields
  const handleTitleUpdate = useCallback((value: string) => {
    updateStep.mutate({ id: step.id, configurationId, title: value });
  }, [step.id, configurationId, updateStep]);

  const handleDescriptionUpdate = useCallback((value: string) => {
    updateStep.mutate({ id: step.id, configurationId, description: value });
  }, [step.id, configurationId, updateStep]);

  const handleInstructionsUpdate = useCallback((value: string) => {
    updateStep.mutate({ id: step.id, configurationId, instructions: value });
  }, [step.id, configurationId, updateStep]);

  const handleTipsUpdate = useCallback((value: string) => {
    updateStep.mutate({ id: step.id, configurationId, tips: value });
  }, [step.id, configurationId, updateStep]);

  const handleTargetUrlUpdate = useCallback((value: string) => {
    updateStep.mutate({ id: step.id, configurationId, target_url: value });
  }, [step.id, configurationId, updateStep]);

  const handleTargetSelectorUpdate = useCallback((value: string) => {
    updateStep.mutate({ id: step.id, configurationId, target_selector: value });
  }, [step.id, configurationId, updateStep]);

  const handleImageUrlUpdate = useCallback((value: string) => {
    updateStep.mutate({ id: step.id, configurationId, image_url: value });
  }, [step.id, configurationId, updateStep]);

  const [title, setTitle] = useDebouncedValue(step.title, handleTitleUpdate);
  const [description, setDescription] = useDebouncedValue(step.description || "", handleDescriptionUpdate);
  const [instructions, setInstructions] = useDebouncedValue(step.instructions || "", handleInstructionsUpdate);
  const [tips, setTips] = useDebouncedValue(step.tips || "", handleTipsUpdate);
  const [targetUrl, setTargetUrl] = useDebouncedValue(step.target_url || "", handleTargetUrlUpdate);
  const [targetSelector, setTargetSelector] = useDebouncedValue(step.target_selector || "", handleTargetSelectorUpdate);
  const [imageUrl, setImageUrl] = useDebouncedValue(step.image_url || "", handleImageUrlUpdate);

  // Non-debounced update for selects/switches
  const handleImmediateUpdate = (field: string, value: unknown) => {
    updateStep.mutate({
      id: step.id,
      configurationId,
      [field]: value,
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = actions.findIndex((a) => a.id === active.id);
      const newIndex = actions.findIndex((a) => a.id === over.id);
      const newActions = arrayMove(actions, oldIndex, newIndex);

      for (let i = 0; i < newActions.length; i++) {
        if (newActions[i].action_order !== i) {
          await updateAction.mutateAsync({
            id: newActions[i].id,
            stepId: step.id,
            action_order: i,
          });
        }
      }
    }
  };

  const handleCreateAction = async () => {
    const result = await createAction.mutateAsync({
      stepId: step.id,
      action: {
        action_type: "click",
        action_order: actions.length,
      },
    });
    setSelectedActionId(result.action.id);
  };

  const handleDeleteAction = async (actionId: string) => {
    if (selectedActionId === actionId) {
      setSelectedActionId(null);
    }
    await deleteAction.mutateAsync({ id: actionId, stepId: step.id });
  };

  const selectedAction = actions.find((a) => a.id === selectedActionId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Editar Passo</h2>
        <Badge variant={step.is_required ? "default" : "secondary"}>
          {step.is_required ? "Obrigatório" : "Opcional"}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Step Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações do Passo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instruções</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                placeholder="Instruções detalhadas para o usuário..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tips">Dicas (Opcional)</Label>
              <Input
                id="tips"
                value={tips}
                onChange={(e) => setTips(e.target.value)}
                placeholder="Dicas adicionais..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Target Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuração de Destino</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target_type">Tipo de Destino</Label>
              <Select
                value={step.target_type}
                onValueChange={(value) => handleImmediateUpdate("target_type", value as StepTargetType)}
              >
                <SelectTrigger id="target_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="page">Página</SelectItem>
                  <SelectItem value="modal">Modal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {step.target_type === "page" && (
              <div className="space-y-2">
                <Label htmlFor="target_url">URL/Rota da Página</Label>
                <Input
                  id="target_url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="/perfil/editar"
                />
              </div>
            )}

            {step.target_type === "modal" && (
              <div className="space-y-2">
                <Label htmlFor="target_selector">Seletor CSS do Modal</Label>
                <Input
                  id="target_selector"
                  value={targetSelector}
                  onChange={(e) => setTargetSelector(e.target.value)}
                  placeholder=".modal-config"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="image_url">URL da Imagem/GIF (Opcional)</Label>
              <Input
                id="image_url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem.gif"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_required">Passo Obrigatório</Label>
                <p className="text-sm text-muted-foreground">
                  Usuário não pode pular este passo
                </p>
              </div>
              <Switch
                id="is_required"
                checked={step.is_required}
                onCheckedChange={(checked) => handleImmediateUpdate("is_required", checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Ações Automatizadas</CardTitle>
          <Button
            size="sm"
            onClick={handleCreateAction}
            disabled={createAction.isPending}
          >
            {createAction.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Nova Ação
          </Button>
        </CardHeader>
        <CardContent>
          {actionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : actions.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Lista de Ações
                </p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={actions.map((a) => a.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {actions.map((action) => (
                        <SortableActionItem
                          key={action.id}
                          action={action}
                          isSelected={selectedActionId === action.id}
                          onSelect={() => setSelectedActionId(action.id)}
                          onDelete={() => handleDeleteAction(action.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

              <div>
                {selectedAction ? (
                  <ActionEditor action={selectedAction} stepId={step.id} />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                    Selecione uma ação para editar
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-muted-foreground">Nenhuma ação configurada.</p>
              <Button variant="link" onClick={handleCreateAction}>
                Criar primeira ação
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
