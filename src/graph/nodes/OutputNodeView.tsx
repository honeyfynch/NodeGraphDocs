import { useCallback } from 'react';
import { useGraph } from '../GraphContext';
import { findIncomingParameterSource, parameterDisplayValue } from '../graphWiring';
import type { OutputNode } from '../types';
import {
  graphNodeWidth,
  nodeHeight,
  ROW_H,
  NODE_ROW_PIN_CENTER_Y_OFFSET,
  outputBodyInputPinLeftLocalPx,
  NODE_OUTPUT_BODY_CONTAINED_ROW_PADDING_LEFT_PX,
  OUTPUT_INPUT_ROW_PADDING_X,
} from '../geometry';
import { resolveGraphHeaderHex } from '../pinColors';
import { NodeShell } from '../NodeShell';
import { NodeResizeEdges } from '../NodeResizeEdges';
import { Pin } from '../Pin';

type Props = {
  node: OutputNode;
  selected: boolean;
  /** Experimental progressive connections (default 1). */
  progressiveCardOpacity?: number;
  inputConnected: boolean;
  onSelect: (e: React.PointerEvent) => void;
  onToggleExpand: () => void;
  onHeaderDragPointerDown: (e: React.PointerEvent) => void;
  onInputPointerDown: (e: React.PointerEvent) => void;
  onInputPointerUp: (e: React.PointerEvent) => void;
  onResizeEdgePointerDown?: (edge: 'left' | 'right', e: React.PointerEvent) => void;
  onNodeContextMenu?: (e: React.MouseEvent) => void;
  showExpandChevron?: boolean;
  onBoundsEl?: (el: HTMLDivElement | null) => void;
};

export function OutputNodeView({
  node,
  selected,
  progressiveCardOpacity = 1,
  inputConnected,
  onSelect,
  onToggleExpand,
  onHeaderDragPointerDown,
  onInputPointerDown,
  onInputPointerUp,
  onResizeEdgePointerDown,
  onNodeContextMenu,
  showExpandChevron = true,
  onBoundsEl,
}: Props) {
  const { state } = useGraph();
  const w = graphNodeWidth(node);
  const h = nodeHeight(node);
  const paramIn = findIncomingParameterSource(state.nodes, state.edges, node.id, 'in-0');

  const boundsRef = useCallback(
    (el: HTMLDivElement | null) => {
      onBoundsEl?.(el);
    },
    [onBoundsEl]
  );

  return (
    <div
      className="absolute"
      ref={boundsRef}
      style={{
        left: node.x,
        top: node.y,
        width: w,
        zIndex: selected ? 4 : 1,
        opacity: (node.disabled ? 0.3 : 1) * progressiveCardOpacity,
      }}
      onContextMenu={(e) => {
        onNodeContextMenu?.(e);
      }}
    >
      <div style={{ position: 'relative', minHeight: h }}>
        {onResizeEdgePointerDown ? (
          <NodeResizeEdges
            node={node}
            onEdgePointerDown={onResizeEdgePointerDown}
            pinStyle={state.pinStyle}
          />
        ) : null}
      <NodeShell
        title={node.title}
        frameVariant={node.frameVariant}
        headerFillOverride={resolveGraphHeaderHex(node.inputPinColor, state.extendedPalette)}
        selected={selected}
        width={w}
        expanded={node.expanded}
        onToggleExpand={onToggleExpand}
        onHeaderDragPointerDown={onHeaderDragPointerDown}
        onBackgroundPointerDown={onSelect}
        dimHeaderChrome={false}
        showExpandChevron={showExpandChevron}
      >
        {node.expanded ? (
          <div
            style={{
              position: 'relative',
              height: ROW_H,
              display: 'flex',
              alignItems: 'center',
              paddingLeft:
                state.pinStyle === 'contained'
                  ? NODE_OUTPUT_BODY_CONTAINED_ROW_PADDING_LEFT_PX
                  : OUTPUT_INPUT_ROW_PADDING_X,
              paddingRight: OUTPUT_INPUT_ROW_PADDING_X,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: outputBodyInputPinLeftLocalPx(node.x, state.pinStyle),
                top: `calc(50% + ${NODE_ROW_PIN_CENTER_Y_OFFSET}px)`,
                transform: 'translate(-50%, -50%)',
                opacity: 1,
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onInputPointerDown(e);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                onInputPointerUp(e);
              }}
            >
              <Pin
                colorId={node.inputPinColor}
                connected={inputConnected}
                clipOuterStrokeOn="left"
              />
            </div>
            <span
              className="text-sm text-muted shrink-0"
              style={{ opacity: 1 }}
            >
              Graph output
            </span>
            {paramIn ? (
              <span
                className="text-sm text-emphasis truncate flex-1 min-w-0 text-right"
                style={{
                  lineHeight: 'var(--alpha-text-bodysmall-line-height)',
                  opacity: 0.5,
                  pointerEvents: 'none',
                }}
                title="Value supplied by a connected parameter. Disconnect the wire to configure locally."
              >
                {parameterDisplayValue(paramIn)}
              </span>
            ) : null}
          </div>
        ) : null}
      </NodeShell>
      </div>
    </div>
  );
}
