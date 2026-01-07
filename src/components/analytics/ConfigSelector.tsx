import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfigurations } from "@/hooks/useConfigurations";
import { Skeleton } from "@/components/ui/skeleton";

interface ConfigSelectorProps {
  value: string | undefined;
  onValueChange: (value: string) => void;
}

export function ConfigSelector({ value, onValueChange }: ConfigSelectorProps) {
  const { data: configurations, isLoading } = useConfigurations();

  if (isLoading) {
    return <Skeleton className="h-10 w-[250px]" />;
  }

  if (!configurations || configurations.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Nenhuma configuração encontrada
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[250px]">
        <SelectValue placeholder="Selecione uma configuração" />
      </SelectTrigger>
      <SelectContent>
        {configurations.map((config) => (
          <SelectItem key={config.id} value={config.id}>
            {config.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
