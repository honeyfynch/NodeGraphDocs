import { graphNodeWidth, nodeHeight } from './geometry';
import { nodeVisibleForGraphScope } from './graphGroupScope';
import type { GraphEdge, GraphNode } from './types';

/** AABB intersection in graph space (partial overlap selects the node). */
export function nodeIdsIntersectingGraphRect(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  graphScope: string | null,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): string[] {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const out: string[] = [];
  for (const n of nodes) {
    if (!nodeVisibleForGraphScope(n.id, graphScope, nodes)) continue;
    const w = graphNodeWidth(n);
    const h = nodeHeight(n, edges);
    const nx2 = n.x + w;
    const ny2 = n.y + h;
    if (n.x < maxX && nx2 > minX && n.y < maxY && ny2 > minY) {
      out.push(n.id);
    }
  }
  return out;
}
