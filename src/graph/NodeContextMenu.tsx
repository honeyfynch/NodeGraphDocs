import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PinColorId } from './pinColors';
import {
  GRAPH_MENU_PANEL_W,
  GraphMenuColorFlyout,
  GraphMenuDivider,
  graphMenuFlyoutPanelStyle,
  graphMenuHotkeyStyle,
  GraphMenuRow,
  GraphMenuSubmenuChevron,
} from './graphMenuShared';

/** Figma `139:47569` node context menu — same shell tokens as graph menu (`138:46599`). */
export type NodeContextMenuProps = {
  open: boolean;
  position: {
    clientX: number;
    clientY: number;
    pasteOriginGraph: { x: number; y: number };
  } | null;
  onClose: () => void;
  hasClipboard: boolean;
  onSwapNode: (outputPinColor: PinColorId) => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: () => void;
  onFrameSelection: () => void;
  onGroup: () => void;
  onUngroup: () => void;
};

export function NodeContextMenu({
  open,
  position,
  onClose,
  hasClipboard,
  onSwapNode,
  onCut,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onRename,
  onFrameSelection,
  onGroup,
  onUngroup,
}: NodeContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const swapSubmenuRef = useRef<HTMLDivElement>(null);
  const [swapSubmenuOpen, setSwapSubmenuOpen] = useState(false);

  useEffect(() => {
    if (!open) setSwapSubmenuOpen(false);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !position || !ref.current) return;
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const pad = 8;
    const left = Math.max(pad, Math.min(position.clientX, window.innerWidth - w - pad));
    const top = Math.max(pad, Math.min(position.clientY, window.innerHeight - h - pad));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (swapSubmenuOpen) {
        setSwapSubmenuOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, swapSubmenuOpen]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (ref.current?.contains(t)) return;
      if (swapSubmenuRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDoc, true);
    return () => document.removeEventListener('mousedown', onDoc, true);
  }, [open, onClose]);

  if (!open || !position) return null;

  const pasteOff = !hasClipboard;

  return (
    <>
      <div
        ref={ref}
        role="menu"
        style={{
          position: 'fixed',
          left: position.clientX,
          top: position.clientY,
          zIndex: 1000,
          width: GRAPH_MENU_PANEL_W,
          ...graphMenuFlyoutPanelStyle,
        }}
      >
        <GraphMenuRow
          label="Open"
          trailing={<span style={graphMenuHotkeyStyle}>Double click</span>}
          disabled
        />
        <GraphMenuRow
          label="Swap node"
          trailing={<GraphMenuSubmenuChevron />}
          onClick={() => setSwapSubmenuOpen((o) => !o)}
        />
        <GraphMenuDivider />
        <GraphMenuRow
          label="Cut"
          trailing={<span style={graphMenuHotkeyStyle}>⌘X</span>}
          onClick={onCut}
        />
        <GraphMenuRow
          label="Copy"
          trailing={<span style={graphMenuHotkeyStyle}>⌘C</span>}
          onClick={onCopy}
        />
        <GraphMenuRow
          label="Paste"
          trailing={<span style={graphMenuHotkeyStyle}>⌘V</span>}
          disabled={pasteOff}
          onClick={onPaste}
        />
        <GraphMenuRow
          label="Duplicate"
          trailing={<span style={graphMenuHotkeyStyle}>⌘D</span>}
          onClick={onDuplicate}
        />
        <GraphMenuRow
          label="Delete"
          trailing={
            <span style={{ ...graphMenuHotkeyStyle, fontSize: 12, lineHeight: '12px' }}>⇐</span>
          }
          onClick={onDelete}
        />
        <GraphMenuRow
          label="Rename"
          trailing={
            <span style={{ ...graphMenuHotkeyStyle, fontSize: 12, lineHeight: '12px' }}>↵</span>
          }
          onClick={onRename}
        />
        <GraphMenuDivider />
        <GraphMenuRow
          label="Frame selection"
          trailing={<span style={graphMenuHotkeyStyle}>F</span>}
          onClick={onFrameSelection}
        />
        <GraphMenuRow
          label="Group selection"
          trailing={<span style={graphMenuHotkeyStyle}>⌘G</span>}
          onClick={onGroup}
        />
        <GraphMenuRow
          label="Ungroup selection"
          trailing={<span style={graphMenuHotkeyStyle}>⌘U</span>}
          onClick={onUngroup}
        />
      </div>

      <GraphMenuColorFlyout
        open={swapSubmenuOpen}
        sectionTitle="Swap node"
        mainMenuRef={ref}
        flyoutRef={swapSubmenuRef}
        menuPosition={position}
        onPickColor={(c) => {
          onSwapNode(c);
          setSwapSubmenuOpen(false);
          onClose();
        }}
      />
    </>
  );
}
