import { inputPinColorForTarget, layoutFunctionInputPorts } from './geometry';
import type { PinColorId } from './pinColors';
import type { GraphNode } from './types';

const DIM = 0.5;

export type WireDragForProgressive = {
  fromNodeId: string;
  colorId: PinColorId;
};

/** True when any input on this node accepts `wireColor` (same rule as live edge preview). */
export function nodeHasMatchingInputPin(node: GraphNode, wireColor: PinColorId): boolean {
  if (node.kind === 'parameter') return false;
  if (node.kind === 'output') return node.inputPinColor === wireColor;
  for (const L of layoutFunctionInputPorts(node)) {
    const c = inputPinColorForTarget(node, L.target);
    if (c !== null && c === wireColor) return true;
  }
  return false;
}

function inputPinColorForPort(node: GraphNode, port: `in-${number}`): PinColorId | null {
  if (node.kind === 'output') return port === 'in-0' ? node.inputPinColor : null;
  if (node.kind !== 'function') return null;
  const L = layoutFunctionInputPorts(node).find((x) => x.port === port);
  if (!L) return null;
  return inputPinColorForTarget(node, L.target);
}

/**
 * Whole-card opacity while routing a wire (Experimental → Progressive connections).
 * Nodes with no matching input pins dim; source node of the wire is never fully dimmed.
 */
export function progressiveWholeNodeOpacity(
  node: GraphNode,
  wireDrag: WireDragForProgressive | null,
  progressiveConnections: boolean
): number {
  if (!progressiveConnections || !wireDrag) return 1;
  const wireColor = wireDrag.colorId;
  if (node.id === wireDrag.fromNodeId) return 1;
  if (nodeHasMatchingInputPin(node, wireColor)) return 1;
  return DIM;
}

/**
 * Per-input-pin multiplier when the node has at least one matching input (partial highlight).
 * Returns 1 when the whole card is already dimmed or progressive wiring is inactive.
 */
export function progressiveInputPinMultiplier(
  node: GraphNode,
  port: `in-${number}`,
  wireDrag: WireDragForProgressive | null,
  progressiveConnections: boolean
): number {
  if (!progressiveConnections || !wireDrag) return 1;
  const wireColor = wireDrag.colorId;
  if (!nodeHasMatchingInputPin(node, wireColor)) return 1;
  const pinColor = inputPinColorForPort(node, port);
  if (pinColor === null) return 1;
  return pinColor === wireColor ? 1 : DIM;
}
