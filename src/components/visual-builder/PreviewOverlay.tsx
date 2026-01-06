import { useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TourStep } from '@/types/visualBuilder';

interface PreviewOverlayProps {
  steps: TourStep[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
}

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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t shadow-lg animate-fade-in">
      <div className="max-w-3xl mx-auto p-4">
        {/* Progress bar */}
        <Progress value={progress} className="h-1 mb-4" />

        <div className="flex items-center gap-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 min-w-[100px]">
            <Play className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              Step {currentIndex + 1} of {steps.length}
            </span>
          </div>

          {/* Current step info */}
          <div className="flex-1 text-center">
            <h3 className="font-semibold text-foreground">
              {currentStep.config.title || `Step ${currentIndex + 1}`}
            </h3>
            {currentStep.config.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {currentStep.config.description}
              </p>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
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
