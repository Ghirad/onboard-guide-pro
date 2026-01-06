import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IframeContainer } from '@/components/visual-builder/IframeContainer';
import { StepConfigPanel } from '@/components/visual-builder/StepConfigPanel';
import { TourTimeline } from '@/components/visual-builder/TourTimeline';
import { BuilderToolbar } from '@/components/visual-builder/BuilderToolbar';
import { PreviewOverlay } from '@/components/visual-builder/PreviewOverlay';
import { SelectedElement, TourStep, VisualBuilderState } from '@/types/visualBuilder';
import { useConfiguration, useConfigurationSteps, useCreateStep, useUpdateStep, useDeleteStep, useCreateAction, useUpdateAction, useStepActions } from '@/hooks/useConfigurations';
import { useToast } from '@/hooks/use-toast';

export default function VisualTourBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: configuration, isLoading: configLoading } = useConfiguration(id);
  const { data: dbSteps, isLoading: stepsLoading } = useConfigurationSteps(id);

  const createStep = useCreateStep();
  const updateStep = useUpdateStep();
  const deleteStep = useDeleteStep();
  const createAction = useCreateAction();

  const [state, setState] = useState<VisualBuilderState>({
    isSelectionMode: false,
    selectedElement: null,
    steps: [],
    currentEditingStepId: null,
    isPreviewMode: false,
    previewStepIndex: 0,
  });

  const [iframeReady, setIframeReady] = useState(false);
  const [highlightSelector, setHighlightSelector] = useState<string | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // Sync steps from database
  useEffect(() => {
    if (dbSteps) {
      const mappedSteps: TourStep[] = dbSteps.map((step, index) => ({
        id: step.id,
        order: step.step_order,
        type: (step.target_type === 'modal' ? 'modal' : 'tooltip') as TourStep['type'],
        selector: step.target_selector || '',
        element: {
          tagName: 'div',
          id: null,
          classList: [],
          textContent: '',
          selector: step.target_selector || '',
          rect: { top: 0, left: 0, width: 0, height: 0 },
        },
        config: {
          title: step.title,
          description: step.description || '',
          position: 'auto',
        },
      }));
      setState(prev => ({ ...prev, steps: mappedSteps }));
    }
  }, [dbSteps]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setState(prev => {
        const oldIndex = prev.steps.findIndex(s => s.id === active.id);
        const newIndex = prev.steps.findIndex(s => s.id === over.id);
        const newSteps = arrayMove(prev.steps, oldIndex, newIndex).map((step, index) => ({
          ...step,
          order: index + 1,
        }));

        // Update order in database
        newSteps.forEach(step => {
          updateStep.mutate({ id: step.id, configurationId: id!, step_order: step.order });
        });

        return { ...prev, steps: newSteps };
      });
    }
  };

  const handleElementSelected = useCallback((element: SelectedElement) => {
    setState(prev => ({
      ...prev,
      selectedElement: element,
      isSelectionMode: false,
    }));
    setShowConfigPanel(true);
  }, []);

  const handleIframeReady = useCallback(() => {
    setIframeReady(true);
  }, []);

  const handleSaveStep = async (stepData: Omit<TourStep, 'id' | 'order'>) => {
    if (!id) return;

    try {
      const newOrder = state.steps.length + 1;

      await createStep.mutateAsync({
        configurationId: id,
        step: {
          title: stepData.config.title || `Step ${newOrder}`,
          description: stepData.config.description || null,
          instructions: stepData.config.description || null,
          target_type: stepData.type === 'modal' ? 'modal' : 'page',
          target_selector: stepData.selector,
          step_order: newOrder,
          is_required: true,
        },
      });

      toast({
        title: 'Step added',
        description: 'The step was added to your tour.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save step.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStep = async (stepId: string, updates: Partial<TourStep>) => {
    try {
      await updateStep.mutateAsync({
        id: stepId,
        configurationId: id!,
        title: updates.config?.title,
        description: updates.config?.description,
        target_selector: updates.selector,
        target_type: updates.type === 'modal' ? 'modal' : 'page',
      });

      toast({
        title: 'Step updated',
        description: 'The step was updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update step.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    const step = state.steps.find(s => s.id === stepId);
    if (!step) return;

    try {
      await deleteStep.mutateAsync({ id: stepId, configurationId: id! });
      toast({
        title: 'Step deleted',
        description: 'The step was removed from your tour.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete step.',
        variant: 'destructive',
      });
    }
  };

  const handleEditStep = (step: TourStep) => {
    setState(prev => ({
      ...prev,
      currentEditingStepId: step.id,
      selectedElement: step.element,
    }));
    setShowConfigPanel(true);
  };

  const handleSave = () => {
    toast({
      title: 'Tour saved',
      description: 'Your tour configuration has been saved.',
    });
    navigate(`/config/${id}`);
  };

  // Preview mode handlers
  const handleStartPreview = useCallback(() => {
    if (state.steps.length === 0) {
      toast({
        title: 'No steps',
        description: 'Add at least one step to preview the tour.',
        variant: 'destructive',
      });
      return;
    }
    setState(prev => ({
      ...prev,
      isPreviewMode: true,
      previewStepIndex: 0,
      isSelectionMode: false,
    }));
    setShowConfigPanel(false);
  }, [state.steps.length, toast]);

  const handleExitPreview = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPreviewMode: false,
      previewStepIndex: 0,
    }));
  }, []);

  const handleNextPreviewStep = useCallback(() => {
    setState(prev => {
      if (prev.previewStepIndex >= prev.steps.length - 1) {
        toast({
          title: 'Tour Complete',
          description: 'You have finished previewing the tour.',
        });
        return {
          ...prev,
          isPreviewMode: false,
          previewStepIndex: 0,
        };
      }
      return {
        ...prev,
        previewStepIndex: prev.previewStepIndex + 1,
      };
    });
  }, [toast]);

  const handlePrevPreviewStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      previewStepIndex: Math.max(0, prev.previewStepIndex - 1),
    }));
  }, []);

  const handlePreviewAction = useCallback((action: 'next' | 'skip') => {
    if (action === 'next' || action === 'skip') {
      handleNextPreviewStep();
    }
  }, [handleNextPreviewStep]);

  const handleTogglePreviewMode = useCallback(() => {
    if (state.isPreviewMode) {
      handleExitPreview();
    } else {
      handleStartPreview();
    }
  }, [state.isPreviewMode, handleExitPreview, handleStartPreview]);

  const proxyUrl = configuration?.target_url
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-page?url=${encodeURIComponent(configuration.target_url)}`
    : '';

  if (configLoading || stepsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const editingStep = state.currentEditingStepId
    ? state.steps.find(s => s.id === state.currentEditingStepId)
    : null;

  const currentPreviewStep = state.isPreviewMode ? state.steps[state.previewStepIndex] : null;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/config/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold">{configuration?.name || 'Visual Builder'}</h1>
          <p className="text-sm text-muted-foreground truncate max-w-md">
            {configuration?.target_url}
          </p>
        </div>
        <BuilderToolbar
          isSelectionMode={state.isSelectionMode}
          isPreviewMode={state.isPreviewMode}
          onToggleSelectionMode={() => setState(prev => ({ ...prev, isSelectionMode: !prev.isSelectionMode }))}
          onTogglePreviewMode={handleTogglePreviewMode}
          onSave={handleSave}
        />
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Steps Timeline */}
        {!state.isPreviewMode && (
          <aside className="w-80 border-r bg-card overflow-y-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={state.steps.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <TourTimeline
                  steps={state.steps}
                  onEditStep={handleEditStep}
                  onDeleteStep={handleDeleteStep}
                  onHoverStep={setHighlightSelector}
                />
              </SortableContext>
            </DndContext>
          </aside>
        )}

        {/* Iframe Preview */}
        <main className={`flex-1 p-4 ${state.isPreviewMode ? 'pb-32' : ''}`}>
          <IframeContainer
            proxyUrl={proxyUrl}
            isSelectionMode={state.isSelectionMode}
            onElementSelected={handleElementSelected}
            onIframeReady={handleIframeReady}
            highlightSelector={highlightSelector || undefined}
            isPreviewMode={state.isPreviewMode}
            previewStep={currentPreviewStep}
            onPreviewAction={handlePreviewAction}
          />
        </main>

        {/* Config Panel (conditionally shown) */}
        {showConfigPanel && !state.isPreviewMode && (
          <aside className="w-96 border-l bg-card overflow-y-auto">
            <StepConfigPanel
              selectedElement={state.selectedElement}
              editingStep={editingStep || null}
              onSave={handleSaveStep}
              onUpdate={handleUpdateStep}
              onClose={() => {
                setShowConfigPanel(false);
                setState(prev => ({
                  ...prev,
                  selectedElement: null,
                  currentEditingStepId: null,
                }));
              }}
            />
          </aside>
        )}
      </div>

      {/* Preview Overlay */}
      {state.isPreviewMode && (
        <PreviewOverlay
          steps={state.steps}
          currentIndex={state.previewStepIndex}
          onNext={handleNextPreviewStep}
          onPrev={handlePrevPreviewStep}
          onExit={handleExitPreview}
        />
      )}
    </div>
  );
}
