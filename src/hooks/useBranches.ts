import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StepBranch, BranchConditionType } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

export function useStepBranches(stepId: string | undefined) {
  return useQuery({
    queryKey: ["step-branches", stepId],
    queryFn: async () => {
      if (!stepId) return [];
      
      const { data, error } = await supabase
        .from("step_branches")
        .select("*")
        .eq("step_id", stepId)
        .order("branch_order", { ascending: true });

      if (error) throw error;
      return data as StepBranch[];
    },
    enabled: !!stepId,
  });
}

export function useConfigurationBranches(configurationId: string | undefined) {
  return useQuery({
    queryKey: ["configuration-branches", configurationId],
    queryFn: async () => {
      if (!configurationId) return {};
      
      // Get all steps for this configuration
      const { data: steps, error: stepsError } = await supabase
        .from("setup_steps")
        .select("id")
        .eq("configuration_id", configurationId);
      
      if (stepsError) throw stepsError;
      if (!steps || steps.length === 0) return {};
      
      const stepIds = steps.map(s => s.id);
      
      // Get all branches for these steps
      const { data: branches, error: branchesError } = await supabase
        .from("step_branches")
        .select("*")
        .in("step_id", stepIds)
        .order("branch_order", { ascending: true });
      
      if (branchesError) throw branchesError;
      
      // Group branches by step_id
      const grouped: Record<string, StepBranch[]> = {};
      (branches || []).forEach(branch => {
        if (!grouped[branch.step_id]) {
          grouped[branch.step_id] = [];
        }
        grouped[branch.step_id].push(branch as StepBranch);
      });
      
      return grouped;
    },
    enabled: !!configurationId,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (branch: Omit<StepBranch, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from("step_branches")
        .insert({
          step_id: branch.step_id,
          condition_type: branch.condition_type,
          condition_value: branch.condition_value,
          condition_label: branch.condition_label,
          next_step_id: branch.next_step_id,
          branch_order: branch.branch_order,
        })
        .select()
        .single();

      if (error) throw error;
      return data as StepBranch;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["step-branches", data.step_id] });
      queryClient.invalidateQueries({ queryKey: ["configuration-branches"] });
      toast({ title: "Ramificação criada!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao criar ramificação",
        description: error.message,
      });
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, stepId, ...updates }: Partial<StepBranch> & { id: string; stepId: string }) => {
      const { data, error } = await supabase
        .from("step_branches")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { branch: data as StepBranch, stepId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["step-branches", result.stepId] });
      queryClient.invalidateQueries({ queryKey: ["configuration-branches"] });
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, stepId }: { id: string; stepId: string }) => {
      const { error } = await supabase
        .from("step_branches")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { stepId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["step-branches", result.stepId] });
      queryClient.invalidateQueries({ queryKey: ["configuration-branches"] });
      toast({ title: "Ramificação removida!" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao remover ramificação",
        description: error.message,
      });
    },
  });
}
