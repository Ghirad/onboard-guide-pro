import { MousePointer, Eye, Save, Undo, Redo, Settings } from 'lucide-react';
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
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}: BuilderToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-card border rounded-lg shadow-sm">
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            pressed={isSelectionMode}
            onPressedChange={onToggleSelectionMode}
            disabled={isPreviewMode}
            aria-label="Toggle selection mode"
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <MousePointer className="h-4 w-4 mr-2" />
            Select
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>
          <p>Click elements to add steps</p>
        </TooltipContent>
      </Tooltip>

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
          <p>Test the tour experience</p>
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
            <p>Undo</p>
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
            <p>Redo</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex-1" />

      <Button onClick={onSave}>
        <Save className="h-4 w-4 mr-2" />
        Save Tour
      </Button>
    </div>
  );
}
