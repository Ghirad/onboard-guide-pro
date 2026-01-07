-- =============================================
-- Update RLS policies to allow admins to see all configurations
-- =============================================

-- 1. Update setup_configurations policies
DROP POLICY IF EXISTS "Users can view own configurations" ON public.setup_configurations;
DROP POLICY IF EXISTS "Users can insert own configurations" ON public.setup_configurations;
DROP POLICY IF EXISTS "Users can update own configurations" ON public.setup_configurations;
DROP POLICY IF EXISTS "Users can delete own configurations" ON public.setup_configurations;

CREATE POLICY "Users can view configurations" ON public.setup_configurations
  FOR SELECT USING (
    auth.uid() = user_id 
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can insert own configurations" ON public.setup_configurations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update configurations" ON public.setup_configurations
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can delete configurations" ON public.setup_configurations
  FOR DELETE USING (
    auth.uid() = user_id 
    OR public.has_role(auth.uid(), 'admin')
  );

-- 2. Update setup_steps policies
DROP POLICY IF EXISTS "Users can view steps of own configurations" ON public.setup_steps;
DROP POLICY IF EXISTS "Users can insert steps to own configurations" ON public.setup_steps;
DROP POLICY IF EXISTS "Users can update steps of own configurations" ON public.setup_steps;
DROP POLICY IF EXISTS "Users can delete steps of own configurations" ON public.setup_steps;

CREATE POLICY "Users can view steps" ON public.setup_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.setup_configurations
      WHERE id = configuration_id 
      AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can insert steps" ON public.setup_steps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.setup_configurations
      WHERE id = configuration_id 
      AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can update steps" ON public.setup_steps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.setup_configurations
      WHERE id = configuration_id 
      AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can delete steps" ON public.setup_steps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.setup_configurations
      WHERE id = configuration_id 
      AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- 3. Update step_actions policies
DROP POLICY IF EXISTS "Users can view actions of own steps" ON public.step_actions;
DROP POLICY IF EXISTS "Users can insert actions to own steps" ON public.step_actions;
DROP POLICY IF EXISTS "Users can update actions of own steps" ON public.step_actions;
DROP POLICY IF EXISTS "Users can delete actions of own steps" ON public.step_actions;

CREATE POLICY "Users can view actions" ON public.step_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.setup_steps s
      JOIN public.setup_configurations c ON s.configuration_id = c.id
      WHERE s.id = step_id 
      AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can insert actions" ON public.step_actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.setup_steps s
      JOIN public.setup_configurations c ON s.configuration_id = c.id
      WHERE s.id = step_id 
      AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can update actions" ON public.step_actions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.setup_steps s
      JOIN public.setup_configurations c ON s.configuration_id = c.id
      WHERE s.id = step_id 
      AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can delete actions" ON public.step_actions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.setup_steps s
      JOIN public.setup_configurations c ON s.configuration_id = c.id
      WHERE s.id = step_id 
      AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- 4. Update step_branches policies
DROP POLICY IF EXISTS "Users can view branches for their steps" ON public.step_branches;
DROP POLICY IF EXISTS "Users can insert branches for their steps" ON public.step_branches;
DROP POLICY IF EXISTS "Users can update branches for their steps" ON public.step_branches;
DROP POLICY IF EXISTS "Users can delete branches for their steps" ON public.step_branches;

CREATE POLICY "Users can view branches" ON public.step_branches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.setup_steps s
      JOIN public.setup_configurations c ON s.configuration_id = c.id
      WHERE s.id = step_id 
      AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can insert branches" ON public.step_branches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.setup_steps s
      JOIN public.setup_configurations c ON s.configuration_id = c.id
      WHERE s.id = step_id 
      AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can update branches" ON public.step_branches
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.setup_steps s
      JOIN public.setup_configurations c ON s.configuration_id = c.id
      WHERE s.id = step_id 
      AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can delete branches" ON public.step_branches
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.setup_steps s
      JOIN public.setup_configurations c ON s.configuration_id = c.id
      WHERE s.id = step_id 
      AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );