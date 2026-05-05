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
  selectedId: string | null;
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
  selectedId: 'n-fn',
  clickDragPinWiring: false,
  playMode: true,
  graphPlayActive: false,
};

type Action =
  | { type: 'select'; id: string | null }
  | { type: 'moveNode'; id: string; x: number; y: number }
  | { type: 'addEdge'; edge: GraphEdge }
  | { type: 'removeEdge'; id: string }
  | {
      type: 'updateParameter';
      id: string;
      patch: Partial<
        Pick<ParameterNode, 'title' | 'outputPinColor' | 'frameVariant' | 'expanded'>
      >;
    }
  | {
      type: 'updateOutput';
      id: string;
      patch: Partial<Pick<OutputNode, 'title' | 'inputPinColor' | 'frameVariant'>>;
    }
  | {
      type: 'updateFunction';
      id: string;
      patch: Partial<
        Pick<FunctionNode, 'title' | 'outputPinColor' | 'frameVariant' | 'slotCount'>
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
  /** Inspector "Node type": switch selected node between parameter and function (edges to inputs are dropped when becoming a parameter). */
  | { type: 'setPrototypeNodeKind'; id: string; kind: 'parameter' | 'function' }
  | { type: 'setClickDragPinWiring'; value: boolean }
  | { type: 'setPlayMode'; value: boolean }
  | { type: 'toggleGraphPlay' };

function reducer(state: GraphState, action: Action): GraphState {
  switch (action.type) {
    case 'select':
      return { ...state, selectedId: action.id };
    case 'setClickDragPinWiring':
      return { ...state, clickDragPinWiring: action.value };
    case 'setPlayMode':
      return {
        ...state,
        playMode: action.value,
        graphPlayActive: action.value ? state.graphPlayActive : false,
      };
    case 'toggleGraphPlay':
      return { ...state, graphPlayActive: !state.graphPlayActive };
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
    case 'updateParameter':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.kind === 'parameter' && n.id === action.id ? { ...n, ...action.patch } : n
        ),
      };
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
    case 'setPrototypeNodeKind': {
      const { id, kind: nextKind } = action;
      const idx = state.nodes.findIndex((n) => n.id === id);
      if (idx < 0) return state;
      const node = state.nodes[idx]!;
      if (node.kind !== 'parameter' && node.kind !== 'function') return state;
      if (node.kind === nextKind) return state;

      let replacement: GraphNode;
      if (nextKind === 'parameter' && node.kind === 'function') {
        replacement = {
          kind: 'parameter',
          id: node.id,
          x: node.x,
          y: node.y,
          title: node.title,
          frameVariant: node.frameVariant,
          outputPinColor: node.outputPinColor,
          expanded: node.expanded,
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
