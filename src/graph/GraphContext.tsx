import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type {
  FunctionNode,
  FunctionSlot,
  GraphEdge,
  GraphNode,
  OutputNode,
  ParameterNode,
} from './types';
import {
  migrateRowPropertyType,
  normalizeFunctionSlot,
  ROW_PROPERTY_TYPE_IDS,
} from './types';
import { PIN_COLOR_IDS, type PinColorId } from './pinColors';
import {
  GRAPH_NODE_MAX_W,
  graphNodeMinWidth,
  graphNodeWidth,
  nodeHeight,
} from './geometry';
import {
  bboxCenterOfNodes,
  buildClipboardFromSelection,
  remapClipboardPaste,
  translateNodes,
  type GraphClipboard,
} from './graphClipboardOps';

const TOP_LEVEL_ROW_TYPES = ROW_PROPERTY_TYPE_IDS.filter((t) => t !== 'inputGroup');

/** Two input pin colors for new functions (any palette entries other than this node’s output). */
function defaultCrossPeersForNodeColor(nodeColor: PinColorId): [PinColorId, PinColorId] {
  const others = PIN_COLOR_IDS.filter((c) => c !== nodeColor);
  return [others[0] ?? 'gray', others[1] ?? 'gray'];
}

/**
 * Default function body: first two rows accept `peerInputColors` (other demo functions’ outputs);
 * third slot Input Group (`73:5651`) uses `nodeColor` on all receiving pins.
 */
function defaultFunctionSlotsForNode(
  nodeColor: PinColorId,
  peerInputColors: [PinColorId, PinColorId]
): FunctionSlot[] {
  const [in0, in1] = peerInputColors;
  return [
    normalizeFunctionSlot({
      label: 'Label',
      propertyType: TOP_LEVEL_ROW_TYPES[0]!,
      inputPinColor: in0,
      placeholderText: 'Placeholder',
      textValue: null,
      numberValues: [null, null, null],
    }),
    normalizeFunctionSlot({
      label: 'Label',
      propertyType: TOP_LEVEL_ROW_TYPES[1]!,
      inputPinColor: in1,
      placeholderText: 'Placeholder',
      textValue: null,
      numberValues: [null, null, null],
    }),
    normalizeFunctionSlot({
      label: 'Inputs',
      propertyType: 'inputGroup',
      inputPinColor: nodeColor,
      placeholderText: 'Placeholder',
      textValue: null,
      numberValues: [null, null, null],
      inputGroupExpanded: true,
      inputGroupChildSlots: [
        normalizeFunctionSlot({
          label: 'Label',
          propertyType: 'textInput',
          inputPinColor: nodeColor,
          placeholderText: 'Placeholder',
          textValue: null,
          numberValues: [null, null, null],
        }),
        normalizeFunctionSlot({
          label: 'Label',
          propertyType: 'dropdown',
          inputPinColor: nodeColor,
          placeholderText: 'Placeholder',
          textValue: null,
          numberValues: [null, null, null],
        }),
      ],
    }),
  ];
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
   * pin color dim to 50% opacity; on nodes that have a match, non-matching input pins dim to 50%.
   */
  progressiveConnections: boolean;
  /** In-memory clipboard for copy/cut/paste (induced subgraph of selected nodes). */
  clipboard: GraphClipboard | null;
  /** Inspector → Graph Settings: when false, parameter nodes are removed and the parameter panel is hidden. */
  parametersEnabled: boolean;
  /** Parameters panel body visibility (Figma `132:9384` header always shown when parameters are on). */
  parameterPanelExpanded: boolean;
};

function defaultSlot(i: number): FunctionSlot {
  return normalizeFunctionSlot({
    label: 'Label',
    propertyType: TOP_LEVEL_ROW_TYPES[i % TOP_LEVEL_ROW_TYPES.length]!,
    inputPinColor: 'berry',
    placeholderText: 'Placeholder',
    textValue: null,
    numberValues: [null, null, null],
  });
}

function makeSlots(count: number, prev: FunctionSlot[]): FunctionSlot[] {
  const out: FunctionSlot[] = [];
  for (let i = 0; i < count; i++) {
    const base = prev[i] ?? defaultSlot(i);
    out.push(
      normalizeFunctionSlot({
        ...base,
        propertyType: migrateRowPropertyType(String(base.propertyType)),
      })
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
      slots: defaultFunctionSlotsForNode('berry', ['lima', 'orange']),
      outputPinColor: 'berry',
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
      slots: defaultFunctionSlotsForNode('lima', ['berry', 'orange']),
      outputPinColor: 'lima',
      expanded: true,
    },
    {
      kind: 'function',
      id: 'n-fn-3',
      x: 520,
      y: 360,
      title: 'Function',
      frameVariant: 'standard',
      slotCount: 3,
      slots: defaultFunctionSlotsForNode('orange', ['berry', 'lima']),
      outputPinColor: 'orange',
      expanded: true,
    },
    {
      kind: 'output',
      id: 'n-out',
      x: 680,
      y: 200,
      title: 'Output',
      frameVariant: 'muted',
      inputPinColor: 'berry',
      expanded: true,
    },
  ],
  edges: [
    {
      id: 'e1',
      from: { nodeId: 'n-param', port: 'out' },
      to: { nodeId: 'n-fn', port: 'in-2' },
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
  /** Canvas ⌘⇧H / Ctrl⇧H: flip `disabled` on every currently selected node. */
  | { type: 'toggleNodeDisabled' }
  | { type: 'copySelection' }
  | { type: 'cutSelection' }
  | { type: 'pasteClipboard'; center: { x: number; y: number } }
  | { type: 'duplicateSelection' }
  | { type: 'deleteSelection' }
  /** Placeholders until group/ungroup ships. */
  | { type: 'groupSelection' }
  | { type: 'ungroupSelection' }
  /** Inspector "Node type": switch selected node between parameter and function (edges to inputs are dropped when becoming a parameter). */
  | { type: 'setPrototypeNodeKind'; id: string; kind: 'parameter' | 'function' }
  | { type: 'setClickDragPinWiring'; value: boolean }
  | { type: 'setShowGraphGuide'; value: boolean }
  | { type: 'setProgressiveConnections'; value: boolean }
  | { type: 'setPlayMode'; value: boolean }
  | { type: 'toggleGraphPlay' }
  /** Horizontal resize from canvas edge handles (`width` clamped; optional `x` when resizing from the left). */
  | { type: 'setNodeDimensions'; id: string; width: number; x?: number }
  /** Context menu Insert node → color: new function centered on `graphX` / `graphY`. */
  | {
      type: 'addFunctionNodeAt';
      graphX: number;
      graphY: number;
      outputPinColor: PinColorId;
    }
  /** Replace node at `nodeId` with a fresh function of `outputPinColor`; drops all edges on that node. */
  | { type: 'swapNodeWithFunction'; nodeId: string; outputPinColor: PinColorId }
  | { type: 'setParametersEnabled'; value: boolean }
  | { type: 'toggleParameterPanelExpanded' }
  | {
      type: 'addParameter';
      graphX: number;
      graphY: number;
      mode: 'new' | 'clone';
      cloneFromId?: string;
      /** When `mode === 'new'`, sets parameter + node pin/header color. Ignored for `clone` (uses source). */
      outputPinColor?: PinColorId;
    };

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
        const p: ParameterNode = {
          kind: 'parameter',
          id: newId,
          x: 80,
          y: 120,
          title: 'Parameter',
          frameVariant: 'emphasis',
          outputPinColor: 'berry',
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
                colorId: 'berry',
              },
            ];
          }
        }
      }
      return { ...state, parametersEnabled: true, nodes, edges };
    }
    case 'toggleParameterPanelExpanded':
      return { ...state, parameterPanelExpanded: !state.parameterPanelExpanded };
    case 'setShowGraphGuide':
      return { ...state, showGraphGuide: action.value };
    case 'setProgressiveConnections':
      return { ...state, progressiveConnections: action.value };
    case 'setPlayMode':
      return {
        ...state,
        playMode: action.value,
        graphPlayActive: action.value ? state.graphPlayActive : false,
      };
    case 'toggleGraphPlay':
      return { ...state, graphPlayActive: !state.graphPlayActive };
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
        if (n.kind === 'output') {
          return { ...n, width: w, ...(targetX !== undefined ? { x: targetX } : {}) };
        }
        return n;
      });
      return { ...state, nodes };
    }
    case 'addFunctionNodeAt': {
      const newId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `n-${Date.now()}`;
      const color = action.outputPinColor;
      const peers = defaultCrossPeersForNodeColor(color);
      const node: FunctionNode = {
        kind: 'function',
        id: newId,
        x: 0,
        y: 0,
        title: 'Function',
        frameVariant: 'standard',
        slotCount: 3,
        slots: defaultFunctionSlotsForNode(color, peers),
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
    case 'swapNodeWithFunction': {
      const idx = state.nodes.findIndex((n) => n.id === action.nodeId);
      if (idx < 0) return state;
      const prev = state.nodes[idx]!;
      const color = action.outputPinColor;
      const peers = defaultCrossPeersForNodeColor(color);
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
        slots: defaultFunctionSlotsForNode(color, peers),
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
      const color: PinColorId =
        cloneSrc != null
          ? cloneSrc.outputPinColor
          : (action.outputPinColor ?? firstParam?.outputPinColor ?? 'berry');
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
      const taken = state.edges.some(
        (e) =>
          e.to.nodeId === action.edge.to.nodeId && e.to.port === action.edge.to.port
      );
      if (taken) return state;
      return { ...state, edges: [...state.edges, action.edge] };
    }
    case 'removeEdge':
      return { ...state, edges: state.edges.filter((e) => e.id !== action.id) };
    case 'updateParameter': {
      const { id, patch } = action;
      if (patch.outputPinColor !== undefined) {
        const c = patch.outputPinColor;
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
    case 'updateOutput':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.kind === 'output' && n.id === action.id ? { ...n, ...action.patch } : n
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
          if (p.outputPinColor !== undefined) next.outputPinColor = p.outputPinColor;
          if (p.slotCount !== undefined) {
            const c = Math.max(1, Math.min(12, p.slotCount));
            next.slotCount = c;
            next.slots = makeSlots(c, next.slots);
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
            return normalizeFunctionSlot({ ...s, ...patch });
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
              return normalizeFunctionSlot({ ...ch, ...p });
            });
            return normalizeFunctionSlot({ ...s, inputGroupChildSlots: children });
          });
          return { ...n, slots };
        }),
      };
    case 'toggleExpanded':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.id ? { ...n, expanded: !n.expanded } : n
        ),
      };
    case 'toggleNodeDisabled': {
      const ids = state.selectedIds;
      if (ids.length === 0) return state;
      const idSet = new Set(ids);
      return {
        ...state,
        nodes: state.nodes.map((n) => {
          if (!idSet.has(n.id)) return n;
          return { ...n, disabled: !n.disabled };
        }),
      };
    }
    case 'copySelection': {
      const clip = buildClipboardFromSelection(
        state.nodes,
        state.edges,
        state.selectedIds
      );
      if (!clip) return state;
      return { ...state, clipboard: clip };
    }
    case 'cutSelection': {
      const clip = buildClipboardFromSelection(
        state.nodes,
        state.edges,
        state.selectedIds
      );
      if (!clip) return state;
      const sel = new Set(state.selectedIds);
      return {
        ...state,
        clipboard: clip,
        nodes: state.nodes.filter((n) => !sel.has(n.id)),
        edges: state.edges.filter(
          (e) => !sel.has(e.from.nodeId) && !sel.has(e.to.nodeId)
        ),
        selectedIds: [],
      };
    }
    case 'deleteSelection': {
      if (state.selectedIds.length === 0) return state;
      const sel = new Set(state.selectedIds);
      return {
        ...state,
        nodes: state.nodes.filter((n) => !sel.has(n.id)),
        edges: state.edges.filter(
          (e) => !sel.has(e.from.nodeId) && !sel.has(e.to.nodeId)
        ),
        selectedIds: [],
      };
    }
    case 'pasteClipboard': {
      if (!state.clipboard) return state;
      const { nodes: remapped, edges: newEdges, newSelectedIds } =
        remapClipboardPaste(state.clipboard);
      const { cx, cy } = bboxCenterOfNodes(state.clipboard.nodes);
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
        state.selectedIds
      );
      if (!clip) return state;
      const { nodes: remapped, edges: newEdges, newSelectedIds } =
        remapClipboardPaste(clip);
      const OFFSET = 48;
      const positioned = translateNodes(remapped, OFFSET, OFFSET);
      return {
        ...state,
        nodes: [...state.nodes, ...positioned],
        edges: [...state.edges, ...newEdges],
        selectedIds: newSelectedIds,
      };
    }
    case 'groupSelection':
    case 'ungroupSelection':
      return state;
    case 'setPrototypeNodeKind': {
      const { id, kind: nextKind } = action;
      if (nextKind === 'parameter' && !state.parametersEnabled) return state;
      const idx = state.nodes.findIndex((n) => n.id === id);
      if (idx < 0) return state;
      const node = state.nodes[idx]!;
      if (node.kind !== 'parameter' && node.kind !== 'function') return state;
      if (node.kind === nextKind) return state;

      let replacement: GraphNode;
      if (nextKind === 'parameter' && node.kind === 'function') {
        const peerParam = state.nodes.find(
          (n) => n.kind === 'parameter' && n.id !== id
        ) as ParameterNode | undefined;
        const sharedPinColor = peerParam?.outputPinColor ?? node.outputPinColor;
        replacement = {
          kind: 'parameter',
          id: node.id,
          x: node.x,
          y: node.y,
          title: node.title,
          frameVariant: node.frameVariant,
          outputPinColor: sharedPinColor,
          expanded: node.expanded,
          parameterValue: 'Value',
          ...(node.width !== undefined ? { width: node.width } : {}),
          ...(node.disabled ? { disabled: true } : {}),
        };
      } else if (nextKind === 'function' && node.kind === 'parameter') {
        replacement = {
          kind: 'function',
          id: node.id,
          x: node.x,
          y: node.y,
          title: node.title,
          frameVariant: node.frameVariant,
          outputPinColor: node.outputPinColor,
          expanded: node.expanded,
          slotCount: 3,
          slots: defaultFunctionSlotsForNode(
            node.outputPinColor,
            defaultCrossPeersForNodeColor(node.outputPinColor)
          ),
          ...(node.width !== undefined ? { width: node.width } : {}),
          ...(node.disabled ? { disabled: true } : {}),
        };
      } else {
        return state;
      }

      const nodes = [...state.nodes];
      nodes[idx] = replacement;

      const edges =
        nextKind === 'parameter'
          ? state.edges.filter((e) => e.to.nodeId !== id)
          : state.edges;

      return { ...state, nodes, edges };
    }
    default:
      return state;
  }
}

type Ctx = {
  state: GraphState;
  dispatch: React.Dispatch<Action>;
  connectEdge: (edge: GraphEdge) => void;
};

const GraphContext = createContext<Ctx | null>(null);

export function GraphProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const connectEdge = useCallback((edge: GraphEdge) => {
    dispatch({ type: 'addEdge', edge });
  }, []);
  const value = useMemo(
    () => ({ state, dispatch, connectEdge }),
    [state, dispatch, connectEdge]
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

export type { PinColorId } from './pinColors';
