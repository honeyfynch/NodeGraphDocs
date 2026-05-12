import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import chevronCollapsedUrl from '../assets/icons/node-header-chevron-collapsed.svg?url';
import chevronExpandedUrl from '../assets/icons/node-header-chevron-expanded.svg?url';
import { GRAPH_NEW_PARAMETER_MENU_SECTION_TITLE } from './graphInsertNodeMenu';
import { GraphMenuColorFlyout } from './graphMenuShared';
import { graphInsertNodeSubmenuRows } from './graphInsertNodeMenu';
import { HEADER_H, ROW_H } from './geometry';
import { useGraph } from './GraphContext';
import type { GraphWireColorId } from './pinColors';
import type { ParameterNode } from './types';

const PANEL_W = 200;

/** Figma node `80:68682` — match `EditableNodeTitle` focus ring. */
const FOCUS_RING = '2px solid rgb(51, 95, 255)';
const FOCUS_RADIUS = 2;
const FOCUS_MIN_H = 24;
const FOCUS_PAD_X = 4;

function ParameterPlusIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 3v10M3 8h10"
        stroke="var(--studio-content-emphasis)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

type InlineEditProps = {
  value: string;
  onCommit: (next: string) => void;
  variant: 'label' | 'value';
  ariaLabel: string;
};

/**
 * Double-click to edit; commit on Enter or blur; Escape cancels.
 * Idle state is plain text (no `TextInput` chrome), like `EditableNodeTitle`.
 */
function ParameterPanelInlineEdit({ value, onCommit, variant, ariaLabel }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurCommitRef = useRef(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (!editing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [editing]);

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skipBlurCommitRef.current = true;
        setDraft(value);
        setEditing(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, value]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    const next = variant === 'label' ? trimmed || value : trimmed;
    onCommit(next);
    setEditing(false);
  }, [draft, value, onCommit, variant]);

  const labelIdle = {
    fontFamily: 'var(--alpha-font-family)',
    fontSize: 'var(--alpha-text-labelsmall-font-size)',
    lineHeight: 'var(--alpha-text-labelsmall-line-height)',
    letterSpacing: 'var(--alpha-text-labelsmall-letter-spacing)',
    fontWeight: 600,
    color: 'var(--studio-content-emphasis)',
  };

  const valueIdle = {
    fontFamily: 'var(--alpha-font-family)',
    fontSize: 'var(--alpha-text-bodysmall-font-size)',
    lineHeight: 1.4,
    letterSpacing: 'var(--alpha-text-bodysmall-letter-spacing)',
    fontWeight: 400,
    color: 'var(--studio-content-default)',
  };

  const inputFont =
    variant === 'label'
      ? {
          fontSize: 'var(--alpha-text-labelsmall-font-size)',
          lineHeight: 'var(--alpha-text-labelsmall-line-height)',
          letterSpacing: 'var(--alpha-text-labelsmall-letter-spacing)',
          fontWeight: 'var(--alpha-text-labelsmall-font-weight)',
        }
      : {
          fontSize: 'var(--alpha-text-bodysmall-font-size)',
          lineHeight: 1.4,
          letterSpacing: 'var(--alpha-text-bodysmall-letter-spacing)',
          fontWeight: 400,
        };

  const inputColor =
    variant === 'label' ? 'var(--studio-content-emphasis)' : 'var(--studio-content-default)';

  return (
    <div
      style={{
        minHeight: FOCUS_MIN_H,
        display: 'flex',
        alignItems: 'center',
        minWidth: 0,
        flex: '1 1 0',
      }}
    >
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          className="w-full min-w-0 truncate"
          value={draft}
          aria-label={ariaLabel}
          style={{
            boxSizing: 'border-box',
            border: FOCUS_RING,
            borderRadius: FOCUS_RADIUS,
            minHeight: FOCUS_MIN_H,
            padding: `0 ${FOCUS_PAD_X}px`,
            fontFamily: 'var(--alpha-font-family)',
            ...inputFont,
            color: inputColor,
            background: 'transparent',
            outline: 'none',
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (skipBlurCommitRef.current) {
              skipBlurCommitRef.current = false;
              return;
            }
            commit();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
        />
      ) : (
        <span
          role="presentation"
          className="truncate"
          style={{
            ...(variant === 'label' ? labelIdle : valueIdle),
            cursor: 'text',
            display: 'inline-block',
            maxWidth: '100%',
            verticalAlign: 'middle',
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDraft(value);
            setEditing(true);
          }}
        >
          {value}
        </span>
      )}
    </div>
  );
}

const panelCardStyle = {
  boxSizing: 'border-box' as const,
  borderRadius: 'var(--studio-radius-panel)',
  borderWidth: 1,
  borderStyle: 'solid' as const,
  borderColor: 'var(--studio-stroke)',
  background: 'var(--studio-surface-200)',
  boxShadow:
    '0px 2px 4px rgba(4, 4, 8, 0.25), 0px 10px 20px rgba(4, 4, 8, 0.25), 0px 16px 32px rgba(4, 4, 8, 0.25)',
  fontFamily: 'var(--alpha-font-family)',
  overflow: 'hidden' as const,
};

/** Figma `132:9384` — pinned top-left of graph viewport; new-parameter palette `145:32069`. */
export function GraphParameterPanel() {
  const { state, dispatch } = useGraph();
  const expanded = state.parameterPanelExpanded;
  const parameters = useMemo(
    () => state.nodes.filter((n): n is ParameterNode => n.kind === 'parameter'),
    [state.nodes]
  );
  const insertNodeColorRows = useMemo(
    () => graphInsertNodeSubmenuRows(state.extendedPalette),
    [state.extendedPalette]
  );

  const panelWrapRef = useRef<HTMLDivElement>(null);
  const newParamColorFlyoutRef = useRef<HTMLDivElement>(null);
  const [newParamColorMenuOpen, setNewParamColorMenuOpen] = useState(false);

  const closeColorMenu = useCallback(() => setNewParamColorMenuOpen(false), []);

  useEffect(() => {
    if (!newParamColorMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeColorMenu();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [newParamColorMenuOpen, closeColorMenu]);

  useEffect(() => {
    if (!newParamColorMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelWrapRef.current?.contains(t)) return;
      if (newParamColorFlyoutRef.current?.contains(t)) return;
      closeColorMenu();
    };
    document.addEventListener('mousedown', onDoc, true);
    return () => document.removeEventListener('mousedown', onDoc, true);
  }, [newParamColorMenuOpen, closeColorMenu]);

  const dispatchNewParameter = useCallback(
    (outputPinColor: GraphWireColorId) => {
      const last = parameters[parameters.length - 1];
      const gx = last ? last.x + 120 : 80;
      const gy = last ? last.y + 56 : 200;
      dispatch({
        type: 'addParameter',
        graphX: gx,
        graphY: gy,
        mode: 'new',
        outputPinColor,
      });
    },
    [dispatch, parameters]
  );

  return (
    <div
      ref={panelWrapRef}
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 25,
        width: PANEL_W,
        pointerEvents: 'auto',
      }}
    >
      <div style={panelCardStyle}>
        <div
          style={{
            minHeight: HEADER_H,
            boxSizing: 'border-box',
            paddingLeft: 4,
            paddingRight: 8,
            paddingTop: 0,
            paddingBottom: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--foundation-gap-medium)',
          }}
        >
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => dispatch({ type: 'toggleParameterPanelExpanded' })}
            style={{
              width: 24,
              height: 24,
              padding: 0,
              border: 'none',
              margin: 0,
              background: 'transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <img
              src={expanded ? chevronExpandedUrl : chevronCollapsedUrl}
              width={12}
              height={12}
              alt=""
              draggable={false}
              style={{ display: 'block' }}
            />
          </button>
          <span
            className="truncate text-emphasis"
            style={{
              flex: '1 1 0',
              minWidth: 0,
              fontSize: 'var(--alpha-text-bodysmall-font-size)',
              lineHeight: 1.4,
              letterSpacing: 'var(--alpha-text-bodysmall-letter-spacing)',
              fontWeight: 600,
            }}
          >
            Parameters
          </span>
          <button
            type="button"
            onClick={() => setNewParamColorMenuOpen((o) => !o)}
            title="Add parameter"
            aria-expanded={newParamColorMenuOpen}
            aria-haspopup="menu"
            style={{
              width: 24,
              height: 24,
              padding: 0,
              border: 'none',
              margin: 0,
              background: 'transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ParameterPlusIcon />
          </button>
        </div>

        {expanded ? (
          <div
            style={{
              padding: `var(--foundation-padding-xsmall) 0`,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--foundation-gap-xxsmall)',
              maxHeight: 320,
              overflowY: 'auto',
            }}
          >
            {parameters.map((p) => (
              <div
                key={p.id}
                style={{
                  minHeight: ROW_H,
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: `0 var(--foundation-padding-small)`,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 'var(--foundation-gap-xsmall)',
                }}
              >
                <ParameterPanelInlineEdit
                  variant="label"
                  ariaLabel="Parameter name"
                  value={p.title}
                  onCommit={(title) =>
                    dispatch({
                      type: 'updateParameter',
                      id: p.id,
                      patch: { title },
                    })
                  }
                />
                <ParameterPanelInlineEdit
                  variant="value"
                  ariaLabel="Parameter value"
                  value={p.parameterValue ?? ''}
                  onCommit={(parameterValue) =>
                    dispatch({
                      type: 'updateParameter',
                      id: p.id,
                      patch: { parameterValue },
                    })
                  }
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <GraphMenuColorFlyout
        open={newParamColorMenuOpen}
        sectionTitle={GRAPH_NEW_PARAMETER_MENU_SECTION_TITLE}
        mainMenuRef={panelWrapRef}
        flyoutRef={newParamColorFlyoutRef}
        menuPosition={null}
        colorRows={insertNodeColorRows}
        onPickColor={(c) => {
          dispatchNewParameter(c);
          closeColorMenu();
        }}
      />
    </div>
  );
}
