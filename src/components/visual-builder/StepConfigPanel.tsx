import { useState, useEffect } from 'react';
import { X, Type, MessageSquare, Sparkles, MousePointer, Keyboard, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SelectedElement, TourStep, TourStepType, TourStepConfig, TooltipPosition } from '@/types/visualBuilder';

interface StepConfigPanelProps {
  selectedElement: SelectedElement | null;
  editingStep: TourStep | null;
  onSave: (step: Omit<TourStep, 'id' | 'order'>) => void;
  onUpdate: (stepId: string, updates: Partial<TourStep>) => void;
  onClose: () => void;
}

const stepTypes: { type: TourStepType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'tooltip', label: 'Tooltip', icon: <MessageSquare className="h-4 w-4" />, description: 'Show explanatory text' },
  { type: 'modal', label: 'Modal', icon: <Type className="h-4 w-4" />, description: 'Display a popup dialog' },
  { type: 'highlight', label: 'Highlight', icon: <Sparkles className="h-4 w-4" />, description: 'Draw attention to element' },
  { type: 'click', label: 'Click', icon: <MousePointer className="h-4 w-4" />, description: 'Wait for user click' },
  { type: 'input', label: 'Input', icon: <Keyboard className="h-4 w-4" />, description: 'Guide user input' },
  { type: 'wait', label: 'Wait', icon: <Clock className="h-4 w-4" />, description: 'Pause before next step' },
];

export function StepConfigPanel({
  selectedElement,
  editingStep,
  onSave,
  onUpdate,
  onClose,
}: StepConfigPanelProps) {
  const [stepType, setStepType] = useState<TourStepType>(editingStep?.type || 'tooltip');
  const [config, setConfig] = useState<TourStepConfig>(editingStep?.config || {
    title: '',
    description: '',
    position: 'auto',
    buttonText: 'Next',
    skipButtonText: 'Skip',
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
    }
  }, [editingStep]);

  const handleSave = () => {
    if (!selectedElement && !editingStep) return;

    const element = editingStep?.element || selectedElement!;
    const selector = editingStep?.selector || selectedElement!.selector;

    if (editingStep) {
      onUpdate(editingStep.id, { type: stepType, config });
    } else {
      onSave({
        type: stepType,
        selector,
        element,
        config,
      });
    }
    onClose();
  };

  const updateConfig = (key: keyof TourStepConfig, value: unknown) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const element = editingStep?.element || selectedElement;

  if (!element) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>Select an element to configure a step</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">
          {editingStep ? 'Edit Step' : 'New Step'}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Element Info */}
        <div className="p-3 bg-muted/50 rounded-lg space-y-1">
          <p className="text-xs text-muted-foreground">Selected Element</p>
          <code className="text-xs font-mono block truncate">{element.selector}</code>
          {element.textContent && (
            <p className="text-xs text-muted-foreground truncate">
              "{element.textContent}"
            </p>
          )}
        </div>

        {/* Step Type Selection */}
        <div className="space-y-2">
          <Label>Step Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {stepTypes.map(({ type, label, icon, description }) => (
              <button
                key={type}
                onClick={() => setStepType(type)}
                className={`flex flex-col items-start p-3 rounded-lg border transition-colors text-left ${
                  stepType === type
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {icon}
                  <span className="font-medium text-sm">{label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Type-specific Configuration */}
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4 mt-4">
            {(stepType === 'tooltip' || stepType === 'modal') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={config.title || ''}
                    onChange={(e) => updateConfig('title', e.target.value)}
                    placeholder="Step title..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={config.description || ''}
                    onChange={(e) => updateConfig('description', e.target.value)}
                    placeholder="Explain what the user should do..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL (optional)</Label>
                  <Input
                    id="imageUrl"
                    value={config.imageUrl || ''}
                    onChange={(e) => updateConfig('imageUrl', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </>
            )}

            {stepType === 'input' && (
              <div className="space-y-2">
                <Label htmlFor="placeholder">Input Placeholder</Label>
                <Input
                  id="placeholder"
                  value={config.inputPlaceholder || ''}
                  onChange={(e) => updateConfig('inputPlaceholder', e.target.value)}
                  placeholder="Type here..."
                />
              </div>
            )}

            {stepType === 'wait' && (
              <div className="space-y-2">
                <Label htmlFor="delay">Wait Duration (ms)</Label>
                <Input
                  id="delay"
                  type="number"
                  value={config.delayMs || 500}
                  onChange={(e) => updateConfig('delayMs', parseInt(e.target.value))}
                  min={100}
                  step={100}
                />
              </div>
            )}

            {(stepType === 'click' || stepType === 'input') && (
              <div className="flex items-center justify-between">
                <Label htmlFor="waitForClick">Wait for user action</Label>
                <Switch
                  id="waitForClick"
                  checked={config.waitForClick || false}
                  onCheckedChange={(checked) => updateConfig('waitForClick', checked)}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4 mt-4">
            {(stepType === 'tooltip' || stepType === 'modal') && (
              <>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select
                    value={config.position || 'auto'}
                    onValueChange={(value) => updateConfig('position', value as TooltipPosition)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buttonText">Button Text</Label>
                  <Input
                    id="buttonText"
                    value={config.buttonText || 'Next'}
                    onChange={(e) => updateConfig('buttonText', e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="showSkip">Show Skip Button</Label>
                  <Switch
                    id="showSkip"
                    checked={config.showSkip ?? true}
                    onCheckedChange={(checked) => updateConfig('showSkip', checked)}
                  />
                </div>

                {config.showSkip && (
                  <div className="space-y-2">
                    <Label htmlFor="skipButtonText">Skip Button Text</Label>
                    <Input
                      id="skipButtonText"
                      value={config.skipButtonText || 'Skip'}
                      onChange={(e) => updateConfig('skipButtonText', e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            {(stepType === 'highlight' || stepType === 'click') && (
              <>
                <div className="space-y-2">
                  <Label>Animation</Label>
                  <Select
                    value={config.highlightAnimation || 'pulse'}
                    onValueChange={(value) => updateConfig('highlightAnimation', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pulse">Pulse</SelectItem>
                      <SelectItem value="glow">Glow</SelectItem>
                      <SelectItem value="border">Border</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="highlightColor">Highlight Color</Label>
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
        </Tabs>
      </div>

      <div className="p-4 border-t flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSave}>
          {editingStep ? 'Update Step' : 'Add Step'}
        </Button>
      </div>
    </div>
  );
}
