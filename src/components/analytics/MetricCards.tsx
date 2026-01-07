import { Card, CardContent } from "@/components/ui/card";
import { Users, Target, TrendingDown, Activity } from "lucide-react";
import type { AnalyticsData } from "@/hooks/useAnalytics";

interface MetricCardsProps {
  data: AnalyticsData;
}

export function MetricCards({ data }: MetricCardsProps) {
  const worstStep = data.stepAnalytics.reduce(
    (worst, step) => (step.dropoffRate > (worst?.dropoffRate || 0) ? step : worst),
    null as typeof data.stepAnalytics[0] | null
  );

  const metrics = [
    {
      title: "Total de Usuários",
      value: data.totalUsers.toLocaleString(),
      icon: Users,
      description: "Usuários únicos que iniciaram",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Taxa de Conclusão",
      value: `${data.completionRate.toFixed(1)}%`,
      icon: Target,
      description: `${data.completedUsers} completaram todos os passos`,
      color: data.completionRate >= 70 ? "text-green-500" : data.completionRate >= 40 ? "text-yellow-500" : "text-red-500",
      bgColor: data.completionRate >= 70 ? "bg-green-500/10" : data.completionRate >= 40 ? "bg-yellow-500/10" : "bg-red-500/10",
    },
    {
      title: "Maior Abandono",
      value: worstStep ? `${worstStep.dropoffRate.toFixed(0)}%` : "—",
      icon: TrendingDown,
      description: worstStep ? `Passo: ${worstStep.stepTitle}` : "Sem dados",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Ativos Hoje",
      value: data.activeToday.toLocaleString(),
      icon: Activity,
      description: "Usuários com atividade hoje",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`rounded-lg p-3 ${metric.bgColor}`}>
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground truncate">{metric.title}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
                <p className="text-xs text-muted-foreground truncate mt-1">{metric.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
