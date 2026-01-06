import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Check, MessageSquare, Maximize2, Highlighter, MousePointer, TextCursor, Clock } from 'lucide-react';

export interface ActionTypeStyle {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  animation?: string;
}

export interface ActionTypeStyles {
  tooltip?: ActionTypeStyle;
  modal?: ActionTypeStyle;
  highlight?: ActionTypeStyle;
  click?: ActionTypeStyle;
  input?: ActionTypeStyle;
  wait?: ActionTypeStyle;
}

const ACTION_TYPES = [
  { id: 'tooltip', name: 'Tooltip', icon: MessageSquare, description: 'Caixa de dica' },
  { id: 'modal', name: 'Modal', icon: Maximize2, description: 'Popup central' },
  { id: 'highlight', name: 'Destaque', icon: Highlighter, description: 'Realce de elemento' },
  { id: 'click', name: 'Clique', icon: MousePointer, description: 'Ação de clique' },
  { id: 'input', name: 'Entrada', icon: TextCursor, description: 'Campo de texto' },
  { id: 'wait', name: 'Esperar', icon: Clock, description: 'Aguardar tempo' },
] as const;

const ANIMATIONS = [
  { id: 'pulse', name: 'Pulse' },
  { id: 'glow', name: 'Glow' },
  { id: 'border', name: 'Border' },
  { id: 'shake', name: 'Shake' },
  { id: 'bounce', name: 'Bounce' },
  { id: 'fade', name: 'Fade' },
];

interface ActionTypeStyleEditorProps {
  value: ActionTypeStyles;
  onChange: (styles: ActionTypeStyles) => void;
  globalPrimaryColor: string;
}

export function ActionTypeStyleEditor({ value, onChange, globalPrimaryColor }: ActionTypeStyleEditorProps) {
  const [selectedType, setSelectedType] = useState<string>('tooltip');

  const getTypeStyle = (typeId: string): ActionTypeStyle => {
    return value[typeId as keyof ActionTypeStyles] || {};
  };

  const updateTypeStyle = (typeId: string, updates: Partial<ActionTypeStyle>) => {
    onChange({
      ...value,
      [typeId]: {
        ...getTypeStyle(typeId),
        ...updates,
      },
    });
  };

  const currentStyle = getTypeStyle(selectedType);
  const currentPrimaryColor = currentStyle.primaryColor || globalPrimaryColor;

  const getAnimationClass = (animId: string) => {
    switch (animId) {
      case 'pulse': return 'animate-highlight-pulse';
      case 'glow': return 'animate-highlight-glow';
      case 'border': return 'animate-highlight-border';
      case 'shake': return 'animate-highlight-shake';
      case 'bounce': return 'animate-highlight-bounce';
      case 'fade': return 'animate-highlight-fade';
      default: return '';
    }
  };

  const renderPreview = () => {
    const style = currentStyle;
    const primary = style.primaryColor || globalPrimaryColor;
    const bg = style.backgroundColor || '#ffffff';
    const text = style.textColor || '#1f2937';
    const anim = style.animation || 'pulse';

    switch (selectedType) {
      case 'tooltip':
        return (
          <div className="relative">
            {/* Target element */}
            <div className="w-full h-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
              Elemento
            </div>
            {/* Tooltip */}
            <div 
              className="absolute -top-24 left-1/2 -translate-x-1/2 p-3 rounded-lg shadow-lg min-w-[160px] z-10"
              style={{ backgroundColor: bg, color: text }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span 
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded text-white"
                  style={{ backgroundColor: primary }}
                >
                  1/3
                </span>
                <span className="text-xs font-medium">Título</span>
              </div>
              <p className="text-[10px] opacity-70 mb-2">Descrição</p>
              <div className="flex gap-1 justify-end">
                <button 
                  className="px-2 py-0.5 text-[8px] rounded text-white"
                  style={{ backgroundColor: primary }}
                >
                  Próximo
                </button>
              </div>
              <div 
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
                style={{ backgroundColor: bg }}
              />
            </div>
          </div>
        );

      case 'modal':
        return (
          <div className="relative h-28 bg-black/30 rounded-lg flex items-center justify-center">
            <div 
              className="p-4 rounded-lg shadow-xl max-w-[180px]"
              style={{ backgroundColor: bg, color: text }}
            >
              <h4 className="text-sm font-semibold mb-1">Título do Modal</h4>
              <p className="text-[10px] opacity-70 mb-2">Descrição breve</p>
              <button 
                className="w-full px-2 py-1 text-[10px] rounded text-white"
                style={{ backgroundColor: primary }}
              >
                Continuar
              </button>
            </div>
          </div>
        );

      case 'highlight':
        return (
          <div className="relative">
            <div className="w-full h-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
              Elemento destacado
            </div>
            <div 
              className={cn(
                "absolute inset-0 rounded pointer-events-none",
                getAnimationClass(anim)
              )}
              style={{ 
                border: `3px solid ${primary}`,
                boxShadow: anim === 'glow' ? `0 0 15px ${primary}80` : undefined
              }}
            />
          </div>
        );

      case 'click':
        return (
          <div className="relative flex items-center justify-center h-16">
            <div 
              className={cn(
                "px-4 py-2 rounded text-white text-xs font-medium cursor-pointer",
                getAnimationClass(anim)
              )}
              style={{ backgroundColor: primary }}
            >
              Clique aqui
            </div>
            <MousePointer 
              className="absolute -right-1 -bottom-1 h-5 w-5 animate-bounce"
              style={{ color: primary }}
            />
          </div>
        );

      case 'input':
        return (
          <div className="relative">
            <div 
              className={cn(
                "w-full h-10 bg-white rounded border-2 flex items-center px-3",
                getAnimationClass(anim)
              )}
              style={{ borderColor: primary }}
            >
              <span className="text-xs text-muted-foreground">Digite algo...</span>
              <span 
                className="ml-1 w-0.5 h-4 animate-pulse"
                style={{ backgroundColor: primary }}
              />
            </div>
          </div>
        );

      case 'wait':
        return (
          <div className="flex items-center justify-center h-16 gap-3">
            <div 
              className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: `${primary}40`, borderTopColor: primary }}
            />
            <span className="text-xs text-muted-foreground">Aguardando...</span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Type Tabs */}
      <div className="flex flex-wrap gap-2">
        {ACTION_TYPES.map((type) => {
          const Icon = type.icon;
          const hasCustomStyle = value[type.id as keyof ActionTypeStyles];
          return (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all text-xs",
                selectedType === type.id
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/50",
                hasCustomStyle && "ring-1 ring-primary/30"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="font-medium">{type.name}</span>
              {hasCustomStyle && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Preview */}
      <div className="p-4 rounded-lg border bg-muted/30 min-h-[120px] flex items-center justify-center">
        {renderPreview()}
      </div>

      {/* Configuration */}
      <div className="space-y-4 p-4 rounded-lg border bg-muted/20">
        <div className="grid grid-cols-2 gap-4">
          {/* Primary Color */}
          <div className="space-y-2">
            <Label className="text-xs">Cor Principal</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={currentStyle.primaryColor || globalPrimaryColor}
                onChange={(e) => updateTypeStyle(selectedType, { primaryColor: e.target.value })}
                className="w-10 h-9 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={currentStyle.primaryColor || globalPrimaryColor}
                onChange={(e) => updateTypeStyle(selectedType, { primaryColor: e.target.value })}
                className="flex-1 font-mono text-xs"
                placeholder="Usar global"
              />
            </div>
          </div>

          {/* Background Color (for tooltip/modal) */}
          {(selectedType === 'tooltip' || selectedType === 'modal') && (
            <div className="space-y-2">
              <Label className="text-xs">Cor de Fundo</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={currentStyle.backgroundColor || '#ffffff'}
                  onChange={(e) => updateTypeStyle(selectedType, { backgroundColor: e.target.value })}
                  className="w-10 h-9 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={currentStyle.backgroundColor || '#ffffff'}
                  onChange={(e) => updateTypeStyle(selectedType, { backgroundColor: e.target.value })}
                  className="flex-1 font-mono text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Animation Selector (for highlight/click/input) */}
        {(selectedType === 'highlight' || selectedType === 'click' || selectedType === 'input') && (
          <div className="space-y-2">
            <Label className="text-xs">Animação</Label>
            <div className="grid grid-cols-3 gap-2">
              {ANIMATIONS.map((anim) => (
                <button
                  key={anim.id}
                  onClick={() => updateTypeStyle(selectedType, { animation: anim.id })}
                  className={cn(
                    "relative p-2 rounded border transition-all",
                    (currentStyle.animation || 'pulse') === anim.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="h-6 flex items-center justify-center mb-1">
                    <div 
                      className={cn(
                        "w-8 h-4 rounded bg-muted relative"
                      )}
                    >
                      <div 
                        className={cn(
                          "absolute inset-0 rounded",
                          getAnimationClass(anim.id)
                        )}
                        style={{ 
                          border: `2px solid ${currentPrimaryColor}`,
                          boxShadow: anim.id === 'glow' ? `0 0 8px ${currentPrimaryColor}80` : undefined
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] font-medium">{anim.name}</span>
                  {(currentStyle.animation || 'pulse') === anim.id && (
                    <Check className="absolute top-1 right-1 h-3 w-3 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reset Button */}
        {value[selectedType as keyof ActionTypeStyles] && (
          <button
            onClick={() => {
              const newValue = { ...value };
              delete newValue[selectedType as keyof ActionTypeStyles];
              onChange(newValue);
            }}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Redefinir para padrão global
          </button>
        )}
      </div>
    </div>
  );
}