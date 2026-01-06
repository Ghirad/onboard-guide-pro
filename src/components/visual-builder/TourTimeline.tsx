import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Eye, MessageSquare, Type, Sparkles, MousePointer, Keyboard, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TourStep, TourStepType } from '@/types/visualBuilder';

interface TourTimelineProps {
  steps: TourStep[];
  onEditStep: (step: TourStep) => void;
  onDeleteStep: (stepId: string) => void;
  onHoverStep: (selector: string | null) => void;
  onPreviewStep?: (step: TourStep) => void;
}

const stepTypeIcons: Record<TourStepType, React.ReactNode> = {
  tooltip: <MessageSquare className="h-4 w-4" />,
  modal: <Type className="h-4 w-4" />,
  highlight: <Sparkles className="h-4 w-4" />,
  click: <MousePointer className="h-4 w-4" />,
  input: <Keyboard className="h-4 w-4" />,
  wait: <Clock className="h-4 w-4" />,
};

interface SortableStepProps {
  step: TourStep;
  onEdit: () => void;
  onDelete: () => void;
  onPreview?: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function SortableStep({ step, onEdit, onDelete, onPreview, onMouseEnter, onMouseLeave }: SortableStepProps) {
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
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-card border rounded-lg group hover:border-primary/50 transition-colors"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
        {stepTypeIcons[step.type]}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {step.config.title || `${step.type.charAt(0).toUpperCase() + step.type.slice(1)} Step`}
        </p>
        <code className="text-xs text-muted-foreground font-mono truncate block">
          {step.selector}
        </code>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onPreview && (
          <Button variant="ghost" size="icon" onClick={onPreview} title="Preview">
            <Eye className="h-4 w-4 text-primary" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onEdit} title="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} title="Remover">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export function TourTimeline({
  steps,
  onEditStep,
  onDeleteStep,
  onHoverStep,
  onPreviewStep,
}: TourTimelineProps) {
  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <Sparkles className="h-12 w-12 mb-4 opacity-50" />
        <p className="font-medium">No steps yet</p>
        <p className="text-sm">Click on elements in the preview to add steps</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Tour Steps</h3>
        <span className="text-sm text-muted-foreground">{steps.length} steps</span>
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <SortableStep
            key={step.id}
            step={step}
            onEdit={() => onEditStep(step)}
            onDelete={() => onDeleteStep(step.id)}
            onPreview={onPreviewStep ? () => onPreviewStep(step) : undefined}
            onMouseEnter={() => onHoverStep(step.selector)}
            onMouseLeave={() => onHoverStep(null)}
          />
        ))}
      </div>
    </div>
  );
}
