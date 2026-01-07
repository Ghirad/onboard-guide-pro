import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { StepAnalytic } from "@/hooks/useAnalytics";

interface StepDetailsTableProps {
  steps: StepAnalytic[];
}

export function StepDetailsTable({ steps }: StepDetailsTableProps) {
  if (steps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalhes por Passo</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          Nenhum passo configurado
        </CardContent>
      </Card>
    );
  }

  const getDropoffBadge = (rate: number) => {
    if (rate < 10) return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">{rate.toFixed(0)}%</Badge>;
    if (rate < 30) return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">{rate.toFixed(0)}%</Badge>;
    return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">{rate.toFixed(0)}%</Badge>;
  };

  const getCompletionBadge = (rate: number) => {
    if (rate >= 70) return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">{rate.toFixed(0)}%</Badge>;
    if (rate >= 40) return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">{rate.toFixed(0)}%</Badge>;
    return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">{rate.toFixed(0)}%</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Detalhes por Passo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Passo</TableHead>
                <TableHead className="text-center">Iniciaram</TableHead>
                <TableHead className="text-center">Completaram</TableHead>
                <TableHead className="text-center">Pularam</TableHead>
                <TableHead className="text-center">Taxa Conclusão</TableHead>
                <TableHead className="text-center">Taxa Abandono</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {steps.map((step) => (
                <TableRow key={step.stepId}>
                  <TableCell className="font-medium text-muted-foreground">
                    {step.stepOrder}
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {step.stepTitle}
                  </TableCell>
                  <TableCell className="text-center">{step.totalStarted}</TableCell>
                  <TableCell className="text-center text-green-600">{step.completed}</TableCell>
                  <TableCell className="text-center text-yellow-600">{step.skipped}</TableCell>
                  <TableCell className="text-center">{getCompletionBadge(step.completionRate)}</TableCell>
                  <TableCell className="text-center">{getDropoffBadge(step.dropoffRate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
