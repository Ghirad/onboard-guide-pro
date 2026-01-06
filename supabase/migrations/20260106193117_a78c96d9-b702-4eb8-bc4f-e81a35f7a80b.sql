-- Add allowed_routes column to setup_configurations
ALTER TABLE public.setup_configurations 
ADD COLUMN allowed_routes text[] DEFAULT '{}';

COMMENT ON COLUMN public.setup_configurations.allowed_routes IS 
'Array de rotas onde o widget deve ser exibido. Suporta wildcards como /painel/*';