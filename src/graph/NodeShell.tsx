import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { FrameVariant } from './types';
import { HEADER_H, PIN_OFFSET } from './geometry';
import { translucentFill50 } from './disabledVisual';
import chevronCollapsedUrl from '../assets/icons/node-header-chevron-collapsed.svg?url';
import chevronExpandedUrl from '../assets/icons/node-header-chevron-expanded.svg?url';

function headerStyle(v: FrameVariant): React.CSSProperties {
  switch (v) {
    case 'emphasis':
      return { background: 'var(--studio-header-emphasis)' };
    case 'muted':
      return { background: 'var(--studio-header-muted)' };
    default:
      return { background: 'var(--studio-header-neutral)' };
  }
}

type Props = {
  title: string;
  /** When set, replaces the default title span (e.g. in-place editable title). */
  titleContent?: ReactNode;
  frameVariant: FrameVariant;
  /** When set, overrides `frameVariant` for header fill (Figma Node `*_600` header vs `*_1000` pin). */
  headerFillOverride?: string;
  selected: boolean;
  width: number;
  expanded: boolean;
  onToggleExpand: () => void;
  /** Extra controls on the left of the title (e.g. collapsed output input pin). */
  headerLeading?: ReactNode;
  /** Extra controls on the right of the title (e.g. collapsed parameter output pin). */
  headerTrailing?: ReactNode;
  /** Body when expanded. */
  children: ReactNode;
  /** Body when collapsed (optional extra strip below the header). */
  collapsedBody?: ReactNode;
  onHeaderDragPointerDown: (e: React.PointerEvent) => void;
  onBackgroundPointerDown?: (e: React.PointerEvent) => void;
  /**
   * When true, header/body fills use 50% `color-mix`; chevron, title row, leading, and output pin
   * use `opacity: 0.5`.
   */
  dimHeaderChrome?: boolean;
};

export function NodeShell({
  title,
  titleContent,
  frameVariant,
  headerFillOverride,
  selected,
  width,
  expanded,
  onToggleExpand,
  headerLeading,
  headerTrailing,
  children,
  collapsedBody,
  onHeaderDragPointerDown,
  onBackgroundPointerDown,
  dimHeaderChrome,
}: Props) {
  const bodyContent = expanded ? children : collapsedBody;
  const showBody =
    bodyContent != null &&
    bodyContent !== false &&
    !(Array.isArray(bodyContent) && bodyContent.length === 0);

  const headerBgBase = headerFillOverride ?? (headerStyle(frameVariant).background as string);
  const headerBackground =
    dimHeaderChrome && headerBgBase ? translucentFill50(headerBgBase) : headerBgBase;
  const bodyBackground = dimHeaderChrome
    ? translucentFill50('var(--studio-surface-200)')
    : 'var(--studio-surface-200)';
  const headerChromeOpacity = dimHeaderChrome ? 0.5 : 1;

  return (
    <div
      className={clsx(
        'studio-node-card',
        selected && 'studio-node-card--selected'
      )}
      style={{
        width,
        borderRadius: 4,
        overflow: 'visible',
        position: 'relative',
      }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest?.('[data-studio-header]')) return;
        onBackgroundPointerDown?.(e);
      }}
    >
      <div
        data-studio-header
        className="studio-node-header flex-row items-center gap-sm text-sm text-emphasis"
        style={{
          background: headerBackground,
          position: 'relative',
          minHeight: HEADER_H,
          borderRadius: showBody ? '4px 4px 0 0' : 4,
          boxSizing: 'border-box',
          paddingLeft: 4,
          paddingRight: headerTrailing != null ? 14 : 8,
        }}
      >
        <button
          type="button"
          className="studio-node-chevron"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse node' : 'Expand node'}
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
            opacity: headerChromeOpacity,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
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
        {headerLeading ? (
          <div
            className="shrink-0 flex-row items-center"
            style={{ opacity: headerChromeOpacity }}
          >
            {headerLeading}
          </div>
        ) : null}
        <div
          className={clsx('flex-1 min-w-0 flex-row items-center')}
          style={{
            cursor: 'grab',
            minHeight: HEADER_H,
            paddingRight: headerTrailing != null ? 4 : 0,
            opacity: headerChromeOpacity,
          }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest?.('[data-studio-editable-title]')) return;
            e.stopPropagation();
            onHeaderDragPointerDown(e);
          }}
        >
          {titleContent ?? <span className="font-semibold truncate">{title}</span>}
        </div>
        {headerTrailing ? (
          <div
            style={{
              position: 'absolute',
              right: -PIN_OFFSET,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              opacity: headerChromeOpacity,
            }}
          >
            {headerTrailing}
          </div>
        ) : null}
      </div>
      {showBody ? (
        <div
          className="studio-node-body"
          style={{
            background: bodyBackground,
            padding: 0,
            borderRadius: '0 0 4px 4px',
            borderTop: 'none',
          }}
        >
          {bodyContent}
        </div>
      ) : null}
    </div>
  );
}
