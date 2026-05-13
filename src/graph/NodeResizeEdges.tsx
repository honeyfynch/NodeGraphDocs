import type { CSSProperties, PointerEvent } from 'react';
import type { GraphEdge, GraphNode } from './types';
import {
  GRAPH_ORBIT_RESIZE_EDGE_OUTSHIFT_PX,
  HEADER_H,
  NODE_CARD_BORDER,
  PARAMETER_CHIP_H,
  ROW_H,
  nodeHeight,
  type GraphPinStyleId,
} from './geometry';

type Props = {
  node: GraphNode;
  /** Required for {@link GraphNode} `generate` height (input row count from edges). */
  edges?: readonly GraphEdge[];
  onEdgePointerDown: (edge: 'left' | 'right', e: PointerEvent<HTMLDivElement>) => void;
  /** When **orbit**, resize bands shift outward so they do not cover sockets (see `GRAPH_ORBIT_RESIZE_EDGE_OUTSHIFT_PX`). */
  pinStyle?: GraphPinStyleId;
};

/** Hit band thickness (px) along the node outline. */
const ZONE = 8;
/** How far past the card bbox the band extends (centers on the visual edge). */
const OUTSET = 6;

const zoneBase: CSSProperties = {
  position: 'absolute',
  zIndex: 4,
  cursor: 'ew-resize',
  touchAction: 'none',
  boxSizing: 'border-box',
};

function bindEdge(
  edge: 'left' | 'right',
  onEdgePointerDown: Props['onEdgePointerDown']
): (e: PointerEvent<HTMLDivElement>) => void {
  return (e) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onEdgePointerDown(edge, e);
  };
}

/**
 * Horizontal resize targets along the node outline, excluding the header row.
 * **Orbit** pins sit outside the card; bands shift outward so they do not stack above sockets (`z-index: 4`).
 * Parameter chip: vertical gaps around the output pin on the right.
 */
export function NodeResizeEdges({
  node,
  edges = [],
  onEdgePointerDown,
  pinStyle = 'classic',
}: Props) {
  const h = nodeHeight(node, edges);
  const orbitOut = pinStyle === 'orbit' ? GRAPH_ORBIT_RESIZE_EDGE_OUTSHIFT_PX : 0;
  const bandEdge = OUTSET + ZONE + orbitOut;

  if (
    node.kind === 'function' ||
    node.kind === 'output' ||
    node.kind === 'generate' ||
    node.kind === 'group' ||
    node.kind === 'groupInput' ||
    node.kind === 'groupOutput'
  ) {
    const bodyH = h - HEADER_H;
    if (bodyH <= 0) return null;
    /** Body starts after card top border + header (`pinGraphPosition` / NodeShell). */
    const bodyTop = NODE_CARD_BORDER + HEADER_H;

    return (
      <>
        <div
          aria-hidden
          style={{
            ...zoneBase,
            left: -bandEdge,
            top: bodyTop,
            width: ZONE,
            height: bodyH,
          }}
          onPointerDown={bindEdge('left', onEdgePointerDown)}
        />
        <div
          aria-hidden
          style={{
            ...zoneBase,
            right: -bandEdge,
            top: bodyTop,
            width: ZONE,
            height: bodyH,
          }}
          onPointerDown={bindEdge('right', onEdgePointerDown)}
        />
      </>
    );
  }

  /* parameter */
  const pinCy = PARAMETER_CHIP_H / 2;
  const pinGap = 10;
  const topSegH = Math.max(0, pinCy - pinGap);
  const midTop = pinCy + pinGap;
  const botSegH = Math.max(0, PARAMETER_CHIP_H - midTop);

  const leftStrip = (
    <div
      key="pl"
      aria-hidden
      style={{
        ...zoneBase,
        left: -bandEdge,
        top: 0,
        width: ZONE,
        height: h,
      }}
      onPointerDown={bindEdge('left', onEdgePointerDown)}
    />
  );

  const rightChipTop =
    topSegH > 0 ? (
      <div
        key="prt"
        aria-hidden
        style={{
          ...zoneBase,
          right: -bandEdge,
          top: 0,
          width: ZONE,
          height: topSegH,
        }}
        onPointerDown={bindEdge('right', onEdgePointerDown)}
      />
    ) : null;

  const rightChipBot =
    botSegH > 0 ? (
      <div
        key="prb"
        aria-hidden
        style={{
          ...zoneBase,
          right: -bandEdge,
          top: midTop,
          width: ZONE,
          height: botSegH,
        }}
        onPointerDown={bindEdge('right', onEdgePointerDown)}
      />
    ) : null;

  const rightValueRow =
    node.expanded ? (
      <div
        key="prv"
        aria-hidden
        style={{
          ...zoneBase,
          right: -bandEdge,
          top: PARAMETER_CHIP_H,
          width: ZONE,
          height: ROW_H,
        }}
        onPointerDown={bindEdge('right', onEdgePointerDown)}
      />
    ) : null;

  return (
    <>
      {leftStrip}
      {rightChipTop}
      {rightChipBot}
      {rightValueRow}
    </>
  );
}
