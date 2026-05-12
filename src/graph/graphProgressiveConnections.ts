import {
  generateWiredInIndices,
  inputPinColorForTarget,
  layoutFunctionInputPorts,
} from './geometry';
import type { GraphWireColorId } from './pinColors';
import type { GraphEdge, GraphNode } from './types';

/** Opacity for dimmed targets while routing (30% opaque). */
const PROGRESSIVE_DIM_OPACITY = 0.3;

export type WireDragForProgressive = {
  fromNodeId: string;
  colorId: GraphWireColorId;
};

/** True when any input on this node accepts `wireColor` (same rule as live edge preview). */
export function nodeHasMatchingInputPin(
  node: GraphNode,
  wireColor: GraphWireColorId,
  _edges: readonly GraphEdge[] = []
): boolean {
  if (node.kind === 'parameter') return false;
  if (node.kind === 'groupInput') {
    return node.outputs.some((o) => o.colorId === wireColor);
  }
  if (node.kind === 'generate') {
    return node.expanded && node.inputGroupExpanded;
  }
  if (node.kind === 'output') return node.inputPinColor === wireColor;
  if (node.kind === 'function' || node.kind === 'group') {
    for (const L of layoutFunctionInputPorts(node)) {
      const c = inputPinColorForTarget(node, L.target);
      if (c !== null && c === wireColor) return true;
    }
  }
  return false;
}

function inputPinColorForPort(
  node: GraphNode,
  port: `in-${number}`,
  edges: readonly GraphEdge[] = []
): GraphWireColorId | null {
  if (node.kind === 'output') return port === 'in-0' ? node.inputPinColor : null;
  if (node.kind === 'generate') {
    if (!node.expanded || !node.inputGroupExpanded) return null;
    const wired = generateWiredInIndices(node.id, edges);
    const nextFree = wired.length === 0 ? 0 : Math.max(...wired) + 1;
    const allowed = new Set([...wired, nextFree]);
    const n = Number(port.slice(3));
    if (!allowed.has(n)) return null;
    return 'gray';
  }
  if (node.kind === 'function' || node.kind === 'group') {
    const L = layoutFunctionInputPorts(node).find((x) => x.port === port);
    if (!L) return null;
    return inputPinColorForTarget(node, L.target);
  }
  return null;
}

/**
 * Whole-card opacity while routing a wire (Experimental → Progressive connections).
 * Nodes with no matching input pins dim to 30% opacity; source node stays full opacity.
 */
export function progressiveWholeNodeOpacity(
  node: GraphNode,
  wireDrag: WireDragForProgressive | null,
  progressiveConnections: boolean,
  edges: readonly GraphEdge[] = []
): number {
  if (!progressiveConnections || !wireDrag) return 1;
  const wireColor = wireDrag.colorId;
  if (node.id === wireDrag.fromNodeId) return 1;
  if (nodeHasMatchingInputPin(node, wireColor, edges)) return 1;
  return PROGRESSIVE_DIM_OPACITY;
}

/**
 * Per-input-pin multiplier when the node has at least one matching input (partial highlight).
 * Returns 1 when the whole card is already dimmed or progressive wiring is inactive.
 * Non-matching pins use the same dim as whole-card mode (30% opacity).
 */
export function progressiveInputPinMultiplier(
  node: GraphNode,
  port: `in-${number}`,
  wireDrag: WireDragForProgressive | null,
  progressiveConnections: boolean,
  edges: readonly GraphEdge[] = []
): number {
  if (!progressiveConnections || !wireDrag) return 1;
  const wireColor = wireDrag.colorId;
  if (!nodeHasMatchingInputPin(node, wireColor, edges)) return 1;
  if (node.kind === 'generate') return 1;
  const pinColor = inputPinColorForPort(node, port, edges);
  if (pinColor === null) return 1;
  return pinColor === wireColor ? 1 : PROGRESSIVE_DIM_OPACITY;
}
