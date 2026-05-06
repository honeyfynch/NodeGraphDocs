import { layoutFunctionInputPorts } from './geometry';
import type { FunctionNode, GraphEdge, GraphNode, ParameterNode } from './types';

/** Display string for a parameter’s carried value (expanded chip + driven inputs). */
export function parameterDisplayValue(p: Pick<ParameterNode, 'parameterValue'>): string {
  const v = p.parameterValue;
  if (typeof v === 'string' && v.trim() !== '') return v.trim();
  return 'Value';
}

/** If an edge from a parameter feeds this input port, return that parameter node. */
export function findIncomingParameterSource(
  nodes: GraphNode[],
  edges: GraphEdge[],
  toNodeId: string,
  port: `in-${number}`
): ParameterNode | null {
  const edge = edges.find((e) => e.to.nodeId === toNodeId && e.to.port === port);
  if (!edge) return null;
  const from = nodes.find((n) => n.id === edge.from.nodeId);
  if (!from || from.kind !== 'parameter') return null;
  return from;
}

export function portForTopLevelFunctionSlot(
  node: FunctionNode,
  slotIndex: number
): `in-${number}` | null {
  const hit = layoutFunctionInputPorts(node).find(
    (L) => L.target.kind === 'slot' && L.target.slotIndex === slotIndex
  );
  return hit?.port ?? null;
}

export function portForInputGroupChild(
  node: FunctionNode,
  groupSlotIndex: number,
  childIndex: number
): `in-${number}` | null {
  const hit = layoutFunctionInputPorts(node).find(
    (L) =>
      L.target.kind === 'inputGroupChild' &&
      L.target.groupSlotIndex === groupSlotIndex &&
      L.target.childIndex === childIndex
  );
  return hit?.port ?? null;
}
