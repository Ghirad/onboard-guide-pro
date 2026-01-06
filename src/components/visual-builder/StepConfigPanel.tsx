import { useState, useEffect } from 'react';
import { X, Type, MessageSquare, Sparkles, MousePointer, Keyboard, Clock, Lightbulb, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { SelectedElement, TourStep, TourStepType, TourStepConfig, TooltipPosition, StepThemeOverride } from '@/types/visualBuilder';

interface StepConfigPanelProps {
  selectedElement: SelectedElement | null;
  editingStep: TourStep | null;
  onSave: (step: Omit<TourStep, 'id' | 'order'>) => void;
  onUpdate: (stepId: string, updates: Partial<TourStep>) => void;
  onClose: () => void;
}

const stepTypes: { type: TourStepType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'tooltip', label: 'Tooltip', icon: <MessageSquare className="h-4 w-4" />, description: 'Texto explicativo junto ao elemento' },
  { type: 'modal', label: 'Modal', icon: <Type className="h-4 w-4" />, description: 'Popup de diálogo centralizado' },
  { type: 'highlight', label: 'Destaque', icon: <Sparkles className="h-4 w-4" />, description: 'Destacar elemento visualmente' },
  { type: 'click', label: 'Clique', icon: <MousePointer className="h-4 w-4" />, description: 'Aguardar clique do usuário' },
  { type: 'input', label: 'Entrada', icon: <Keyboard className="h-4 w-4" />, description: 'Guiar entrada de dados' },
  { type: 'wait', label: 'Esperar', icon: <Clock className="h-4 w-4" />, description: 'Pausa antes do próximo passo' },
];

// Suggest step type based on element
function getSuggestedType(tagName: string): TourStepType {
  const tag = tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea') return 'input';
  if (tag === 'button' || tag === 'a') return 'click';
  if (tag === 'select') return 'click';
  return 'tooltip';
}

function getElementTypeLabel(tagName: string): string {
  const tag = tagName.toLowerCase();
  if (tag === 'button') return 'Botão';
  if (tag === 'a') return 'Link';
  if (tag === 'input') return 'Campo de entrada';
  if (tag === 'textarea') return 'Área de texto';
  if (tag === 'select') return 'Seletor';
  if (tag === 'div') return 'Divisão';
  if (tag === 'span') return 'Texto';
  if (tag === 'img') return 'Imagem';
  if (tag === 'nav') return 'Navegação';
  return tagName.toUpperCase();
}

export function StepConfigPanel({
  selectedElement,
  editingStep,
  onSave,
  onUpdate,
  onClose,
}: StepConfigPanelProps) {
  const element = editingStep?.element || selectedElement;
  const suggestedType = element ? getSuggestedType(element.tagName) : 'tooltip';
  
  const [stepType, setStepType] = useState<TourStepType>(editingStep?.type || suggestedType);
  const [config, setConfig] = useState<TourStepConfig>(editingStep?.config || {
    title: '',
    description: '',
    position: 'auto',
    buttonText: 'Próximo',
    skipButtonText: 'Pular',
    showSkip: true,
    highlightAnimation: 'pulse',
    highlightColor: '#3b82f6',
    waitForClick: false,
    delayMs: 500,
  });

  useEffect(() => {
    if (editingStep) {
      setStepType(editingStep.type);
      setConfig(editingStep.config);
    } else if (element) {
      // Set suggested type for new elements
      setStepType(getSuggestedType(element.tagName));
    }
  }, [editingStep, element]);

  const handleSave = () => {
    if (!selectedElement && !editingStep) return;

    const el = editingStep?.element || selectedElement!;
    const selector = editingStep?.selector || selectedElement!.selector;

    if (editingStep) {
      onUpdate(editingStep.id, { type: stepType, config });
    } else {
      onSave({
        type: stepType,
        selector,
        element: el,
        config,
      });
    }
    onClose();
  };

  const updateConfig = (key: keyof TourStepConfig, value: unknown) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (!element) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <MousePointer className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Selecione um elemento para configurar um passo</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-primary/5">
        <div>
          <h3 className="font-semibold">
            {editingStep ? '✏️ Editar Passo' : '🎯 Novo Passo'}
          </h3>
          <p className="text-xs text-muted-foreground">
            Configure como o passo vai aparecer
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Element Info */}
        <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Elemento Selecionado
            </span>
            <Badge variant="secondary" className="text-xs">
              {getElementTypeLabel(element.tagName)}
            </Badge>
          </div>
          <code className="text-xs font-mono block truncate text-primary">
            {element.selector}
          </code>
          {element.textContent && (
            <p className="text-xs text-muted-foreground truncate">
              Texto: "{element.textContent}"
            </p>
          )}
        </div>

        {/* Step Type Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Tipo de Ação</Label>
            {!editingStep && stepType === suggestedType && (
              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <Lightbulb className="h-3 w-3" />
                Sugerido
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {stepTypes.map(({ type, label, icon, description }) => (
              <button
                key={type}
                onClick={() => setStepType(type)}
                className={`flex flex-col items-start p-3 rounded-lg border transition-all text-left ${
                  stepType === type
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={stepType === type ? 'text-primary' : 'text-muted-foreground'}>
                    {icon}
                  </span>
                  <span className="font-medium text-sm">{label}</span>
                  {type === suggestedType && !editingStep && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">●</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Type-specific Configuration */}
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">Conteúdo</TabsTrigger>
            <TabsTrigger value="appearance">Aparência</TabsTrigger>
            <TabsTrigger value="theme" className="flex items-center gap-1">
              <Palette className="h-3 w-3" />
              Tema
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4 mt-4">
            {(stepType === 'tooltip' || stepType === 'modal') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={config.title || ''}
                    onChange={(e) => updateConfig('title', e.target.value)}
                    placeholder="Ex: Clique aqui para continuar..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={config.description || ''}
                    onChange={(e) => updateConfig('description', e.target.value)}
                    placeholder="Explique o que o usuário deve fazer neste passo..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">URL da Imagem (opcional)</Label>
                  <Input
                    id="imageUrl"
                    value={config.imageUrl || ''}
                    onChange={(e) => updateConfig('imageUrl', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </>
            )}

            {stepType === 'highlight' && (
              <div className="space-y-2">
                <Label htmlFor="title">Título do Destaque (opcional)</Label>
                <Input
                  id="title"
                  value={config.title || ''}
                  onChange={(e) => updateConfig('title', e.target.value)}
                  placeholder="Ex: Observe este elemento"
                />
              </div>
            )}

            {stepType === 'click' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Instrução</Label>
                  <Input
                    id="title"
                    value={config.title || ''}
                    onChange={(e) => updateConfig('title', e.target.value)}
                    placeholder="Ex: Clique neste botão"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="waitForClick">Aguardar clique do usuário</Label>
                  <Switch
                    id="waitForClick"
                    checked={config.waitForClick || false}
                    onCheckedChange={(checked) => updateConfig('waitForClick', checked)}
                  />
                </div>
              </div>
            )}

            {stepType === 'input' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">Instrução</Label>
                  <Input
                    id="title"
                    value={config.title || ''}
                    onChange={(e) => updateConfig('title', e.target.value)}
                    placeholder="Ex: Digite seu nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="placeholder">Placeholder de Exemplo</Label>
                  <Input
                    id="placeholder"
                    value={config.inputPlaceholder || ''}
                    onChange={(e) => updateConfig('inputPlaceholder', e.target.value)}
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="waitForClick">Aguardar preenchimento</Label>
                  <Switch
                    id="waitForClick"
                    checked={config.waitForClick || false}
                    onCheckedChange={(checked) => updateConfig('waitForClick', checked)}
                  />
                </div>
              </>
            )}

            {stepType === 'wait' && (
              <div className="space-y-2">
                <Label htmlFor="delay">Tempo de Espera (ms)</Label>
                <Input
                  id="delay"
                  type="number"
                  value={config.delayMs || 500}
                  onChange={(e) => updateConfig('delayMs', parseInt(e.target.value))}
                  min={100}
                  step={100}
                />
                <p className="text-xs text-muted-foreground">
                  {config.delayMs ? `${(config.delayMs / 1000).toFixed(1)} segundos` : '0.5 segundos'}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4 mt-4">
            {(stepType === 'tooltip' || stepType === 'modal') && (
              <>
                <div className="space-y-2">
                  <Label>Posição</Label>
                  <Select
                    value={config.position || 'auto'}
                    onValueChange={(value) => updateConfig('position', value as TooltipPosition)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automática</SelectItem>
                      <SelectItem value="top">Acima</SelectItem>
                      <SelectItem value="bottom">Abaixo</SelectItem>
                      <SelectItem value="left">Esquerda</SelectItem>
                      <SelectItem value="right">Direita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buttonText">Texto do Botão</Label>
                  <Input
                    id="buttonText"
                    value={config.buttonText || 'Próximo'}
                    onChange={(e) => updateConfig('buttonText', e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="showSkip">Mostrar Botão "Pular"</Label>
                  <Switch
                    id="showSkip"
                    checked={config.showSkip ?? true}
                    onCheckedChange={(checked) => updateConfig('showSkip', checked)}
                  />
                </div>

                {config.showSkip && (
                  <div className="space-y-2">
                    <Label htmlFor="skipButtonText">Texto do Botão Pular</Label>
                    <Input
                      id="skipButtonText"
                      value={config.skipButtonText || 'Pular'}
                      onChange={(e) => updateConfig('skipButtonText', e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            {(stepType === 'highlight' || stepType === 'click') && (
              <>
                <div className="space-y-2">
                  <Label>Animação</Label>
                  <Select
                    value={config.highlightAnimation || 'pulse'}
                    onValueChange={(value) => updateConfig('highlightAnimation', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pulse">Pulsar</SelectItem>
                      <SelectItem value="glow">Brilho</SelectItem>
                      <SelectItem value="border">Borda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="highlightColor">Cor do Destaque</Label>
                  <div className="flex gap-2">
                    <Input
                      id="highlightColor"
                      type="color"
                      value={config.highlightColor || '#3b82f6'}
                      onChange={(e) => updateConfig('highlightColor', e.target.value)}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={config.highlightColor || '#3b82f6'}
                      onChange={(e) => updateConfig('highlightColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="theme" className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor="enableTheme">Tema Personalizado</Label>
                <p className="text-xs text-muted-foreground">
                  Sobrescrever o tema global para este passo
                </p>
              </div>
              <Switch
                id="enableTheme"
                checked={config.themeOverride?.enabled ?? false}
                onCheckedChange={(checked) => {
                  updateConfig('themeOverride', {
                    ...config.themeOverride,
                    enabled: checked,
                  });
                }}
              />
            </div>

            {config.themeOverride?.enabled && (
              <div className="space-y-4 p-3 border rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="themePrimaryColor">Cor Principal</Label>
                  <div className="flex gap-2">
                    <Input
                      id="themePrimaryColor"
                      type="color"
                      value={config.themeOverride?.primaryColor || '#6366f1'}
                      onChange={(e) => updateConfig('themeOverride', {
                        ...config.themeOverride,
                        primaryColor: e.target.value,
                      })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={config.themeOverride?.primaryColor || '#6366f1'}
                      onChange={(e) => updateConfig('themeOverride', {
                        ...config.themeOverride,
                        primaryColor: e.target.value,
                      })}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="themeBgColor">Cor de Fundo</Label>
                  <div className="flex gap-2">
                    <Input
                      id="themeBgColor"
                      type="color"
                      value={config.themeOverride?.backgroundColor || '#ffffff'}
                      onChange={(e) => updateConfig('themeOverride', {
                        ...config.themeOverride,
                        backgroundColor: e.target.value,
                      })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={config.themeOverride?.backgroundColor || '#ffffff'}
                      onChange={(e) => updateConfig('themeOverride', {
                        ...config.themeOverride,
                        backgroundColor: e.target.value,
                      })}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="themeTextColor">Cor do Texto</Label>
                  <div className="flex gap-2">
                    <Input
                      id="themeTextColor"
                      type="color"
                      value={config.themeOverride?.textColor || '#1f2937'}
                      onChange={(e) => updateConfig('themeOverride', {
                        ...config.themeOverride,
                        textColor: e.target.value,
                      })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={config.themeOverride?.textColor || '#1f2937'}
                      onChange={(e) => updateConfig('themeOverride', {
                        ...config.themeOverride,
                        textColor: e.target.value,
                      })}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Animação</Label>
                  <Select
                    value={config.themeOverride?.animation || 'pulse'}
                    onValueChange={(value) => updateConfig('themeOverride', {
                      ...config.themeOverride,
                      animation: value as StepThemeOverride['animation'],
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pulse">Pulsar</SelectItem>
                      <SelectItem value="glow">Brilho</SelectItem>
                      <SelectItem value="border">Borda</SelectItem>
                      <SelectItem value="shake">Tremer</SelectItem>
                      <SelectItem value="bounce">Pular</SelectItem>
                      <SelectItem value="fade">Fade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Arredondamento</Label>
                  <div className="flex gap-2">
                    {(['none', 'sm', 'rounded', 'lg', 'xl'] as const).map((radius) => (
                      <button
                        key={radius}
                        onClick={() => updateConfig('themeOverride', {
                          ...config.themeOverride,
                          borderRadius: radius,
                        })}
                        className={`flex-1 py-2 px-3 text-xs border rounded transition-all ${
                          (config.themeOverride?.borderRadius || 'rounded') === radius
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {radius === 'none' ? '□' : radius === 'sm' ? '◢' : radius === 'rounded' ? '◓' : radius === 'lg' ? '◔' : '●'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">Preview</p>
                  <div
                    className={`p-4 rounded shadow-lg ${
                      config.themeOverride?.animation === 'pulse' ? 'animate-highlight-pulse' :
                      config.themeOverride?.animation === 'glow' ? 'animate-highlight-glow' :
                      config.themeOverride?.animation === 'border' ? 'animate-highlight-border' :
                      config.themeOverride?.animation === 'shake' ? 'animate-highlight-shake' :
                      config.themeOverride?.animation === 'bounce' ? 'animate-highlight-bounce' :
                      config.themeOverride?.animation === 'fade' ? 'animate-highlight-fade' : ''
                    }`}
                    style={{
                      backgroundColor: config.themeOverride?.backgroundColor || '#ffffff',
                      color: config.themeOverride?.textColor || '#1f2937',
                      borderRadius: config.themeOverride?.borderRadius === 'none' ? '0' :
                        config.themeOverride?.borderRadius === 'sm' ? '4px' :
                        config.themeOverride?.borderRadius === 'lg' ? '12px' :
                        config.themeOverride?.borderRadius === 'xl' ? '16px' : '8px',
                      border: config.themeOverride?.animation === 'border' 
                        ? `2px solid ${config.themeOverride?.primaryColor || '#6366f1'}` 
                        : undefined,
                      boxShadow: config.themeOverride?.animation === 'glow' 
                        ? `0 0 15px ${config.themeOverride?.primaryColor || '#6366f1'}` 
                        : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded text-white"
                        style={{ backgroundColor: config.themeOverride?.primaryColor || '#6366f1' }}
                      >
                        Passo 1
                      </span>
                      <span className="font-medium text-sm">{config.title || 'Título do Passo'}</span>
                    </div>
                    <p className="text-xs opacity-80">{config.description || 'Descrição do passo aqui...'}</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="p-4 border-t flex gap-2 bg-muted/30">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancelar
        </Button>
        <Button className="flex-1" onClick={handleSave}>
          {editingStep ? 'Atualizar Passo' : 'Adicionar Passo'}
        </Button>
      </div>
    </div>
  );
}
