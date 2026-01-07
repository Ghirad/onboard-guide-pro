import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IframeContainer, IframeContainerRef } from '@/components/visual-builder/IframeContainer';
import { StepConfigPanel } from '@/components/visual-builder/StepConfigPanel';
import { TourTimeline } from '@/components/visual-builder/TourTimeline';
import { BuilderToolbar } from '@/components/visual-builder/BuilderToolbar';
import { PreviewOverlay } from '@/components/visual-builder/PreviewOverlay';
import { ElementsPanel, ScannedElement } from '@/components/visual-builder/ElementsPanel';
import { CaptureModal } from '@/components/visual-builder/CaptureModal';
import { SettingsPanel } from '@/components/visual-builder/SettingsPanel';
import { CodeModal } from '@/components/visual-builder/CodeModal';
// StepPreviewModal removed - preview now happens directly in iframe
import { SelectedElement, TourStep, VisualBuilderState } from '@/types/visualBuilder';
import { useConfiguration, useConfigurationStepsWithActions, useCreateStep, useUpdateStep, useDeleteStep, useCreateAction, useUpdateAction, useUpdateConfiguration, SetupStepWithActions } from '@/hooks/useConfigurations';
import { TourStepType } from '@/types/visualBuilder';
import { useToast } from '@/hooks/use-toast';

interface CapturedElement {
  selector: string;
  label: string;
  tagName: string;
  rect: { top: number; left: number; width: number; height: number };
}

export default function VisualTourBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: configuration, isLoading: configLoading } = useConfiguration(id);
  const { data: dbStepsWithActions, isLoading: stepsLoading, refetch: refetchSteps } = useConfigurationStepsWithActions(id);

  const createStep = useCreateStep();
  const updateStep = useUpdateStep();
  const deleteStep = useDeleteStep();
  const createAction = useCreateAction();
  const updateAction = useUpdateAction();
  const updateConfiguration = useUpdateConfiguration();

  // Helper to derive TourStepType from database step + actions
  const deriveStepType = (step: SetupStepWithActions): TourStepType => {
    if (step.target_type === 'modal') return 'modal';
    
    const firstAction = step.step_actions?.[0];
    if (firstAction) {
      const actionType = firstAction.action_type;
      if (['click', 'input', 'wait', 'highlight'].includes(actionType)) {
        return actionType as TourStepType;
      }
      if (actionType === 'open_modal') return 'modal';
    }
    
    return 'tooltip';
  };

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
  const [scannedElements, setScannedElements] = useState<ScannedElement[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'steps' | 'elements' | 'settings'>('elements');
  const [showCodeModal, setShowCodeModal] = useState(false);
  
  // Capture state
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [captureToken, setCaptureToken] = useState<string | null>(null);
  const [isCaptureReady, setIsCaptureReady] = useState(false);
  
  // previewStep state removed - preview now happens in iframe via isPreviewMode
  
  const iframeContainerRef = useRef<IframeContainerRef>(null);

  // Auto-refetch steps while capture modal is open
  useEffect(() => {
    if (!showCaptureModal) return;
    
    const interval = setInterval(() => {
      refetchSteps();
    }, 3000); // Refetch every 3 seconds
    
    return () => clearInterval(interval);
  }, [showCaptureModal, refetchSteps]);
  useEffect(() => {
    if (dbStepsWithActions) {
      const mappedSteps: TourStep[] = dbStepsWithActions.map((step) => {
        const stepType = deriveStepType(step);
        const firstAction = step.step_actions?.[0];
        
        // Get selector from step or first action
        const selector = step.target_selector || firstAction?.selector || '';
        
        // Parse theme_override from database
        const themeOverride = (step as any).theme_override || undefined;
        
        return {
          id: step.id,
          order: step.step_order,
          type: stepType,
          selector,
          element: {
            tagName: 'div',
            id: null,
            classList: [],
            textContent: '',
            selector,
            rect: { top: 0, left: 0, width: 0, height: 0 },
          },
          config: {
            title: step.title,
            description: step.description || '',
            position: (step as any).tooltip_position || 'auto',
            delayMs: firstAction?.delay_ms || undefined,
            highlightColor: firstAction?.highlight_color || undefined,
            highlightAnimation: firstAction?.highlight_animation || undefined,
            themeOverride,
            showSkip: !step.is_required,
          },
        };
      });
      setState(prev => ({ ...prev, steps: mappedSteps }));
    }
  }, [dbStepsWithActions]);

  const handleCapturedElement = useCallback((element: CapturedElement) => {
    const selectedElement: SelectedElement = {
      tagName: element.tagName,
      id: null,
      classList: [],
      textContent: element.label || '',
      selector: element.selector,
      rect: element.rect || { top: 0, left: 0, width: 0, height: 0 },
    };
    
    setState(prev => ({
      ...prev,
      selectedElement,
      isSelectionMode: false,
    }));
    setShowConfigPanel(true);
    setSidebarTab('steps');
    setShowCaptureModal(false);
    
    toast({
      title: 'Elemento capturado',
      description: `${element.tagName}: ${(element.label || element.selector).slice(0, 30)}`,
    });
  }, [toast]);

  const handleManualImport = useCallback((element: CapturedElement) => {
    handleCapturedElement(element);
  }, [handleCapturedElement]);

  const handleCapturedScan = useCallback((elements: CapturedElement[]) => {
    const getElementType = (tagName: string): ScannedElement['type'] => {
      const tag = tagName.toLowerCase();
      if (tag === 'button') return 'button';
      if (tag === 'a') return 'link';
      if (tag === 'input') return 'input';
      if (tag === 'select') return 'select';
      if (tag === 'textarea') return 'input';
      if (tag === 'nav') return 'navigation';
      return 'other';
    };

    const scanned: ScannedElement[] = elements.map(el => ({
      type: getElementType(el.tagName),
      selector: el.selector,
      label: el.label,
      tagName: el.tagName,
      rect: el.rect,
    }));
    setScannedElements(scanned);
    setIsScanning(false);
    
    toast({
      title: 'Elementos escaneados',
      description: `${elements.length} elementos encontrados.`,
    });
  }, [toast]);

  // Handler for complete step captured from console script
  const handleCapturedStep = useCallback(async (stepData: {
    stepType: string;
    selector: string;
    element: { tagName: string; label: string; rect: { top: number; left: number; width: number; height: number } };
    config: { title: string; description: string | null; position: string; delayMs?: number };
  }) => {
    if (!id) return;
    
    // Validate selector
    if (!stepData.selector || stepData.selector.trim() === '') {
      toast({
        title: 'Erro',
        description: 'Seletor inválido. Capture o elemento novamente.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const newOrder = state.steps.length; // 0-based
      const stepType = stepData.stepType as TourStepType;
      
      // Create the step
      const createdStep = await createStep.mutateAsync({
        configurationId: id,
        step: {
          title: stepData.config.title || `Passo ${newOrder + 1}`,
          description: stepData.config.description || null,
          instructions: stepData.config.description || null,
          target_type: stepType === 'modal' ? 'modal' : 'page',
          target_selector: stepData.selector,
          step_order: newOrder,
          is_required: true,
        },
      });
      
      // Create step_action for action types (click, input, wait, highlight)
      if (['click', 'input', 'wait', 'highlight'].includes(stepType)) {
        await createAction.mutateAsync({
          stepId: createdStep.id,
          action: {
            action_type: stepType as 'click' | 'input' | 'wait' | 'highlight',
            selector: stepData.selector,
            action_order: 0,
            delay_ms: stepType === 'wait' ? (stepData.config.delayMs || 500) : 0,
            description: stepData.config.title || null,
          },
        });
      }
      
      // Optimistic update - add to local state immediately
      const newStep: TourStep = {
        id: createdStep.id,
        order: newOrder,
        type: stepType,
        selector: stepData.selector,
        element: {
          tagName: stepData.element.tagName,
          id: null,
          classList: [],
          textContent: stepData.element.label || '',
          selector: stepData.selector,
          rect: stepData.element.rect || { top: 0, left: 0, width: 0, height: 0 },
        },
        config: {
          title: stepData.config.title || `Passo ${newOrder + 1}`,
          description: stepData.config.description || '',
          position: (stepData.config.position || 'auto') as 'auto' | 'top' | 'bottom' | 'left' | 'right',
        },
      };
      
      setState(prev => ({
        ...prev,
        steps: [...prev.steps, newStep],
      }));
      
      // Refetch to sync with database
      refetchSteps();
      
      toast({
        title: '✓ Passo adicionado!',
        description: stepData.config.title || stepData.selector.slice(0, 30),
      });
      
      // Switch to steps tab to show the new step
      setSidebarTab('steps');
    } catch (error) {
      console.error('[VisualTourBuilder] Error saving step:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar o passo.',
        variant: 'destructive',
      });
    }
  }, [id, state.steps.length, createStep, createAction, refetchSteps, toast]);

  // Listen for capture messages from external script/extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data?.token || event.data.token !== captureToken) return;
      
      console.log('[VisualTourBuilder] Capture message:', event.data.type);
      
      if (event.data.type === 'TOUR_CAPTURE_READY') {
        setIsCaptureReady(true);
        toast({
          title: 'Captura ativada',
          description: 'Clique nos elementos do site para capturar.',
        });
      } else if (event.data.type === 'TOUR_CAPTURE_ELEMENT') {
        handleCapturedElement(event.data.element as CapturedElement);
      } else if (event.data.type === 'TOUR_CAPTURE_SCAN') {
        handleCapturedScan(event.data.elements as CapturedElement[]);
      } else if (event.data.type === 'TOUR_CAPTURE_STEP') {
        // Complete step from console script - save directly
        handleCapturedStep(event.data.step);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Also listen via BroadcastChannel for extension support
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('tour-builder-capture');
      channel.onmessage = (event) => {
        if (event.data?.token === captureToken) {
          handleMessage({ data: event.data } as MessageEvent);
        }
      };
    } catch (e) {
      console.log('[VisualTourBuilder] BroadcastChannel not supported');
    }

    return () => {
      window.removeEventListener('message', handleMessage);
      channel?.close();
    };
  }, [captureToken, toast, handleCapturedElement, handleCapturedScan, handleCapturedStep]);

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
          order: index, // 0-based
        }));

        // Update all steps with new order (0-based)
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
    setSidebarTab('steps');
  }, []);

  const handleScannedElementClick = useCallback((element: ScannedElement) => {
    const selectedElement: SelectedElement = {
      tagName: element.tagName,
      id: null,
      classList: [],
      textContent: element.label,
      selector: element.selector,
      rect: element.rect,
    };
    setState(prev => ({
      ...prev,
      selectedElement,
      isSelectionMode: false,
    }));
    setShowConfigPanel(true);
    setSidebarTab('steps');
  }, []);

  const handleIframeReady = useCallback(() => {
    setIframeReady(true);
  }, []);

  const handleElementsScanned = useCallback((elements: ScannedElement[]) => {
    setScannedElements(elements);
    setIsScanning(false);
    if (elements.length > 0) {
      toast({
        title: 'Elementos detectados',
        description: `${elements.length} elementos interativos encontrados na página.`,
      });
    }
  }, [toast]);

  const handleStartCapture = useCallback(() => {
    const token = crypto.randomUUID();
    setCaptureToken(token);
    setIsCaptureReady(false);
    setShowCaptureModal(true);
  }, []);

  const handleScanElements = useCallback(() => {
    // In direct mode, open capture modal for scanning
    handleStartCapture();
  }, [handleStartCapture]);

  const handleSaveStep = async (stepData: Omit<TourStep, 'id' | 'order'>) => {
    if (!id) return;

    try {
      const newOrder = state.steps.length; // 0-based
      const stepType = stepData.type;

      const createdStep = await createStep.mutateAsync({
        configurationId: id,
        step: {
          title: stepData.config.title || `Passo ${newOrder + 1}`,
          description: stepData.config.description || null,
          instructions: stepData.config.description || null,
          target_type: stepType === 'modal' ? 'modal' : 'page',
          target_selector: stepData.selector,
          step_order: newOrder,
          is_required: stepData.config.showSkip !== true,
          theme_override: stepData.config.themeOverride?.enabled ? stepData.config.themeOverride : null,
          tooltip_position: stepData.config.position || 'auto',
        } as any,
      });
      
      // Create step_action for action types
      if (['click', 'input', 'wait', 'highlight'].includes(stepType)) {
        await createAction.mutateAsync({
          stepId: createdStep.id,
          action: {
            action_type: stepType as 'click' | 'input' | 'wait' | 'highlight',
            selector: stepData.selector,
            action_order: 0,
            delay_ms: stepData.config.delayMs || 0,
            highlight_color: stepData.config.highlightColor || '#ff9f0d',
            highlight_animation: stepData.config.highlightAnimation || 'pulse',
            description: stepData.config.title || null,
          },
        });
      }

      setShowConfigPanel(false);
      setState(prev => ({ ...prev, selectedElement: null }));
      refetchSteps();

      toast({
        title: 'Passo adicionado',
        description: 'O passo foi adicionado ao seu tour.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar o passo.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStep = async (stepId: string, updates: Partial<TourStep>) => {
    try {
      // Update step fields
      await updateStep.mutateAsync({
        id: stepId,
        configurationId: id!,
        title: updates.config?.title,
        description: updates.config?.description,
        target_selector: updates.selector,
        target_type: updates.type === 'modal' ? 'modal' : 'page',
        theme_override: updates.config?.themeOverride?.enabled ? updates.config.themeOverride : null,
        tooltip_position: updates.config?.position || 'auto',
        is_required: updates.config?.showSkip !== true,
      } as any);

      // Also update associated action if type requires it
      const actionTypes = ['click', 'input', 'wait', 'highlight'];
      const stepWithActions = dbStepsWithActions?.find(s => s.id === stepId);
      const firstAction = stepWithActions?.step_actions?.[0];

      if (updates.type && actionTypes.includes(updates.type)) {
        if (firstAction) {
          // Update existing action
          await updateAction.mutateAsync({
            id: firstAction.id,
            stepId,
            action_type: updates.type as 'click' | 'input' | 'wait' | 'highlight',
            selector: updates.selector || firstAction.selector,
            delay_ms: updates.config?.delayMs ?? firstAction.delay_ms,
            highlight_color: updates.config?.highlightColor || firstAction.highlight_color,
            highlight_animation: updates.config?.highlightAnimation || firstAction.highlight_animation,
          });
        } else {
          // Create new action
          await createAction.mutateAsync({
            stepId,
            action: {
              action_type: updates.type as 'click' | 'input' | 'wait' | 'highlight',
              selector: updates.selector || '',
              action_order: 0,
              delay_ms: updates.config?.delayMs || 0,
              highlight_color: updates.config?.highlightColor || '#ff9f0d',
              highlight_animation: updates.config?.highlightAnimation || 'pulse',
            },
          });
        }
      }

      refetchSteps();
      toast({
        title: 'Passo atualizado',
        description: 'O passo foi atualizado.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar o passo.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    const step = state.steps.find(s => s.id === stepId);
    if (!step) return;

    try {
      await deleteStep.mutateAsync({ id: stepId, configurationId: id! });
      refetchSteps();
      toast({
        title: 'Passo removido',
        description: 'O passo foi removido do seu tour.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao remover o passo.',
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
      title: 'Tour salvo',
      description: 'Sua configuração de tour foi salva.',
    });
    navigate(`/config/${id}`);
  };

  // Preview mode handlers
  const handleStartPreview = useCallback((startIndex = 0) => {
    if (state.steps.length === 0) {
      toast({
        title: 'Sem passos',
        description: 'Adicione pelo menos um passo para visualizar o tour.',
        variant: 'destructive',
      });
      return;
    }
    setState(prev => ({
      ...prev,
      isPreviewMode: true,
      previewStepIndex: startIndex,
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
          title: 'Tour Completo',
          description: 'Você terminou de visualizar o tour.',
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

  const handlePreviewAction = useCallback((action: 'next' | 'prev' | 'exit') => {
    if (action === 'next') {
      handleNextPreviewStep();
    } else if (action === 'prev') {
      handlePrevPreviewStep();
    } else if (action === 'exit') {
      handleExitPreview();
    }
  }, [handleNextPreviewStep, handlePrevPreviewStep, handleExitPreview]);

  const handleTogglePreviewMode = useCallback(() => {
    if (state.isPreviewMode) {
      handleExitPreview();
    } else {
      handleStartPreview(0);
    }
  }, [state.isPreviewMode, handleExitPreview, handleStartPreview]);

  // Preview individual step in iframe (instead of modal)
  const handlePreviewStepInIframe = useCallback((step: TourStep) => {
    const stepIndex = state.steps.findIndex(s => s.id === step.id);
    if (stepIndex !== -1) {
      handleStartPreview(stepIndex);
    }
  }, [state.steps, handleStartPreview]);

  // Use direct URL (no proxy)
  const iframeUrl = configuration?.target_url || '';
  const builderOrigin = window.location.origin;

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
    <div className="flex flex-col h-screen min-h-0 bg-background">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
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
          onStartCapture={handleStartCapture}
          onShowCode={() => setShowCodeModal(true)}
        />
      </header>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        {!state.isPreviewMode && (
          <aside className="w-80 border-r bg-card overflow-hidden flex flex-col min-h-0">
            <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as 'steps' | 'elements' | 'settings')} className="flex-1 min-h-0 flex flex-col">
              <TabsList className="w-full rounded-none border-b grid grid-cols-3">
                <TabsTrigger value="elements">Elementos</TabsTrigger>
                <TabsTrigger value="steps">
                  Passos
                  {state.steps.length > 0 && (
                    <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 rounded-full">
                      {state.steps.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="settings">Config</TabsTrigger>
              </TabsList>
              <TabsContent value="elements" className="flex-1 min-h-0 overflow-hidden m-0">
                <ElementsPanel
                  elements={scannedElements}
                  isLoading={isScanning}
                  onElementClick={handleScannedElementClick}
                  onElementHover={setHighlightSelector}
                  onScanElements={handleScanElements}
                />
              </TabsContent>
              <TabsContent value="steps" className="flex-1 min-h-0 overflow-y-auto m-0">
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
                      onPreviewStep={handlePreviewStepInIframe}
                    />
                  </SortableContext>
                </DndContext>
              </TabsContent>
              <TabsContent value="settings" className="flex-1 min-h-0 overflow-y-auto m-0">
                {configuration && (
                  <SettingsPanel
                    configuration={configuration}
                    onUpdate={(updates) => updateConfiguration.mutate({ id: id!, ...updates })}
                    isSaving={updateConfiguration.isPending}
                  />
                )}
              </TabsContent>
            </Tabs>
          </aside>
        )}

        {/* Iframe Preview */}
        <main className={`flex-1 p-4 ${state.isPreviewMode ? 'pb-32' : ''}`}>
          <IframeContainer
            ref={iframeContainerRef}
            url={iframeUrl}
            mode="direct"
            isSelectionMode={state.isSelectionMode}
            onElementSelected={handleElementSelected}
            onIframeReady={handleIframeReady}
            highlightSelector={highlightSelector || undefined}
            isPreviewMode={state.isPreviewMode}
            previewStep={currentPreviewStep}
            previewStepIndex={state.previewStepIndex}
            totalSteps={state.steps.length}
            onPreviewAction={handlePreviewAction}
            onElementsScanned={handleElementsScanned}
          />
        </main>

        {/* Config Panel (conditionally shown) */}
        {showConfigPanel && !state.isPreviewMode && (
          <aside className="w-96 border-l bg-card overflow-y-auto min-h-0">
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

      {/* Capture Modal */}
      {configuration?.target_url && captureToken && (
        <CaptureModal
          open={showCaptureModal}
          onOpenChange={setShowCaptureModal}
          targetUrl={configuration.target_url}
          captureToken={captureToken}
          builderOrigin={builderOrigin}
          configurationId={id!}
          apiKey={configuration.api_key}
          supabaseUrl={import.meta.env.VITE_SUPABASE_URL}
          isCaptureReady={isCaptureReady}
          selectedElement={state.selectedElement ? {
            selector: state.selectedElement.selector,
            label: state.selectedElement.textContent || '',
            tagName: state.selectedElement.tagName,
            rect: state.selectedElement.rect,
          } : null}
          onImportElement={handleManualImport}
          onImportStep={handleCapturedStep}
          onConfigureStep={() => {
            setShowCaptureModal(false);
            setShowConfigPanel(true);
            setSidebarTab('steps');
          }}
        />
      )}

      {/* Code Modal */}
      {configuration && (
        <CodeModal
          open={showCodeModal}
          onOpenChange={setShowCodeModal}
          config={configuration}
        />
      )}

      {/* Step Preview Modal removed - preview now happens in iframe */}
    </div>
  );
}
