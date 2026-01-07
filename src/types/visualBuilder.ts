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
  // Branch/flow fields
  is_branch_point?: boolean;
  default_next_step_id?: string | null;
}

export interface StepThemeOverride {
  enabled?: boolean;
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  animation?: 'pulse' | 'glow' | 'border' | 'shake' | 'bounce' | 'fade';
  borderRadius?: 'none' | 'sm' | 'rounded' | 'lg' | 'xl';
}

export interface TourStepConfig {
  title?: string;
  description?: string;
  position?: TooltipPosition;
  imageUrl?: string;
  buttonText?: string;
  skipButtonText?: string;
  showSkip?: boolean;
  showNextButton?: boolean;
  highlightAnimation?: 'pulse' | 'glow' | 'border';
  highlightColor?: string;
  waitForClick?: boolean;
  inputPlaceholder?: string;
  delayMs?: number;
  themeOverride?: StepThemeOverride;
}

export interface VisualBuilderState {
  isSelectionMode: boolean;
  selectedElement: SelectedElement | null;
  steps: TourStep[];
  currentEditingStepId: string | null;
  isPreviewMode: boolean;
  previewStepIndex: number;
}
