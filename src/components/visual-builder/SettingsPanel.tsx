import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SetupConfiguration } from '@/types/database';
import { Save, Loader2, Settings, Palette } from 'lucide-react';
import { ThemeSelector, ThemeConfig } from './ThemeSelector';

interface SettingsPanelProps {
  configuration: SetupConfiguration;
  onUpdate: (updates: Partial<SetupConfiguration>) => void;
  isSaving: boolean;
}

export function SettingsPanel({ configuration, onUpdate, isSaving }: SettingsPanelProps) {
  const [name, setName] = useState(configuration.name || '');
  const [description, setDescription] = useState(configuration.description || '');
  const [targetUrl, setTargetUrl] = useState(configuration.target_url || '');
  const [widgetPosition, setWidgetPosition] = useState(configuration.widget_position || 'bottom-right');
  const [autoStart, setAutoStart] = useState(configuration.auto_start ?? true);
  const [isActive, setIsActive] = useState(configuration.is_active ?? true);
  const [allowedRoutes, setAllowedRoutes] = useState<string[]>(
    (configuration as any).allowed_routes || []
  );
  
  // Theme state
  const [theme, setTheme] = useState<ThemeConfig>({
    template: (configuration as any).theme_template || 'modern',
    primaryColor: (configuration as any).theme_primary_color || '#6366f1',
    secondaryColor: (configuration as any).theme_secondary_color || '#8b5cf6',
    backgroundColor: (configuration as any).theme_background_color || '#ffffff',
    textColor: (configuration as any).theme_text_color || '#1f2937',
    highlightAnimation: (configuration as any).theme_highlight_animation || 'pulse',
    borderRadius: (configuration as any).theme_border_radius || 'rounded',
    actionTypeStyles: (configuration as any).action_type_styles || {}
  });

  // Sync state when configuration changes
  useEffect(() => {
    setName(configuration.name || '');
    setDescription(configuration.description || '');
    setTargetUrl(configuration.target_url || '');
    setWidgetPosition(configuration.widget_position || 'bottom-right');
    setAutoStart(configuration.auto_start ?? true);
    setIsActive(configuration.is_active ?? true);
    setAllowedRoutes((configuration as any).allowed_routes || []);
    setTheme({
      template: (configuration as any).theme_template || 'modern',
      primaryColor: (configuration as any).theme_primary_color || '#6366f1',
      secondaryColor: (configuration as any).theme_secondary_color || '#8b5cf6',
      backgroundColor: (configuration as any).theme_background_color || '#ffffff',
      textColor: (configuration as any).theme_text_color || '#1f2937',
      highlightAnimation: (configuration as any).theme_highlight_animation || 'pulse',
      borderRadius: (configuration as any).theme_border_radius || 'rounded',
      actionTypeStyles: (configuration as any).action_type_styles || {}
    });
  }, [configuration]);

  const handleSave = () => {
    onUpdate({
      name,
      description,
      target_url: targetUrl,
      widget_position: widgetPosition,
      auto_start: autoStart,
      is_active: isActive,
      allowed_routes: allowedRoutes,
      theme_template: theme.template,
      theme_primary_color: theme.primaryColor,
      theme_secondary_color: theme.secondaryColor,
      theme_background_color: theme.backgroundColor,
      theme_text_color: theme.textColor,
      theme_highlight_animation: theme.highlightAnimation,
      theme_border_radius: theme.borderRadius,
      action_type_styles: theme.actionTypeStyles,
    } as any);
  };

  const currentAllowedRoutes = (configuration as any).allowed_routes || [];
  const currentActionTypeStyles = (configuration as any).action_type_styles || {};
  const hasChanges = 
    name !== configuration.name ||
    description !== (configuration.description || '') ||
    targetUrl !== configuration.target_url ||
    widgetPosition !== (configuration.widget_position || 'bottom-right') ||
    autoStart !== (configuration.auto_start ?? true) ||
    isActive !== (configuration.is_active ?? true) ||
    JSON.stringify(allowedRoutes) !== JSON.stringify(currentAllowedRoutes) ||
    theme.template !== ((configuration as any).theme_template || 'modern') ||
    theme.primaryColor !== ((configuration as any).theme_primary_color || '#6366f1') ||
    theme.secondaryColor !== ((configuration as any).theme_secondary_color || '#8b5cf6') ||
    theme.backgroundColor !== ((configuration as any).theme_background_color || '#ffffff') ||
    theme.textColor !== ((configuration as any).theme_text_color || '#1f2937') ||
    theme.highlightAnimation !== ((configuration as any).theme_highlight_animation || 'pulse') ||
    theme.borderRadius !== ((configuration as any).theme_border_radius || 'rounded') ||
    JSON.stringify(theme.actionTypeStyles) !== JSON.stringify(currentActionTypeStyles);

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="general" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4 grid w-auto grid-cols-2">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Aparência
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="general" className="p-4 space-y-4 mt-0">
            <div className="space-y-2">
              <Label htmlFor="config-name">Nome da Configuração</Label>
              <Input
                id="config-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Meu Onboarding"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="config-description">Descrição</Label>
              <Textarea
                id="config-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Guia de onboarding para novos usuários..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="config-url">URL Alvo</Label>
              <Input
                id="config-url"
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://meusite.com"
              />
              <p className="text-xs text-muted-foreground">
                URL onde o onboarding será exibido
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="widget-position">Posição do Widget</Label>
              <Select value={widgetPosition} onValueChange={setWidgetPosition}>
                <SelectTrigger id="widget-position">
                  <SelectValue placeholder="Selecione a posição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top-bar">Barra Superior</SelectItem>
                  <SelectItem value="bottom-right">Inferior Direito</SelectItem>
                  <SelectItem value="bottom-left">Inferior Esquerdo</SelectItem>
                  <SelectItem value="top-right">Superior Direito</SelectItem>
                  <SelectItem value="top-left">Superior Esquerdo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="auto-start">Iniciar automaticamente</Label>
                <p className="text-xs text-muted-foreground">
                  O tour inicia assim que a página carrega
                </p>
              </div>
              <Switch
                id="auto-start"
                checked={autoStart}
                onCheckedChange={setAutoStart}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="is-active">Configuração ativa</Label>
                <p className="text-xs text-muted-foreground">
                  Desative para pausar o onboarding
                </p>
              </div>
              <Switch
                id="is-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allowed-routes">Rotas Permitidas</Label>
              <Textarea
                id="allowed-routes"
                value={allowedRoutes.join('\n')}
                onChange={(e) => setAllowedRoutes(
                  e.target.value.split('\n').map(r => r.trim()).filter(r => r)
                )}
                placeholder="/Painel&#10;/dashboard/*&#10;/app/settings"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Uma rota por linha. Use * para wildcards (ex: /painel/*). Deixe vazio para todas as páginas.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="p-4 mt-0">
            <ThemeSelector value={theme} onChange={setTheme} />
          </TabsContent>
        </div>
      </Tabs>

      <div className="p-4 border-t">
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || isSaving}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
