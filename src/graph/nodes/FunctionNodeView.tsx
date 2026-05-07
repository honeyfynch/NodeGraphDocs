import { useGraph } from '../GraphContext';
import {
  findIncomingParameterSource,
  parameterDisplayValue,
} from '../graphWiring';
import { foundationLayout, nodeLabelColumn, nodeRow } from '../figmaNodeTokens';
import {
  graphNodeWidth,
  nodeHeight,
  ROW_H,
  layoutFunctionInputPorts,
  portsForInputGroupSlot,
} from '../geometry';
import type { FunctionNode, FunctionSlot } from '../types';
import { NODE_HEADER_HEX } from '../pinColors';
import { EditableNodeTitle } from '../EditableNodeTitle';
import { NodePropertySlotControl } from '../nodePropertyUi';
import { NodeShell } from '../NodeShell';
import { NodeResizeEdges } from '../NodeResizeEdges';
import { Pin } from '../Pin';
import chevronCollapsedUrl from '../../assets/icons/node-header-chevron-collapsed.svg?url';
import chevronExpandedUrl from '../../assets/icons/node-header-chevron-expanded.svg?url';

type Props = {
  node: FunctionNode;
  selected: boolean;
  /** Experimental progressive connections: whole-card dim (default 1). */
  progressiveCardOpacity?: number;
  /** Per-input-pin multiplier when the card stays full opacity (default 1). */
  progressiveInputPinMultiplier?: (port: `in-${number}`) => number;
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
};

function groupExpanded(slot: FunctionSlot): boolean {
  return slot.inputGroupExpanded !== false;
}

function childSlots(slot: FunctionSlot): FunctionSlot[] {
  return slot.inputGroupChildSlots ?? [];
}

/** Label + property column when node is disabled (input pins use {@link dimInputPinWrapper}). */
function dimRowContent(disabled: boolean) {
  return disabled ? 0.5 : 1;
}

/** Disconnected input pins dim with the node; connected pins stay full opacity. */
function dimInputPinWrapper(disabled: boolean, connected: boolean) {
  return disabled && !connected ? 0.5 : 1;
}

export function FunctionNodeView({
  node,
  selected,
  progressiveCardOpacity = 1,
  progressiveInputPinMultiplier,
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
}: Props) {
  const { state: graphState } = useGraph();
  const portLayouts = layoutFunctionInputPorts(node);
  const w = graphNodeWidth(node);
  const h = nodeHeight(node);

  const progressivePinFactor = (port: `in-${number}`) =>
    progressiveCardOpacity < 1 ? 1 : (progressiveInputPinMultiplier?.(port) ?? 1);

  const headerPin = (
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
        onOutputPointerDown(e);
      }}
    >
      <Pin
        colorId={node.outputPinColor}
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
          minHeight: ROW_H,
          ...nodeRow,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            opacity:
              dimInputPinWrapper(Boolean(node.disabled), conn) * progressivePinFactor(port),
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
    const stubConnected = groupPorts.some((p) => inputConnected(p));
    const stubPort = groupPorts[0];
    const stubProg =
      stubPort != null ? progressivePinFactor(stubPort) : 1;

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
        }}
      >
        <div
          className="flex-row items-center gap-sm"
          style={{
            position: 'relative',
            minHeight: ROW_H,
            paddingLeft: 4,
            paddingRight: 8,
            boxSizing: 'border-box',
          }}
        >
          {!expanded && groupPorts.length > 0 ? (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                opacity:
                  dimInputPinWrapper(Boolean(node.disabled), stubConnected) * stubProg,
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onCollapsedInputGroupPointerDown?.(slotIndex, e);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                onCollapsedInputGroupPointerUp?.(slotIndex, e);
              }}
            >
              <Pin
                colorId={groupPin}
                connected={stubConnected}
                clipOuterStrokeOn="left"
              />
            </div>
          ) : null}
          <div
            className="flex-row items-center gap-sm flex-1 min-w-0"
            style={{ opacity: dimRowContent(Boolean(node.disabled)) }}
          >
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
            <div className="flex-1 min-w-0 flex-row items-center text-sm text-muted">
              <span
                className="truncate"
                style={{ lineHeight: 'var(--alpha-text-bodysmall-line-height)' }}
              >
                {slot.label}
              </span>
            </div>
          </div>
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
                    minHeight: ROW_H,
                    ...nodeRow,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      opacity:
                        dimInputPinWrapper(Boolean(node.disabled), childConn) *
                        progressivePinFactor(port),
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
      style={{
        left: node.x,
        top: node.y,
        width: w,
        zIndex: selected ? 4 : 1,
        opacity: progressiveCardOpacity,
      }}
      onContextMenu={(e) => {
        onNodeContextMenu?.(e);
      }}
    >
      <div style={{ position: 'relative', zIndex: 1, minHeight: h }}>
        {onResizeEdgePointerDown ? (
          <NodeResizeEdges node={node} onEdgePointerDown={onResizeEdgePointerDown} />
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
          headerFillOverride={NODE_HEADER_HEX[node.outputPinColor]}
          selected={selected}
          width={w}
          expanded={node.expanded}
          onToggleExpand={onToggleExpand}
          headerTrailing={headerPin}
          onHeaderDragPointerDown={onHeaderDragPointerDown}
          onBackgroundPointerDown={onSelect}
          dimHeaderChrome={Boolean(node.disabled)}
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
