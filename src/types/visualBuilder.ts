export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto';
export type TourStepType = 'tooltip' | 'modal' | 'highlight' | 'click' | 'input' | 'wait';

export interface SelectedElement {
  tagName: string;
  id: string | null;
  classList: string[];
  textContent: string;
  selector: string;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export interface TourStep {
  id: string;
  order: number;
  type: TourStepType;
  selector: string;
  element: SelectedElement;
  config: TourStepConfig;
}

export interface TourStepConfig {
  title?: string;
  description?: string;
  position?: TooltipPosition;
  imageUrl?: string;
  buttonText?: string;
  skipButtonText?: string;
  showSkip?: boolean;
  highlightAnimation?: 'pulse' | 'glow' | 'border';
  highlightColor?: string;
  waitForClick?: boolean;
  inputPlaceholder?: string;
  delayMs?: number;
}

export interface VisualBuilderState {
  isSelectionMode: boolean;
  selectedElement: SelectedElement | null;
  steps: TourStep[];
  currentEditingStepId: string | null;
  isPreviewMode: boolean;
  previewStepIndex: number;
}
