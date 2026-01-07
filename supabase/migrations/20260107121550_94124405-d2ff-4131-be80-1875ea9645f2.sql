-- Add 'redirect' to action_type enum
ALTER TYPE action_type ADD VALUE 'redirect';

-- Add columns for redirect action
ALTER TABLE step_actions 
ADD COLUMN IF NOT EXISTS redirect_url text,
ADD COLUMN IF NOT EXISTS redirect_type text DEFAULT 'push',
ADD COLUMN IF NOT EXISTS redirect_delay_ms integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS redirect_wait_for_load boolean DEFAULT true;