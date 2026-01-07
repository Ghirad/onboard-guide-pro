import { useCallback, useMemo, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  addEdge,
  MarkerType,
  NodeProps,
  Handle,
  Position,
  ConnectionLineComponentProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { TourStep } from '@/types/visualBuilder';
import { StepBranch } from '@/types/database';
import { cn } from '@/lib/utils';
import { MousePointer, Type, Clock, Sparkles, ArrowRight, GitBranch, MessageSquare, Link2 } from 'lucide-react';
import { EdgeEditPopover } from './EdgeEditPopover';
import { ConnectionTypeDialog } from './ConnectionTypeDialog';

interface FlowchartViewProps {
  steps: TourStep[];
  branches: Record<string, StepBranch[]>;
  onStepClick: (step: TourStep) => void;
  onStepPositionChange: (stepId: string, x: number, y: number) => void;
  onConnectionCreate: (sourceId: string, targetId: string) => void;
  onBranchCreate?: (sourceId: string, targetId: string) => void;
  onUpdateBranch?: (branchId: string, updates: Partial<StepBranch>) => void;
  onDeleteBranch?: (branchId: string, stepId: string) => void;
  onClearDefaultNext?: (stepId: string) => void;
}

// Custom node component for steps
function StepNode({ data, selected }: NodeProps) {
  const getTypeIcon = () => {
    switch (data.type) {
      case 'click': return <MousePointer className="h-3.5 w-3.5" />;
      case 'input': return <Type className="h-3.5 w-3.5" />;
      case 'wait': return <Clock className="h-3.5 w-3.5" />;
      case 'highlight': return <Sparkles className="h-3.5 w-3.5" />;
      case 'redirect': return <ArrowRight className="h-3.5 w-3.5" />;
      case 'modal': return <MessageSquare className="h-3.5 w-3.5" />;
      default: return <MessageSquare className="h-3.5 w-3.5" />;
    }
  };

  const getTypeColor = () => {
    if (data.isBranchPoint) return 'bg-amber-500/20 border-amber-500 text-amber-700';
    switch (data.type) {
      case 'click':
      case 'input':
        return 'bg-emerald-500/20 border-emerald-500 text-emerald-700';
      case 'redirect':
        return 'bg-purple-500/20 border-purple-500 text-purple-700';
      case 'wait':
      case 'highlight':
        return 'bg-blue-500/20 border-blue-500 text-blue-700';
      default:
        return 'bg-primary/20 border-primary text-primary';
    }
  };

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 min-w-[180px] max-w-[220px] cursor-pointer transition-all',
        getTypeColor(),
        selected && 'ring-2 ring-offset-2 ring-primary shadow-lg'
      )}
      onClick={() => data.onClick?.(data.step)}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-3 !h-3" />
      
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold opacity-60">#{data.order + 1}</span>
        {data.isBranchPoint && <GitBranch className="h-3.5 w-3.5 text-amber-600" />}
        {getTypeIcon()}
      </div>
      
      <div className="font-medium text-sm truncate" title={data.title}>
        {data.title}
      </div>
      
      {data.description && (
        <div className="text-xs opacity-70 truncate mt-0.5" title={data.description}>
          {data.description}
        </div>
      )}

      {data.branchCount > 0 && (
        <div className="text-xs mt-1.5 flex items-center gap-1 text-amber-600">
          <GitBranch className="h-3 w-3" />
          {data.branchCount} ramificações
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-3 !h-3" />
    </div>
  );
}

// Start node component
function StartNode() {
  return (
    <div className="px-4 py-2 rounded-full bg-emerald-500 text-white font-medium text-sm shadow-lg">
      <Handle type="source" position={Position.Bottom} className="!bg-white !w-3 !h-3" />
      Início
    </div>
  );
}

// End node component
function EndNode() {
  return (
    <div className="px-4 py-2 rounded-full bg-rose-500 text-white font-medium text-sm shadow-lg">
      <Handle type="target" position={Position.Top} className="!bg-white !w-3 !h-3" />
      Fim
    </div>
  );
}

const nodeTypes = {
  stepNode: StepNode,
  startNode: StartNode,
  endNode: EndNode,
};

interface SelectedEdge {
  id: string;
  type: 'branch' | 'default' | 'linear';
  branch?: StepBranch;
  sourceId: string;
  targetId: string;
  position: { x: number; y: number };
}

interface PendingConnection {
  source: string;
  target: string;
  sourceTitle?: string;
  targetTitle?: string;
}

// Custom connection line with visual icons
function CustomConnectionLine({ fromX, fromY, toX, toY }: ConnectionLineComponentProps) {
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;

  return (
    <g>
      {/* Animated connection path */}
      <path
        fill="none"
        stroke="url(#connection-gradient)"
        strokeWidth={2.5}
        strokeDasharray="8,4"
        d={`M${fromX},${fromY} C ${fromX} ${midY} ${toX} ${midY} ${toX},${toY}`}
        className="animate-pulse"
      />
      
      {/* Gradient definition */}
      <defs>
        <linearGradient id="connection-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      
      {/* Icon indicators at the end point */}
      <foreignObject 
        x={toX - 44} 
        y={toY - 16} 
        width={88} 
        height={32}
        className="overflow-visible"
      >
        <div className="connection-icon-container flex items-center justify-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500 text-white shadow-md border-2 border-white">
            <Link2 className="h-3.5 w-3.5" />
          </div>
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-white shadow-md border-2 border-white">
            <GitBranch className="h-3.5 w-3.5" />
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

export function FlowchartView({
  steps,
  branches,
  onStepClick,
  onStepPositionChange,
  onConnectionCreate,
  onBranchCreate,
  onUpdateBranch,
  onDeleteBranch,
  onClearDefaultNext,
}: FlowchartViewProps) {
  const [selectedEdge, setSelectedEdge] = useState<SelectedEdge | null>(null);
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);

  // MiniMap node color function
  const nodeColor = useCallback((node: Node) => {
    if (node.type === 'startNode') return '#10b981'; // emerald
    if (node.type === 'endNode') return '#ef4444';   // rose
    if (node.data?.isBranchPoint) return '#f59e0b';  // amber
    
    switch (node.data?.type) {
      case 'click':
      case 'input':
        return '#10b981';
      case 'redirect':
        return '#8b5cf6';
      case 'wait':
      case 'highlight':
        return '#3b82f6';
      default:
        return '#6366f1';
    }
  }, []);

  // Convert steps to ReactFlow nodes
  const initialNodes = useMemo(() => {
    const nodes: Node[] = [];
    
    // Add start node
    nodes.push({
      id: 'start',
      type: 'startNode',
      position: { x: 250, y: 0 },
      data: {},
    });

    // Add step nodes
    steps.forEach((step, index) => {
      const stepBranches = branches[step.id] || [];
      
      // Use saved positions or calculate default
      const x = (step as any).position_x || 250;
      const y = (step as any).position_y || (index + 1) * 120;
      
      nodes.push({
        id: step.id,
        type: 'stepNode',
        position: { x, y },
        data: {
          step,
          title: step.config.title,
          description: step.config.description,
          type: step.type,
          order: step.order,
          isBranchPoint: (step as any).is_branch_point || stepBranches.length > 0,
          branchCount: stepBranches.length,
          onClick: onStepClick,
        },
      });
    });

    // Add end node
    const lastY = steps.length > 0 
      ? Math.max(...steps.map((s, i) => (s as any).position_y || (i + 1) * 120)) + 120
      : 120;
    
    nodes.push({
      id: 'end',
      type: 'endNode',
      position: { x: 250, y: lastY },
      data: {},
    });

    return nodes;
  }, [steps, branches, onStepClick]);

  // Convert steps/branches to ReactFlow edges
  const initialEdges = useMemo(() => {
    const edges: Edge[] = [];
    
    // Connect start to first step
    if (steps.length > 0) {
      edges.push({
        id: 'start-to-first',
        source: 'start',
        target: steps[0].id,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
      });
    } else {
      // Connect start directly to end if no steps
      edges.push({
        id: 'start-to-end',
        source: 'start',
        target: 'end',
        type: 'smoothstep',
        style: { stroke: '#6b7280', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
      });
    }

    // Create edges between steps
    steps.forEach((step, index) => {
      const stepBranches = branches[step.id] || [];
      const defaultNextId = (step as any).default_next_step_id;
      
      if (stepBranches.length > 0) {
        // Step has branches - create edge for each branch
        stepBranches.forEach((branch) => {
          if (branch.next_step_id) {
            edges.push({
              id: `branch-${step.id}-${branch.id}`,
              source: step.id,
              target: branch.next_step_id,
              type: 'smoothstep',
              label: branch.condition_label,
              labelBgStyle: { fill: '#fef3c7', stroke: '#f59e0b' },
              labelStyle: { fontSize: 10, fontWeight: 500 },
              style: { stroke: '#f59e0b', strokeWidth: 2, cursor: 'pointer' },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
              data: { edgeType: 'branch', branch, stepId: step.id },
            });
          }
        });
        
        // Add default edge if exists
        if (defaultNextId) {
          edges.push({
            id: `default-${step.id}`,
            source: step.id,
            target: defaultNextId,
            type: 'smoothstep',
            label: 'Padrão',
            labelBgStyle: { fill: '#e5e7eb' },
            labelStyle: { fontSize: 10 },
            style: { stroke: '#6b7280', strokeWidth: 2, strokeDasharray: '5,5', cursor: 'pointer' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
            data: { edgeType: 'default', stepId: step.id },
          });
        }
      } else {
        // Linear flow - connect to next step or end
        const nextStep = steps[index + 1];
        const targetId = defaultNextId || nextStep?.id || 'end';
        
        edges.push({
          id: `edge-${step.id}`,
          source: step.id,
          target: targetId,
          type: 'smoothstep',
          style: { stroke: '#6366f1', strokeWidth: 2, cursor: 'pointer' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
          data: { edgeType: 'linear', stepId: step.id },
        });
      }
    });

    return edges;
  }, [steps, branches]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes and edges when steps/branches change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Handle node drag end to save position
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id !== 'start' && node.id !== 'end') {
        onStepPositionChange(node.id, Math.round(node.position.x), Math.round(node.position.y));
      }
    },
    [onStepPositionChange]
  );

  // Handle new connections - show dialog to choose type
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target && params.source !== 'start' && params.target !== 'end') {
        const sourceStep = steps.find(s => s.id === params.source);
        const targetStep = steps.find(s => s.id === params.target);
        
        // Show dialog to choose connection type
        setPendingConnection({
          source: params.source,
          target: params.target,
          sourceTitle: sourceStep?.config.title,
          targetTitle: targetStep?.config.title,
        });
      }
    },
    [steps]
  );

  // Handle connection type selection
  const handleSelectDefaultConnection = useCallback(() => {
    if (pendingConnection) {
      onConnectionCreate(pendingConnection.source, pendingConnection.target);
      setPendingConnection(null);
    }
  }, [pendingConnection, onConnectionCreate]);

  const handleSelectBranchConnection = useCallback(() => {
    if (pendingConnection && onBranchCreate) {
      onBranchCreate(pendingConnection.source, pendingConnection.target);
      setPendingConnection(null);
    }
  }, [pendingConnection, onBranchCreate]);

  // Handle edge click
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      // Ignore start/end edges
      if (edge.source === 'start' || edge.target === 'end') return;

      const edgeData = edge.data || {};
      let edgeType: 'branch' | 'default' | 'linear' = 'linear';
      let branch: StepBranch | undefined;

      if (edge.id.startsWith('branch-')) {
        edgeType = 'branch';
        branch = edgeData.branch;
      } else if (edge.id.startsWith('default-')) {
        edgeType = 'default';
      }

      setSelectedEdge({
        id: edge.id,
        type: edgeType,
        branch,
        sourceId: edge.source!,
        targetId: edge.target!,
        position: { x: event.clientX, y: event.clientY },
      });
    },
    []
  );

  // Handle branch update from popover
  const handleUpdateBranch = useCallback(
    (branchId: string, updates: Partial<StepBranch>) => {
      onUpdateBranch?.(branchId, updates);
      setSelectedEdge(null);
    },
    [onUpdateBranch]
  );

  // Handle branch delete from popover
  const handleDeleteBranch = useCallback(
    (branchId: string, stepId: string) => {
      onDeleteBranch?.(branchId, stepId);
      setSelectedEdge(null);
    },
    [onDeleteBranch]
  );

  // Handle clear default next
  const handleClearDefaultNext = useCallback(
    (stepId: string) => {
      onClearDefaultNext?.(stepId);
      setSelectedEdge(null);
    },
    [onClearDefaultNext]
  );

  // Handle convert branch to default
  const handleConvertToDefault = useCallback(
    (stepId: string, targetId: string) => {
      onConnectionCreate(stepId, targetId);
    },
    [onConnectionCreate]
  );

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        connectionLineComponent={CustomConnectionLine}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        snapToGrid
        snapGrid={[10, 10]}
        className="bg-muted/30"
      >
        <Controls className="!bg-card !border !shadow-sm" />
        <Background gap={20} size={1} color="hsl(var(--muted-foreground) / 0.1)" />
        <MiniMap 
          nodeColor={nodeColor}
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="!rounded-lg"
        />
      </ReactFlow>

      {/* Connection Type Dialog */}
      <ConnectionTypeDialog
        open={!!pendingConnection}
        onOpenChange={(open) => !open && setPendingConnection(null)}
        onSelectDefault={handleSelectDefaultConnection}
        onSelectBranch={handleSelectBranchConnection}
        sourceTitle={pendingConnection?.sourceTitle}
        targetTitle={pendingConnection?.targetTitle}
      />

      {/* Edge Edit Popover */}
      {selectedEdge && (
        <EdgeEditPopover
          open={!!selectedEdge}
          onOpenChange={(open) => !open && setSelectedEdge(null)}
          position={selectedEdge.position}
          edgeType={selectedEdge.type}
          branch={selectedEdge.branch}
          sourceStepId={selectedEdge.sourceId}
          targetStepId={selectedEdge.targetId}
          allSteps={steps}
          onUpdateBranch={handleUpdateBranch}
          onDeleteBranch={handleDeleteBranch}
          onClearDefaultNext={handleClearDefaultNext}
          onConvertToDefault={handleConvertToDefault}
        />
      )}

      {/* Help hint */}
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur px-3 py-2 rounded-lg border shadow-sm text-xs text-muted-foreground">
        <span className="font-medium">Dica:</span> Arraste entre nós para criar conexões • Clique em uma conexão para editar
      </div>
    </div>
  );
}
