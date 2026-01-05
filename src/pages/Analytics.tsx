import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function Analytics() {
  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Analytics</h1>
          <p className="mt-1 text-muted-foreground">
            Acompanhe o desempenho dos seus fluxos de onboarding
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-full bg-muted p-4">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="mb-2">Em breve</CardTitle>
            <CardDescription className="text-center max-w-md">
              O painel de analytics estará disponível em breve. Você poderá visualizar
              taxas de conclusão, tempo médio por etapa e pontos de abandono.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
