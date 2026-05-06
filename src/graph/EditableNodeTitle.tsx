import { useCallback, useEffect, useRef, useState } from 'react';

const DRAG_THRESHOLD_PX = 6;

/** Figma node `80:68682` — focused header TextInput `ContentArea` (system emphasis ring). */
const FOCUS_RING = '2px solid rgb(51, 95, 255)';
const FOCUS_RADIUS = 2;
const FOCUS_MIN_H = 24;
const FOCUS_PAD_X = 4;

type Props = {
  value: string;
  onCommit: (next: string) => void;
  /** Start canvas node drag using pointer-down coordinates (for grab offset). */
  onTitleDragStart: (startClient: {
    clientX: number;
    clientY: number;
    shiftKey?: boolean;
  }) => void;
};

/**
 * Double-click to edit. Commit on Enter or blur; Escape cancels.
 * Drag with movement > threshold calls `onTitleDragStart` (Figma header title + node drag).
 */
export function EditableNodeTitle({ value, onCommit, onTitleDragStart }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const removeDragListenersRef = useRef<(() => void) | null>(null);
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

  useEffect(
    () => () => {
      removeDragListenersRef.current?.();
    },
    []
  );

  const commit = useCallback(() => {
    const next = draft.trim() || value;
    onCommit(next);
    setEditing(false);
  }, [draft, value, onCommit]);

  const onDisplayPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const grabClientX = e.clientX;
      const grabClientY = e.clientY;
      let moved = false;
      const cleanup = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        removeDragListenersRef.current = null;
      };
      const move = (ev: PointerEvent) => {
        if (moved) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (dx * dx + dy * dy >= DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
          moved = true;
          onTitleDragStart({
            clientX: grabClientX,
            clientY: grabClientY,
            shiftKey: e.shiftKey,
          });
          cleanup();
        }
      };
      const up = () => cleanup();
      removeDragListenersRef.current = cleanup;
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    },
    [onTitleDragStart]
  );

  const idleTypography = {
    fontFamily: 'var(--alpha-font-family)',
    fontSize: 'var(--alpha-text-labelsmall-font-size)',
    lineHeight: 'var(--alpha-text-labelsmall-line-height)',
    letterSpacing: 'var(--alpha-text-labelsmall-letter-spacing)',
    fontWeight: 600,
    color: 'var(--studio-content-emphasis)',
  };

  return (
    <div
      data-studio-editable-title
      className="min-w-0 flex-1"
      style={{
        minHeight: FOCUS_MIN_H,
        display: 'flex',
        alignItems: 'center',
        /** Let clicks on empty title lane reach the header node-drag handler; only the text/input is hit-targetable. */
        pointerEvents: 'none',
      }}
    >
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          className="studio-editable-title-input w-full min-w-0"
          value={draft}
          aria-label="Node title"
          style={{
            boxSizing: 'border-box',
            border: FOCUS_RING,
            borderRadius: FOCUS_RADIUS,
            minHeight: FOCUS_MIN_H,
            padding: `0 ${FOCUS_PAD_X}px`,
            fontFamily: 'var(--alpha-font-family)',
            fontSize: 'var(--alpha-text-labelsmall-font-size)',
            lineHeight: 'var(--alpha-text-labelsmall-line-height)',
            letterSpacing: 'var(--alpha-text-labelsmall-letter-spacing)',
            fontWeight: 'var(--alpha-text-labelsmall-font-weight)',
            color: 'var(--studio-content-emphasis)',
            background: 'transparent',
            outline: 'none',
            pointerEvents: 'auto',
          }}
          onPointerDown={(e) => e.stopPropagation()}
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
            ...idleTypography,
            cursor: 'text',
            display: 'inline-block',
            maxWidth: '100%',
            verticalAlign: 'middle',
            pointerEvents: 'auto',
          }}
          onPointerDown={onDisplayPointerDown}
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
