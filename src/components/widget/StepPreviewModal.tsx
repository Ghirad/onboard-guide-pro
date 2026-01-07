import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Eye, 
  ChevronRight,
  MousePointer,
  Type,
  Scroll,
  Clock,
  Sparkles,
  ExternalLink,
  Check,
  SkipForward
} from "lucide-react";
import { SetupStep, StepAction } from "@/types/database";
import { cn } from "@/lib/utils";

interface StepPreviewModalProps {
  step: SetupStep | null;
  stepIndex: number;
  totalSteps: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoToStep: (index: number) => void;
  actions: StepAction[];
  previousSteps: { step: SetupStep; status: "completed" | "skipped" | "pending" }[];
}

const actionTypeIcons: Record<string, React.ReactNode> = {
  click: <MousePointer className="h-4 w-4" />,
  input: <Type className="h-4 w-4" />,
  scroll: <Scroll className="h-4 w-4" />,
  wait: <Clock className="h-4 w-4" />,
  highlight: <Sparkles className="h-4 w-4" />,
  open_modal: <ExternalLink className="h-4 w-4" />,
};

const actionTypeLabels: Record<string, string> = {
  click: "Clicar",
  input: "Preencher",
  scroll: "Rolar",
  wait: "Aguardar",
  highlight: "Destacar",
  open_modal: "Abrir Modal",
};

export function StepPreviewModal({
  step,
  stepIndex,
  totalSteps,
  open,
  onOpenChange,
  onGoToStep,
  actions,
  previousSteps,
}: StepPreviewModalProps) {
  if (!step) return null;

  // Estimate time based on actions
  const estimatedMinutes = Math.max(1, Math.ceil(actions.length * 0.5));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              Pré-visualização: Passo {stepIndex + 1} de {totalSteps}
            </span>
          </div>
          <DialogTitle className="flex items-center gap-2">
            📌 {step.title}
            {!step.is_required && (
              <Badge variant="secondary" className="text-xs">
                Opcional
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-base">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step Image */}
          {step.image_url && (
            <div className="rounded-lg overflow-hidden border">
              <img 
                src={step.image_url} 
                alt={step.title}
                className="w-full h-48 object-cover"
              />
            </div>
          )}

          {/* What you'll do */}
          {actions.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  📋 O que você vai fazer:
                </h4>
                <ol className="space-y-2">
                  {actions.map((action, index) => (
                    <li key={action.id} className="flex items-start gap-3 text-sm">
                      <span className="flex-shrink-0 h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-muted-foreground">
                          {actionTypeIcons[action.action_type]}
                        </span>
                        <span>
                          {actionTypeLabels[action.action_type]}
                          {action.selector && (
                            <code className="ml-1 text-xs bg-muted px-1 rounded">
                              {action.selector.length > 30 
                                ? action.selector.slice(0, 30) + "..." 
                                : action.selector}
                            </code>
                          )}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Estimated time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Tempo estimado: ~{estimatedMinutes} minuto{estimatedMinutes > 1 ? "s" : ""}</span>
          </div>

          {/* Previous steps needed */}
          {previousSteps.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                🔗 Passos anteriores necessários:
              </h4>
              <div className="space-y-1.5">
                {previousSteps.map(({ step: prevStep, status }) => (
                  <div 
                    key={prevStep.id} 
                    className={cn(
                      "flex items-center gap-2 text-sm p-2 rounded",
                      status === "completed" && "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
                      status === "skipped" && "text-muted-foreground bg-muted/50",
                      status === "pending" && "text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                    )}
                  >
                    {status === "completed" ? (
                      <Check className="h-4 w-4" />
                    ) : status === "skipped" ? (
                      <SkipForward className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                    <span>{prevStep.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {step.instructions && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">📝 Instruções:</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {step.instructions}
              </p>
            </div>
          )}

          {/* Tips */}
          {step.tips && (
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4">
              <p className="text-sm">
                <strong>💡 Dica:</strong> {step.tips}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={() => {
            onGoToStep(stepIndex);
            onOpenChange(false);
          }}>
            Ir para este passo
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
