import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { StepAnalytic } from "@/hooks/useAnalytics";

interface StepProgressChartProps {
  steps: StepAnalytic[];
}

export function StepProgressChart({ steps }: StepProgressChartProps) {
  if (steps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progresso por Passo</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          Sem dados de progresso ainda
        </CardContent>
      </Card>
    );
  }

  const chartData = steps.map((step) => ({
    name: `P${step.stepOrder}`,
    fullName: step.stepTitle,
    Completado: step.completed,
    Pulado: step.skipped,
    Pendente: step.pending,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Progresso por Passo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-lg">
                        <p className="font-medium mb-2">{data.fullName}</p>
                        {payload.map((entry: any) => (
                          <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {entry.value}
                          </p>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: 12 }}
                iconType="circle"
              />
              <Bar dataKey="Completado" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Pulado" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Pendente" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
