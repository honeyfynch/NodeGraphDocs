import { layoutFunctionInputPorts } from './geometry';
import type { FunctionNode, GraphEdge, GraphNode, GroupNode, ParameterNode } from './types';

function findIncomingEdgeThroughGroup(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  toNodeId: string,
  port: `in-${number}`
): GraphEdge | undefined {
  for (const n of nodes) {
    if (n.kind !== 'group') continue;
    const b = n.bridges.find((x) => x.innerNodeId === toNodeId && x.innerPort === port);
    if (!b) continue;
    const gPort = `in-${b.groupPortIndex}` as `in-${number}`;
    const e = edges.find((ed) => ed.to.nodeId === n.id && ed.to.port === gPort);
    if (e) return e;
  }
  return undefined;
}

/** Direct edge to an input, or an edge to a {@link GroupNode} port that bridges to this target. */
export function findIncomingEdgeToPort(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  toNodeId: string,
  port: `in-${number}`
): GraphEdge | undefined {
  return (
    edges.find((e) => e.to.nodeId === toNodeId && e.to.port === port) ??
    findIncomingEdgeThroughGroup(nodes, edges, toNodeId, port)
  );
}

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
  const edge =
    findIncomingEdgeToPort(nodes, edges, toNodeId, port);
  if (!edge) return null;
  const from = nodes.find((n) => n.id === edge.from.nodeId);
  if (!from || from.kind !== 'parameter') return null;
  return from;
}

export function portForTopLevelFunctionSlot(
  node: FunctionNode | GroupNode,
  slotIndex: number
): `in-${number}` | null {
  const hit = layoutFunctionInputPorts(node).find(
    (L) => L.target.kind === 'slot' && L.target.slotIndex === slotIndex
  );
  return hit?.port ?? null;
}

export function portForInputGroupChild(
  node: FunctionNode | GroupNode,
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
