import { X, MessageSquare, Type, Sparkles, MousePointer, Keyboard, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { TourStep, TourStepType, TooltipPosition } from '@/types/visualBuilder';

interface StepPreviewModalProps {
  step: TourStep | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const stepTypeIcons: Record<TourStepType, React.ReactNode> = {
  tooltip: <MessageSquare className="h-5 w-5" />,
  modal: <Type className="h-5 w-5" />,
  highlight: <Sparkles className="h-5 w-5" />,
  click: <MousePointer className="h-5 w-5" />,
  input: <Keyboard className="h-5 w-5" />,
  wait: <Clock className="h-5 w-5" />,
};

const stepTypeLabels: Record<TourStepType, string> = {
  tooltip: 'Tooltip',
  modal: 'Modal',
  highlight: 'Destaque',
  click: 'Clique',
  input: 'Input',
  wait: 'Aguardar',
};

const positionLabels: Record<TooltipPosition, string> = {
  top: 'Acima',
  bottom: 'Abaixo',
  left: 'Esquerda',
  right: 'Direita',
  auto: 'Automático',
};

export function StepPreviewModal({ step, open, onOpenChange }: StepPreviewModalProps) {
  if (!step) return null;

  const position = step.config.position || 'auto';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-primary">{stepTypeIcons[step.type]}</span>
            Preview: {step.config.title || `Passo ${step.order + 1}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Visual Preview Area */}
          <div className="relative bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20 p-8 min-h-[300px] flex items-center justify-center">
            {/* Simulated Page */}
            <div className="relative w-full max-w-md">
              {/* Target Element Placeholder */}
              <div className="relative">
                <div 
                  className={`
                    bg-primary/10 border-2 border-primary rounded-lg p-4 text-center
                    ${step.config.highlightAnimation === 'pulse' ? 'animate-pulse' : ''}
                    ${step.config.highlightAnimation === 'glow' ? 'shadow-lg shadow-primary/50' : ''}
                    ${step.config.highlightAnimation === 'border' ? 'border-4' : ''}
                  `}
                  style={step.config.highlightColor ? { borderColor: step.config.highlightColor } : undefined}
                >
                  <span className="text-sm text-muted-foreground font-mono">
                    {step.selector.length > 40 ? step.selector.slice(0, 40) + '...' : step.selector}
                  </span>
                </div>

                {/* Tooltip/Modal Preview */}
                {(step.type === 'tooltip' || step.type === 'modal') && (
                  <div 
                    className={`
                      absolute bg-card border rounded-lg shadow-xl p-4 w-64 z-10
                      ${position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-3' : ''}
                      ${position === 'bottom' || position === 'auto' ? 'top-full left-1/2 -translate-x-1/2 mt-3' : ''}
                      ${position === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-3' : ''}
                      ${position === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-3' : ''}
                    `}
                  >
                    {/* Arrow */}
                    <div 
                      className={`
                        absolute w-3 h-3 bg-card border rotate-45
                        ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1.5 border-t-0 border-l-0' : ''}
                        ${position === 'bottom' || position === 'auto' ? 'bottom-full left-1/2 -translate-x-1/2 mb-1.5 border-b-0 border-r-0' : ''}
                        ${position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1.5 border-t-0 border-r-0' : ''}
                        ${position === 'right' ? 'right-full top-1/2 -translate-y-1/2 mr-1.5 border-b-0 border-l-0' : ''}
                      `}
                    />
                    
                    {step.config.imageUrl && (
                      <img 
                        src={step.config.imageUrl} 
                        alt="Step image" 
                        className="w-full h-24 object-cover rounded mb-3"
                      />
                    )}
                    
                    <h4 className="font-semibold text-foreground mb-1">
                      {step.config.title || 'Título do passo'}
                    </h4>
                    
                    {step.config.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {step.config.description}
                      </p>
                    )}
                    
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">
                        {step.config.buttonText || 'Próximo'}
                      </Button>
                      {step.config.showSkip && (
                        <Button size="sm" variant="ghost">
                          {step.config.skipButtonText || 'Pular'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Wait indicator */}
                {step.type === 'wait' && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Aguardando {step.config.delayMs || 500}ms</span>
                  </div>
                )}

                {/* Click indicator */}
                {step.type === 'click' && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-primary/20 animate-ping" />
                    <MousePointer className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Tipo:</span>
                <Badge variant="secondary" className="gap-1">
                  {stepTypeIcons[step.type]}
                  {stepTypeLabels[step.type]}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Posição:</span>
                <Badge variant="outline">{positionLabels[position]}</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-muted-foreground">Seletor:</span>
                <code className="ml-2 text-xs bg-muted px-2 py-1 rounded font-mono">
                  {step.selector.length > 30 ? step.selector.slice(0, 30) + '...' : step.selector}
                </code>
              </div>
              {step.config.delayMs && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Delay:</span>
                  <span>{step.config.delayMs}ms</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
