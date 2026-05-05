import type { OutputNode } from '../types';
import { NODE_W, ROW_H } from '../geometry';
import { NODE_HEADER_HEX } from '../pinColors';
import { NodeShell } from '../NodeShell';
import { Pin } from '../Pin';

type Props = {
  node: OutputNode;
  selected: boolean;
  inputConnected: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onHeaderDragPointerDown: (e: React.PointerEvent) => void;
  onInputPointerDown: (e: React.PointerEvent) => void;
  onInputPointerUp: (e: React.PointerEvent) => void;
};

export function OutputNodeView({
  node,
  selected,
  inputConnected,
  onSelect,
  onToggleExpand,
  onHeaderDragPointerDown,
  onInputPointerDown,
  onInputPointerUp,
}: Props) {
  return (
    <div className="absolute" style={{ left: node.x, top: node.y, width: NODE_W }}>
      <NodeShell
        title={node.title}
        frameVariant={node.frameVariant}
        headerFillOverride={NODE_HEADER_HEX[node.inputPinColor]}
        selected={selected}
        width={NODE_W}
        expanded={node.expanded}
        onToggleExpand={onToggleExpand}
        onHeaderDragPointerDown={onHeaderDragPointerDown}
        onBackgroundPointerDown={onSelect}
      >
        {node.expanded ? (
          <div
            style={{
              position: 'relative',
              height: ROW_H,
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 12,
              paddingRight: 12,
              boxSizing: 'border-box',
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
                onInputPointerDown(e);
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                onInputPointerUp(e);
              }}
            >
              <Pin colorId={node.inputPinColor} connected={inputConnected} />
            </div>
            <span className="text-sm text-muted">Graph output</span>
          </div>
        ) : null}
      </NodeShell>
    </div>
  );
}
