import type { CSSProperties, PointerEvent } from 'react';
import type { GraphEdge, GraphNode } from './types';
import {
  HEADER_H,
  NODE_CARD_BORDER,
  PARAMETER_CHIP_H,
  ROW_H,
  nodeHeight,
} from './geometry';

type Props = {
  node: GraphNode;
  /** Required for {@link GraphNode} `generate` height (input row count from edges). */
  edges?: readonly GraphEdge[];
  onEdgePointerDown: (edge: 'left' | 'right', e: PointerEvent<HTMLDivElement>) => void;
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
 * Horizontal resize targets along the node outline, excluding the header row and pin sockets
 * (function/output: body left/right only; parameter: chip edges with gaps around the output pin).
 */
export function NodeResizeEdges({ node, edges = [], onEdgePointerDown }: Props) {
  const h = nodeHeight(node, edges);

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
            left: -(OUTSET + ZONE),
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
            right: -(OUTSET + ZONE),
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
        left: -(OUTSET + ZONE),
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
          right: -(OUTSET + ZONE),
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
          right: -(OUTSET + ZONE),
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
          right: -(OUTSET + ZONE),
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
