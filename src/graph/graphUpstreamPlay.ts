import type { GraphEdge } from './types';

/**
 * Edges that **supply** any of `seedNodeIds` — every directed edge on a path ending at a seed
 * (walk backward from each seed along `to → from`). Used for selection-local play-mode flow.
 */
export function edgeIdsUpstreamOfNodeIds(
  seedNodeIds: readonly string[],
  edges: readonly GraphEdge[]
): Set<string> {
  const out = new Set<string>();
  const visited = new Set<string>();
  const stack = [...seedNodeIds];
  while (stack.length > 0) {
    const n = stack.pop()!;
    if (visited.has(n)) continue;
    visited.add(n);
    for (const e of edges) {
      if (e.to.nodeId !== n) continue;
      out.add(e.id);
      stack.push(e.from.nodeId);
    }
  }
  return out;
}
