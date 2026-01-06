-- Add column for action type specific styles
ALTER TABLE setup_configurations 
ADD COLUMN IF NOT EXISTS action_type_styles JSONB DEFAULT '{}'::jsonb;