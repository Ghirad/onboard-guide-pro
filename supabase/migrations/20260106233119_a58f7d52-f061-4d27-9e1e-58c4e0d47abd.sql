-- Adicionar coluna theme_override na tabela setup_steps
ALTER TABLE public.setup_steps 
ADD COLUMN theme_override JSONB DEFAULT NULL;

COMMENT ON COLUMN public.setup_steps.theme_override IS 
  'Configurações de tema específicas deste passo que sobrescrevem o tema global';