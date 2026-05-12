import type { GraphNode, GroupNode } from './types';

/** Every node id hidden on the root graph (inside any {@link GroupNode} subgraph). */
export function unionHiddenContainedNodeIds(nodes: readonly GraphNode[]): Set<string> {
  const s = new Set<string>();
  for (const n of nodes) {
    if (n.kind !== 'group') continue;
    for (const id of n.containedNodeIds) s.add(id);
  }
  return s;
}

export function groupForScopedView(
  nodes: readonly GraphNode[],
  graphScope: string | null
): GroupNode | null {
  if (!graphScope) return null;
  const g = nodes.find((n) => n.id === graphScope && n.kind === 'group');
  return (g as GroupNode) ?? null;
}

/** Whether `nodeId` is drawn on the canvas for the current scope (root vs inside a group). */
export function nodeVisibleForGraphScope(
  nodeId: string,
  graphScope: string | null,
  nodes: readonly GraphNode[]
): boolean {
  if (!graphScope) {
    return !unionHiddenContainedNodeIds(nodes).has(nodeId);
  }
  const g = groupForScopedView(nodes, graphScope);
  if (!g) return true;
  return g.containedNodeIds.includes(nodeId);
}

export function edgeVisibleForGraphScope(
  edge: { from: { nodeId: string }; to: { nodeId: string } },
  graphScope: string | null,
  nodes: readonly GraphNode[]
): boolean {
  return (
    nodeVisibleForGraphScope(edge.from.nodeId, graphScope, nodes) &&
    nodeVisibleForGraphScope(edge.to.nodeId, graphScope, nodes)
  );
}
