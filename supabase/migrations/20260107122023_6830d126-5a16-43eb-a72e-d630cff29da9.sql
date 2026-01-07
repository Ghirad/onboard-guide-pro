-- Tabela para definir condições/ramificações de um passo
CREATE TABLE public.step_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid REFERENCES public.setup_steps(id) ON DELETE CASCADE NOT NULL,
  condition_type text NOT NULL DEFAULT 'click',
  condition_value text,
  condition_label text NOT NULL,
  next_step_id uuid REFERENCES public.setup_steps(id) ON DELETE SET NULL,
  branch_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Adicionar campos para controle de fluxo e posicionamento no flowchart
ALTER TABLE public.setup_steps 
ADD COLUMN default_next_step_id uuid REFERENCES public.setup_steps(id) ON DELETE SET NULL,
ADD COLUMN is_branch_point boolean DEFAULT false,
ADD COLUMN position_x integer DEFAULT 0,
ADD COLUMN position_y integer DEFAULT 0;

-- Habilitar RLS
ALTER TABLE public.step_branches ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para step_branches
CREATE POLICY "Users can view branches for their steps" ON public.step_branches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.setup_steps s
      JOIN public.setup_configurations c ON s.configuration_id = c.id
      WHERE s.id = step_branches.step_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert branches for their steps" ON public.step_branches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.setup_steps s
      JOIN public.setup_configurations c ON s.configuration_id = c.id
      WHERE s.id = step_branches.step_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update branches for their steps" ON public.step_branches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.setup_steps s
      JOIN public.setup_configurations c ON s.configuration_id = c.id
      WHERE s.id = step_branches.step_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete branches for their steps" ON public.step_branches
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.setup_steps s
      JOIN public.setup_configurations c ON s.configuration_id = c.id
      WHERE s.id = step_branches.step_id AND c.user_id = auth.uid()
    )
  );