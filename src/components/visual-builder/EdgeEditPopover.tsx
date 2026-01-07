import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trash2, GitBranch, ArrowRight, Link2 } from 'lucide-react';
import { TourStep } from '@/types/visualBuilder';
import { StepBranch, BranchConditionType } from '@/types/database';

interface EdgeEditPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: { x: number; y: number };
  edgeType: 'branch' | 'default' | 'linear';
  branch?: StepBranch;
  sourceStepId: string;
  targetStepId: string;
  allSteps: TourStep[];
  onUpdateBranch?: (branchId: string, updates: Partial<StepBranch>) => void;
  onDeleteBranch?: (branchId: string, stepId: string) => void;
  onClearDefaultNext?: (stepId: string) => void;
  onConvertToDefault?: (stepId: string, targetId: string) => void;
}

export function EdgeEditPopover({
  open,
  onOpenChange,
  position,
  edgeType,
  branch,
  sourceStepId,
  targetStepId,
  allSteps,
  onUpdateBranch,
  onDeleteBranch,
  onClearDefaultNext,
  onConvertToDefault,
}: EdgeEditPopoverProps) {
  const [label, setLabel] = useState(branch?.condition_label || '');
  const [conditionType, setConditionType] = useState<BranchConditionType>(
    branch?.condition_type as BranchConditionType || 'click'
  );
  const [conditionValue, setConditionValue] = useState(branch?.condition_value || '');
  const [selectedTarget, setSelectedTarget] = useState(targetStepId);

  useEffect(() => {
    if (branch) {
      setLabel(branch.condition_label);
      setConditionType(branch.condition_type as BranchConditionType);
      setConditionValue(branch.condition_value || '');
    }
    setSelectedTarget(targetStepId);
  }, [branch, targetStepId]);

  const sourceStep = allSteps.find(s => s.id === sourceStepId);
  const targetStep = allSteps.find(s => s.id === targetStepId);
  const availableTargets = allSteps.filter(s => s.id !== sourceStepId);

  const handleSave = () => {
    if (branch && onUpdateBranch) {
      onUpdateBranch(branch.id, {
        condition_label: label,
        condition_type: conditionType,
        condition_value: conditionValue || null,
        next_step_id: selectedTarget,
      });
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (edgeType === 'branch' && branch && onDeleteBranch) {
      onDeleteBranch(branch.id, sourceStepId);
    } else if (edgeType === 'default' && onClearDefaultNext) {
      onClearDefaultNext(sourceStepId);
    }
    onOpenChange(false);
  };

  const handleConvertToDefault = () => {
    if (branch && onDeleteBranch && onConvertToDefault) {
      // Delete branch and set as default
      onDeleteBranch(branch.id, sourceStepId);
      onConvertToDefault(sourceStepId, targetStepId);
    }
    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <div
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            width: 1,
            height: 1,
            pointerEvents: 'none',
          }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-80" side="right" align="start">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {edgeType === 'branch' ? (
                <GitBranch className="h-4 w-4 text-amber-600" />
              ) : edgeType === 'default' ? (
                <Link2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ArrowRight className="h-4 w-4 text-indigo-500" />
              )}
              <span className="font-medium text-sm">
                {edgeType === 'branch' ? 'Ramificação' : edgeType === 'default' ? 'Conexão Padrão' : 'Conexão Linear'}
              </span>
            </div>
          </div>

          {/* Connection info */}
          <div className="p-2 bg-muted/50 rounded text-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">De:</span>
              <span className="font-medium">#{(sourceStep?.order ?? 0) + 1} {sourceStep?.config.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Para:</span>
              <span className="font-medium">#{(targetStep?.order ?? 0) + 1} {targetStep?.config.title}</span>
            </div>
          </div>

          {/* Branch-specific fields */}
          {edgeType === 'branch' && branch && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Descrição</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Se clicar em 'Plano Pro'"
                  className="h-8 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={conditionType} onValueChange={(v) => setConditionType(v as BranchConditionType)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="click">Clique</SelectItem>
                      <SelectItem value="selector">Seletor</SelectItem>
                      <SelectItem value="custom">Customizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Destino</Label>
                  <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTargets.map((step) => (
                        <SelectItem key={step.id} value={step.id}>
                          #{step.order + 1} {step.config.title.slice(0, 12)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {conditionType !== 'custom' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Seletor CSS (opcional)</Label>
                  <Input
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
                    placeholder="#btn-opcao"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            {edgeType === 'branch' && (
              <>
                <Button variant="outline" size="sm" className="flex-1" onClick={handleSave}>
                  Salvar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={handleConvertToDefault}
                  title="Converter para conexão padrão"
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              {edgeType !== 'branch' && <span className="ml-1">Remover</span>}
            </Button>
          </div>

          {/* Help text */}
          {edgeType === 'linear' && (
            <p className="text-xs text-muted-foreground">
              Conexão linear automática. Remova para criar ramificações ou definir próximo passo manual.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
