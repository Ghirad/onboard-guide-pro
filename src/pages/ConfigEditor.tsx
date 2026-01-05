import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useConfiguration,
  useConfigurationSteps,
  useUpdateConfiguration,
  useCreateStep,
  useUpdateStep,
  useDeleteStep,
} from "@/hooks/useConfigurations";
import { StepEditor } from "@/components/config/StepEditor";
import { CodeGenerator } from "@/components/config/CodeGenerator";
import { Loader2, ArrowLeft, Plus, GripVertical, Trash2, ChevronRight, Eye } from "lucide-react";
import { SetupStep } from "@/types/database";
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
import { cn } from "@/lib/utils";

function SortableStepItem({
  step,
  isSelected,
  onSelect,
  onDelete,
}: {
  step: SetupStep;
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
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-lg border bg-card p-3 transition-all",
        isSelected && "border-primary ring-1 ring-primary",
        isDragging && "opacity-50"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      
      <div className="flex-1 cursor-pointer" onClick={onSelect}>
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {step.step_order + 1}
          </span>
          <span className="font-medium">{step.title}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant={step.is_required ? "default" : "secondary"} className="text-xs">
            {step.is_required ? "Obrigatório" : "Opcional"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {step.target_type === "page" ? "Página" : "Modal"}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onSelect}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function ConfigEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const { data: config, isLoading: configLoading } = useConfiguration(id);
  const { data: steps = [], isLoading: stepsLoading } = useConfigurationSteps(id);
  const updateConfiguration = useUpdateConfiguration();
  const createStep = useCreateStep();
  const updateStep = useUpdateStep();
  const deleteStep = useDeleteStep();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => s.id === active.id);
      const newIndex = steps.findIndex((s) => s.id === over.id);
      const newSteps = arrayMove(steps, oldIndex, newIndex);

      // Update all step orders
      for (let i = 0; i < newSteps.length; i++) {
        if (newSteps[i].step_order !== i) {
          await updateStep.mutateAsync({
            id: newSteps[i].id,
            configurationId: id!,
            step_order: i,
          });
        }
      }
    }
  };

  const handleCreateStep = async () => {
    if (!id) return;
    const result = await createStep.mutateAsync({
      configurationId: id,
      step: {
        title: `Passo ${steps.length + 1}`,
        step_order: steps.length,
      },
    });
    setSelectedStepId(result.id);
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!id) return;
    if (selectedStepId === stepId) {
      setSelectedStepId(null);
    }
    await deleteStep.mutateAsync({ id: stepId, configurationId: id });
  };

  const selectedStep = steps.find((s) => s.id === selectedStepId);

  if (configLoading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!config) {
    return (
      <AdminLayout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Configuração não encontrada.</p>
          <Button asChild className="mt-4">
            <Link to="/">Voltar ao Dashboard</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-border bg-background p-4 lg:p-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <Input
                value={config.name}
                onChange={(e) =>
                  updateConfiguration.mutate({ id: config.id, name: e.target.value })
                }
                className="h-auto border-0 bg-transparent p-0 text-xl font-bold focus-visible:ring-0"
                placeholder="Nome da configuração"
              />
              <p className="mt-1 text-sm text-muted-foreground">
                Criado {new Date(config.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={config.is_active ? "default" : "secondary"}>
                {config.is_active ? "Ativo" : "Inativo"}
              </Badge>
              <Button asChild variant="outline">
                <Link to={`/config/${id}/preview`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="steps" className="flex h-full flex-col">
            <div className="border-b border-border px-4 lg:px-6">
              <TabsList className="h-12">
                <TabsTrigger value="steps">Passos</TabsTrigger>
                <TabsTrigger value="settings">Configurações</TabsTrigger>
                <TabsTrigger value="code">Código de Integração</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="steps" className="flex-1 overflow-hidden data-[state=active]:flex">
              <div className="flex h-full w-full">
                {/* Steps List */}
                <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-border p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold">Passos do Setup</h3>
                    <Button
                      size="sm"
                      onClick={handleCreateStep}
                      disabled={createStep.isPending}
                    >
                      {createStep.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {stepsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : steps.length > 0 ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={steps.map((s) => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {steps.map((step) => (
                            <SortableStepItem
                              key={step.id}
                              step={step}
                              isSelected={selectedStepId === step.id}
                              onSelect={() => setSelectedStepId(step.id)}
                              onDelete={() => handleDeleteStep(step.id)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="rounded-lg border border-dashed p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhum passo criado ainda.
                      </p>
                      <Button
                        variant="link"
                        className="mt-2"
                        onClick={handleCreateStep}
                      >
                        Criar primeiro passo
                      </Button>
                    </div>
                  )}
                </div>

                {/* Step Editor */}
                <div className="flex-1 overflow-y-auto p-6">
                  {selectedStep ? (
                    <StepEditor
                      step={selectedStep}
                      configurationId={id!}
                      onClose={() => setSelectedStepId(null)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <p>Selecione um passo para editar</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="flex-1 overflow-auto p-6">
              <div className="mx-auto max-w-2xl space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Básicas</CardTitle>
                    <CardDescription>
                      Configure os detalhes principais da sua configuração de setup
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        value={config.name}
                        onChange={(e) =>
                          updateConfiguration.mutate({ id: config.id, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={config.description || ""}
                        onChange={(e) =>
                          updateConfiguration.mutate({
                            id: config.id,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target_url">URL da Aplicação Alvo</Label>
                      <Input
                        id="target_url"
                        value={config.target_url}
                        onChange={(e) =>
                          updateConfiguration.mutate({
                            id: config.id,
                            target_url: e.target.value,
                          })
                        }
                        placeholder="https://exemplo.com"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Widget</CardTitle>
                    <CardDescription>
                      Configure a aparência e comportamento do widget
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="position">Posição do Widget</Label>
                      <Select
                        value={config.widget_position}
                        onValueChange={(value) =>
                          updateConfiguration.mutate({
                            id: config.id,
                            widget_position: value,
                          })
                        }
                      >
                        <SelectTrigger id="position">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottom-right">Inferior Direito</SelectItem>
                          <SelectItem value="bottom-left">Inferior Esquerdo</SelectItem>
                          <SelectItem value="top-right">Superior Direito</SelectItem>
                          <SelectItem value="top-left">Superior Esquerdo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="auto_start">Iniciar Automaticamente</Label>
                        <p className="text-sm text-muted-foreground">
                          Inicia o setup quando o usuário abre a página
                        </p>
                      </div>
                      <Switch
                        id="auto_start"
                        checked={config.auto_start}
                        onCheckedChange={(checked) =>
                          updateConfiguration.mutate({
                            id: config.id,
                            auto_start: checked,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="is_active">Status Ativo</Label>
                        <p className="text-sm text-muted-foreground">
                          Ativa ou desativa este setup
                        </p>
                      </div>
                      <Switch
                        id="is_active"
                        checked={config.is_active}
                        onCheckedChange={(checked) =>
                          updateConfiguration.mutate({
                            id: config.id,
                            is_active: checked,
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="code" className="flex-1 overflow-auto p-6">
              <CodeGenerator config={config} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminLayout>
  );
}
