import { foundationLayout, nodeLabelColumn, nodeRow } from '../figmaNodeTokens';
import {
  NODE_W,
  ROW_H,
  layoutFunctionInputPorts,
  portsForInputGroupSlot,
} from '../geometry';
import type { FunctionNode, FunctionSlot } from '../types';
import { NODE_HEADER_HEX } from '../pinColors';
import { EditableNodeTitle } from '../EditableNodeTitle';
import { NodePropertySlotControl } from '../nodePropertyUi';
import { NodeShell } from '../NodeShell';
import { Pin } from '../Pin';
import chevronCollapsedUrl from '../../assets/icons/node-header-chevron-collapsed.svg?url';
import chevronExpandedUrl from '../../assets/icons/node-header-chevron-expanded.svg?url';

type Props = {
  node: FunctionNode;
  selected: boolean;
  inputConnected: (port: `in-${number}`) => boolean;
  outputConnected: boolean;
  onSelect: () => void;
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
};

function groupExpanded(slot: FunctionSlot): boolean {
  return slot.inputGroupExpanded !== false;
}

function childSlots(slot: FunctionSlot): FunctionSlot[] {
  return slot.inputGroupChildSlots ?? [];
}

export function FunctionNodeView({
  node,
  selected,
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
}: Props) {
  const portLayouts = layoutFunctionInputPorts(node);

  const headerPin = (
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
        onOutputPointerDown(e);
      }}
    >
      <Pin colorId={node.outputPinColor} connected={outputConnected} />
    </div>
  );

  const renderNormalRow = (slot: FunctionSlot, slotIndex: number, port: `in-${number}`) => (
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
        <Pin colorId={slot.inputPinColor} connected={inputConnected(port)} />
      </div>
      <div className="text-sm text-muted shrink-0" style={nodeLabelColumn}>
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
        }}
      >
        <NodePropertySlotControl slot={slot} onPatch={(patch) => onSlotPatch(slotIndex, patch)} />
      </div>
    </div>
  );

  const renderInputGroup = (slot: FunctionSlot, slotIndex: number) => {
    const children = childSlots(slot);
    const expanded = groupExpanded(slot);
    const groupPin = slot.inputPinColor;
    const groupPorts = portsForInputGroupSlot(node, slotIndex);
    const stubConnected = groupPorts.some((p) => inputConnected(p));

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
              <Pin colorId={groupPin} connected={stubConnected} />
            </div>
          ) : null}
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
        {expanded
          ? children.map((child, childIndex) => {
              const port = groupPorts[childIndex];
              if (!port) return null;
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
                    <Pin colorId={groupPin} connected={inputConnected(port)} />
                  </div>
                  <div className="text-sm text-muted shrink-0" style={nodeLabelColumn}>
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
                    }}
                  >
                    <NodePropertySlotControl
                      slot={child}
                      onPatch={(patch) => onInputGroupChildPatch(slotIndex, childIndex, patch)}
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
    <div className="absolute" style={{ left: node.x, top: node.y, width: NODE_W }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
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
          width={NODE_W}
          expanded={node.expanded}
          onToggleExpand={onToggleExpand}
          headerTrailing={headerPin}
          onHeaderDragPointerDown={onHeaderDragPointerDown}
          onBackgroundPointerDown={onSelect}
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
