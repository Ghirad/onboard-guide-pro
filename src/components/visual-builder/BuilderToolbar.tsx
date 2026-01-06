import { MousePointer, Eye, Save, Undo, Redo, MousePointer2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface BuilderToolbarProps {
  isSelectionMode: boolean;
  isPreviewMode: boolean;
  onToggleSelectionMode: () => void;
  onTogglePreviewMode: () => void;
  onSave: () => void;
  onStartCapture?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function BuilderToolbar({
  isSelectionMode,
  isPreviewMode,
  onToggleSelectionMode,
  onTogglePreviewMode,
  onSave,
  onStartCapture,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}: BuilderToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-card border rounded-lg shadow-sm">
      {/* Capture Button - Primary action */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="default"
            size="sm"
            onClick={onStartCapture}
            disabled={isPreviewMode}
            className="gap-2"
          >
            <MousePointer2 className="h-4 w-4" />
            Capturar
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Capturar elementos do site para criar passos</p>
        </TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            pressed={isPreviewMode}
            onPressedChange={onTogglePreviewMode}
            aria-label="Toggle preview mode"
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>
          <p>Testar experiência do tour</p>
        </TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              disabled={!canUndo}
            >
              <Undo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Desfazer</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRedo}
              disabled={!canRedo}
            >
              <Redo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refazer</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex-1" />

      <Button onClick={onSave}>
        <Save className="h-4 w-4 mr-2" />
        Salvar Tour
      </Button>
    </div>
  );
}
