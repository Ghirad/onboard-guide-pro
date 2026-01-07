export type ActionType = 'click' | 'input' | 'scroll' | 'wait' | 'highlight' | 'open_modal' | 'redirect';
export type HighlightAnimation = 'pulse' | 'glow' | 'border';
export type StepTargetType = 'page' | 'modal';
export type ProgressStatus = 'pending' | 'completed' | 'skipped';
export type RedirectType = 'push' | 'replace';
export type BranchConditionType = 'click' | 'selector' | 'custom';

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SetupConfiguration {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  target_url: string;
  is_active: boolean;
  widget_position: string;
  auto_start: boolean;
  allowed_routes?: string[] | null;
  api_key: string;
  created_at: string;
  updated_at: string;
}

export interface SetupStep {
  id: string;
  configuration_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  target_type: StepTargetType;
  target_selector: string | null;
  target_url: string | null;
  is_required: boolean;
  step_order: number;
  image_url: string | null;
  tips: string | null;
  created_at: string;
  updated_at: string;
  // Branch/flow fields
  default_next_step_id: string | null;
  is_branch_point: boolean;
  position_x: number;
  position_y: number;
}

export interface StepAction {
  id: string;
  step_id: string;
  action_type: ActionType;
  selector: string | null;
  value: string | null;
  delay_ms: number;
  scroll_to_element: boolean;
  scroll_behavior: string;
  scroll_position: string;
  highlight_color: string;
  highlight_duration_ms: number;
  highlight_animation: HighlightAnimation;
  wait_for_element: boolean;
  input_type: string;
  action_order: number;
  description: string | null;
  created_at: string;
  redirect_url: string | null;
  redirect_type: RedirectType;
  redirect_delay_ms: number;
  redirect_wait_for_load: boolean;
}

export interface StepBranch {
  id: string;
  step_id: string;
  condition_type: BranchConditionType;
  condition_value: string | null;
  condition_label: string;
  next_step_id: string | null;
  branch_order: number;
  created_at: string;
}

export interface UserProgress {
  id: string;
  configuration_id: string;
  client_id: string;
  step_id: string | null;
  status: ProgressStatus;
  completed_at: string | null;
  skipped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SetupConfigurationWithSteps extends SetupConfiguration {
  steps: SetupStepWithActions[];
}

export interface SetupStepWithActions extends SetupStep {
  actions: StepAction[];
  branches?: StepBranch[];
}
