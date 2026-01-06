import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SetupConfiguration, SetupStep, StepAction, ActionType, StepTargetType, HighlightAnimation } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

export function useConfigurations() {
  return useQuery({
    queryKey: ["configurations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setup_configurations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SetupConfiguration[];
    },
  });
}

export function useConfiguration(id: string | undefined) {
  return useQuery({
    queryKey: ["configuration", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("setup_configurations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as SetupConfiguration;
    },
    enabled: !!id,
  });
}

export function useConfigurationSteps(configurationId: string | undefined) {
  return useQuery({
    queryKey: ["steps", configurationId],
    queryFn: async () => {
      if (!configurationId) return [];
      
      const { data, error } = await supabase
        .from("setup_steps")
        .select("*")
        .eq("configuration_id", configurationId)
        .order("step_order", { ascending: true });

      if (error) throw error;
      return data as SetupStep[];
    },
    enabled: !!configurationId,
  });
}

// New hook: Steps with their actions for Visual Builder
export interface SetupStepWithActions extends SetupStep {
  step_actions: StepAction[];
}

export function useConfigurationStepsWithActions(configurationId: string | undefined) {
  return useQuery({
    queryKey: ["steps-with-actions", configurationId],
    queryFn: async () => {
      if (!configurationId) return [];
      
      const { data, error } = await supabase
        .from("setup_steps")
        .select("*, step_actions(*)")
        .eq("configuration_id", configurationId)
        .order("step_order", { ascending: true });

      if (error) throw error;
      
      // Sort actions within each step
      return (data as SetupStepWithActions[]).map(step => ({
        ...step,
        step_actions: (step.step_actions || []).sort((a, b) => a.action_order - b.action_order),
      }));
    },
    enabled: !!configurationId,
  });
}

export function useStepActions(stepId: string | undefined) {
  return useQuery({
    queryKey: ["actions", stepId],
    queryFn: async () => {
      if (!stepId) return [];
      
      const { data, error } = await supabase
        .from("step_actions")
        .select("*")
        .eq("step_id", stepId)
        .order("action_order", { ascending: true });

      if (error) throw error;
      return data as StepAction[];
    },
    enabled: !!stepId,
  });
}

export function useCreateConfiguration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (config: Partial<SetupConfiguration>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("setup_configurations")
        .insert({
          name: config.name || "Nova Configuração",
          description: config.description || "",
          target_url: config.target_url || "https://",
          is_active: config.is_active ?? true,
          widget_position: config.widget_position || "bottom-right",
          auto_start: config.auto_start ?? false,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SetupConfiguration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configurations"] });
      toast({ title: "Configuração criada com sucesso!" });
    },
    onError: (error) => {
      toast({ 
        variant: "destructive", 
        title: "Erro ao criar configuração", 
        description: error.message 
      });
    },
  });
}

export function useUpdateConfiguration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SetupConfiguration> & { id: string }) => {
      const { data, error } = await supabase
        .from("setup_configurations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as SetupConfiguration;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["configurations"] });
      queryClient.invalidateQueries({ queryKey: ["configuration", data.id] });
      toast({ title: "Configuração atualizada!" });
    },
    onError: (error) => {
      toast({ 
        variant: "destructive", 
        title: "Erro ao atualizar", 
        description: error.message 
      });
    },
  });
}

export function useDeleteConfiguration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("setup_configurations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configurations"] });
      toast({ title: "Configuração excluída!" });
    },
    onError: (error) => {
      toast({ 
        variant: "destructive", 
        title: "Erro ao excluir", 
        description: error.message 
      });
    },
  });
}

export function useCreateStep() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ configurationId, step }: { configurationId: string; step: Partial<SetupStep> }) => {
      const { data, error } = await supabase
        .from("setup_steps")
        .insert({
          configuration_id: configurationId,
          title: step.title || "Novo Passo",
          description: step.description || "",
          instructions: step.instructions || "",
          target_type: (step.target_type as StepTargetType) || "page",
          target_selector: step.target_selector || "",
          target_url: step.target_url || "",
          is_required: step.is_required ?? true,
          step_order: step.step_order || 0,
          image_url: step.image_url || null,
          tips: step.tips || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SetupStep;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["steps", variables.configurationId] });
      toast({ title: "Passo criado com sucesso!" });
    },
    onError: (error) => {
      toast({ 
        variant: "destructive", 
        title: "Erro ao criar passo", 
        description: error.message 
      });
    },
  });
}

export function useUpdateStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, configurationId, ...updates }: Partial<SetupStep> & { id: string; configurationId: string }) => {
      const updateData: Record<string, unknown> = { ...updates };
      delete updateData.configurationId;
      
      const { data, error } = await supabase
        .from("setup_steps")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { step: data as SetupStep, configurationId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["steps", result.configurationId] });
      queryClient.invalidateQueries({ queryKey: ["steps-with-actions", result.configurationId] });
    },
  });
}

export function useDeleteStep() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, configurationId }: { id: string; configurationId: string }) => {
      const { error } = await supabase
        .from("setup_steps")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { configurationId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["steps", result.configurationId] });
      toast({ title: "Passo excluído!" });
    },
    onError: (error) => {
      toast({ 
        variant: "destructive", 
        title: "Erro ao excluir passo", 
        description: error.message 
      });
    },
  });
}

export function useCreateAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stepId, action }: { stepId: string; action: Partial<StepAction> }) => {
      const { data, error } = await supabase
        .from("step_actions")
        .insert({
          step_id: stepId,
          action_type: (action.action_type as ActionType) || "click",
          selector: action.selector || "",
          value: action.value || null,
          delay_ms: action.delay_ms || 0,
          scroll_to_element: action.scroll_to_element ?? true,
          scroll_behavior: action.scroll_behavior || "smooth",
          scroll_position: action.scroll_position || "center",
          highlight_color: action.highlight_color || "#ff9f0d",
          highlight_duration_ms: action.highlight_duration_ms || 2000,
          highlight_animation: (action.highlight_animation as HighlightAnimation) || "pulse",
          wait_for_element: action.wait_for_element ?? false,
          input_type: action.input_type || "text",
          action_order: action.action_order || 0,
          description: action.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return { action: data as StepAction, stepId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["actions", result.stepId] });
      queryClient.invalidateQueries({ queryKey: ["steps-with-actions"] });
    },
  });
}

export function useUpdateAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, stepId, ...updates }: Partial<StepAction> & { id: string; stepId: string }) => {
      const updateData: Record<string, unknown> = { ...updates };
      delete updateData.stepId;
      
      const { data, error } = await supabase
        .from("step_actions")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { action: data as StepAction, stepId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["actions", result.stepId] });
      queryClient.invalidateQueries({ queryKey: ["steps-with-actions"] });
    },
  });
}

export function useDeleteAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, stepId }: { id: string; stepId: string }) => {
      const { error } = await supabase
        .from("step_actions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { stepId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["actions", result.stepId] });
      queryClient.invalidateQueries({ queryKey: ["steps-with-actions"] });
    },
  });
}
