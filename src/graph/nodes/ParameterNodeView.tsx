import clsx from 'clsx';
import type { ParameterNode } from '../types';
import {
  PARAMETER_CHIP_H,
  PARAMETER_NODE_W,
  PARAMETER_RADIUS_INNER,
  PARAMETER_RADIUS_OUTER,
  PIN_OFFSET,
  ROW_H,
} from '../geometry';
import { NODE_HEADER_HEX } from '../pinColors';
import { EditableNodeTitle } from '../EditableNodeTitle';
import { Pin } from '../Pin';

/** Inner chip vertical space: outer `PARAMETER_CHIP_H` minus 1px stroke inset top and bottom. */
const PARAMETER_CHIP_INNER_H = PARAMETER_CHIP_H - 2;

type Props = {
  node: ParameterNode;
  selected: boolean;
  outputConnected: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onTitleCommit: (title: string) => void;
  onTitleDragStart: (start: { clientX: number; clientY: number }) => void;
  onHeaderDragPointerDown: (e: React.PointerEvent) => void;
  onOutputPointerDown: (e: React.PointerEvent) => void;
};

/**
 * Figma **Parameter** (`73:6071` / symbol `73:6072`): 114×28 chip, `radius/large` 16px,
 * horizontal padding 12px, 3px row gap, output pin matches `NodeShell` header trailing (`PIN_OFFSET`).
 * Frame stroke is a ring **behind** the fill and pin so it does not paint over the socket;
 * inner fill uses `radius − 1px` so corners meet the 1px stroke without canvas gaps.
 * Focused title edit ring matches node `80:68682` (Figma Desktop MCP).
 */
export function ParameterNodeView({
  node,
  selected,
  outputConnected,
  onSelect,
  onToggleExpand,
  onTitleCommit,
  onTitleDragStart,
  onHeaderDragPointerDown,
  onOutputPointerDown,
}: Props) {
  const bg = NODE_HEADER_HEX[node.outputPinColor];
  const expanded = node.expanded;

  return (
    <div className="absolute" style={{ left: node.x, top: node.y, width: PARAMETER_NODE_W }}>
      <div
        className="parameter-node-frame"
        style={{
          width: PARAMETER_NODE_W,
          height: expanded ? PARAMETER_CHIP_H + ROW_H : PARAMETER_CHIP_H,
          position: 'relative',
          borderRadius: PARAMETER_RADIUS_OUTER,
          overflow: 'visible',
        }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest?.('[data-studio-param-pin]')) return;
          onSelect();
        }}
      >
        <div
          aria-hidden
          className={clsx(
            'parameter-node-stroke',
            selected && 'parameter-node-stroke--selected'
          )}
          style={{ borderRadius: PARAMETER_RADIUS_OUTER }}
        />
        <div
          className="parameter-node-surface"
          style={{
            borderRadius: expanded ? 0 : PARAMETER_RADIUS_INNER,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
              minHeight: PARAMETER_CHIP_INNER_H,
              paddingLeft: 12,
              paddingRight: 12,
              background: bg,
              boxSizing: 'border-box',
              position: 'relative',
              borderTopLeftRadius: PARAMETER_RADIUS_INNER,
              borderTopRightRadius: PARAMETER_RADIUS_INNER,
              borderBottomLeftRadius: expanded ? 0 : PARAMETER_RADIUS_INNER,
              borderBottomRightRadius: expanded ? 0 : PARAMETER_RADIUS_INNER,
              cursor: 'grab',
            }}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest?.('[data-studio-editable-title]')) return;
              onHeaderDragPointerDown(e);
            }}
            onDoubleClick={(e) => {
              if ((e.target as HTMLElement).closest?.('[data-studio-editable-title]')) return;
              e.preventDefault();
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  minHeight: 24,
                  paddingLeft: 4,
                  paddingRight: 4,
                  boxSizing: 'border-box',
                  pointerEvents: 'none',
                }}
              >
                <EditableNodeTitle
                  value={node.title}
                  onCommit={onTitleCommit}
                  onTitleDragStart={onTitleDragStart}
                />
              </div>
            </div>
            <div
              data-studio-param-pin
              style={{
                position: 'absolute',
                right: -PIN_OFFSET,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 2,
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelect();
                onOutputPointerDown(e);
              }}
            >
              <Pin colorId={node.outputPinColor} connected={outputConnected} />
            </div>
          </div>
          {expanded ? (
            <div
              className="studio-node-body"
              style={{
                height: ROW_H,
                display: 'flex',
                alignItems: 'center',
                padding: '2px 8px',
                boxSizing: 'border-box',
                background: 'var(--studio-surface-200)',
                borderTop: 'none',
                borderBottomLeftRadius: PARAMETER_RADIUS_INNER,
                borderBottomRightRadius: PARAMETER_RADIUS_INNER,
              }}
            >
              <span className="text-sm text-muted" style={{ width: 96, flexShrink: 0 }}>
                Value
              </span>
              <div className="flex-1" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
