-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create enum for action types
CREATE TYPE public.action_type AS ENUM ('click', 'input', 'scroll', 'wait', 'highlight', 'open_modal');

-- Create enum for highlight animation types
CREATE TYPE public.highlight_animation AS ENUM ('pulse', 'glow', 'border');

-- Create enum for step target types
CREATE TYPE public.step_target_type AS ENUM ('page', 'modal');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Create setup_configurations table
CREATE TABLE public.setup_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  widget_position TEXT DEFAULT 'bottom-right',
  auto_start BOOLEAN DEFAULT false,
  api_key TEXT DEFAULT gen_random_uuid()::text NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create setup_steps table
CREATE TABLE public.setup_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id UUID REFERENCES public.setup_configurations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  target_type step_target_type DEFAULT 'page' NOT NULL,
  target_selector TEXT,
  target_url TEXT,
  is_required BOOLEAN DEFAULT true NOT NULL,
  step_order INTEGER NOT NULL,
  image_url TEXT,
  tips TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create step_actions table
CREATE TABLE public.step_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID REFERENCES public.setup_steps(id) ON DELETE CASCADE NOT NULL,
  action_type action_type NOT NULL,
  selector TEXT,
  value TEXT,
  delay_ms INTEGER DEFAULT 0,
  scroll_to_element BOOLEAN DEFAULT true,
  scroll_behavior TEXT DEFAULT 'smooth',
  scroll_position TEXT DEFAULT 'center',
  highlight_color TEXT DEFAULT '#ff9f0d',
  highlight_duration_ms INTEGER DEFAULT 2000,
  highlight_animation highlight_animation DEFAULT 'pulse',
  wait_for_element BOOLEAN DEFAULT false,
  input_type TEXT DEFAULT 'text',
  action_order INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_progress table (for tracking client progress)
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id UUID REFERENCES public.setup_configurations(id) ON DELETE CASCADE NOT NULL,
  client_id TEXT NOT NULL,
  step_id UUID REFERENCES public.setup_steps(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  skipped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (configuration_id, client_id, step_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setup_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setup_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles (only admins can manage roles)
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for setup_configurations
CREATE POLICY "Users can view own configurations" ON public.setup_configurations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own configurations" ON public.setup_configurations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own configurations" ON public.setup_configurations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own configurations" ON public.setup_configurations
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for setup_steps (via configuration ownership)
CREATE POLICY "Users can view steps of own configurations" ON public.setup_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.setup_configurations
      WHERE id = configuration_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert steps to own configurations" ON public.setup_steps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.setup_configurations
      WHERE id = configuration_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update steps of own configurations" ON public.setup_steps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.setup_configurations
      WHERE id = configuration_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete steps of own configurations" ON public.setup_steps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.setup_configurations
      WHERE id = configuration_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for step_actions (via step -> configuration ownership)
CREATE POLICY "Users can view actions of own steps" ON public.step_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.setup_steps s
      JOIN public.setup_configurations c ON s.configuration_id = c.id
      WHERE s.id = step_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert actions to own steps" ON public.step_actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.setup_steps s
      JOIN public.setup_configurations c ON s.configuration_id = c.id
      WHERE s.id = step_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update actions of own steps" ON public.step_actions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.setup_steps s
      JOIN public.setup_configurations c ON s.configuration_id = c.id
      WHERE s.id = step_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete actions of own steps" ON public.step_actions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.setup_steps s
      JOIN public.setup_configurations c ON s.configuration_id = c.id
      WHERE s.id = step_id AND c.user_id = auth.uid()
    )
  );

-- RLS Policies for user_progress (public read via api_key, write by anyone)
CREATE POLICY "Anyone can view progress by configuration" ON public.user_progress
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert progress" ON public.user_progress
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update progress" ON public.user_progress
  FOR UPDATE USING (true);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  
  -- Assign default 'admin' role (since this is for small team)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_setup_configurations_updated_at
  BEFORE UPDATE ON public.setup_configurations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_setup_steps_updated_at
  BEFORE UPDATE ON public.setup_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();