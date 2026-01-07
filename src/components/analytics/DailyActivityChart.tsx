import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DailyActivity } from "@/hooks/useAnalytics";

interface DailyActivityChartProps {
  data: DailyActivity[];
}

export function DailyActivityChart({ data }: DailyActivityChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Atividade Diária</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          Sem atividade nos últimos 30 dias
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    displayDate: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Atividade Diária (últimos 30 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-lg">
                        <p className="font-medium mb-2">
                          {format(parseISO(data.date), "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <p className="text-sm text-green-600">Completados: {data.completed}</p>
                        <p className="text-sm text-yellow-600">Pulados: {data.skipped}</p>
                        <p className="text-sm font-medium mt-1">Total: {data.total}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorTotal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
