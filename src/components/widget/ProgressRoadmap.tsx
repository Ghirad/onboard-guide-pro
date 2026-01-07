import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Check, 
  SkipForward, 
  Circle,
  Eye,
  RotateCcw,
  ChevronRight,
  MousePointer,
  Type,
  Scroll,
  Clock,
  Sparkles,
  ExternalLink,
  Play,
  Lock,
  GitBranch
} from "lucide-react";
import { SetupStep, StepAction } from "@/types/database";
import { VisibleStep } from "@/hooks/useVisibleSteps";
import { cn } from "@/lib/utils";

interface ProgressRoadmapProps {
  steps: SetupStep[];
  visibleSteps?: VisibleStep[];
  hasLockedSteps?: boolean;
  currentStepIndex: number;
  completedSteps: Set<string>;
  skippedSteps: Set<string>;
  actions: Record<string, StepAction[]>;
  onStepChange: (index: number) => void;
  onPreviewStep: (step: SetupStep) => void;
  onRestart: () => void;
  onRestartFrom: (stepIndex: number) => void;
}

const actionTypeIcons: Record<string, React.ReactNode> = {
  click: <MousePointer className="h-3 w-3" />,
  input: <Type className="h-3 w-3" />,
  scroll: <Scroll className="h-3 w-3" />,
  wait: <Clock className="h-3 w-3" />,
  highlight: <Sparkles className="h-3 w-3" />,
  open_modal: <ExternalLink className="h-3 w-3" />,
};

const actionTypeLabels: Record<string, string> = {
  click: "Clique",
  input: "Input",
  scroll: "Scroll",
  wait: "Espera",
  highlight: "Destaque",
  open_modal: "Abrir Modal",
};

export function ProgressRoadmap({
  steps,
  visibleSteps,
  hasLockedSteps = false,
  currentStepIndex,
  completedSteps,
  skippedSteps,
  actions,
  onStepChange,
  onPreviewStep,
  onRestart,
  onRestartFrom,
}: ProgressRoadmapProps) {
  // Use visible steps if provided, otherwise fall back to all steps
  const displaySteps = visibleSteps || steps.map(s => ({ ...s, isLocked: false, depth: 0 } as VisibleStep));
  const [showRestartOptions, setShowRestartOptions] = useState(false);

  const getStepStatus = (step: SetupStep) => {
    if (completedSteps.has(step.id)) return "completed";
    if (skippedSteps.has(step.id)) return "skipped";
    if (steps[currentStepIndex]?.id === step.id) return "current";
    return "pending";
  };

  const getStepActions = (stepId: string) => {
    return actions[stepId] || [];
  };

  const summarizeActions = (stepActions: StepAction[]) => {
    if (stepActions.length === 0) return null;
    
    const summary = stepActions.reduce((acc, action) => {
      const label = actionTypeLabels[action.action_type] || action.action_type;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(summary)
      .map(([type, count]) => count > 1 ? `${count}x ${type}` : type)
      .join(", ");
  };

  return (
    <div className="bg-background border rounded-lg shadow-lg overflow-hidden max-h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className="font-semibold">Roadmap do Onboarding</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowRestartOptions(!showRestartOptions)}
          className="gap-1"
        >
          <RotateCcw className="h-4 w-4" />
          Reiniciar
        </Button>
      </div>

      {/* Restart Options */}
      {showRestartOptions && (
        <div className="p-4 border-b bg-amber-50 dark:bg-amber-950/30">
          <p className="text-sm font-medium mb-3 text-amber-800 dark:text-amber-200">
            ⚠️ Escolha como deseja reiniciar:
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onRestart();
                setShowRestartOptions(false);
              }}
              className="justify-start"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reiniciar TUDO (voltar ao início)
            </Button>
            <div className="text-xs text-muted-foreground mt-2">
              Ou clique em "Refazer" em qualquer passo para reiniciar a partir dele
            </div>
          </div>
        </div>
      )}

      {/* Steps List */}
      <ScrollArea className="max-h-[50vh]">
        <div className="p-4 space-y-1">
          {displaySteps.map((step, index) => {
            const status = getStepStatus(step);
            const stepActions = getStepActions(step.id);
            const actionsSummary = summarizeActions(stepActions);
            const isLast = index === displaySteps.length - 1 && !hasLockedSteps;
            const originalIndex = steps.findIndex(s => s.id === step.id);

            return (
              <div key={step.id} className="relative">
                {/* Connector line */}
                {!isLast && (
                  <div 
                    className={cn(
                      "absolute left-[15px] top-[38px] w-0.5 h-[calc(100%-20px)]",
                      status === "completed" ? "bg-emerald-300" :
                      status === "skipped" ? "bg-muted-foreground/30" :
                      "bg-muted-foreground/20"
                    )}
                  />
                )}

                <div
                  className={cn(
                    "relative flex gap-3 p-3 rounded-lg transition-colors",
                    step.depth > 0 && "ml-4 border-l-2 border-primary/20",
                    status === "current" && "bg-primary/10 border-l-2 border-primary",
                    status === "completed" && "opacity-80",
                    status === "pending" && "opacity-60 hover:opacity-80",
                    status === "skipped" && "opacity-50"
                  )}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {status === "completed" ? (
                      <div className="h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    ) : status === "skipped" ? (
                      <div className="h-7 w-7 rounded-full bg-muted-foreground/50 flex items-center justify-center">
                        <SkipForward className="h-3.5 w-3.5 text-white" />
                      </div>
                    ) : status === "current" ? (
                      <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center ring-2 ring-primary/30 ring-offset-2">
                        <span className="text-xs font-bold text-primary-foreground">{originalIndex + 1}</span>
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{step.title}</span>
                      {!step.is_required && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Opcional
                        </Badge>
                      )}
                      {step.branchPath && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                          <GitBranch className="h-2.5 w-2.5" />
                          {step.branchPath}
                        </Badge>
                      )}
                      {step.hasLockedBranches && !step.branchPath && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          <GitBranch className="h-2.5 w-2.5" />
                          Escolha aqui
                        </Badge>
                      )}
                    </div>
                    
                    {step.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {step.description}
                      </p>
                    )}

                    {/* Actions summary */}
                    {actionsSummary && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                          {stepActions.slice(0, 3).map((action, i) => (
                            <span key={i} className="opacity-70">
                              {actionTypeIcons[action.action_type]}
                            </span>
                          ))}
                          <span>{actionsSummary}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex-shrink-0 flex items-start gap-1">
                    {status === "completed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onRestartFrom(originalIndex)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Refazer
                      </Button>
                    )}
                    {status === "current" && (
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onStepChange(originalIndex)}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Continuar
                      </Button>
                    )}
                    {status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onPreviewStep(step)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Pré-ver
                      </Button>
                    )}
                    {status === "skipped" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onRestartFrom(originalIndex)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Refazer
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Locked Steps Indicator */}
          {hasLockedSteps && (
            <div className="relative">
              <div 
                className="absolute left-[15px] top-0 w-0.5 h-4 bg-muted-foreground/20"
              />
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/30 ml-0">
                <div className="flex-shrink-0">
                  <div className="h-7 w-7 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Mais passos disponíveis
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Complete os passos anteriores para desbloquear novos caminhos
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t bg-muted/20 text-center">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          {completedSteps.size} de {displaySteps.length} passos concluídos
          {hasLockedSteps && (
            <span className="flex items-center gap-0.5 text-muted-foreground/70">
              <Lock className="h-3 w-3" />
              +?
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
