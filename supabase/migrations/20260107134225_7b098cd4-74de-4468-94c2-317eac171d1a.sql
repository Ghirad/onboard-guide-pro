-- Create table to store user branch choices
CREATE TABLE public.user_branch_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  configuration_id UUID NOT NULL REFERENCES public.setup_configurations(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.setup_steps(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.step_branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one choice per step per client
  UNIQUE(client_id, configuration_id, step_id)
);

-- Enable RLS
ALTER TABLE public.user_branch_choices ENABLE ROW LEVEL SECURITY;

-- RLS policies (public access like user_progress)
CREATE POLICY "Anyone can insert branch choices"
ON public.user_branch_choices
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update branch choices"
ON public.user_branch_choices
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can view branch choices"
ON public.user_branch_choices
FOR SELECT
USING (true);

CREATE POLICY "Anyone can delete branch choices"
ON public.user_branch_choices
FOR DELETE
USING (true);

-- Index for faster lookups
CREATE INDEX idx_user_branch_choices_client_config 
ON public.user_branch_choices(client_id, configuration_id);