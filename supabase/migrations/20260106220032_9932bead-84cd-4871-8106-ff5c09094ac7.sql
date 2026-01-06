-- Add theme customization columns to setup_configurations
ALTER TABLE setup_configurations 
ADD COLUMN IF NOT EXISTS theme_template VARCHAR(50) DEFAULT 'modern',
ADD COLUMN IF NOT EXISTS theme_primary_color VARCHAR(20) DEFAULT '#6366f1',
ADD COLUMN IF NOT EXISTS theme_secondary_color VARCHAR(20) DEFAULT '#8b5cf6',
ADD COLUMN IF NOT EXISTS theme_background_color VARCHAR(20) DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS theme_text_color VARCHAR(20) DEFAULT '#1f2937',
ADD COLUMN IF NOT EXISTS theme_highlight_animation VARCHAR(20) DEFAULT 'pulse',
ADD COLUMN IF NOT EXISTS theme_border_radius VARCHAR(20) DEFAULT 'rounded';