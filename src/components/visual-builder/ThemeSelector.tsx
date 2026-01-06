import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Check, Palette, Sparkles, Layers } from 'lucide-react';
import { ActionTypeStyleEditor, ActionTypeStyles } from './ActionTypeStyleEditor';

export interface ThemeConfig {
  template: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  highlightAnimation: string;
  borderRadius: string;
  actionTypeStyles?: ActionTypeStyles;
}

interface ThemeTemplate {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  highlightAnimation: string;
  borderRadius: string;
}

const THEME_TEMPLATES: ThemeTemplate[] = [
  {
    id: 'modern',
    name: 'Moderno',
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    highlightAnimation: 'pulse',
    borderRadius: 'rounded'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    primaryColor: '#1f2937',
    secondaryColor: '#374151',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    highlightAnimation: 'border',
    borderRadius: 'sharp'
  },
  {
    id: 'ocean',
    name: 'Oceano',
    primaryColor: '#0ea5e9',
    secondaryColor: '#06b6d4',
    backgroundColor: '#ffffff',
    textColor: '#0c4a6e',
    highlightAnimation: 'glow',
    borderRadius: 'rounded'
  },
  {
    id: 'forest',
    name: 'Floresta',
    primaryColor: '#22c55e',
    secondaryColor: '#10b981',
    backgroundColor: '#ffffff',
    textColor: '#14532d',
    highlightAnimation: 'pulse',
    borderRadius: 'rounded'
  },
  {
    id: 'sunset',
    name: 'Sunset',
    primaryColor: '#f97316',
    secondaryColor: '#ef4444',
    backgroundColor: '#ffffff',
    textColor: '#7c2d12',
    highlightAnimation: 'glow',
    borderRadius: 'rounded'
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    primaryColor: '#a78bfa',
    secondaryColor: '#818cf8',
    backgroundColor: '#1f2937',
    textColor: '#f9fafb',
    highlightAnimation: 'glow',
    borderRadius: 'rounded'
  }
];

const HIGHLIGHT_ANIMATIONS = [
  { id: 'pulse', name: 'Pulse', description: 'Pulsação suave' },
  { id: 'glow', name: 'Glow', description: 'Brilho radiante' },
  { id: 'border', name: 'Border', description: 'Borda animada' },
  { id: 'shake', name: 'Shake', description: 'Tremor rápido' },
  { id: 'bounce', name: 'Bounce', description: 'Quique suave' },
  { id: 'fade', name: 'Fade', description: 'Aparece e some' },
];

interface ThemeSelectorProps {
  value: ThemeConfig;
  onChange: (theme: ThemeConfig) => void;
}

export function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  const [useCustomColors, setUseCustomColors] = useState(false);
  const [animatingTemplate, setAnimatingTemplate] = useState<string | null>(null);

  const handleTemplateSelect = (template: ThemeTemplate) => {
    setAnimatingTemplate(template.id);
    setTimeout(() => setAnimatingTemplate(null), 500);
    
    onChange({
      template: template.id,
      primaryColor: template.primaryColor,
      secondaryColor: template.secondaryColor,
      backgroundColor: template.backgroundColor,
      textColor: template.textColor,
      highlightAnimation: template.highlightAnimation,
      borderRadius: template.borderRadius
    });
    setUseCustomColors(false);
  };

  const handleColorChange = (key: keyof ThemeConfig, newValue: string) => {
    onChange({ ...value, [key]: newValue });
    setUseCustomColors(true);
  };

  const handleAnimationChange = (animationId: string) => {
    onChange({ ...value, highlightAnimation: animationId });
  };

  const handleActionTypeStylesChange = (styles: ActionTypeStyles) => {
    onChange({ ...value, actionTypeStyles: styles });
  };

  const getHighlightStyle = (animationId: string, color: string) => {
    const baseStyle = {
      border: `3px solid ${color}`,
    };
    
    if (animationId === 'glow') {
      return {
        ...baseStyle,
        boxShadow: `0 0 15px ${color}80`,
      };
    }
    
    return baseStyle;
  };

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

  return (
    <div className="space-y-6">
      {/* Template Gallery */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Escolha um modelo
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {THEME_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className={cn(
                "relative p-3 rounded-lg border-2 transition-all duration-300 text-left",
                value.template === template.id && !useCustomColors
                  ? "border-primary ring-2 ring-primary/20 scale-[1.02]"
                  : "border-border hover:border-primary/50 hover:scale-[1.01]",
                animatingTemplate === template.id && "animate-template-select"
              )}
            >
              {/* Preview */}
              <div 
                className="h-12 rounded-md mb-2 flex items-center justify-center transition-transform duration-300"
                style={{ 
                  background: `linear-gradient(135deg, ${template.primaryColor} 0%, ${template.secondaryColor} 100%)` 
                }}
              >
                <div 
                  className="w-8 h-6 rounded shadow-sm flex items-center justify-center transition-all duration-300"
                  style={{ 
                    backgroundColor: template.backgroundColor,
                    color: template.textColor
                  }}
                >
                  <span className="text-[8px] font-medium">Aa</span>
                </div>
              </div>
              
              {/* Name */}
              <span className="text-sm font-medium">{template.name}</span>
              
              {/* Selected indicator */}
              {value.template === template.id && !useCustomColors && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center animate-scale-in">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Highlight Animation Selector */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Animação de Destaque
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {HIGHLIGHT_ANIMATIONS.map((anim) => (
            <button
              key={anim.id}
              onClick={() => handleAnimationChange(anim.id)}
              className={cn(
                "relative p-2 rounded-lg border-2 transition-all duration-200",
                value.highlightAnimation === anim.id
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-border hover:border-primary/50"
              )}
            >
              {/* Animated Preview */}
              <div className="h-8 mb-1 flex items-center justify-center">
                <div className="w-12 h-6 rounded bg-muted/50 relative">
                  <div 
                    className={cn(
                      "absolute inset-0 rounded pointer-events-none",
                      getAnimationClass(anim.id)
                    )}
                    style={getHighlightStyle(anim.id, value.primaryColor)}
                  />
                </div>
              </div>
              <span className="text-[10px] font-medium block text-center">{anim.name}</span>
              
              {value.highlightAnimation === anim.id && (
                <Check className="absolute top-1 right-1 h-3 w-3 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Colors Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label>Personalizar cores</Label>
          <p className="text-xs text-muted-foreground">
            Ajustar cores manualmente
          </p>
        </div>
        <Switch
          checked={useCustomColors}
          onCheckedChange={setUseCustomColors}
        />
      </div>

      {/* Custom Colors */}
      {useCustomColors && (
        <div className="space-y-4 p-4 rounded-lg border bg-muted/30 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color" className="text-xs">Cor Primária</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={value.primaryColor}
                  onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                  className="w-10 h-9 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={value.primaryColor}
                  onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                  className="flex-1 font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-color" className="text-xs">Cor Secundária</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={value.secondaryColor}
                  onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                  className="w-10 h-9 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={value.secondaryColor}
                  onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                  className="flex-1 font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bg-color" className="text-xs">Cor de Fundo</Label>
              <div className="flex gap-2">
                <Input
                  id="bg-color"
                  type="color"
                  value={value.backgroundColor}
                  onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                  className="w-10 h-9 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={value.backgroundColor}
                  onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                  className="flex-1 font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="text-color" className="text-xs">Cor do Texto</Label>
              <div className="flex gap-2">
                <Input
                  id="text-color"
                  type="color"
                  value={value.textColor}
                  onChange={(e) => handleColorChange('textColor', e.target.value)}
                  className="w-10 h-9 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={value.textColor}
                  onChange={(e) => handleColorChange('textColor', e.target.value)}
                  className="flex-1 font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview */}
      <div className="space-y-3">
        <Label>Preview</Label>
        <div className="relative p-6 rounded-lg border bg-muted/30 overflow-hidden">
          {/* Simulated element */}
          <div 
            className="relative w-full h-10 rounded flex items-center justify-center text-xs"
            style={{ 
              backgroundColor: '#e5e7eb',
              color: '#6b7280'
            }}
          >
            <span>Elemento do site</span>
            
            {/* Highlight preview with selected animation */}
            <div 
              className={cn(
                "absolute inset-0 rounded pointer-events-none transition-all duration-300",
                getAnimationClass(value.highlightAnimation)
              )}
              style={getHighlightStyle(value.highlightAnimation, value.primaryColor)}
            />
          </div>
          
          {/* Tooltip preview */}
          <div 
            className="absolute -top-2 left-1/2 transform -translate-x-1/2 p-3 rounded-lg shadow-lg min-w-[180px] transition-all duration-300"
            style={{ 
              backgroundColor: value.backgroundColor,
              color: value.textColor
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span 
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white"
                style={{ 
                  background: `linear-gradient(135deg, ${value.primaryColor}, ${value.secondaryColor})` 
                }}
              >
                1/3
              </span>
              <span className="text-xs font-medium">Título do Passo</span>
            </div>
            <p className="text-[10px] opacity-70 mb-2">Descrição de exemplo</p>
            <div className="flex gap-1.5 justify-end">
              <button 
                className="px-2 py-0.5 text-[9px] rounded transition-colors duration-200"
                style={{ 
                  backgroundColor: `${value.primaryColor}15`,
                  color: value.textColor
                }}
              >
                Pular
              </button>
              <button 
                className="px-2 py-0.5 text-[9px] rounded text-white transition-colors duration-200"
                style={{ 
                  background: `linear-gradient(135deg, ${value.primaryColor}, ${value.secondaryColor})` 
                }}
              >
                Próximo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Type Styles Editor */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Estilos por Tipo de Ação
        </Label>
        <p className="text-xs text-muted-foreground">
          Configure cores e animações específicas para cada tipo de ação
        </p>
        <ActionTypeStyleEditor
          value={value.actionTypeStyles || {}}
          onChange={handleActionTypeStylesChange}
          globalPrimaryColor={value.primaryColor}
        />
      </div>
    </div>
  );
}
