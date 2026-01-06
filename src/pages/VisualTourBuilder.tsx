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
import { SelectedElement, TourStep, VisualBuilderState } from '@/types/visualBuilder';
import { useConfiguration, useConfigurationSteps, useCreateStep, useUpdateStep, useDeleteStep } from '@/hooks/useConfigurations';
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
  const { data: dbSteps, isLoading: stepsLoading } = useConfigurationSteps(id);

  const createStep = useCreateStep();
  const updateStep = useUpdateStep();
  const deleteStep = useDeleteStep();

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
  const [sidebarTab, setSidebarTab] = useState<'steps' | 'elements'>('elements');
  
  // Capture state
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [captureToken, setCaptureToken] = useState<string | null>(null);
  const [isCaptureReady, setIsCaptureReady] = useState(false);
  
  const iframeContainerRef = useRef<IframeContainerRef>(null);

  // Sync steps from database
  useEffect(() => {
    if (dbSteps) {
      const mappedSteps: TourStep[] = dbSteps.map((step) => ({
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
    config: { title: string; description: string | null; position: string };
  }) => {
    if (!id) return;
    
    try {
      const newOrder = state.steps.length + 1;
      
      await createStep.mutateAsync({
        configurationId: id,
        step: {
          title: stepData.config.title || `Passo ${newOrder}`,
          description: stepData.config.description || null,
          instructions: stepData.config.description || null,
          target_type: stepData.stepType === 'modal' ? 'modal' : 'page',
          target_selector: stepData.selector,
          step_order: newOrder,
          is_required: true,
        },
      });
      
      toast({
        title: '✓ Passo adicionado!',
        description: stepData.config.title || stepData.selector.slice(0, 30),
      });
      
      // Switch to steps tab to show the new step
      setSidebarTab('steps');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar o passo.',
        variant: 'destructive',
      });
    }
  }, [id, state.steps.length, createStep, toast]);

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
          order: index + 1,
        }));

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
      const newOrder = state.steps.length + 1;

      await createStep.mutateAsync({
        configurationId: id,
        step: {
          title: stepData.config.title || `Passo ${newOrder}`,
          description: stepData.config.description || null,
          instructions: stepData.config.description || null,
          target_type: stepData.type === 'modal' ? 'modal' : 'page',
          target_selector: stepData.selector,
          step_order: newOrder,
          is_required: true,
        },
      });

      setShowConfigPanel(false);
      setState(prev => ({ ...prev, selectedElement: null }));

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
      await updateStep.mutateAsync({
        id: stepId,
        configurationId: id!,
        title: updates.config?.title,
        description: updates.config?.description,
        target_selector: updates.selector,
        target_type: updates.type === 'modal' ? 'modal' : 'page',
      });

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
  const handleStartPreview = useCallback(() => {
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
          onStartCapture={handleStartCapture}
        />
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {!state.isPreviewMode && (
          <aside className="w-80 border-r bg-card overflow-hidden flex flex-col">
            <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as 'steps' | 'elements')} className="flex-1 flex flex-col">
              <TabsList className="w-full rounded-none border-b">
                <TabsTrigger value="elements" className="flex-1">Elementos</TabsTrigger>
                <TabsTrigger value="steps" className="flex-1">
                  Passos
                  {state.steps.length > 0 && (
                    <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 rounded-full">
                      {state.steps.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="elements" className="flex-1 overflow-hidden m-0">
                <ElementsPanel
                  elements={scannedElements}
                  isLoading={isScanning}
                  onElementClick={handleScannedElementClick}
                  onElementHover={setHighlightSelector}
                  onScanElements={handleScanElements}
                />
              </TabsContent>
              <TabsContent value="steps" className="flex-1 overflow-y-auto m-0">
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
            onPreviewAction={handlePreviewAction}
            onElementsScanned={handleElementsScanned}
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

      {/* Capture Modal */}
      {configuration?.target_url && captureToken && (
        <CaptureModal
          open={showCaptureModal}
          onOpenChange={setShowCaptureModal}
          targetUrl={configuration.target_url}
          captureToken={captureToken}
          builderOrigin={builderOrigin}
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
    </div>
  );
}
