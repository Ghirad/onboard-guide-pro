import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  SkipForward, 
  Play,
  ChevronDown,
  Minimize2
} from "lucide-react";
import { SetupStep, StepAction } from "@/types/database";
import { cn } from "@/lib/utils";

interface TopBarWidgetProps {
  configName: string;
  steps: SetupStep[];
  currentStepIndex: number;
  completedSteps: Set<string>;
  skippedSteps: Set<string>;
  actions: StepAction[];
  onStepChange: (index: number) => void;
  onComplete: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export function TopBarWidget({
  configName,
  steps,
  currentStepIndex,
  completedSteps,
  skippedSteps,
  actions,
  onStepChange,
  onComplete,
  onSkip,
  onClose,
}: TopBarWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const currentStep = steps[currentStepIndex];
  const progress = steps.length > 0 
    ? Math.round(((completedSteps.size + skippedSteps.size) / steps.length) * 100) 
    : 0;

  const getStepStatus = (step: SetupStep) => {
    if (completedSteps.has(step.id)) return "completed";
    if (skippedSteps.has(step.id)) return "skipped";
    if (steps[currentStepIndex]?.id === step.id) return "current";
    return "pending";
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-lg transition-all hover:scale-105"
      >
        <Play className="h-4 w-4" />
        <span className="text-sm font-medium">{completedSteps.size}/{steps.length}</span>
      </button>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border shadow-md">
      {/* Main Bar */}
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Progress Dots */}
        <div className="flex items-center gap-1">
          {steps.map((step, index) => {
            const status = getStepStatus(step);
            return (
              <button
                key={step.id}
                onClick={() => onStepChange(index)}
                className={cn(
                  "h-3 w-3 rounded-full transition-all hover:scale-125",
                  status === "completed" && "bg-emerald-500",
                  status === "skipped" && "bg-muted-foreground/50",
                  status === "current" && "bg-primary ring-2 ring-primary/30 ring-offset-1",
                  status === "pending" && "bg-muted-foreground/30"
                )}
                title={`${step.title} - ${status === "completed" ? "Concluído" : status === "skipped" ? "Pulado" : status === "current" ? "Atual" : "Pendente"}`}
              />
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* Current Step Info */}
        <Popover open={isExpanded} onOpenChange={setIsExpanded}>
          <PopoverTrigger asChild>
            <button className="flex flex-1 items-center gap-3 text-left hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {currentStepIndex + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{currentStep?.title || "Sem passos"}</p>
                {currentStep?.description && (
                  <p className="text-xs text-muted-foreground truncate">{currentStep.description}</p>
                )}
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
            </button>
          </PopoverTrigger>
          
          <PopoverContent className="w-96 p-0" align="start">
            {currentStep && (
              <div className="space-y-4 p-4">
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
                      <strong>💡 Dica:</strong> {currentStep.tips}
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

                {/* Actions in Popover */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" className="w-full">
                    <Play className="mr-2 h-4 w-4" />
                    Executar Auto
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Fazer Manual
                  </Button>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Progress */}
        <div className="flex items-center gap-3 w-48">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {completedSteps.size + skippedSteps.size}/{steps.length}
          </span>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* Navigation Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={currentStepIndex === 0}
            onClick={() => onStepChange(currentStepIndex - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {currentStep && !currentStep.is_required && !skippedSteps.has(currentStep.id) && (
            <Button variant="ghost" size="sm" onClick={onSkip}>
              <SkipForward className="mr-1 h-4 w-4" />
              Pular
            </Button>
          )}

          <Button 
            size="sm"
            onClick={onComplete}
            disabled={!currentStep || completedSteps.has(currentStep?.id || "")}
          >
            {currentStep && completedSteps.has(currentStep.id) ? (
              <>
                <Check className="mr-1 h-4 w-4" />
                Feito
              </>
            ) : (
              "Concluir"
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={currentStepIndex === steps.length - 1}
            onClick={() => onStepChange(currentStepIndex + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* Minimize/Close */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMinimized(true)}
            title="Minimizar"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
