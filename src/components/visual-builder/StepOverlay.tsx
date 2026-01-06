import { Button } from '@/components/ui/button';
import { TourStep } from '@/types/visualBuilder';
import { ChevronLeft, ChevronRight, X, MousePointer, Type, Eye } from 'lucide-react';

interface StepOverlayProps {
  step: TourStep;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
}

export function StepOverlay({ 
  step, 
  currentIndex, 
  totalSteps, 
  onNext, 
  onPrev, 
  onExit 
}: StepOverlayProps) {
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === totalSteps - 1;

  const getStepIcon = () => {
    switch (step.type) {
      case 'click':
        return <MousePointer className="h-4 w-4" />;
      case 'input':
        return <Type className="h-4 w-4" />;
      case 'highlight':
        return <Eye className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getPositionClasses = () => {
    const position = step.config.position || 'auto';
    switch (position) {
      case 'top':
        return 'top-8 left-1/2 -translate-x-1/2';
      case 'bottom':
        return 'bottom-8 left-1/2 -translate-x-1/2';
      case 'left':
        return 'left-8 top-1/2 -translate-y-1/2';
      case 'right':
        return 'right-8 top-1/2 -translate-y-1/2';
      default:
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  };

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 pointer-events-auto" onClick={onExit} />
      
      {/* Tooltip Card */}
      <div 
        className={`absolute ${getPositionClasses()} pointer-events-auto max-w-sm w-full mx-4 animate-fade-in`}
      >
        <div className="bg-card border border-border rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Passo {currentIndex + 1} de {totalSteps}
              </span>
              {getStepIcon() && (
                <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {getStepIcon()}
                  <span className="capitalize">{step.type}</span>
                </span>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={onExit}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Image */}
          {step.config.imageUrl && (
            <div className="w-full h-32 bg-muted">
              <img 
                src={step.config.imageUrl} 
                alt={step.config.title || 'Step image'}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-4 space-y-3">
            {step.config.title && (
              <h4 className="font-semibold text-foreground">{step.config.title}</h4>
            )}
            {step.config.description && (
              <p className="text-sm text-muted-foreground">{step.config.description}</p>
            )}
            
            {/* Selector Info */}
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs">
              <span className="text-muted-foreground">Elemento:</span>
              <code className="bg-background px-1.5 py-0.5 rounded text-primary font-mono truncate max-w-[200px]">
                {step.selector}
              </code>
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrev}
              disabled={isFirstStep}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={isLastStep ? onExit : onNext}
              className="gap-1"
            >
              {isLastStep ? 'Finalizar' : step.config.buttonText || 'Próximo'}
              {!isLastStep && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
