import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import type {
  FunctionNode,
  FunctionSlot,
  GenerateNode,
  GraphEdge,
  GraphNode,
  GraphTypeId,
  GroupNode,
  OutputNode,
  ParameterNode,
  TaskNode,
} from './types';
import {
  migrateRowPropertyType,
  normalizeFunctionSlot,
  ROW_PROPERTY_TYPE_IDS,
  TASK_LEADING_ICON_IDS,
} from './types';
import {
  PIN_COLOR_IDS,
  FOUNDATION_PALETTE_IDS,
  UNIVERSAL_SOCKET_COLOR_ID,
  coerceGraphWireColorForPaletteMode,
  forbidReservedShellWireColor,
  toFoundationPaletteId,
  toPinColorId,
  type GraphWireColorId,
} from './pinColors';
import {
  GRAPH_NODE_MAX_W,
  graphNodeMinWidth,
  graphNodeWidth,
  nodeHeight,
  type GraphPinStyleId,
} from './geometry';
import {
  bboxCenterOfNodes,
  buildClipboardFromSelection,
  remapClipboardPaste,
  translateNodes,
  type GraphClipboard,
} from './graphClipboardOps';
import {
  applyGroupSelection,
  applyUngroupSelection,
  expandDeleteIdsForGroupsAndRestoreEdges,
  isInputConnectedWithGroupBridges,
} from './graphGroupOps';
import { createManagementDemoGraph, sortedManagementTasks } from './managementGraphTemplate';

const TOP_LEVEL_ROW_TYPES = ROW_PROPERTY_TYPE_IDS.filter((t) => t !== 'inputGroup');

/** Two input pin colors for new functions (any palette entries other than this node’s output). */
function defaultCrossPeersForNodeColor(
  nodeColor: GraphWireColorId,
  extendedPalette: boolean
): [GraphWireColorId, GraphWireColorId] {
  if (extendedPalette) {
    const pin = toPinColorId(nodeColor);
    const others = PIN_COLOR_IDS.filter((c) => c !== pin);
    return [others[0] ?? 'gray', others[1] ?? 'gray'];
  }
  const f = toFoundationPaletteId(nodeColor);
  const others = FOUNDATION_PALETTE_IDS.filter((c) => c !== f);
  return [others[0] ?? 'berry', others[1] ?? 'red'];
}

/**
 * Default function body: first two rows accept `peerInputColors` (other demo functions’ outputs);
 * third slot Input Group (`73:5651`) uses `nodeColor` on all receiving pins.
 */
function defaultFunctionSlotsForNode(
  nodeColor: GraphWireColorId,
  peerInputColors: [GraphWireColorId, GraphWireColorId],
  extendedPalette: boolean
): FunctionSlot[] {
  const [in0, in1] = peerInputColors;
  return [
    normalizeFunctionSlot(
      {
        label: 'Label',
        propertyType: TOP_LEVEL_ROW_TYPES[0]!,
        inputPinColor: in0,
        placeholderText: 'Placeholder',
        textValue: null,
        numberValues: [null, null, null],
      },
      extendedPalette
    ),
    normalizeFunctionSlot(
      {
        label: 'Label',
        propertyType: TOP_LEVEL_ROW_TYPES[1]!,
        inputPinColor: in1,
        placeholderText: 'Placeholder',
        textValue: null,
        numberValues: [null, null, null],
      },
      extendedPalette
    ),
    normalizeFunctionSlot(
      {
        label: 'Inputs',
        propertyType: 'inputGroup',
        inputPinColor: nodeColor,
        placeholderText: 'Placeholder',
        textValue: null,
        numberValues: [null, null, null],
        inputGroupChildSlots: [
          normalizeFunctionSlot(
            {
              label: 'Label',
              propertyType: 'textInput',
              inputPinColor: nodeColor,
              placeholderText: 'Placeholder',
              textValue: null,
              numberValues: [null, null, null],
            },
            extendedPalette
          ),
          normalizeFunctionSlot(
            {
              label: 'Label',
              propertyType: 'dropdown',
              inputPinColor: nodeColor,
              placeholderText: 'Placeholder',
              textValue: null,
              numberValues: [null, null, null],
            },
            extendedPalette
          ),
        ],
      },
      extendedPalette
    ),
  ];
}

function migrateAllNodeEdgeColors(
  nodes: GraphNode[],
  edges: GraphEdge[],
  extendedPalette: boolean
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const mapC = (c: GraphWireColorId) => coerceGraphWireColorForPaletteMode(c, extendedPalette);
  const nodesOut = nodes.map((n) => {
    if (n.kind === 'parameter')
      return { ...n, outputPinColor: forbidReservedShellWireColor(mapC(n.outputPinColor)) };
    if (n.kind === 'output')
      return { ...n, inputPinColor: forbidReservedShellWireColor(mapC(n.inputPinColor)) };
    if (n.kind === 'generate') return n;
    if (n.kind === 'groupInput') {
      return {
        ...n,
        outputs: n.outputs.map((r) => ({ ...r, colorId: mapC(r.colorId) })),
      };
    }
    if (n.kind === 'groupOutput') return { ...n, inputPinColor: mapC(n.inputPinColor) };
    if (n.kind === 'task') {
      return {
        ...n,
        inputPinColor: forbidReservedShellWireColor(mapC(n.inputPinColor)),
        outputPinColor: forbidReservedShellWireColor(mapC(n.outputPinColor)),
      };
    }
    if (n.kind === 'function' || n.kind === 'group') {
      return {
        ...n,
        outputPinColor: forbidReservedShellWireColor(mapC(n.outputPinColor)),
        slots: n.slots.map((s) => normalizeFunctionSlot(s, extendedPalette)),
      };
    }
    return n;
  });
  const edgesOut = edges.map((e) => {
    const fromN = nodes.find((nn) => nn.id === e.from.nodeId);
    let sid = e.colorId;
    if (fromN?.kind === 'generate' && e.colorId === UNIVERSAL_SOCKET_COLOR_ID) {
      sid = 'gray';
    }
    return { ...e, colorId: mapC(sid) as GraphWireColorId };
  });
  return { nodes: nodesOut, edges: edgesOut };
}

function normalizeManagementTaskNodeAfterHydrate(n: GraphNode): GraphNode {
  if (n.kind !== 'task') return n;
  let leadingIconId = n.leadingIconId;
  if (!TASK_LEADING_ICON_IDS.includes(leadingIconId)) {
    leadingIconId = 'prompt';
  }
  const taskState =
    n.taskState === 'pending' || n.taskState === 'in_progress' || n.taskState === 'completed'
      ? n.taskState
      : 'pending';
  const managementOrder =
    typeof n.managementOrder === 'number' && Number.isFinite(n.managementOrder)
      ? n.managementOrder
      : 0;
  return {
    ...n,
    inputPinColor: forbidReservedShellWireColor(n.inputPinColor),
    outputPinColor: forbidReservedShellWireColor(n.outputPinColor),
    leadingIconId,
    taskState,
    managementOrder,
  };
}

export type GraphState = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Selection order: last id is the primary node for the inspector. Shift-click toggles membership. */
  selectedIds: string[];
  /**
   * When true, wiring follows hold-and-drag from an output (legacy). When false (default),
   * click output then click a matching input without holding drag.
   */
  clickDragPinWiring: boolean;
  /**
   * When true, the graph canvas shows the play/pause overlay and runtime can be toggled.
   * When false, play controls are hidden (dummy dataflow cannot be started from the UI).
   */
  playMode: boolean;
  /**
   * Dummy runtime: whether “playback” is active (overlay shows Play so user can pause).
   * Default false → overlay shows Pause (Figma default variant before first click).
   */
  graphPlayActive: boolean;
  /** Bottom-left navigation/shortcuts panel (Figma `133:7964`). Toggled from Inspector → Experimental Settings. Default off. */
  showGraphGuide: boolean;
  /**
   * When true (default), while a wire is active from an output pin, nodes with no compatible input
   * pin color dim to 30% opacity; on nodes that have a match, non-matching input pins use the same dim.
   */
  progressiveConnections: boolean;
  /** In-memory clipboard for copy/cut/paste (induced subgraph of selected nodes). */
  clipboard: GraphClipboard | null;
  /** Inspector → Graph Settings: when false, parameter nodes are removed and the parameter panel is hidden. */
  parametersEnabled: boolean;
  /** Parameters panel body visibility (Figma `132:9384` header always shown when parameters are on). */
  parameterPanelExpanded: boolean;
  /**
   * When true, node/pin/wire colors use the extended palette (Lima, Berry, …). When false (default),
   * colors use Figma **DataCategorical Contrast** tokens (Blue, Berry, …) from `155:13740`.
   */
  extendedPalette: boolean;
  /** Graph Settings — when true (default), inspector can switch nodes to Generate and generate UI is shown. */
  generativeNodesEnabled: boolean;
  /** When set, the canvas shows only that group's subgraph (Blender-style scoped edit). */
  graphScope: string | null;
  /**
   * Inspector → Experimental → Pin styling: classic (clipped outer ring), orbit / contained
   * (full ring + frame-edge anchors; gap from card edge is `PIN_STYLE_FRAME_ANCHOR_PX` in `geometry.ts`).
   */
  pinStyle: GraphPinStyleId;
  /**
   * When true (default), node header chevrons hide and a contextual toolbar appears above the
   * selection (Figma `2009:75048`). When false, chevron expand/collapse stays on each node.
   */
  contextToolbar: boolean;
  /**
   * Experimental: when true and {@link contextToolbar} is on, expand/collapse lives in the context
   * toolbar only; when false, header chevrons return (still respecting {@link rightAlignedChevron}).
   * Cleared when the context toolbar is off.
   */
  contextToolbarExpandCollapseInToolbar: boolean;
  /**
   * Experimental: when true and {@link contextToolbar} is on, the selection toolbar is fixed
   * centered under the graph ribbon instead of above the selection. Cleared when the toolbar is off.
   */
  contextToolbarDocked: boolean;
  /**
   * When true (default), expand/collapse chevrons sit on the trailing side of node headers and
   * input-group headers. When false, chevrons stay on the leading edge (legacy layout).
   */
  rightAlignedChevron: boolean;
  /**
   * Per-node IDs used for **selection-local** play-mode flow: wires **upstream** of these nodes
   * (edges that feed them, recursively toward sources). Cleared when graph-level play becomes active.
   */
  localPlayNodeIds: string[];
  /**
   * Graph Settings — **Data Flow** (default) vs **Management** (task-only dependency layout).
   * Management forces play/parameters/generative off and strips non-task nodes when activated.
   */
  graphType: GraphTypeId;
};

function defaultSlot(i: number, extendedPalette: boolean): FunctionSlot {
  return normalizeFunctionSlot(
    {
      label: 'Label',
      propertyType: TOP_LEVEL_ROW_TYPES[i % TOP_LEVEL_ROW_TYPES.length]!,
      inputPinColor: 'berry',
      placeholderText: 'Placeholder',
      textValue: null,
      numberValues: [null, null, null],
    },
    extendedPalette
  );
}

function makeSlots(
  count: number,
  prev: FunctionSlot[],
  extendedPalette: boolean
): FunctionSlot[] {
  const out: FunctionSlot[] = [];
  for (let i = 0; i < count; i++) {
    const base = prev[i] ?? defaultSlot(i, extendedPalette);
    out.push(
      normalizeFunctionSlot(
        {
          ...base,
          propertyType: migrateRowPropertyType(String(base.propertyType)),
        },
        extendedPalette
      )
    );
  }
  return out;
}

const initialState: GraphState = {
  nodes: [
    {
      kind: 'parameter',
      id: 'n-param',
      x: 80,
      y: 120,
      title: 'Parameter',
      frameVariant: 'emphasis',
      outputPinColor: 'berry',
      expanded: false,
      parameterValue: 'Value',
    },
    {
      kind: 'function',
      id: 'n-fn',
      x: 380,
      y: 80,
      title: 'Function',
      frameVariant: 'standard',
      slotCount: 3,
      slots: defaultFunctionSlotsForNode(
        'gray',
        defaultCrossPeersForNodeColor('gray', false),
        false
      ),
      outputPinColor: 'gray',
      expanded: true,
    },
    {
      kind: 'function',
      id: 'n-fn-2',
      x: 100,
      y: 360,
      title: 'Function',
      frameVariant: 'standard',
      slotCount: 3,
      slots: defaultFunctionSlotsForNode(
        'gray',
        defaultCrossPeersForNodeColor('gray', false),
        false
      ),
      outputPinColor: 'gray',
      expanded: true,
    },
    {
      kind: 'generate',
      id: 'n-gen',
      x: 520,
      y: 360,
      title: 'Generate',
      frameVariant: 'muted',
      expanded: true,
      generativePhase: 'prompt',
      promptText: '',
      inputGroupExpanded: false,
    },
    {
      kind: 'output',
      id: 'n-out',
      x: 680,
      y: 200,
      title: 'Output',
      frameVariant: 'muted',
      inputPinColor: 'gray',
      expanded: true,
    },
  ],
  edges: [
    {
      id: 'e1',
      from: { nodeId: 'n-param', port: 'out' },
      to: { nodeId: 'n-fn', port: 'in-1' },
      colorId: 'berry',
    },
  ],
  selectedIds: ['n-fn'],
  clickDragPinWiring: false,
  playMode: true,
  graphPlayActive: false,
  showGraphGuide: false,
  progressiveConnections: true,
  clipboard: null,
  parametersEnabled: true,
  parameterPanelExpanded: true,
  extendedPalette: false,
  generativeNodesEnabled: true,
  graphScope: null,
  pinStyle: 'orbit',
  contextToolbar: true,
  contextToolbarExpandCollapseInToolbar: false,
  contextToolbarDocked: false,
  rightAlignedChevron: true,
  localPlayNodeIds: [],
  graphType: 'dataFlow',
};

type Action =
  /** `additive: true` (Shift): toggle `id` in the selection; otherwise replace with `[id]` or clear when `id` is null. */
  | { type: 'select'; id: string | null; additive?: boolean }
  /** Replace selection with this ordered list (e.g. drag start when preserving multi-select). */
  | { type: 'selectMany'; ids: string[] }
  | { type: 'moveNode'; id: string; x: number; y: number }
  | { type: 'addEdge'; edge: GraphEdge }
  | { type: 'removeEdge'; id: string }
  | {
      type: 'updateParameter';
      id: string;
      patch: Partial<
        Pick<
          ParameterNode,
          | 'title'
          | 'outputPinColor'
          | 'frameVariant'
          | 'expanded'
          | 'parameterValue'
          | 'disabled'
        >
      >;
    }
  | {
      type: 'updateOutput';
      id: string;
      patch: Partial<
        Pick<OutputNode, 'title' | 'inputPinColor' | 'frameVariant' | 'disabled'>
      >;
    }
  | {
      type: 'updateFunction';
      id: string;
      patch: Partial<
        Pick<FunctionNode, 'title' | 'outputPinColor' | 'frameVariant' | 'slotCount' | 'disabled'>
      > & {
        slots?: FunctionSlot[];
      };
    }
  | {
      type: 'updateFunctionSlot';
      id: string;
      slotIndex: number;
      patch: Partial<FunctionSlot>;
    }
  | {
      type: 'updateFunctionInputGroupChild';
      id: string;
      slotIndex: number;
      childIndex: number;
      patch: Partial<FunctionSlot>;
    }
  | { type: 'toggleExpanded'; id: string }
  /**
   * Canvas ⌘⇧H / Ctrl⇧H or **M**: set every affected node’s `disabled` (mute) to the same value —
   * opposite of the first id’s current `disabled` (id list order). When `ids` is omitted, uses
   * {@link GraphState.selectedIds}.
   */
  | { type: 'toggleNodeDisabled'; ids?: readonly string[] }
  /** Set `disabled` on all selected nodes that support it (context menu / toolbar). */
  | { type: 'setSelectionMuted'; muted: boolean }
  /**
   * Expand/collapse all affected nodes with `expanded` to match the inverse of the first id’s state.
   * When `ids` is omitted, uses {@link GraphState.selectedIds}.
   */
  | { type: 'unifyExpandSelection'; ids?: readonly string[] }
  /**
   * Toggle selection-scoped play (outgoing wire flow) for the given ids; disabled while graph play is active.
   * When `ids` is omitted, uses {@link GraphState.selectedIds}.
   */
  | { type: 'toggleSelectionLocalPlay'; ids?: readonly string[] }
  /** Advance every Generate node in `ids` (or full selection when omitted) from prompt → output (toolbar Run). */
  | { type: 'runGenerateSelection'; ids?: readonly string[] }
  | { type: 'setContextToolbar'; value: boolean }
  | { type: 'setContextToolbarExpandCollapseInToolbar'; value: boolean }
  | { type: 'setContextToolbarDocked'; value: boolean }
  | { type: 'setRightAlignedChevron'; value: boolean }
  | { type: 'copySelection' }
  | { type: 'cutSelection' }
  | { type: 'pasteClipboard'; center: { x: number; y: number } }
  | { type: 'duplicateSelection' }
  | { type: 'deleteSelection' }
  | { type: 'groupSelection' }
  | { type: 'ungroupSelection' }
  | {
      type: 'updateGroup';
      id: string;
      patch: Partial<Pick<GroupNode, 'title' | 'frameVariant' | 'disabled'>>;
    }
  /** Inspector "Node type": switch selected prototype node (parameter / function / generate). */
  | { type: 'setPrototypeNodeKind'; id: string; kind: 'parameter' | 'function' | 'generate' }
  | { type: 'enterGroupScope'; groupId: string }
  | { type: 'exitGroupScope' }
  | { type: 'updateGenerate'; id: string; patch: Partial<GenerateNode> }
  | { type: 'setClickDragPinWiring'; value: boolean }
  | { type: 'setShowGraphGuide'; value: boolean }
  /** Extended palette (Lima, Berry, …). Off = Figma DataCategorical tokens (default). */
  | { type: 'setExtendedPalette'; value: boolean }
  | { type: 'setProgressiveConnections'; value: boolean }
  | { type: 'setPinStyle'; value: GraphPinStyleId }
  | { type: 'setPlayMode'; value: boolean }
  | { type: 'toggleGraphPlay' }
  | { type: 'managementPlayAdvance' }
  /** Horizontal resize from canvas edge handles (`width` clamped; optional `x` when resizing from the left). */
  | { type: 'setNodeDimensions'; id: string; width: number; x?: number }
  /** Context menu Insert node → color: new function centered on `graphX` / `graphY`. */
  | {
      type: 'addFunctionNodeAt';
      graphX: number;
      graphY: number;
      outputPinColor: GraphWireColorId;
    }
  | { type: 'addTaskNodeAt'; graphX: number; graphY: number }
  | {
      type: 'updateTask';
      id: string;
      patch: Partial<
        Pick<
          TaskNode,
          | 'title'
          | 'inputPinColor'
          | 'outputPinColor'
          | 'frameVariant'
          | 'disabled'
          | 'taskState'
          | 'leadingIconId'
          | 'managementOrder'
        >
      >;
    }
  | { type: 'setGraphType'; value: GraphTypeId }
  /** Replace node at `nodeId` with a fresh function of `outputPinColor`; drops all edges on that node. */
  | { type: 'swapNodeWithFunction'; nodeId: string; outputPinColor: GraphWireColorId }
  | { type: 'setParametersEnabled'; value: boolean }
  | { type: 'toggleParameterPanelExpanded' }
  | { type: 'setGenerativeNodesEnabled'; value: boolean }
  | {
      type: 'addParameter';
      graphX: number;
      graphY: number;
      mode: 'new' | 'clone';
      cloneFromId?: string;
      /** When `mode === 'new'`, sets parameter + node pin/header color. Ignored for `clone` (uses source). */
      outputPinColor?: GraphWireColorId;
    }
  /** Internal: restore full graph state from an undo/redo snapshot (immutable clone). */
  | { type: 'hydrateGraphState'; state: GraphState };

const MAX_GRAPH_UNDO = 80;

function shouldRecordActionForUndo(action: Action): boolean {
  switch (action.type) {
    case 'select':
    case 'selectMany':
    case 'moveNode':
    case 'setNodeDimensions':
    case 'hydrateGraphState':
    case 'managementPlayAdvance':
      return false;
    default:
      return true;
  }
}

function reducer(state: GraphState, action: Action): GraphState {
  switch (action.type) {
    case 'select': {
      if (action.id == null) {
        return { ...state, selectedIds: [] };
      }
      if (action.additive) {
        const cur = state.selectedIds;
        const i = cur.indexOf(action.id);
        if (i >= 0) {
          return { ...state, selectedIds: cur.filter((nid) => nid !== action.id) };
        }
        return { ...state, selectedIds: [...cur, action.id] };
      }
      return { ...state, selectedIds: [action.id] };
    }
    case 'selectMany': {
      const seen = new Set<string>();
      const ids: string[] = [];
      for (const id of action.ids) {
        if (seen.has(id)) continue;
        if (!state.nodes.some((n) => n.id === id)) continue;
        seen.add(id);
        ids.push(id);
      }
      return { ...state, selectedIds: ids };
    }
    case 'setClickDragPinWiring':
      return { ...state, clickDragPinWiring: action.value };
    case 'setParametersEnabled': {
      if (action.value === state.parametersEnabled) return state;
      if (!action.value) {
        const paramIds = new Set(
          state.nodes.filter((n) => n.kind === 'parameter').map((n) => n.id)
        );
        if (paramIds.size === 0) {
          return { ...state, parametersEnabled: false };
        }
        const nodes = state.nodes.filter((n) => n.kind !== 'parameter');
        const edges = state.edges.filter(
          (e) => !paramIds.has(e.from.nodeId) && !paramIds.has(e.to.nodeId)
        );
        const selectedIds = state.selectedIds.filter((id) => !paramIds.has(id));
        return {
          ...state,
          parametersEnabled: false,
          nodes,
          edges,
          selectedIds,
        };
      }
      let nodes = state.nodes;
      let edges = state.edges;
      if (!nodes.some((n) => n.kind === 'parameter')) {
        const newId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `n-param-${Date.now()}`;
        const defaultPin = 'berry';
        const p: ParameterNode = {
          kind: 'parameter',
          id: newId,
          x: 80,
          y: 120,
          title: 'Parameter',
          frameVariant: 'emphasis',
          outputPinColor: defaultPin,
          expanded: false,
          parameterValue: 'Value',
        };
        nodes = [...nodes, p];
        const fn = nodes.find((n) => n.id === 'n-fn' && n.kind === 'function');
        if (fn) {
          const taken = edges.some((e) => e.to.nodeId === 'n-fn' && e.to.port === 'in-2');
          if (!taken) {
            edges = [
              ...edges,
              {
                id:
                  typeof crypto !== 'undefined' && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `e-${Date.now()}`,
                from: { nodeId: newId, port: 'out' },
                to: { nodeId: 'n-fn', port: 'in-2' },
                colorId: defaultPin,
              },
            ];
          }
        }
      }
      return { ...state, parametersEnabled: true, nodes, edges };
    }
    case 'toggleParameterPanelExpanded':
      return { ...state, parameterPanelExpanded: !state.parameterPanelExpanded };
    case 'setGenerativeNodesEnabled': {
      if (action.value === state.generativeNodesEnabled) return state;
      if (!action.value) {
        const genIds = new Set(
          state.nodes.filter((n) => n.kind === 'generate').map((n) => n.id)
        );
        if (genIds.size === 0) {
          return { ...state, generativeNodesEnabled: false };
        }
        const nodes = state.nodes.filter((n) => n.kind !== 'generate');
        const edges = state.edges.filter(
          (e) => !genIds.has(e.from.nodeId) && !genIds.has(e.to.nodeId)
        );
        const selectedIds = state.selectedIds.filter((id) => !genIds.has(id));
        return {
          ...state,
          generativeNodesEnabled: false,
          nodes,
          edges,
          selectedIds,
        };
      }
      return { ...state, generativeNodesEnabled: true };
    }
    case 'setGraphType': {
      if (action.value === state.graphType) return state;
      if (action.value === 'management') {
        const { nodes, edges } = createManagementDemoGraph();
        return {
          ...state,
          graphType: 'management',
          playMode: false,
          graphPlayActive: false,
          localPlayNodeIds: [],
          parametersEnabled: false,
          generativeNodesEnabled: false,
          graphScope: null,
          contextToolbarExpandCollapseInToolbar: false,
          parameterPanelExpanded: false,
          nodes,
          edges,
          selectedIds: [],
          clipboard: null,
        };
      }
      return { ...state, graphType: 'dataFlow' };
    }
    case 'setShowGraphGuide':
      return { ...state, showGraphGuide: action.value };
    case 'setExtendedPalette': {
      if (action.value === state.extendedPalette) return state;
      const migrated = migrateAllNodeEdgeColors(state.nodes, state.edges, action.value);
      return {
        ...state,
        extendedPalette: action.value,
        nodes: migrated.nodes,
        edges: migrated.edges,
      };
    }
    case 'setProgressiveConnections':
      return { ...state, progressiveConnections: action.value };
    case 'setPinStyle':
      return { ...state, pinStyle: action.value };
    case 'setPlayMode':
      return {
        ...state,
        playMode: action.value,
        graphPlayActive: action.value ? state.graphPlayActive : false,
        localPlayNodeIds: action.value ? state.localPlayNodeIds : [],
      };
    case 'toggleGraphPlay': {
      const next = !state.graphPlayActive;
      if (state.graphType === 'management') {
        if (!next) {
          return {
            ...state,
            graphPlayActive: false,
            localPlayNodeIds: [],
          };
        }
        const tasks = sortedManagementTasks(state.nodes);
        let nodes: GraphNode[] = state.nodes.map((n): GraphNode => {
          if (n.kind !== 'task') return n;
          return { ...n, taskState: 'pending' };
        });
        const firstId = tasks[0]?.id;
        if (firstId) {
          nodes = nodes.map((n): GraphNode =>
            n.kind === 'task' && n.id === firstId ? { ...n, taskState: 'in_progress' } : n
          );
        }
        return {
          ...state,
          graphPlayActive: true,
          localPlayNodeIds: [],
          nodes,
        };
      }
      return {
        ...state,
        graphPlayActive: next,
        localPlayNodeIds: next ? [] : state.localPlayNodeIds,
      };
    }
    case 'managementPlayAdvance': {
      if (state.graphType !== 'management' || !state.graphPlayActive) return state;
      const tasks = sortedManagementTasks(state.nodes);
      const cur = tasks.find((t) => t.taskState === 'in_progress');
      if (!cur) {
        return { ...state, graphPlayActive: false, localPlayNodeIds: [] };
      }
      const nextPending = tasks.find(
        (t) => t.managementOrder > cur.managementOrder && t.taskState === 'pending'
      );
      const nodes = state.nodes.map((n): GraphNode => {
        if (n.kind !== 'task') return n;
        if (n.id === cur.id) return { ...n, taskState: 'completed' };
        if (nextPending && n.id === nextPending.id) return { ...n, taskState: 'in_progress' };
        return n;
      });
      const stillActive = Boolean(nextPending);
      return {
        ...state,
        nodes,
        graphPlayActive: stillActive,
        localPlayNodeIds: [],
      };
    }
    case 'setContextToolbar':
      return {
        ...state,
        contextToolbar: action.value,
        contextToolbarDocked: action.value ? state.contextToolbarDocked : false,
        contextToolbarExpandCollapseInToolbar: action.value
          ? state.contextToolbarExpandCollapseInToolbar
          : false,
      };
    case 'setContextToolbarExpandCollapseInToolbar':
      if (!state.contextToolbar) return state;
      return { ...state, contextToolbarExpandCollapseInToolbar: action.value };
    case 'setContextToolbarDocked':
      if (!state.contextToolbar) return state;
      return { ...state, contextToolbarDocked: action.value };
    case 'setRightAlignedChevron':
      return { ...state, rightAlignedChevron: action.value };
    case 'unifyExpandSelection': {
      const ids =
        action.ids && action.ids.length > 0 ? [...action.ids] : [...state.selectedIds];
      if (ids.length === 0) return state;
      const first = state.nodes.find((n) => n.id === ids[0]);
      if (!first || !('expanded' in first)) return state;
      const targetExpanded = !first.expanded;
      const idSet = new Set(ids);
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          idSet.has(n.id) && 'expanded' in n ? { ...n, expanded: targetExpanded } : n
        ),
      };
    }
    case 'setSelectionMuted': {
      const idSet = new Set(state.selectedIds);
      if (idSet.size === 0) return state;
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          idSet.has(n.id) ? { ...n, disabled: action.muted } : n
        ),
      };
    }
    case 'toggleNodeDisabled': {
      const ids =
        action.ids && action.ids.length > 0 ? [...action.ids] : [...state.selectedIds];
      if (ids.length === 0) return state;
      const first = state.nodes.find((n) => n.id === ids[0]);
      if (!first) return state;
      const targetDisabled = !Boolean(first.disabled);
      const idSet = new Set(ids);
      return {
        ...state,
        nodes: state.nodes.map((n) => {
          if (!idSet.has(n.id)) return n;
          return { ...n, disabled: targetDisabled };
        }),
      };
    }
    case 'toggleSelectionLocalPlay': {
      const ids =
        action.ids && action.ids.length > 0 ? [...action.ids] : [...state.selectedIds];
      if (!state.playMode || state.graphPlayActive || ids.length === 0) {
        return state;
      }
      const first = ids[0]!;
      const set = new Set(state.localPlayNodeIds);
      const firstActive = set.has(first);
      for (const id of ids) {
        if (firstActive) set.delete(id);
        else set.add(id);
      }
      return { ...state, localPlayNodeIds: [...set] };
    }
    case 'runGenerateSelection': {
      const idSet = new Set(
        action.ids && action.ids.length > 0 ? action.ids : state.selectedIds
      );
      return {
        ...state,
        nodes: state.nodes.map((n) => {
          if (n.kind !== 'generate' || !idSet.has(n.id)) return n;
          if (n.generativePhase !== 'prompt') return n;
          return { ...n, generativePhase: 'output' as const };
        }),
      };
    }
    case 'enterGroupScope': {
      if (state.graphType === 'management') return state;
      const g = state.nodes.find(
        (n) => n.id === action.groupId && n.kind === 'group'
      ) as GroupNode | undefined;
      if (!g) return state;
      const innerFirst = g.containedNodeIds.find(
        (id) => id !== g.groupInputNodeId && id !== g.groupOutputNodeId
      );
      return {
        ...state,
        graphScope: action.groupId,
        selectedIds: innerFirst ? [innerFirst] : [g.id],
      };
    }
    case 'exitGroupScope': {
      const gid = state.graphScope;
      return {
        ...state,
        graphScope: null,
        selectedIds: gid ? [gid] : [],
      };
    }
    case 'setNodeDimensions': {
      const { id, width: targetW, x: targetX } = action;
      const nodes = state.nodes.map((n) => {
        if (n.id !== id) return n;
        const lo = graphNodeMinWidth(n);
        const w = Math.min(GRAPH_NODE_MAX_W, Math.max(lo, targetW));
        if (n.kind === 'parameter') {
          return { ...n, width: w, ...(targetX !== undefined ? { x: targetX } : {}) };
        }
        if (n.kind === 'function') {
          return { ...n, width: w, ...(targetX !== undefined ? { x: targetX } : {}) };
        }
        if (n.kind === 'group') {
          return { ...n, width: w, ...(targetX !== undefined ? { x: targetX } : {}) };
        }
        if (n.kind === 'output') {
          return { ...n, width: w, ...(targetX !== undefined ? { x: targetX } : {}) };
        }
        if (n.kind === 'generate') {
          return { ...n, width: w, ...(targetX !== undefined ? { x: targetX } : {}) };
        }
        if (n.kind === 'task') {
          return { ...n, width: w, ...(targetX !== undefined ? { x: targetX } : {}) };
        }
        if (n.kind === 'groupInput' || n.kind === 'groupOutput') {
          return { ...n, width: w, ...(targetX !== undefined ? { x: targetX } : {}) };
        }
        return n;
      });
      return { ...state, nodes };
    }
    case 'addFunctionNodeAt': {
      if (state.graphType === 'management') return state;
      const newId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `n-${Date.now()}`;
      const color = forbidReservedShellWireColor(action.outputPinColor);
      const peers = defaultCrossPeersForNodeColor(color, state.extendedPalette);
      const node: FunctionNode = {
        kind: 'function',
        id: newId,
        x: 0,
        y: 0,
        title: 'Function',
        frameVariant: 'standard',
        slotCount: 3,
        slots: defaultFunctionSlotsForNode(color, peers, state.extendedPalette),
        outputPinColor: color,
        expanded: true,
      };
      const w = graphNodeWidth(node);
      const h = nodeHeight(node);
      node.x = action.graphX - w / 2;
      node.y = action.graphY - h / 2;
      return {
        ...state,
        nodes: [...state.nodes, node],
        selectedIds: [newId],
      };
    }
    case 'addTaskNodeAt': {
      if (state.graphType !== 'management') return state;
      const newId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `n-task-${Date.now()}`;
      const gray = forbidReservedShellWireColor('gray');
      const maxOrder = state.nodes.reduce((m, n) => {
        if (n.kind !== 'task') return m;
        const o = n.managementOrder ?? 0;
        return o > m ? o : m;
      }, -1);
      const node: TaskNode = {
        kind: 'task',
        id: newId,
        x: 0,
        y: 0,
        title: 'Task',
        frameVariant: 'muted',
        inputPinColor: gray,
        outputPinColor: gray,
        taskState: 'pending',
        leadingIconId: 'prompt',
        managementOrder: maxOrder + 1,
      };
      const w = graphNodeWidth(node);
      const h = nodeHeight(node);
      node.x = action.graphX - w / 2;
      node.y = action.graphY - h / 2;
      return {
        ...state,
        nodes: [...state.nodes, node],
        selectedIds: [newId],
      };
    }
    case 'updateTask': {
      const { id, patch } = action;
      let nextPatch = { ...patch };
      if (nextPatch.leadingIconId !== undefined) {
        if (!TASK_LEADING_ICON_IDS.includes(nextPatch.leadingIconId)) {
          const { leadingIconId: _li, ...rest } = nextPatch;
          nextPatch = rest;
        }
      }
      if (nextPatch.inputPinColor !== undefined) {
        nextPatch = {
          ...nextPatch,
          inputPinColor: forbidReservedShellWireColor(nextPatch.inputPinColor),
        };
      }
      if (nextPatch.outputPinColor !== undefined) {
        nextPatch = {
          ...nextPatch,
          outputPinColor: forbidReservedShellWireColor(nextPatch.outputPinColor),
        };
      }
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.kind === 'task' && n.id === id ? { ...n, ...nextPatch } : n
        ),
      };
    }
    case 'swapNodeWithFunction': {
      const idx = state.nodes.findIndex((n) => n.id === action.nodeId);
      if (idx < 0) return state;
      const prev = state.nodes[idx]!;
      if (
        prev.kind === 'group' ||
        prev.kind === 'groupInput' ||
        prev.kind === 'groupOutput' ||
        prev.kind === 'task'
      ) {
        return state;
      }
      const color = forbidReservedShellWireColor(action.outputPinColor);
      const peers = defaultCrossPeersForNodeColor(color, state.extendedPalette);
      const base = {
        id: prev.id,
        x: prev.x,
        y: prev.y,
        title: prev.title,
        frameVariant: prev.frameVariant,
        expanded: prev.expanded,
        ...(prev.width !== undefined ? { width: prev.width } : {}),
        ...(prev.disabled ? { disabled: true } : {}),
      };
      const replacement: FunctionNode = {
        kind: 'function',
        ...base,
        slotCount: 3,
        slots: defaultFunctionSlotsForNode(color, peers, state.extendedPalette),
        outputPinColor: color,
      };
      const nodes = [...state.nodes];
      nodes[idx] = replacement;
      const id = action.nodeId;
      const edges = state.edges.filter((e) => e.from.nodeId !== id && e.to.nodeId !== id);
      return {
        ...state,
        nodes,
        edges,
        selectedIds: [id],
      };
    }
    case 'addParameter': {
      if (!state.parametersEnabled) return state;
      const newId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `n-param-${Date.now()}`;
      const firstParam = state.nodes.find((n) => n.kind === 'parameter') as
        | ParameterNode
        | undefined;
      let title = 'Parameter';
      let parameterValue: string | undefined = 'Value';
      let cloneSrc: ParameterNode | undefined;
      if (action.mode === 'clone' && action.cloneFromId) {
        cloneSrc = state.nodes.find(
          (n) => n.id === action.cloneFromId && n.kind === 'parameter'
        ) as ParameterNode | undefined;
        if (cloneSrc) {
          title = cloneSrc.title;
          parameterValue = cloneSrc.parameterValue ?? 'Value';
        }
      }
      const color: GraphWireColorId = forbidReservedShellWireColor(
        cloneSrc != null
          ? cloneSrc.outputPinColor
          : (action.outputPinColor ?? firstParam?.outputPinColor ?? 'berry')
      );
      const node: ParameterNode = {
        kind: 'parameter',
        id: newId,
        x: 0,
        y: 0,
        title,
        frameVariant: 'emphasis',
        outputPinColor: color,
        expanded: false,
        parameterValue,
      };
      const w = graphNodeWidth(node);
      const h = nodeHeight(node);
      node.x = action.graphX - w / 2;
      node.y = action.graphY - h / 2;
      return {
        ...state,
        nodes: [...state.nodes, node],
        selectedIds: [newId],
      };
    }
    case 'moveNode': {
      const nodes = state.nodes.map((n) =>
        n.id === action.id ? { ...n, x: action.x, y: action.y } : n
      );
      return { ...state, nodes };
    }
    case 'addEdge': {
      if (state.graphType === 'management') {
        const fromN = state.nodes.find((n) => n.id === action.edge.from.nodeId);
        const toN = state.nodes.find((n) => n.id === action.edge.to.nodeId);
        if (fromN?.kind === 'task' || toN?.kind === 'task') return state;
      }
      const taken =
        isInputConnectedWithGroupBridges(
          state.nodes,
          state.edges,
          action.edge.to.nodeId,
          action.edge.to.port
        );
      if (taken) return state;
      return { ...state, edges: [...state.edges, action.edge] };
    }
    case 'removeEdge': {
      if (state.graphType === 'management') {
        const edge = state.edges.find((e) => e.id === action.id);
        if (edge) {
          const fromN = state.nodes.find((n) => n.id === edge.from.nodeId);
          const toN = state.nodes.find((n) => n.id === edge.to.nodeId);
          if (fromN?.kind === 'task' && toN?.kind === 'task') return state;
        }
      }
      return { ...state, edges: state.edges.filter((e) => e.id !== action.id) };
    }
    case 'updateParameter': {
      const { id, patch } = action;
      if (patch.outputPinColor !== undefined) {
        const c = forbidReservedShellWireColor(patch.outputPinColor);
        const { outputPinColor: _oc, ...rest } = patch;
        const paramIds = new Set(
          state.nodes.filter((n) => n.kind === 'parameter').map((n) => n.id)
        );
        const nodes = state.nodes.map((n) => {
          if (n.kind !== 'parameter') return n;
          const next = { ...n, outputPinColor: c };
          return n.id === id && Object.keys(rest).length > 0 ? { ...next, ...rest } : next;
        });
        const edges = state.edges.map((e) =>
          paramIds.has(e.from.nodeId) ? { ...e, colorId: c } : e
        );
        return { ...state, nodes, edges };
      }
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.kind === 'parameter' && n.id === id ? { ...n, ...patch } : n
        ),
      };
    }
    case 'updateOutput': {
      const { id, patch } = action;
      return {
        ...state,
        nodes: state.nodes.map((n) => {
          if (n.kind !== 'output' || n.id !== id) return n;
          const p = { ...patch };
          if (p.inputPinColor !== undefined) {
            p.inputPinColor = forbidReservedShellWireColor(p.inputPinColor);
          }
          return { ...n, ...p };
        }),
      };
    }
    case 'updateGenerate':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.kind === 'generate' && n.id === action.id ? { ...n, ...action.patch } : n
        ),
      };
    case 'updateFunction': {
      return {
        ...state,
        nodes: state.nodes.map((n) => {
          if (n.kind !== 'function' || n.id !== action.id) return n;
          const next: FunctionNode = { ...n };
          const p = action.patch;
          if (p.title !== undefined) next.title = p.title;
          if (p.frameVariant !== undefined) next.frameVariant = p.frameVariant;
          if (p.outputPinColor !== undefined)
            next.outputPinColor = forbidReservedShellWireColor(p.outputPinColor);
          if (p.slotCount !== undefined) {
            const c = Math.max(1, Math.min(12, p.slotCount));
            next.slotCount = c;
            next.slots = makeSlots(c, next.slots, state.extendedPalette);
          }
          if (p.slots !== undefined) next.slots = p.slots;
          return next;
        }),
      };
    }
    case 'updateFunctionSlot':
      return {
        ...state,
        nodes: state.nodes.map((n) => {
          if (n.kind !== 'function' || n.id !== action.id) return n;
          const slots = n.slots.map((s, i) => {
            if (i !== action.slotIndex) return s;
            const patch = { ...action.patch };
            if (patch.propertyType !== undefined) {
              patch.propertyType = migrateRowPropertyType(String(patch.propertyType));
            }
            return normalizeFunctionSlot({ ...s, ...patch }, state.extendedPalette);
          });
          return { ...n, slots };
        }),
      };
    case 'updateFunctionInputGroupChild':
      return {
        ...state,
        nodes: state.nodes.map((n) => {
          if (n.kind !== 'function' || n.id !== action.id) return n;
          const slots = n.slots.map((s, si) => {
            if (si !== action.slotIndex) return s;
            if (s.propertyType !== 'inputGroup' || !s.inputGroupChildSlots) return s;
            const children = s.inputGroupChildSlots.map((ch, ci) => {
              if (ci !== action.childIndex) return ch;
              const p = { ...action.patch };
              if (p.propertyType !== undefined) {
                p.propertyType = migrateRowPropertyType(String(p.propertyType));
                if (p.propertyType === 'inputGroup') p.propertyType = 'textInput';
              }
              return normalizeFunctionSlot({ ...ch, ...p }, state.extendedPalette);
            });
            return normalizeFunctionSlot(
              { ...s, inputGroupChildSlots: children },
              state.extendedPalette
            );
          });
          return { ...n, slots };
        }),
      };
    case 'toggleExpanded':
      return {
        ...state,
        nodes: state.nodes.map((n) => {
          if (n.id !== action.id) return n;
          if (!('expanded' in n)) return n;
          return { ...n, expanded: !n.expanded };
        }),
      };
    case 'copySelection': {
      const clip = buildClipboardFromSelection(
        state.nodes,
        state.edges,
        state.selectedIds,
        state.extendedPalette
      );
      if (!clip) return state;
      return { ...state, clipboard: clip };
    }
    case 'cutSelection': {
      const clip = buildClipboardFromSelection(
        state.nodes,
        state.edges,
        state.selectedIds,
        state.extendedPalette
      );
      if (!clip) return state;
      const { deleteIds, edges: edgesAfterRestore } = expandDeleteIdsForGroupsAndRestoreEdges(
        state.nodes,
        state.edges,
        new Set(state.selectedIds)
      );
      return {
        ...state,
        clipboard: clip,
        nodes: state.nodes.filter((n) => !deleteIds.has(n.id)),
        edges: edgesAfterRestore.filter(
          (e) => !deleteIds.has(e.from.nodeId) && !deleteIds.has(e.to.nodeId)
        ),
        selectedIds: [],
      };
    }
    case 'deleteSelection': {
      if (state.selectedIds.length === 0) return state;
      const { deleteIds, edges: edgesAfterRestore } = expandDeleteIdsForGroupsAndRestoreEdges(
        state.nodes,
        state.edges,
        new Set(state.selectedIds)
      );
      return {
        ...state,
        nodes: state.nodes.filter((n) => !deleteIds.has(n.id)),
        edges: edgesAfterRestore.filter(
          (e) => !deleteIds.has(e.from.nodeId) && !deleteIds.has(e.to.nodeId)
        ),
        selectedIds: [],
      };
    }
    case 'pasteClipboard': {
      if (!state.clipboard) return state;
      const { nodes: remapped, edges: newEdges, newSelectedIds } = remapClipboardPaste(
        state.clipboard,
        state.extendedPalette
      );
      const { cx, cy } = bboxCenterOfNodes(
        state.clipboard.nodes,
        state.clipboard.edges,
        { includeGenerateRunRow: !state.contextToolbar }
      );
      const dx = action.center.x - cx;
      const dy = action.center.y - cy;
      let positioned = translateNodes(remapped, dx, dy);
      let edgesOut = newEdges;
      let selectedOut = newSelectedIds;
      if (!state.parametersEnabled) {
        const paramIds = new Set(
          positioned.filter((n) => n.kind === 'parameter').map((n) => n.id)
        );
        if (paramIds.size > 0) {
          positioned = positioned.filter((n) => n.kind !== 'parameter');
          edgesOut = newEdges.filter(
            (e) => !paramIds.has(e.from.nodeId) && !paramIds.has(e.to.nodeId)
          );
          selectedOut = newSelectedIds.filter((id) => !paramIds.has(id));
        }
      }
      if (!state.generativeNodesEnabled) {
        const genIds = new Set(
          positioned.filter((n) => n.kind === 'generate').map((n) => n.id)
        );
        if (genIds.size > 0) {
          positioned = positioned.filter((n) => n.kind !== 'generate');
          edgesOut = edgesOut.filter(
            (e) => !genIds.has(e.from.nodeId) && !genIds.has(e.to.nodeId)
          );
          selectedOut = selectedOut.filter((id) => !genIds.has(id));
        }
      }
      if (state.graphType === 'management') {
        const nonTask = new Set(
          positioned.filter((n) => n.kind !== 'task').map((n) => n.id)
        );
        if (nonTask.size > 0) {
          positioned = positioned.filter((n) => n.kind === 'task');
          edgesOut = edgesOut.filter(
            (e) => !nonTask.has(e.from.nodeId) && !nonTask.has(e.to.nodeId)
          );
          selectedOut = selectedOut.filter((id) => !nonTask.has(id));
        }
      }
      if (positioned.length === 0) return state;
      return {
        ...state,
        nodes: [...state.nodes, ...positioned],
        edges: [...state.edges, ...edgesOut],
        selectedIds: selectedOut,
      };
    }
    case 'duplicateSelection': {
      if (state.selectedIds.length === 0) return state;
      const clip = buildClipboardFromSelection(
        state.nodes,
        state.edges,
        state.selectedIds,
        state.extendedPalette
      );
      if (!clip) return state;
      const { nodes: remapped, edges: newEdges, newSelectedIds } = remapClipboardPaste(
        clip,
        state.extendedPalette
      );
      const OFFSET = 48;
      let positioned = translateNodes(remapped, OFFSET, OFFSET);
      let edgesDup = newEdges;
      let selOut = newSelectedIds;
      if (state.graphType === 'management') {
        const nonTask = new Set(positioned.filter((n) => n.kind !== 'task').map((n) => n.id));
        if (nonTask.size > 0) {
          positioned = positioned.filter((n) => n.kind === 'task');
          edgesDup = edgesDup.filter(
            (e) => !nonTask.has(e.from.nodeId) && !nonTask.has(e.to.nodeId)
          );
          selOut = selOut.filter((id) => !nonTask.has(id));
        }
      }
      if (positioned.length === 0) return state;
      return {
        ...state,
        nodes: [...state.nodes, ...positioned],
        edges: [...state.edges, ...edgesDup],
        selectedIds: selOut,
      };
    }
    case 'groupSelection': {
      if (state.graphScope || state.graphType === 'management') return state;
      const next = applyGroupSelection(
        state.nodes,
        state.edges,
        state.selectedIds,
        state.extendedPalette,
        { includeGenerateRunRow: !state.contextToolbar }
      );
      if (!next) return state;
      return {
        ...state,
        nodes: next.nodes,
        edges: next.edges,
        selectedIds: next.selectedIds,
      };
    }
    case 'ungroupSelection': {
      if (state.graphScope || state.graphType === 'management') return state;
      const next = applyUngroupSelection(state.nodes, state.edges, state.selectedIds);
      if (!next) return state;
      return {
        ...state,
        nodes: next.nodes,
        edges: next.edges,
        selectedIds: next.selectedIds,
      };
    }
    case 'updateGroup':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.kind === 'group' && n.id === action.id ? { ...n, ...action.patch } : n
        ),
      };
    case 'setPrototypeNodeKind': {
      const { id, kind: nextKind } = action;
      if (nextKind === 'parameter' && !state.parametersEnabled) return state;
      if (nextKind === 'generate' && !state.generativeNodesEnabled) return state;
      const idx = state.nodes.findIndex((n) => n.id === id);
      if (idx < 0) return state;
      const node = state.nodes[idx]!;
      if (node.kind === 'output' || node.kind === 'task') return state;
      if (!(node.kind === 'parameter' || node.kind === 'function' || node.kind === 'generate')) {
        return state;
      }
      if (node.kind === nextKind) return state;

      const base = {
        id: node.id,
        x: node.x,
        y: node.y,
        title: node.title,
        frameVariant: node.frameVariant,
        expanded: node.expanded,
        ...(node.width !== undefined ? { width: node.width } : {}),
        ...(node.disabled ? { disabled: true } : {}),
      };

      let replacement: GraphNode;
      if (nextKind === 'generate') {
        const titleForGenerate =
          (node.kind === 'function' && node.title === 'Function') ||
          (node.kind === 'parameter' && node.title === 'Parameter')
            ? 'Generate'
            : node.title;
        replacement = {
          kind: 'generate',
          ...base,
          title: titleForGenerate,
          frameVariant: 'muted',
          generativePhase: 'prompt',
          promptText: '',
          inputGroupExpanded: false,
        };
      } else if (nextKind === 'parameter') {
        const peerParam = state.nodes.find(
          (n) => n.kind === 'parameter' && n.id !== id
        ) as ParameterNode | undefined;
        let sharedPinColor: GraphWireColorId = 'berry';
        if (node.kind === 'function') {
          sharedPinColor = peerParam?.outputPinColor ?? node.outputPinColor;
        } else if (node.kind === 'generate') {
          const outEdge = state.edges.find((e) => e.from.nodeId === id);
          sharedPinColor =
            peerParam?.outputPinColor ?? outEdge?.colorId ?? 'berry';
          sharedPinColor = coerceGraphWireColorForPaletteMode(
            sharedPinColor,
            state.extendedPalette
          );
        }
        sharedPinColor = forbidReservedShellWireColor(sharedPinColor);
        replacement = {
          kind: 'parameter',
          ...base,
          frameVariant: node.kind === 'generate' ? 'emphasis' : node.frameVariant,
          outputPinColor: sharedPinColor,
          parameterValue: 'Value',
        };
      } else {
        let outColor: GraphWireColorId = 'berry';
        if (node.kind === 'parameter') {
          outColor = node.outputPinColor;
        } else if (node.kind === 'generate') {
          const outEdge = state.edges.find((e) => e.from.nodeId === id);
          outColor = outEdge?.colorId ?? 'berry';
          outColor = coerceGraphWireColorForPaletteMode(outColor, state.extendedPalette);
        } else {
          outColor = node.outputPinColor;
        }
        outColor = forbidReservedShellWireColor(outColor);
        const peers = defaultCrossPeersForNodeColor(outColor, state.extendedPalette);
        replacement = {
          kind: 'function',
          ...base,
          slotCount: 3,
          slots: defaultFunctionSlotsForNode(outColor, peers, state.extendedPalette),
          outputPinColor: outColor,
        };
      }

      const nodes = [...state.nodes];
      nodes[idx] = replacement;

      let edges = state.edges;
      if (nextKind === 'parameter') {
        edges = state.edges
          .filter((e) => e.to.nodeId !== id)
          .map((e) => {
            if (e.from.nodeId !== id) return e;
            const p = replacement as ParameterNode;
            return { ...e, colorId: p.outputPinColor };
          });
      } else if (nextKind === 'generate') {
        edges = state.edges
          .filter((e) => e.to.nodeId !== id)
          .map((e) =>
            e.from.nodeId === id ? { ...e, colorId: 'gray' as GraphWireColorId } : e
          );
      } else if (nextKind === 'function' && node.kind === 'generate') {
        const fn = replacement as FunctionNode;
        edges = state.edges
          .filter((e) => e.to.nodeId !== id)
          .map((e) => (e.from.nodeId === id ? { ...e, colorId: fn.outputPinColor } : e));
      } else if (nextKind === 'function' && node.kind === 'parameter') {
        edges = state.edges;
      }

      return { ...state, nodes, edges };
    }
    case 'hydrateGraphState': {
      const next = structuredClone(action.state) as GraphState;
      if (typeof next.contextToolbarDocked !== 'boolean') {
        next.contextToolbarDocked = false;
      }
      if (typeof next.contextToolbarExpandCollapseInToolbar !== 'boolean') {
        next.contextToolbarExpandCollapseInToolbar = false;
      }
      if (!next.contextToolbar) {
        next.contextToolbarDocked = false;
        next.contextToolbarExpandCollapseInToolbar = false;
      }
      if (next.graphType !== 'management' && next.graphType !== 'dataFlow') {
        next.graphType = 'dataFlow';
      }
      if (next.graphType === 'management') {
        const taskNodes = next.nodes
          .filter((n) => n.kind === 'task')
          .map((n) => normalizeManagementTaskNodeAfterHydrate(n));
        const ids = new Set(taskNodes.map((n) => n.id));
        next.nodes = taskNodes;
        next.edges = next.edges.filter(
          (e) => ids.has(e.from.nodeId) && ids.has(e.to.nodeId)
        );
        next.playMode = false;
        next.graphPlayActive = false;
        next.localPlayNodeIds = [];
        next.parametersEnabled = false;
        next.generativeNodesEnabled = false;
        next.graphScope = null;
        next.contextToolbarExpandCollapseInToolbar = false;
      }
      return next;
    }
    default:
      return state;
  }
}

type Ctx = {
  state: GraphState;
  dispatch: React.Dispatch<Action>;
  connectEdge: (edge: GraphEdge) => void;
  pushUndoSnapshot: () => void;
  undo: () => void;
  redo: () => void;
};

const GraphContext = createContext<Ctx | null>(null);

export function GraphProvider({ children }: { children: ReactNode }) {
  const [state, baseDispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const historyRef = useRef<{ past: GraphState[]; future: GraphState[] }>({
    past: [],
    future: [],
  });

  const dispatch = useCallback((action: Action) => {
    if (action.type === 'hydrateGraphState') {
      baseDispatch(action);
      return;
    }
    if (shouldRecordActionForUndo(action)) {
      const past = historyRef.current.past;
      past.push(structuredClone(stateRef.current));
      historyRef.current.future = [];
      while (past.length > MAX_GRAPH_UNDO) past.shift();
    }
    baseDispatch(action);
  }, []);

  const pushUndoSnapshot = useCallback(() => {
    const past = historyRef.current.past;
    past.push(structuredClone(stateRef.current));
    historyRef.current.future = [];
    while (past.length > MAX_GRAPH_UNDO) past.shift();
  }, []);

  const undo = useCallback(() => {
    const past = historyRef.current.past;
    if (past.length === 0) return;
    const prev = past.pop()!;
    historyRef.current.future.push(structuredClone(stateRef.current));
    baseDispatch({ type: 'hydrateGraphState', state: prev });
  }, []);

  const redo = useCallback(() => {
    const future = historyRef.current.future;
    if (future.length === 0) return;
    const next = future.pop()!;
    historyRef.current.past.push(structuredClone(stateRef.current));
    baseDispatch({ type: 'hydrateGraphState', state: next });
  }, []);

  const connectEdge = useCallback(
    (edge: GraphEdge) => {
      dispatch({ type: 'addEdge', edge });
    },
    [dispatch]
  );

  const value = useMemo(
    () => ({ state, dispatch, connectEdge, pushUndoSnapshot, undo, redo }),
    [state, dispatch, connectEdge, pushUndoSnapshot, undo, redo]
  );
  return <GraphContext.Provider value={value}>{children}</GraphContext.Provider>;
}

export function useGraph() {
  const ctx = useContext(GraphContext);
  if (!ctx) throw new Error('useGraph needs GraphProvider');
  return ctx;
}

export function useConnectEdge() {
  return useGraph().connectEdge;
}

export type { GraphWireColorId, PinColorId } from './pinColors';
