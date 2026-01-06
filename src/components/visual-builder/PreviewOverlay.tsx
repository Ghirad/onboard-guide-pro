import { useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Play, MessageSquare, Type, Sparkles, MousePointer, Keyboard, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TourStep, TourStepType, TooltipPosition } from '@/types/visualBuilder';

interface PreviewOverlayProps {
  steps: TourStep[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
}

const stepTypeIcons: Record<TourStepType, React.ReactNode> = {
  tooltip: <MessageSquare className="h-4 w-4" />,
  modal: <Type className="h-4 w-4" />,
  highlight: <Sparkles className="h-4 w-4" />,
  click: <MousePointer className="h-4 w-4" />,
  input: <Keyboard className="h-4 w-4" />,
  wait: <Clock className="h-4 w-4" />,
};

const positionLabels: Record<TooltipPosition, string> = {
  top: '↑ Acima',
  bottom: '↓ Abaixo',
  left: '← Esquerda',
  right: '→ Direita',
  auto: '◉ Auto',
};

export function PreviewOverlay({
  steps,
  currentIndex,
  onNext,
  onPrev,
  onExit,
}: PreviewOverlayProps) {
  const currentStep = steps[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;
  const progress = ((currentIndex + 1) / steps.length) * 100;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'Enter':
      case ' ':
        e.preventDefault();
        onNext();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        onPrev();
        break;
      case 'Escape':
        e.preventDefault();
        onExit();
        break;
    }
  }, [onNext, onPrev, onExit]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Auto-advance for wait steps
  useEffect(() => {
    if (currentStep?.type === 'wait' && currentStep.config.delayMs) {
      const timer = setTimeout(onNext, currentStep.config.delayMs);
      return () => clearTimeout(timer);
    }
  }, [currentStep, onNext]);

  if (!currentStep) return null;

  const position = currentStep.config.position || 'auto';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t shadow-lg animate-fade-in">
      <div className="max-w-4xl mx-auto p-4">
        {/* Progress bar */}
        <Progress value={progress} className="h-1 mb-4" />

        <div className="flex items-start gap-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2 min-w-[100px]">
            <Play className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              Step {currentIndex + 1} of {steps.length}
            </span>
          </div>

          {/* Visual Preview Card */}
          <div className="flex-1 flex gap-4">
            {/* Mini tooltip preview */}
            <div className="bg-muted/50 rounded-lg p-3 border flex-shrink-0 w-48">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-primary">{stepTypeIcons[currentStep.type]}</span>
                <span className="text-xs font-medium capitalize">{currentStep.type}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {positionLabels[position]}
                </span>
              </div>
              
              {/* Mini tooltip representation */}
              <div className="relative bg-card border rounded p-2 text-xs">
                <div className="font-medium truncate">
                  {currentStep.config.title || 'Título'}
                </div>
                {currentStep.config.description && (
                  <div className="text-muted-foreground truncate mt-0.5">
                    {currentStep.config.description}
                  </div>
                )}
                <div className="flex gap-1 mt-2">
                  <div className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-[10px]">
                    {currentStep.config.buttonText || 'Próximo'}
                  </div>
                  {currentStep.config.showSkip && (
                    <div className="bg-muted px-2 py-0.5 rounded text-[10px]">
                      Pular
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Current step info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {currentStep.config.title || `Step ${currentIndex + 1}`}
              </h3>
              {currentStep.config.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {currentStep.config.description}
                </p>
              )}
              <code className="text-xs text-muted-foreground font-mono mt-2 block truncate">
                {currentStep.selector}
              </code>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrev}
              disabled={isFirst}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <Button
              size="sm"
              onClick={onNext}
            >
              {isLast ? 'Finish' : 'Next'}
              {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onExit}
              className="ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="flex justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <span>← → Navigate</span>
          <span>Enter/Space Next</span>
          <span>Esc Exit</span>
        </div>
      </div>
    </div>
  );
}
