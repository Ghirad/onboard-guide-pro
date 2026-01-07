import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { StepBranch, BranchConditionType } from '@/types/database';
import { TourStep } from '@/types/visualBuilder';
import { Plus, Trash2, GitBranch, ArrowRight } from 'lucide-react';

interface BranchEditorProps {
  stepId: string;
  branches: StepBranch[];
  allSteps: TourStep[];
  isBranchPoint: boolean;
  defaultNextStepId: string | null;
  onToggleBranchPoint: (enabled: boolean) => void;
  onDefaultNextStepChange: (stepId: string | null) => void;
  onCreateBranch: (branch: Omit<StepBranch, 'id' | 'created_at'>) => void;
  onUpdateBranch: (branchId: string, updates: Partial<StepBranch>) => void;
  onDeleteBranch: (branchId: string) => void;
}

export function BranchEditor({
  stepId,
  branches,
  allSteps,
  isBranchPoint,
  defaultNextStepId,
  onToggleBranchPoint,
  onDefaultNextStepChange,
  onCreateBranch,
  onUpdateBranch,
  onDeleteBranch,
}: BranchEditorProps) {
  const [newBranch, setNewBranch] = useState({
    condition_type: 'click' as BranchConditionType,
    condition_value: '',
    condition_label: '',
    next_step_id: null as string | null,
  });

  // Filter out current step from available targets
  const availableTargets = allSteps.filter(s => s.id !== stepId);

  const handleAddBranch = () => {
    if (!newBranch.condition_label.trim()) return;
    
    onCreateBranch({
      step_id: stepId,
      condition_type: newBranch.condition_type,
      condition_value: newBranch.condition_value || null,
      condition_label: newBranch.condition_label,
      next_step_id: newBranch.next_step_id,
      branch_order: branches.length,
    });
    
    // Reset form
    setNewBranch({
      condition_type: 'click',
      condition_value: '',
      condition_label: '',
      next_step_id: null,
    });
  };

  const renderStepOption = (step: TourStep) => (
    <SelectItem key={step.id} value={step.id}>
      #{step.order + 1} {step.config.title.slice(0, 15)}
    </SelectItem>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Fluxo Condicional
          </CardTitle>
          <Switch
            checked={isBranchPoint}
            onCheckedChange={onToggleBranchPoint}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Ative para criar caminhos diferentes baseados na ação do usuário
        </p>
      </CardHeader>

      {isBranchPoint && (
        <CardContent className="space-y-4">
          {/* Existing branches */}
          {branches.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Ramificações</Label>
              {branches.map((branch, index) => (
                <div
                  key={branch.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border"
                >
                  <span className="text-xs font-medium text-muted-foreground w-5">
                    {index + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {branch.condition_label}
                    </div>
                    {branch.condition_value && (
                      <div className="text-xs text-muted-foreground truncate">
                        {branch.condition_type}: {branch.condition_value}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <Select
                    value={branch.next_step_id || 'none'}
                    onValueChange={(value) =>
                      onUpdateBranch(branch.id, {
                        next_step_id: value === 'none' ? null : value,
                      })
                    }
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue placeholder="Destino" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {availableTargets.map(renderStepOption)}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => onDeleteBranch(branch.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new branch */}
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-sm">Nova Ramificação</Label>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de Condição</Label>
                <Select
                  value={newBranch.condition_type}
                  onValueChange={(value) =>
                    setNewBranch({ ...newBranch, condition_type: value as BranchConditionType })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="click">Clique em elemento</SelectItem>
                    <SelectItem value="selector">Seletor específico</SelectItem>
                    <SelectItem value="custom">Customizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">Próximo Passo</Label>
                <Select
                  value={newBranch.next_step_id || 'none'}
                  onValueChange={(value) =>
                    setNewBranch({ ...newBranch, next_step_id: value === 'none' ? null : value })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {availableTargets.map(renderStepOption)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newBranch.condition_type !== 'custom' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Seletor CSS</Label>
                <Input
                  value={newBranch.condition_value}
                  onChange={(e) =>
                    setNewBranch({ ...newBranch, condition_value: e.target.value })
                  }
                  placeholder="#btn-opcao, .menu-item"
                  className="h-8 text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Descrição da Condição</Label>
              <Input
                value={newBranch.condition_label}
                onChange={(e) =>
                  setNewBranch({ ...newBranch, condition_label: e.target.value })
                }
                placeholder="Ex: Se clicar em 'Plano Pro'"
                className="h-8 text-xs"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleAddBranch}
              disabled={!newBranch.condition_label.trim()}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Adicionar Ramificação
            </Button>
          </div>

          {/* Default next step */}
          <div className="space-y-2 pt-3 border-t">
            <Label className="text-sm">Passo Padrão (quando nenhuma condição)</Label>
            <Select
              value={defaultNextStepId || 'none'}
              onValueChange={(value) =>
                onDefaultNextStepChange(value === 'none' ? null : value)
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Próximo passo sequencial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Próximo passo sequencial</SelectItem>
                {availableTargets.map((step) => (
                  <SelectItem key={step.id} value={step.id}>
                    #{step.order + 1} {step.config.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Para onde ir se nenhuma das condições acima for atendida
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
