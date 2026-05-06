import { graphNodeWidth, nodeHeight } from './geometry';
import type { GraphEdge, GraphNode } from './types';
import { normalizeFunctionSlot } from './types';

export type GraphClipboard = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

function newId(prefix: string): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function cloneGraphNode(n: GraphNode): GraphNode {
  const raw = structuredClone(n) as GraphNode;
  if (raw.kind === 'function' && raw.slots) {
    raw.slots = raw.slots.map((s) => normalizeFunctionSlot(s));
  }
  return raw;
}

/** Induced subgraph: edges whose both endpoints lie in `nodeIds`. */
export function inducedEdgesForNodes(
  edges: GraphEdge[],
  nodeIds: ReadonlySet<string>
): GraphEdge[] {
  return edges.filter(
    (e) => nodeIds.has(e.from.nodeId) && nodeIds.has(e.to.nodeId)
  );
}

export function buildClipboardFromSelection(
  nodes: GraphNode[],
  edges: GraphEdge[],
  selectedIds: readonly string[]
): GraphClipboard | null {
  if (selectedIds.length === 0) return null;
  const set = new Set(selectedIds);
  const picked = nodes.filter((n) => set.has(n.id));
  if (picked.length === 0) return null;
  const nodeIds = new Set(picked.map((n) => n.id));
  const pickedEdges = inducedEdgesForNodes(edges, nodeIds);
  return {
    nodes: picked.map((n) => cloneGraphNode(n)),
    edges: pickedEdges.map((e) => ({ ...e })),
  };
}

export function bboxCenterOfNodes(nodes: GraphNode[]): { cx: number; cy: number } {
  let minGX = Infinity;
  let minGY = Infinity;
  let maxGX = -Infinity;
  let maxGY = -Infinity;
  for (const n of nodes) {
    const w = graphNodeWidth(n);
    const h = nodeHeight(n);
    minGX = Math.min(minGX, n.x);
    minGY = Math.min(minGY, n.y);
    maxGX = Math.max(maxGX, n.x + w);
    maxGY = Math.max(maxGY, n.y + h);
  }
  return { cx: (minGX + maxGX) / 2, cy: (minGY + maxGY) / 2 };
}

function withNodeId(n: GraphNode, id: string): GraphNode {
  return { ...n, id };
}

/** Clone bundle nodes with new ids; remap edges to new ids (both ends must be in bundle). */
export function remapClipboardPaste(bundle: GraphClipboard): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  newSelectedIds: string[];
} {
  const idMap = new Map<string, string>();
  for (const n of bundle.nodes) {
    idMap.set(n.id, newId('n'));
  }
  const inBundle = new Set(bundle.nodes.map((n) => n.id));

  const nodes = bundle.nodes.map((n) => {
    const nid = idMap.get(n.id)!;
    return withNodeId(cloneGraphNode(n), nid);
  });

  const edges: GraphEdge[] = [];
  for (const e of bundle.edges) {
    if (!inBundle.has(e.from.nodeId) || !inBundle.has(e.to.nodeId)) continue;
    edges.push({
      ...e,
      id: newId('e'),
      from: { nodeId: idMap.get(e.from.nodeId)!, port: e.from.port },
      to: { nodeId: idMap.get(e.to.nodeId)!, port: e.to.port },
    });
  }

  return { nodes, edges, newSelectedIds: nodes.map((n) => n.id) };
}

export function translateNodes(nodes: GraphNode[], dx: number, dy: number): GraphNode[] {
  return nodes.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy }));
}
