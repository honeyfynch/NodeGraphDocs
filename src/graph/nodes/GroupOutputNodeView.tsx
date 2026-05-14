import { useCallback } from 'react';
import {
  graphNodeWidth,
  nodeHeight,
  ROW_H,
  NODE_ROW_PIN_CENTER_Y_OFFSET,
  functionBodyInputPinLeftLocalPx,
  nodeRowPaddingForPinStyle,
  graphOrbitPinHitStackStyle,
} from '../geometry';
import type { GroupOutputNode } from '../types';
import { useGraph } from '../GraphContext';
import { GROUP_SHELL_HEADER_WIRE_ID, resolveGraphHeaderHex } from '../pinColors';
import { EditableNodeTitle } from '../EditableNodeTitle';
import { NodeShell } from '../NodeShell';
import { NodeResizeEdges } from '../NodeResizeEdges';
import { Pin } from '../Pin';
import { nodeLabelColumn, nodeRow } from '../figmaNodeTokens';

type Props = {
  node: GroupOutputNode;
  selected: boolean;
  progressiveCardOpacity?: number;
  inputConnected: boolean;
  onSelect: (e: React.PointerEvent) => void;
  onTitleDragStart: (start: { clientX: number; clientY: number }) => void;
  onHeaderDragPointerDown: (e: React.PointerEvent) => void;
  onInputPointerDown: (e: React.PointerEvent) => void;
  onInputPointerUp: (e: React.PointerEvent) => void;
  onResizeEdgePointerDown?: (edge: 'left' | 'right', e: React.PointerEvent) => void;
  onNodeContextMenu?: (e: React.MouseEvent) => void;
  onExitSubgraph?: () => void;
  showExpandChevron?: boolean;
  rightAlignedChevron?: boolean;
  onBoundsEl?: (el: HTMLDivElement | null) => void;
};

export function GroupOutputNodeView({
  node,
  selected,
  progressiveCardOpacity = 1,
  inputConnected,
  onSelect,
  onTitleDragStart,
  onHeaderDragPointerDown,
  onInputPointerDown,
  onInputPointerUp,
  onResizeEdgePointerDown,
  onNodeContextMenu,
  onExitSubgraph,
  showExpandChevron = true,
  rightAlignedChevron = true,
  onBoundsEl,
}: Props) {
  const { state: graphState } = useGraph();
  const w = graphNodeWidth(node);
  const h = nodeHeight(node);

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
      onContextMenu={(e) => onNodeContextMenu?.(e)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onExitSubgraph?.();
      }}
    >
      <div style={{ position: 'relative', zIndex: 1, minHeight: h }}>
        {onResizeEdgePointerDown ? (
          <NodeResizeEdges
            node={node}
            onEdgePointerDown={onResizeEdgePointerDown}
          />
        ) : null}
        <NodeShell
          title={node.title}
          titleContent={
            <EditableNodeTitle
              value={node.title}
              onCommit={() => {}}
              onTitleDragStart={onTitleDragStart}
            />
          }
          frameVariant={node.frameVariant}
          headerFillOverride={resolveGraphHeaderHex(GROUP_SHELL_HEADER_WIRE_ID, graphState.extendedPalette)}
          selected={selected}
          width={w}
          expanded
          onToggleExpand={() => {}}
          headerTrailing={null}
          onHeaderDragPointerDown={onHeaderDragPointerDown}
          onBackgroundPointerDown={onSelect}
          dimHeaderChrome={false}
          showExpandChevron={showExpandChevron}
          rightAlignedChevron={rightAlignedChevron}
          pinStyle={graphState.pinStyle}
        >
          <div
            style={{
              position: 'relative',
              height: ROW_H,
              ...nodeRow,
              ...nodeRowPaddingForPinStyle(graphState.pinStyle),
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: functionBodyInputPinLeftLocalPx(node.x, graphState.pinStyle),
                top: `calc(50% + ${NODE_ROW_PIN_CENTER_Y_OFFSET}px)`,
                transform: 'translate(-50%, -50%)',
                ...graphOrbitPinHitStackStyle(graphState.pinStyle),
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
            <div
              className="text-sm text-muted shrink-0"
              style={{ ...nodeLabelColumn, marginLeft: 8 }}
            >
              <span className="truncate" style={{ lineHeight: 'var(--alpha-text-bodysmall-line-height)' }}>
                {node.rowLabel}
              </span>
            </div>
          </div>
        </NodeShell>
      </div>
    </div>
  );
}
