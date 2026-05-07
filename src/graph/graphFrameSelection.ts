import { graphNodeWidth, nodeHeight } from './geometry';
import type { GraphNode } from './types';

export type GraphView = { tx: number; ty: number; scale: number };

/**
 * Fit the bounding box of the given nodes into the graph viewport (screen-space tx/ty/scale).
 * `selectedIds` lists which nodes to include; callers may pass every node id to frame the whole graph.
 * Returns null if nothing to frame (empty ids, missing nodes, or degenerate bounds).
 */
export function viewToFrameNodes(
  nodes: GraphNode[],
  selectedIds: string[],
  containerWidth: number,
  containerHeight: number,
  padPx: number,
  minScale: number,
  maxScale: number
): GraphView | null {
  if (selectedIds.length === 0 || containerWidth <= 1 || containerHeight <= 1) return null;
  const picked = nodes.filter((n) => selectedIds.includes(n.id));
  if (picked.length === 0) return null;

  let minGX = Infinity;
  let minGY = Infinity;
  let maxGX = -Infinity;
  let maxGY = -Infinity;
  for (const n of picked) {
    const w = graphNodeWidth(n);
    const h = nodeHeight(n);
    minGX = Math.min(minGX, n.x);
    minGY = Math.min(minGY, n.y);
    maxGX = Math.max(maxGX, n.x + w);
    maxGY = Math.max(maxGY, n.y + h);
  }

  const gw = maxGX - minGX;
  const gh = maxGY - minGY;
  if (!Number.isFinite(gw) || !Number.isFinite(gh) || gw < 1 || gh < 1) return null;

  const cx = (minGX + maxGX) / 2;
  const cy = (minGY + maxGY) / 2;

  const availW = Math.max(1, containerWidth - 2 * padPx);
  const availH = Math.max(1, containerHeight - 2 * padPx);
  const scale = Math.min(
    maxScale,
    Math.max(minScale, Math.min(availW / gw, availH / gh))
  );

  const tx = containerWidth / 2 - cx * scale;
  const ty = containerHeight / 2 - cy * scale;

  return { tx, ty, scale };
}
