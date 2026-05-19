import {
  generateWiredInIndices,
  inputPinColorForTarget,
  layoutFunctionInputPorts,
} from './geometry';
import { wireColorsMatch, type GraphWireColorId } from './pinColors';
import type { GraphEdge, GraphNode, GraphOutPort } from './types';

/** Opacity for dimmed targets while routing (30% opaque). */
const PROGRESSIVE_DIM_OPACITY = 0.3;

export type WireDragForProgressive = {
  fromNodeId: string;
  fromPort: GraphOutPort;
  colorId: GraphWireColorId;
};

/** Lane index for an output port (`out` and `out-0` both → 0). */
function outPortLane(port: GraphOutPort): number {
  if (port === 'out') return 0;
  const m = /^out-(\d+)$/.exec(port);
  return m ? Number(m[1]) : 0;
}

/**
 * While routing a new wire from an output, dim every other output pin to {@link PROGRESSIVE_DIM_OPACITY};
 * the pin under the active drag stays at 1.
 *
 * When the node’s whole card is already dimmed (no matching inputs), returns 1 so opacity is not
 * multiplied twice with {@link progressiveWholeNodeOpacity}.
 */
export function progressiveOutputPinOpacity(
  nodeId: string,
  port: GraphOutPort,
  wireDrag: WireDragForProgressive | null,
  progressiveConnections: boolean,
  wholeCardAtFullOpacity: boolean
): number {
  if (!progressiveConnections || !wireDrag) return 1;
  if (nodeId === wireDrag.fromNodeId && outPortLane(port) === outPortLane(wireDrag.fromPort)) {
    return 1;
  }
  if (!wholeCardAtFullOpacity) return 1;
  return PROGRESSIVE_DIM_OPACITY;
}

/** True when any input on this node accepts `wireColor` (same rule as live edge preview). */
export function nodeHasMatchingInputPin(
  node: GraphNode,
  wireColor: GraphWireColorId,
  _edges: readonly GraphEdge[] = []
): boolean {
  if (node.kind === 'parameter') return false;
  if (node.kind === 'groupInput') {
    return node.outputs.some((o) => wireColorsMatch(wireColor, o.colorId));
  }
  if (node.kind === 'generate') {
    return node.expanded && node.inputGroupExpanded;
  }
  if (node.kind === 'output') return wireColorsMatch(wireColor, node.inputPinColor);
  if (node.kind === 'task') return wireColorsMatch(wireColor, node.inputPinColor);
  if (node.kind === 'function' || node.kind === 'group') {
    for (const L of layoutFunctionInputPorts(node)) {
      const c = inputPinColorForTarget(node, L.target);
      if (c !== null && wireColorsMatch(wireColor, c)) return true;
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
  if (node.kind === 'task') return port === 'in-0' ? node.inputPinColor : null;
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
  return pinColor !== null && wireColorsMatch(wireColor, pinColor) ? 1 : PROGRESSIVE_DIM_OPACITY;
}
