import { useLayoutEffect, type CSSProperties, type ReactNode, type RefObject } from 'react';
import chevronCollapsedUrl from '../assets/icons/node-header-chevron-collapsed.svg?url';
import type { GraphWireColorId } from './pinColors';
import { GRAPH_INSERT_NODE_SUBMENU_W, GRAPH_NEW_PARAMETER_MENU_SECTION_TITLE } from './graphInsertNodeMenu';

/** Figma graph / node context menus — width 260. */
export const GRAPH_MENU_PANEL_W = 260;
export const ROW_MIN_H = 25;
export const RADIUS_PANEL = 8;
export const RADIUS_ROW = 4;

export const graphMenuRowLabel: CSSProperties = {
  fontFamily: 'var(--alpha-font-family)',
  fontSize: 'var(--alpha-text-bodysmall-font-size)',
  lineHeight: 1.4,
  letterSpacing: 'var(--alpha-text-bodysmall-letter-spacing)',
  fontWeight: 400,
  color: 'var(--studio-content-emphasis)',
};

export const graphMenuHotkeyStyle: CSSProperties = {
  fontFamily: 'var(--alpha-font-family)',
  fontSize: 'var(--alpha-text-bodysmall-font-size)',
  lineHeight: 1,
  fontWeight: 400,
  color: 'var(--studio-content-muted)',
  whiteSpace: 'nowrap',
};

export const GRAPH_MENU_SHADOW =
  '0px 2px 4px rgba(4, 4, 8, 0.25), 0px 10px 20px rgba(4, 4, 8, 0.25), 0px 16px 32px rgba(4, 4, 8, 0.25)';

/** Figma `.MenuSectionTitle` (e.g. `139:47052`, `139:47569`). */
const SUBMENU_SECTION_TITLE_MIN_H = 24;
export const graphMenuSubmenuSectionTitleStyle: CSSProperties = {
  fontFamily: 'var(--alpha-font-family)',
  fontSize: 10,
  lineHeight: 1.4,
  fontWeight: 600,
  letterSpacing: 0,
  color: 'var(--studio-content-default)',
  padding: `0 var(--foundation-padding-medium)`,
  minHeight: SUBMENU_SECTION_TITLE_MIN_H,
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
};

export const graphMenuFlyoutPanelStyle: CSSProperties = {
  boxSizing: 'border-box',
  padding: 'var(--foundation-padding-small)',
  gap: 'var(--foundation-gap-xxsmall)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  borderRadius: RADIUS_PANEL,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'var(--studio-stroke)',
  background: 'var(--studio-surface-200)',
  boxShadow: GRAPH_MENU_SHADOW,
  fontFamily: 'var(--alpha-font-family)',
};

export function GraphMenuSubmenuChevron() {
  return (
    <span
      style={{
        width: 16,
        height: 16,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <img
        src={chevronCollapsedUrl}
        width={12}
        height={12}
        alt=""
        draggable={false}
        style={{ display: 'block' }}
      />
    </span>
  );
}

export function GraphMenuDivider() {
  return (
    <div
      style={{
        width: '100%',
        padding: '4px 0',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ height: 1, background: 'var(--studio-stroke)' }} />
    </div>
  );
}

type MenuRowProps = {
  label: string;
  trailing?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

export function GraphMenuRow({ label, trailing, disabled, onClick }: MenuRowProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick?.();
      }}
      style={{
        width: '100%',
        minHeight: ROW_MIN_H,
        boxSizing: 'border-box',
        padding: `var(--foundation-padding-xsmall) var(--foundation-padding-medium)`,
        borderRadius: RADIUS_ROW,
        border: 'none',
        margin: 0,
        background: 'transparent',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--foundation-gap-medium)',
        opacity: disabled ? 0.5 : 1,
        textAlign: 'left',
      }}
    >
      <span className="truncate" style={{ ...graphMenuRowLabel, flex: '1 1 0', minWidth: 0 }}>
        {label}
      </span>
      {trailing ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexShrink: 0,
            minHeight: 16,
          }}
        >
          {trailing}
        </div>
      ) : null}
    </button>
  );
}

export function GraphMenuSubmenuSectionTitle({ title }: { title: string }) {
  return (
    <div style={graphMenuSubmenuSectionTitleStyle} className="truncate">
      {title}
    </div>
  );
}

/** Color list flyout — Figma `139:47052`; anchored to main menu top-right (`mainMenuRef`). */
export function GraphMenuColorFlyout({
  open,
  sectionTitle,
  mainMenuRef,
  flyoutRef,
  menuPosition,
  colorRows,
  onPickColor,
}: {
  open: boolean;
  sectionTitle: string;
  mainMenuRef: RefObject<HTMLDivElement | null>;
  flyoutRef: RefObject<HTMLDivElement | null>;
  /** When the main menu is repositioned, pass updated coords so this flyout reclamps. */
  menuPosition: { clientX: number; clientY: number } | null;
  colorRows: readonly { label: string; colorId: GraphWireColorId }[];
  onPickColor: (color: GraphWireColorId) => void;
}) {
  useLayoutEffect(() => {
    if (!open || !mainMenuRef.current || !flyoutRef.current) return;
    const main = mainMenuRef.current.getBoundingClientRect();
    const subEl = flyoutRef.current;
    const w = subEl.offsetWidth;
    const h = subEl.offsetHeight;
    const pad = 8;
    let left = main.right;
    let top = main.top;
    if (left + w > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - w - pad);
    }
    if (top + h > window.innerHeight - pad) {
      top = Math.max(pad, window.innerHeight - h - pad);
    }
    if (top < pad) top = pad;
    if (left < pad) left = pad;
    subEl.style.left = `${left}px`;
    subEl.style.top = `${top}px`;
  }, [open, sectionTitle, menuPosition?.clientX, menuPosition?.clientY, mainMenuRef, flyoutRef, colorRows]);

  if (!open) return null;

  return (
    <div
      ref={flyoutRef}
      role="menu"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 1001,
        width: GRAPH_INSERT_NODE_SUBMENU_W,
        ...graphMenuFlyoutPanelStyle,
      }}
    >
      <GraphMenuSubmenuSectionTitle title={sectionTitle} />
      {colorRows.map((row) => (
        <GraphMenuRow
          key={row.colorId}
          label={row.label}
          onClick={() => onPickColor(row.colorId)}
        />
      ))}
    </div>
  );
}

/** Graph menu → Insert parameter: list existing parameters + New parameter (Figma `132:9384`). */
export function GraphMenuInsertParameterFlyout({
  open,
  mainMenuRef,
  flyoutRef,
  menuPosition,
  parameterRows,
  onPickExisting,
  onNewParameter,
}: {
  open: boolean;
  mainMenuRef: RefObject<HTMLDivElement | null>;
  flyoutRef: RefObject<HTMLDivElement | null>;
  menuPosition: { clientX: number; clientY: number } | null;
  parameterRows: readonly { id: string; title: string }[];
  onPickExisting: (parameterId: string) => void;
  onNewParameter: () => void;
}) {
  useLayoutEffect(() => {
    if (!open || !mainMenuRef.current || !flyoutRef.current) return;
    const main = mainMenuRef.current.getBoundingClientRect();
    const subEl = flyoutRef.current;
    const w = subEl.offsetWidth;
    const h = subEl.offsetHeight;
    const pad = 8;
    let left = main.right;
    let top = main.top;
    if (left + w > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - w - pad);
    }
    if (top + h > window.innerHeight - pad) {
      top = Math.max(pad, window.innerHeight - h - pad);
    }
    if (top < pad) top = pad;
    if (left < pad) left = pad;
    subEl.style.left = `${left}px`;
    subEl.style.top = `${top}px`;
  }, [open, menuPosition?.clientX, menuPosition?.clientY, mainMenuRef, flyoutRef]);

  if (!open) return null;

  return (
    <div
      ref={flyoutRef}
      role="menu"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 1001,
        width: GRAPH_MENU_PANEL_W,
        ...graphMenuFlyoutPanelStyle,
      }}
    >
      <GraphMenuSubmenuSectionTitle title="Insert parameter" />
      {parameterRows.map((row) => (
        <GraphMenuRow
          key={row.id}
          label={row.title}
          onClick={() => onPickExisting(row.id)}
        />
      ))}
      <GraphMenuDivider />
      <GraphMenuRow label={GRAPH_NEW_PARAMETER_MENU_SECTION_TITLE} onClick={onNewParameter} />
    </div>
  );
}
