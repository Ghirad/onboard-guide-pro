import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useConfiguration, useConfigurationSteps, useStepActions } from "@/hooks/useConfigurations";
import { Loader2, ArrowLeft, Play, X, ChevronLeft, ChevronRight, Check, SkipForward } from "lucide-react";
import { SetupStep } from "@/types/database";
import { cn } from "@/lib/utils";
import { TopBarWidget } from "@/components/widget/TopBarWidget";

export default function Preview() {
  const { id } = useParams<{ id: string }>();
  const [isWidgetOpen, setIsWidgetOpen] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [skippedSteps, setSkippedSteps] = useState<Set<string>>(new Set());

  const { data: config, isLoading: configLoading } = useConfiguration(id);
  const { data: steps = [], isLoading: stepsLoading } = useConfigurationSteps(id);

  const currentStep = steps[currentStepIndex];
  const { data: actions = [] } = useStepActions(currentStep?.id);

  const progress = steps.length > 0 
    ? Math.round(((completedSteps.size + skippedSteps.size) / steps.length) * 100) 
    : 0;

  const handleCompleteStep = () => {
    if (currentStep) {
      setCompletedSteps((prev) => new Set(prev).add(currentStep.id));
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      }
    }
  };

  const handleSkipStep = () => {
    if (currentStep && !currentStep.is_required) {
      setSkippedSteps((prev) => new Set(prev).add(currentStep.id));
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      }
    }
  };

  const getStepStatus = (step: SetupStep) => {
    if (completedSteps.has(step.id)) return "completed";
    if (skippedSteps.has(step.id)) return "skipped";
    if (steps[currentStepIndex]?.id === step.id) return "current";
    return "pending";
  };

  if (configLoading || stepsLoading) {
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
        <div className="flex items-center gap-4 border-b border-border bg-background p-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/config/${id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Preview: {config.name}</h1>
            <p className="text-sm text-muted-foreground">
              Simulação do widget como o cliente verá
            </p>
          </div>
          <Badge variant="outline">{config.widget_position}</Badge>
        </div>

        {/* Preview Area */}
        <div className={cn(
          "relative flex-1 bg-muted/30 p-8",
          config.widget_position === "top-bar" && isWidgetOpen && "pt-24"
        )}>
          {/* Top Bar Widget */}
          {config.widget_position === "top-bar" && isWidgetOpen && (
            <TopBarWidget
              configName={config.name}
              steps={steps}
              currentStepIndex={currentStepIndex}
              completedSteps={completedSteps}
              skippedSteps={skippedSteps}
              actions={actions}
              onStepChange={setCurrentStepIndex}
              onComplete={handleCompleteStep}
              onSkip={handleSkipStep}
              onClose={() => setIsWidgetOpen(false)}
            />
          )}

          {/* Simulated Page */}
          <div className="mx-auto h-full max-w-4xl rounded-lg border border-border bg-background shadow-lg">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-destructive/50"></div>
              <div className="h-3 w-3 rounded-full bg-warning/50"></div>
              <div className="h-3 w-3 rounded-full bg-success/50"></div>
              <div className="ml-4 flex-1 rounded bg-muted px-3 py-1 text-xs text-muted-foreground">
                {config.target_url}
              </div>
            </div>
            <div className="flex h-[calc(100%-48px)] items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-lg font-medium">Área da Aplicação Alvo</p>
                <p className="text-sm">O widget aparecerá sobre esta área</p>
              </div>
            </div>
          </div>

          {/* Widget Floating Button - Only for non-top-bar positions */}
          {config.widget_position !== "top-bar" && (
            <button
              onClick={() => setIsWidgetOpen(true)}
              className={cn(
                "fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105",
                config.widget_position === "bottom-right" && "bottom-6 right-6",
                config.widget_position === "bottom-left" && "bottom-6 left-6",
                config.widget_position === "top-right" && "top-20 right-6",
                config.widget_position === "top-left" && "top-20 left-6",
                isWidgetOpen && "hidden"
              )}
            >
              <Play className="h-6 w-6" />
              {steps.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                  {completedSteps.size}/{steps.length}
                </span>
              )}
            </button>
          )}

          {/* Top Bar Minimized Button */}
          {config.widget_position === "top-bar" && !isWidgetOpen && (
            <button
              onClick={() => setIsWidgetOpen(true)}
              className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-lg transition-all hover:scale-105"
            >
              <Play className="h-4 w-4" />
              <span className="text-sm font-medium">{completedSteps.size}/{steps.length}</span>
            </button>
          )}

          {/* Widget Sidebar - Only for non-top-bar positions */}
          {config.widget_position !== "top-bar" && isWidgetOpen && (
            <div
              className={cn(
                "fixed top-0 z-50 flex h-full w-96 flex-col bg-background shadow-2xl",
                config.widget_position.includes("right") ? "right-0" : "left-0"
              )}
            >
              {/* Widget Header */}
              <div className="flex items-center justify-between border-b border-border bg-primary px-4 py-3">
                <div>
                  <h3 className="font-semibold text-primary-foreground">{config.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-primary-foreground/80">
                    <span>{progress}% completo</span>
                    <span>•</span>
                    <span>{completedSteps.size + skippedSteps.size}/{steps.length} etapas</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={() => setIsWidgetOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="h-1 bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Steps Mini Map */}
              <div className="flex gap-1 overflow-x-auto border-b border-border p-2">
                {steps.map((step, index) => {
                  const status = getStepStatus(step);
                  return (
                    <button
                      key={step.id}
                      onClick={() => setCurrentStepIndex(index)}
                      className={cn(
                        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium transition-all",
                        status === "completed" && "bg-success text-success-foreground",
                        status === "skipped" && "bg-muted text-muted-foreground",
                        status === "current" && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                        status === "pending" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {status === "completed" ? (
                        <Check className="h-4 w-4" />
                      ) : status === "skipped" ? (
                        <SkipForward className="h-3 w-3" />
                      ) : (
                        index + 1
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Current Step Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {currentStep ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                        {currentStepIndex + 1}
                      </span>
                      <h4 className="flex-1 font-semibold">{currentStep.title}</h4>
                      <Badge variant={currentStep.is_required ? "default" : "secondary"}>
                        {currentStep.is_required ? "Obrigatório" : "Opcional"}
                      </Badge>
                    </div>

                    {currentStep.description && (
                      <p className="text-sm text-muted-foreground">{currentStep.description}</p>
                    )}

                    {currentStep.image_url && (
                      <img
                        src={currentStep.image_url}
                        alt="Instrução"
                        className="w-full rounded-lg border border-border"
                      />
                    )}

                    {currentStep.instructions && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Instruções</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm whitespace-pre-wrap">{currentStep.instructions}</p>
                        </CardContent>
                      </Card>
                    )}

                    {currentStep.tips && (
                      <div className="rounded-lg bg-secondary/50 p-3">
                        <p className="text-sm">
                          <strong>Dica:</strong> {currentStep.tips}
                        </p>
                      </div>
                    )}

                    {actions.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Ações Automatizadas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {actions.map((action, index) => (
                              <li key={action.id} className="flex items-center gap-2 text-sm">
                                <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-xs">
                                  {index + 1}
                                </span>
                                <span className="capitalize">{action.action_type}</span>
                                {action.selector && (
                                  <code className="rounded bg-muted px-1 text-xs">
                                    {action.selector}
                                  </code>
                                )}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <p>Nenhum passo configurado</p>
                  </div>
                )}
              </div>

              {/* Widget Footer */}
              {currentStep && (
                <div className="border-t border-border p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="w-full">
                      <Play className="mr-2 h-4 w-4" />
                      Executar Auto
                    </Button>
                    <Button variant="outline" className="w-full">
                      Fazer Manual
                    </Button>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={currentStepIndex === 0}
                      onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    {!currentStep.is_required && !skippedSteps.has(currentStep.id) && (
                      <Button variant="ghost" className="flex-1" onClick={handleSkipStep}>
                        <SkipForward className="mr-2 h-4 w-4" />
                        Pular
                      </Button>
                    )}
                    
                    <Button 
                      className="flex-1" 
                      onClick={handleCompleteStep}
                      disabled={completedSteps.has(currentStep.id)}
                    >
                      {completedSteps.has(currentStep.id) ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Concluído
                        </>
                      ) : (
                        "Concluir Etapa"
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={currentStepIndex === steps.length - 1}
                      onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
