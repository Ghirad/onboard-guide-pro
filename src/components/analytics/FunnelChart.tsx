import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StepAnalytic } from "@/hooks/useAnalytics";

interface FunnelChartProps {
  steps: StepAnalytic[];
  totalUsers: number;
}

export function FunnelChart({ steps, totalUsers }: FunnelChartProps) {
  if (steps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Funil de Conversão</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          Sem dados de progresso ainda
        </CardContent>
      </Card>
    );
  }

  // Calculate cumulative users at each step
  const funnelData = steps.map((step, index) => {
    const usersAtStep = index === 0 ? totalUsers : step.totalStarted;
    const percentage = totalUsers > 0 ? (usersAtStep / totalUsers) * 100 : 0;
    return {
      ...step,
      usersAtStep,
      percentage,
    };
  });

  const maxWidth = 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Funil de Conversão</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {funnelData.map((step, index) => {
          const width = Math.max(20, (step.percentage / 100) * maxWidth);
          const getColor = () => {
            if (step.percentage >= 70) return "bg-green-500";
            if (step.percentage >= 40) return "bg-yellow-500";
            return "bg-red-500";
          };

          return (
            <div key={step.stepId} className="relative">
              <div className="flex items-center gap-3">
                <span className="w-6 text-sm font-medium text-muted-foreground">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {step.stepTitle}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {step.usersAtStep} ({step.percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="relative h-8 w-full bg-muted/30 rounded overflow-hidden">
                    <div
                      className={`h-full ${getColor()} transition-all duration-500 rounded`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              </div>
              {index < funnelData.length - 1 && (
                <div className="ml-9 mt-1 text-xs text-muted-foreground">
                  ↓ {step.dropoffRate.toFixed(0)}% abandonaram
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
