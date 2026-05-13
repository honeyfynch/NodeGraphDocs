import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { GraphWireColorId } from './pinColors';
import { GRAPH_NEW_PARAMETER_MENU_SECTION_TITLE } from './graphInsertNodeMenu';
import {
  GRAPH_MENU_PANEL_W,
  GraphMenuColorFlyout,
  GraphMenuDivider,
  GraphMenuInsertParameterFlyout,
  graphMenuFlyoutPanelStyle,
  graphMenuHotkeyStyle,
  GraphMenuRow,
  GraphMenuSubmenuChevron,
} from './graphMenuShared';

export type GraphContextMenuProps = {
  open: boolean;
  position: { clientX: number; clientY: number } | null;
  onClose: () => void;
  hasSelection: boolean;
  /** True after a successful Cut/Copy placed nodes in the graph clipboard. */
  hasClipboard: boolean;
  parametersEnabled: boolean;
  parameterRows: readonly { id: string; title: string }[];
  colorRows: readonly { label: string; colorId: GraphWireColorId }[];
  onInsertFunctionNode: (outputPinColor: GraphWireColorId) => void;
  onInsertParameterFromTemplate: (parameterId: string) => void;
  onInsertParameterNew: (outputPinColor: GraphWireColorId) => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: () => void;
  onFrameSelection: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  /** When set, bottom section includes mute/unmute for the current selection. */
  muteSelectionLabel?: string | null;
  onMuteSelection?: () => void;
  /** When true, Ungroup is inactive (no group node in the current selection). */
  ungroupDisabled?: boolean;
};

export function GraphContextMenu({
  open,
  position,
  onClose,
  hasSelection,
  hasClipboard,
  parametersEnabled,
  parameterRows,
  colorRows,
  onInsertFunctionNode,
  onInsertParameterFromTemplate,
  onInsertParameterNew,
  onCut,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onRename,
  onFrameSelection,
  onGroup,
  onUngroup,
  muteSelectionLabel,
  onMuteSelection,
  ungroupDisabled = false,
}: GraphContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const insertNodeFlyoutRef = useRef<HTMLDivElement>(null);
  const insertParamFlyoutRef = useRef<HTMLDivElement>(null);
  const insertNewParamColorFlyoutRef = useRef<HTMLDivElement>(null);
  const [insertNodeSubmenuOpen, setInsertNodeSubmenuOpen] = useState(false);
  const [insertParamSubmenuOpen, setInsertParamSubmenuOpen] = useState(false);
  const [insertNewParamColorSubmenuOpen, setInsertNewParamColorSubmenuOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setInsertNodeSubmenuOpen(false);
      setInsertParamSubmenuOpen(false);
      setInsertNewParamColorSubmenuOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!insertParamSubmenuOpen) setInsertNewParamColorSubmenuOpen(false);
  }, [insertParamSubmenuOpen]);

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
      if (e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('input, textarea, select, [contenteditable=true]')) return;

      if (e.key === 'Escape') {
        if (insertNodeSubmenuOpen) {
          setInsertNodeSubmenuOpen(false);
          return;
        }
        if (insertNewParamColorSubmenuOpen) {
          setInsertNewParamColorSubmenuOpen(false);
          return;
        }
        if (insertParamSubmenuOpen) {
          setInsertParamSubmenuOpen(false);
          return;
        }
        onClose();
        return;
      }

      if (
        (e.key === 'm' || e.key === 'M') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        muteSelectionLabel &&
        onMuteSelection &&
        hasSelection
      ) {
        e.preventDefault();
        onMuteSelection();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    open,
    onClose,
    insertNodeSubmenuOpen,
    insertParamSubmenuOpen,
    insertNewParamColorSubmenuOpen,
    muteSelectionLabel,
    onMuteSelection,
    hasSelection,
  ]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (ev: MouseEvent) => {
      const t = ev.target as Node;
      if (ref.current?.contains(t)) return;
      if (insertNodeFlyoutRef.current?.contains(t)) return;
      if (insertParamFlyoutRef.current?.contains(t)) return;
      if (insertNewParamColorFlyoutRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDoc, true);
    return () => document.removeEventListener('mousedown', onDoc, true);
  }, [open, onClose]);

  if (!open || !position) return null;

  const selOff = !hasSelection;
  const pasteOff = !hasClipboard;
  const ungroupOff = selOff || ungroupDisabled;

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
          label="Insert node"
          trailing={<GraphMenuSubmenuChevron />}
          onClick={() => {
            setInsertParamSubmenuOpen(false);
            setInsertNodeSubmenuOpen((o) => !o);
          }}
        />
        {parametersEnabled ? (
          <GraphMenuRow
            label="Insert parameter"
            trailing={<GraphMenuSubmenuChevron />}
            onClick={() => {
              setInsertNodeSubmenuOpen(false);
              setInsertParamSubmenuOpen((o) => !o);
            }}
          />
        ) : null}
        <GraphMenuDivider />
        <GraphMenuRow
          label="Cut"
          trailing={<span style={graphMenuHotkeyStyle}>⌘X</span>}
          disabled={selOff}
          onClick={onCut}
        />
        <GraphMenuRow
          label="Copy"
          trailing={<span style={graphMenuHotkeyStyle}>⌘C</span>}
          disabled={selOff}
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
          disabled={selOff}
          onClick={onDuplicate}
        />
        <GraphMenuRow
          label="Delete"
          trailing={
            <span style={{ ...graphMenuHotkeyStyle, fontSize: 12, lineHeight: '12px' }}>⇐</span>
          }
          disabled={selOff}
          onClick={onDelete}
        />
        <GraphMenuRow
          label="Rename"
          trailing={
            <span style={{ ...graphMenuHotkeyStyle, fontSize: 12, lineHeight: '12px' }}>↵</span>
          }
          disabled={selOff}
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
          disabled={selOff}
          onClick={onGroup}
        />
        <GraphMenuRow
          label="Ungroup selection"
          trailing={<span style={graphMenuHotkeyStyle}>⌘U</span>}
          disabled={ungroupOff}
          onClick={onUngroup}
        />
        {muteSelectionLabel ? (
          <GraphMenuRow
            label={muteSelectionLabel}
            trailing={<span style={graphMenuHotkeyStyle}>M</span>}
            disabled={selOff}
            onClick={onMuteSelection}
          />
        ) : null}
      </div>

      <GraphMenuColorFlyout
        open={insertNodeSubmenuOpen}
        sectionTitle="Insert node"
        mainMenuRef={ref}
        flyoutRef={insertNodeFlyoutRef}
        menuPosition={position}
        colorRows={colorRows}
        onPickColor={(c) => {
          onInsertFunctionNode(c);
          setInsertNodeSubmenuOpen(false);
        }}
      />

      <GraphMenuInsertParameterFlyout
        open={insertParamSubmenuOpen}
        mainMenuRef={ref}
        flyoutRef={insertParamFlyoutRef}
        menuPosition={position}
        parameterRows={parameterRows}
        onPickExisting={(parameterId) => {
          onInsertParameterFromTemplate(parameterId);
          setInsertParamSubmenuOpen(false);
        }}
        onNewParameter={() => setInsertNewParamColorSubmenuOpen(true)}
      />

      <GraphMenuColorFlyout
        open={insertNewParamColorSubmenuOpen}
        sectionTitle={GRAPH_NEW_PARAMETER_MENU_SECTION_TITLE}
        mainMenuRef={insertParamFlyoutRef}
        flyoutRef={insertNewParamColorFlyoutRef}
        menuPosition={position}
        colorRows={colorRows}
        onPickColor={(c) => {
          onInsertParameterNew(c);
          setInsertNewParamColorSubmenuOpen(false);
          setInsertParamSubmenuOpen(false);
        }}
      />
    </>
  );
}
