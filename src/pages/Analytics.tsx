import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useConfigurations } from "@/hooks/useConfigurations";
import { useAnalytics } from "@/hooks/useAnalytics";
import { ConfigSelector } from "@/components/analytics/ConfigSelector";
import { MetricCards } from "@/components/analytics/MetricCards";
import { FunnelChart } from "@/components/analytics/FunnelChart";
import { StepProgressChart } from "@/components/analytics/StepProgressChart";
import { StepDetailsTable } from "@/components/analytics/StepDetailsTable";
import { DailyActivityChart } from "@/components/analytics/DailyActivityChart";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";

export default function Analytics() {
  const { data: configurations } = useConfigurations();
  const [selectedConfigId, setSelectedConfigId] = useState<string | undefined>();
  
  // Auto-select first configuration
  useEffect(() => {
    if (configurations && configurations.length > 0 && !selectedConfigId) {
      setSelectedConfigId(configurations[0].id);
    }
  }, [configurations, selectedConfigId]);

  const { data: analytics, isLoading, error } = useAnalytics(selectedConfigId);

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Analytics</h1>
            <p className="mt-1 text-muted-foreground">
              Acompanhe o desempenho dos seus fluxos de onboarding
            </p>
          </div>
          <ConfigSelector value={selectedConfigId} onValueChange={setSelectedConfigId} />
        </div>

        {/* Content */}
        {!selectedConfigId ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 rounded-full bg-muted p-4">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">Selecione uma configuração</p>
              <p className="text-sm text-muted-foreground text-center max-w-md mt-2">
                Escolha uma configuração de onboarding para visualizar as métricas de progresso e engajamento.
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[120px]" />
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-[350px]" />
              <Skeleton className="h-[350px]" />
            </div>
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="py-8 text-center text-destructive">
              Erro ao carregar dados: {error.message}
            </CardContent>
          </Card>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Metric Cards */}
            <MetricCards data={analytics} />

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              <FunnelChart steps={analytics.stepAnalytics} totalUsers={analytics.totalUsers} />
              <StepProgressChart steps={analytics.stepAnalytics} />
            </div>

            {/* Activity Chart */}
            <DailyActivityChart data={analytics.dailyActivity} />

            {/* Details Table */}
            <StepDetailsTable steps={analytics.stepAnalytics} />
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
