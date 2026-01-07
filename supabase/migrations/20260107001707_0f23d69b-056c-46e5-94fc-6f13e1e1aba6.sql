-- Add tooltip_position column to setup_steps table
ALTER TABLE public.setup_steps ADD COLUMN tooltip_position text DEFAULT 'auto';