import { useCallback } from 'react';
import {
  graphNodeWidth,
  nodeHeight,
  ROW_H,
  NODE_ROW_PIN_CENTER_Y_OFFSET,
  cardTrailingOutputRightCss,
} from '../geometry';
import type { GraphOutPort, GroupInputNode } from '../types';
import { useGraph } from '../GraphContext';
import { GROUP_SHELL_HEADER_WIRE_ID, resolveGraphHeaderHex } from '../pinColors';
import { EditableNodeTitle } from '../EditableNodeTitle';
import { NodeShell } from '../NodeShell';
import { NodeResizeEdges } from '../NodeResizeEdges';
import { Pin } from '../Pin';
import { nodeLabelColumn, nodeRow } from '../figmaNodeTokens';

type Props = {
  node: GroupInputNode;
  selected: boolean;
  progressiveCardOpacity?: number;
  progressiveOutputPinOpacity?: (port: GraphOutPort) => number;
  outputConnected: (port: GraphOutPort) => boolean;
  onSelect: (e: React.PointerEvent) => void;
  onTitleDragStart: (start: { clientX: number; clientY: number }) => void;
  onHeaderDragPointerDown: (e: React.PointerEvent) => void;
  onOutputPointerDown: (port: GraphOutPort, e: React.PointerEvent) => void;
  onResizeEdgePointerDown?: (edge: 'left' | 'right', e: React.PointerEvent) => void;
  onNodeContextMenu?: (e: React.MouseEvent) => void;
  onExitSubgraph?: () => void;
  showExpandChevron?: boolean;
  onBoundsEl?: (el: HTMLDivElement | null) => void;
};

export function GroupInputNodeView({
  node,
  selected,
  progressiveCardOpacity = 1,
  progressiveOutputPinOpacity,
  outputConnected,
  onSelect,
  onTitleDragStart,
  onHeaderDragPointerDown,
  onOutputPointerDown,
  onResizeEdgePointerDown,
  onNodeContextMenu,
  onExitSubgraph,
  showExpandChevron = true,
  onBoundsEl,
}: Props) {
  const { state: graphState } = useGraph();
  const w = graphNodeWidth(node);
  const h = nodeHeight(node);
  const rowDefs =
    node.outputs.length > 0
      ? node.outputs.map((row, i) => ({
          label: row.label,
          colorId: row.colorId,
          port: `out-${i}` as GraphOutPort,
        }))
      : [{ label: '—', colorId: 'gray' as const, port: 'out' as GraphOutPort }];

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
            pinStyle={graphState.pinStyle}
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
        >
          {rowDefs.map((row, i) => (
            <div
              key={`${node.id}-row-${i}`}
              style={{
                position: 'relative',
                height: ROW_H,
                ...nodeRow,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: cardTrailingOutputRightCss(graphState.pinStyle),
                  top: `calc(50% + ${NODE_ROW_PIN_CENTER_Y_OFFSET}px)`,
                  transform: 'translateY(-50%)',
                  opacity: progressiveOutputPinOpacity?.(row.port) ?? 1,
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onOutputPointerDown(row.port, e);
                }}
              >
                <Pin colorId={row.colorId} connected={outputConnected(row.port)} clipOuterStrokeOn="right" />
              </div>
              <div
                className="text-sm text-muted shrink-0"
                style={{ ...nodeLabelColumn, marginLeft: 8 }}
              >
                <span className="truncate" style={{ lineHeight: 'var(--alpha-text-bodysmall-line-height)' }}>
                  {row.label}
                </span>
              </div>
            </div>
          ))}
        </NodeShell>
      </div>
    </div>
  );
}
