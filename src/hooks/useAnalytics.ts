import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StepAnalytic {
  stepId: string;
  stepTitle: string;
  stepOrder: number;
  totalStarted: number;
  completed: number;
  skipped: number;
  pending: number;
  completionRate: number;
  dropoffRate: number;
}

export interface DailyActivity {
  date: string;
  completed: number;
  skipped: number;
  total: number;
}

export interface AnalyticsData {
  totalUsers: number;
  completedUsers: number;
  completionRate: number;
  activeToday: number;
  stepAnalytics: StepAnalytic[];
  dailyActivity: DailyActivity[];
}

export function useAnalytics(configurationId: string | undefined) {
  return useQuery({
    queryKey: ["analytics", configurationId],
    queryFn: async (): Promise<AnalyticsData> => {
      if (!configurationId) throw new Error("Configuration ID required");

      // Fetch all progress for this configuration
      const { data: progress, error: progressError } = await supabase
        .from("user_progress")
        .select("*")
        .eq("configuration_id", configurationId);

      if (progressError) throw progressError;

      // Fetch steps for this configuration
      const { data: steps, error: stepsError } = await supabase
        .from("setup_steps")
        .select("id, title, step_order")
        .eq("configuration_id", configurationId)
        .order("step_order", { ascending: true });

      if (stepsError) throw stepsError;

      // Calculate unique users
      const uniqueUsers = new Set(progress?.map((p) => p.client_id) || []);
      const totalUsers = uniqueUsers.size;

      // Calculate users who completed all required steps
      const totalSteps = steps?.length || 0;
      const userStepCounts = new Map<string, number>();
      
      progress?.forEach((p) => {
        if (p.status === "completed") {
          const current = userStepCounts.get(p.client_id) || 0;
          userStepCounts.set(p.client_id, current + 1);
        }
      });

      let completedUsers = 0;
      userStepCounts.forEach((count) => {
        if (count >= totalSteps) completedUsers++;
      });

      const completionRate = totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0;

      // Calculate active today
      const today = new Date().toISOString().split("T")[0];
      const activeToday = new Set(
        progress
          ?.filter((p) => p.updated_at?.startsWith(today))
          .map((p) => p.client_id) || []
      ).size;

      // Calculate step analytics
      const stepAnalytics: StepAnalytic[] = (steps || []).map((step, index) => {
        const stepProgress = progress?.filter((p) => p.step_id === step.id) || [];
        const completed = stepProgress.filter((p) => p.status === "completed").length;
        const skipped = stepProgress.filter((p) => p.status === "skipped").length;
        const pending = stepProgress.filter((p) => p.status === "pending").length;
        
        // Users who reached this step (have any record for it)
        const totalStarted = stepProgress.length;
        
        // For dropoff: users who started but didn't complete or skip
        const dropoffRate = totalStarted > 0 
          ? ((totalStarted - completed - skipped) / totalStarted) * 100 
          : 0;

        const stepCompletionRate = totalStarted > 0 
          ? (completed / totalStarted) * 100 
          : 0;

        return {
          stepId: step.id,
          stepTitle: step.title,
          stepOrder: step.step_order,
          totalStarted,
          completed,
          skipped,
          pending,
          completionRate: stepCompletionRate,
          dropoffRate: Math.max(0, dropoffRate),
        };
      });

      // Calculate daily activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyMap = new Map<string, { completed: number; skipped: number }>();
      
      progress?.forEach((p) => {
        const date = p.updated_at?.split("T")[0];
        if (date && new Date(date) >= thirtyDaysAgo) {
          const current = dailyMap.get(date) || { completed: 0, skipped: 0 };
          if (p.status === "completed") current.completed++;
          if (p.status === "skipped") current.skipped++;
          dailyMap.set(date, current);
        }
      });

      const dailyActivity: DailyActivity[] = Array.from(dailyMap.entries())
        .map(([date, counts]) => ({
          date,
          completed: counts.completed,
          skipped: counts.skipped,
          total: counts.completed + counts.skipped,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalUsers,
        completedUsers,
        completionRate,
        activeToday,
        stepAnalytics,
        dailyActivity,
      };
    },
    enabled: !!configurationId,
  });
}
