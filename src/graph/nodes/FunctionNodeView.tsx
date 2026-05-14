import { useCallback } from 'react';
import { useGraph } from '../GraphContext';
import {
  findIncomingParameterSource,
  parameterDisplayValue,
} from '../graphWiring';
import { foundationLayout, nodeLabelColumn, nodeRow } from '../figmaNodeTokens';
import {
  cardTrailingOutputRightCss,
  collapsedInputGroupStubPinCenterXLocalPx,
  functionBodyInputPinLeftLocalPx,
  graphOrbitPinHitStackStyle,
  GRAPH_ORBIT_PIN_ABOVE_RESIZE_Z_INDEX,
  graphNodeWidth,
  NODE_GRAPH_RIGHT_EXPAND_CHEVRON_BUTTON_RIGHT_PX,
  NODE_GRAPH_RIGHT_EXPAND_TITLE_PAD_RIGHT_PX,
  nodeHeaderTitleExtraPadLeftWhenRightChevron,
  nodeHeight,
  nodeRowPaddingForPinStyle,
  ROW_H,
  NODE_ROW_PIN_CENTER_Y_OFFSET,
  GRAPH_PIN_DIAMETER_PX,
  layoutFunctionInputPorts,
  portsForInputGroupSlot,
} from '../geometry';
import type { FunctionNode, FunctionSlot, GraphOutPort, GroupNode } from '../types';
import { groupCanvasOutputPinColorId } from '../graphGroupOps';
import { GROUP_SHELL_HEADER_WIRE_ID, resolveGraphHeaderHex } from '../pinColors';
import { EditableNodeTitle } from '../EditableNodeTitle';
import { NodePropertySlotControl } from '../nodePropertyUi';
import { NodeShell } from '../NodeShell';
import { NodeResizeEdges } from '../NodeResizeEdges';
import { Pin } from '../Pin';
import chevronCollapsedUrl from '../../assets/icons/node-header-chevron-collapsed.svg?url';
import chevronExpandedUrl from '../../assets/icons/node-header-chevron-expanded.svg?url';

type Props = {
  node: FunctionNode | GroupNode;
  /** When true, body rows do not mutate slots (used for {@link GroupNode} on the canvas). */
  canvasReadOnly?: boolean;
  selected: boolean;
  /** Experimental progressive connections: whole-card dim (default 1). */
  progressiveCardOpacity?: number;
  /** Per-input-pin multiplier when the card stays full opacity (default 1). */
  progressiveInputPinMultiplier?: (port: `in-${number}`) => number;
  /** Progressive connections: dim other output pins while dragging a wire from an output. */
  progressiveOutputPinOpacity?: (port: GraphOutPort) => number;
  inputConnected: (port: `in-${number}`) => boolean;
  outputConnected: boolean;
  onSelect: (e: React.PointerEvent) => void;
  onToggleExpand: () => void;
  onTitleCommit: (title: string) => void;
  onTitleDragStart: (start: { clientX: number; clientY: number }) => void;
  onHeaderDragPointerDown: (e: React.PointerEvent) => void;
  onInputPointerDown: (port: `in-${number}`, e: React.PointerEvent) => void;
  onInputPointerUp: (port: `in-${number}`, e: React.PointerEvent) => void;
  onOutputPointerDown: (e: React.PointerEvent) => void;
  onSlotPatch: (slotIndex: number, patch: Partial<FunctionSlot>) => void;
  onInputGroupChildPatch: (
    slotIndex: number,
    childIndex: number,
    patch: Partial<FunctionSlot>
  ) => void;
  onCollapsedInputGroupPointerDown?: (groupSlotIndex: number, e: React.PointerEvent) => void;
  onCollapsedInputGroupPointerUp?: (groupSlotIndex: number, e: React.PointerEvent) => void;
  onResizeEdgePointerDown?: (edge: 'left' | 'right', e: React.PointerEvent) => void;
  onNodeContextMenu?: (e: React.MouseEvent) => void;
  /** When false, header chevron is hidden (context toolbar). Default true. */
  showExpandChevron?: boolean;
  /**
   * When true (default), input-group and node header chevrons sit on the trailing side.
   * When false, chevrons stay on the leading edge.
   */
  rightAlignedChevron?: boolean;
  /** Registers the outer bounds element for the context toolbar (client rect union). */
  onBoundsEl?: (el: HTMLDivElement | null) => void;
  onGraphShellDoubleClick?: () => void;
};

function groupExpanded(slot: FunctionSlot): boolean {
  return slot.inputGroupExpanded === true;
}

function childSlots(slot: FunctionSlot): FunctionSlot[] {
  return slot.inputGroupChildSlots ?? [];
}

/** Muted nodes use outer opacity only — keep row/pin multipliers at 1. */
function dimRowContent(_disabled: boolean) {
  return 1;
}

function dimInputPinWrapper(_disabled: boolean, _connected: boolean) {
  return 1;
}

export function FunctionNodeView({
  node,
  canvasReadOnly = false,
  selected,
  progressiveCardOpacity = 1,
  progressiveInputPinMultiplier,
  progressiveOutputPinOpacity,
  inputConnected,
  outputConnected,
  onSelect,
  onToggleExpand,
  onTitleCommit,
  onTitleDragStart,
  onHeaderDragPointerDown,
  onInputPointerDown,
  onInputPointerUp,
  onOutputPointerDown,
  onSlotPatch,
  onInputGroupChildPatch,
  onCollapsedInputGroupPointerDown,
  onCollapsedInputGroupPointerUp,
  onResizeEdgePointerDown,
  onNodeContextMenu,
  onGraphShellDoubleClick,
  showExpandChevron = true,
  rightAlignedChevron = true,
  onBoundsEl,
}: Props) {
  const { state: graphState } = useGraph();
  const portLayouts = layoutFunctionInputPorts(node);
  const w = graphNodeWidth(node);
  const h = nodeHeight(node);
  const isGroup = node.kind === 'group';
  const headerOutputPinColorId = isGroup
    ? groupCanvasOutputPinColorId(node, graphState.edges)
    : node.outputPinColor;
  const headerFillOverride = resolveGraphHeaderHex(
    isGroup ? GROUP_SHELL_HEADER_WIRE_ID : node.outputPinColor,
    graphState.extendedPalette
  );

  const boundsRef = useCallback(
    (el: HTMLDivElement | null) => {
      onBoundsEl?.(el);
    },
    [onBoundsEl]
  );

  const progressivePinFactor = (port: `in-${number}`) =>
    progressiveCardOpacity < 1 ? 1 : (progressiveInputPinMultiplier?.(port) ?? 1);

  const headerPin = (
    <div
      style={{
        opacity: progressiveOutputPinOpacity?.('out') ?? 1,
        ...graphOrbitPinHitStackStyle(graphState.pinStyle),
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onOutputPointerDown(e);
      }}
    >
      <Pin
        colorId={headerOutputPinColorId}
        connected={outputConnected}
        clipOuterStrokeOn="right"
      />
    </div>
  );

  const parameterDrivenForPort = (port: `in-${number}`) => {
    const src = findIncomingParameterSource(graphState.nodes, graphState.edges, node.id, port);
    return src ? parameterDisplayValue(src) : undefined;
  };

  const renderNormalRow = (slot: FunctionSlot, slotIndex: number, port: `in-${number}`) => {
    const conn = inputConnected(port);
    return (
      <div
        key={`${node.id}-slot-${slotIndex}`}
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
            opacity:
              dimInputPinWrapper(Boolean(node.disabled), conn) * progressivePinFactor(port),
            ...graphOrbitPinHitStackStyle(graphState.pinStyle),
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onInputPointerDown(port, e);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            onInputPointerUp(port, e);
          }}
        >
          <Pin
            colorId={slot.inputPinColor}
            connected={conn}
            clipOuterStrokeOn="left"
          />
        </div>
        <div
          className="text-sm text-muted shrink-0"
          style={{ ...nodeLabelColumn, opacity: dimRowContent(Boolean(node.disabled)) }}
        >
          <span
            className="truncate"
            style={{ lineHeight: 'var(--alpha-text-bodysmall-line-height)' }}
          >
            {slot.label}
          </span>
        </div>
        <div
          className="flex-1 min-w-0"
          style={{
            minHeight: foundationLayout.contentMinHeight,
            display: 'flex',
            alignItems: 'center',
            opacity: dimRowContent(Boolean(node.disabled)),
          }}
        >
          <NodePropertySlotControl
            slot={slot}
            onPatch={(patch) => onSlotPatch(slotIndex, patch)}
            parameterDrivenValue={parameterDrivenForPort(port)}
          />
        </div>
      </div>
    );
  };

  const renderInputGroup = (slot: FunctionSlot, slotIndex: number) => {
    const children = childSlots(slot);
    const expanded = groupExpanded(slot);
    const groupPin = slot.inputPinColor;
    const groupPorts = portsForInputGroupSlot(node, slotIndex);
    return (
      <div
        key={`${node.id}-ig-${slotIndex}`}
        style={{
          position: 'relative',
          borderTop: '1px solid var(--studio-stroke)',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          minWidth: 0,
          overflow: expanded ? 'visible' : 'hidden',
        }}
      >
        <div
          className="flex-row items-center gap-sm"
          style={{
            position: 'relative',
            height: ROW_H,
            boxSizing: 'border-box',
            paddingLeft: rightAlignedChevron ? 8 : 4,
            paddingRight: 8,
          }}
        >
          {!expanded && groupPorts.length > 0 ? (
            <div
              style={{
                position: 'absolute',
                left: collapsedInputGroupStubPinCenterXLocalPx(node.x, graphState.pinStyle),
                top: `calc(50% + ${NODE_ROW_PIN_CENTER_Y_OFFSET}px)`,
                transform: 'translate(-50%, -50%)',
                width: GRAPH_PIN_DIAMETER_PX,
                height: GRAPH_PIN_DIAMETER_PX,
                opacity: 0,
                touchAction: 'none',
                ...graphOrbitPinHitStackStyle(graphState.pinStyle),
              }}
              aria-hidden
              onPointerDown={(e) => {
                e.stopPropagation();
                onCollapsedInputGroupPointerDown?.(slotIndex, e);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                onCollapsedInputGroupPointerUp?.(slotIndex, e);
              }}
            />
          ) : null}
          <div
            className="flex-row items-center gap-sm flex-1 min-w-0"
            style={{
              opacity: dimRowContent(Boolean(node.disabled)),
              paddingLeft: rightAlignedChevron
                ? nodeHeaderTitleExtraPadLeftWhenRightChevron(graphState.pinStyle, 8)
                : 0,
              paddingRight: rightAlignedChevron
                ? NODE_GRAPH_RIGHT_EXPAND_TITLE_PAD_RIGHT_PX
                : 0,
            }}
          >
            {!rightAlignedChevron ? (
              <button
                type="button"
                className="studio-node-chevron"
                aria-expanded={expanded}
                aria-label={expanded ? 'Collapse inputs' : 'Expand inputs'}
                style={{
                  flexShrink: 0,
                  width: 24,
                  height: 24,
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canvasReadOnly) return;
                  onSlotPatch(slotIndex, { inputGroupExpanded: !expanded });
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <img
                  src={expanded ? chevronExpandedUrl : chevronCollapsedUrl}
                  width={12}
                  height={12}
                  alt=""
                  draggable={false}
                />
              </button>
            ) : null}
            <div className="flex-1 min-w-0 flex-row items-center text-sm text-muted">
              <span
                className="truncate"
                style={{ lineHeight: 'var(--alpha-text-bodysmall-line-height)' }}
              >
                {slot.label}
              </span>
            </div>
          </div>
          {rightAlignedChevron ? (
            <button
              type="button"
              className="studio-node-chevron"
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse inputs' : 'Expand inputs'}
              style={{
                position: 'absolute',
                right: NODE_GRAPH_RIGHT_EXPAND_CHEVRON_BUTTON_RIGHT_PX,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 3,
                flexShrink: 0,
                width: 24,
                height: 24,
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (canvasReadOnly) return;
                onSlotPatch(slotIndex, { inputGroupExpanded: !expanded });
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <img
                src={expanded ? chevronExpandedUrl : chevronCollapsedUrl}
                width={12}
                height={12}
                alt=""
                draggable={false}
              />
            </button>
          ) : null}
        </div>
        {expanded
          ? children.map((child, childIndex) => {
              const port = groupPorts[childIndex];
              if (!port) return null;
              const childConn = inputConnected(port);
              return (
                <div
                  key={`${node.id}-ig-${slotIndex}-c-${childIndex}`}
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
                      opacity:
                        dimInputPinWrapper(Boolean(node.disabled), childConn) *
                        progressivePinFactor(port),
                      ...graphOrbitPinHitStackStyle(graphState.pinStyle),
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onInputPointerDown(port, e);
                    }}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      onInputPointerUp(port, e);
                    }}
                  >
                    <Pin
                      colorId={groupPin}
                      connected={childConn}
                      clipOuterStrokeOn="left"
                    />
                  </div>
                  <div
                    className="text-sm text-muted shrink-0"
                    style={{ ...nodeLabelColumn, opacity: dimRowContent(Boolean(node.disabled)) }}
                  >
                    <span
                      className="truncate"
                      style={{ lineHeight: 'var(--alpha-text-bodysmall-line-height)' }}
                    >
                      {child.label}
                    </span>
                  </div>
                  <div
                    className="flex-1 min-w-0"
                    style={{
                      minHeight: foundationLayout.contentMinHeight,
                      display: 'flex',
                      alignItems: 'center',
                      opacity: dimRowContent(Boolean(node.disabled)),
                    }}
                  >
                    <NodePropertySlotControl
                      slot={child}
                      onPatch={(patch) => onInputGroupChildPatch(slotIndex, childIndex, patch)}
                      parameterDrivenValue={
                        port ? parameterDrivenForPort(port) : undefined
                      }
                    />
                  </div>
                </div>
              );
            })
          : null}
      </div>
    );
  };

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
      onDoubleClick={() => {
        onGraphShellDoubleClick?.();
      }}
    >
      <div style={{ position: 'relative', zIndex: 1, minHeight: h }}>
        {onResizeEdgePointerDown ? (
          <NodeResizeEdges
            node={node}
            edges={graphState.edges}
            onEdgePointerDown={onResizeEdgePointerDown}
          />
        ) : null}
        <NodeShell
          title={node.title}
          titleContent={
            <EditableNodeTitle
              value={node.title}
              onCommit={onTitleCommit}
              onTitleDragStart={onTitleDragStart}
            />
          }
          frameVariant={node.frameVariant}
          headerFillOverride={headerFillOverride}
          selected={selected}
          width={w}
          expanded={node.expanded}
          onToggleExpand={onToggleExpand}
          headerTrailing={headerPin}
          headerTrailingRightCss={cardTrailingOutputRightCss(graphState.pinStyle)}
          headerTrailingZIndex={
            graphState.pinStyle === 'orbit' ? GRAPH_ORBIT_PIN_ABOVE_RESIZE_Z_INDEX : 2
          }
          pinStyle={graphState.pinStyle}
          onHeaderDragPointerDown={onHeaderDragPointerDown}
          onBackgroundPointerDown={onSelect}
          dimHeaderChrome={false}
          showExpandChevron={showExpandChevron}
          rightAlignedChevron={rightAlignedChevron}
        >
          {node.expanded ? (
            <>
              {node.slots.map((slot, si) => {
                if (slot.propertyType === 'inputGroup') {
                  return renderInputGroup(slot, si);
                }
                const hit = portLayouts.find(
                  (L) => L.target.kind === 'slot' && L.target.slotIndex === si
                );
                if (!hit) return null;
                return renderNormalRow(slot, si, hit.port);
              })}
            </>
          ) : null}
        </NodeShell>
      </div>
    </div>
  );
}
