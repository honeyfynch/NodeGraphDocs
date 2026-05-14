import clsx from 'clsx';
import type { CSSProperties, ReactNode } from 'react';
import type { FrameVariant } from './types';
import type { GraphPinStyleId } from './geometry';
import {
  HEADER_H,
  NODE_GRAPH_RIGHT_EXPAND_CHEVRON_BUTTON_RIGHT_PX,
  NODE_GRAPH_RIGHT_EXPAND_TITLE_PAD_RIGHT_PX,
  NODE_ROW_PIN_CENTER_Y_OFFSET,
  NODE_SHELL_HEADER_PADDING_LEFT_PX,
  PIN_OFFSET,
  nodeHeaderTitleExtraPadLeftWhenRightChevron,
} from './geometry';
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
  /** When set, replaces default `var(--studio-surface-200)` for the expanded body shell. */
  bodyBackgroundOverride?: string;
  /** Outer card + header/body corner radius (px). Default `4` matches standard nodes; Generate uses `8`. */
  cardBorderRadius?: number;
  selected: boolean;
  width: number;
  expanded: boolean;
  onToggleExpand: () => void;
  /** Extra controls on the left of the title (e.g. collapsed output input pin). */
  headerLeading?: ReactNode;
  /** Extra controls on the right of the title (e.g. collapsed parameter output pin). */
  headerTrailing?: ReactNode;
  /**
   * CSS `right` (px) for the header trailing pin wrapper — negative extends past the header’s inner
   * right edge (default `-PIN_OFFSET` / classic).
   */
  headerTrailingRightCss?: number;
  /**
   * z-index for the header trailing pin slot (default `2`). Orbit pins overlap horizontal resize bands
   * (`z-index` 4) — pass {@link GRAPH_ORBIT_PIN_ABOVE_RESIZE_Z_INDEX} from `geometry.ts` when using orbit.
   */
  headerTrailingZIndex?: number;
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
  /**
   * When false, header expand/collapse chevron is omitted (context toolbar handles expand).
   * Default true.
   */
  showExpandChevron?: boolean;
  /**
   * When true (default), expand/collapse chevron sits on the trailing side of the header (before the
   * absolute output pin). When false, chevron stays on the leading edge. Ignored when
   * `showExpandChevron` is false.
   */
  rightAlignedChevron?: boolean;
  /**
   * Pin styling for row padding contract — when {@link rightAlignedChevron} is true, title text is
   * inset to align with `.NodeRow` property labels.
   */
  pinStyle?: GraphPinStyleId;
};

export function NodeShell({
  title,
  titleContent,
  frameVariant,
  headerFillOverride,
  bodyBackgroundOverride,
  cardBorderRadius = 4,
  selected,
  width,
  expanded,
  onToggleExpand,
  headerLeading,
  headerTrailing,
  headerTrailingRightCss = -PIN_OFFSET,
  headerTrailingZIndex = 2,
  children,
  collapsedBody,
  onHeaderDragPointerDown,
  onBackgroundPointerDown,
  dimHeaderChrome,
  showExpandChevron = true,
  rightAlignedChevron = true,
  pinStyle = 'classic',
}: Props) {
  const bodyContent = expanded ? children : collapsedBody;
  const showBody =
    bodyContent != null &&
    bodyContent !== false &&
    !(Array.isArray(bodyContent) && bodyContent.length === 0);

  const headerBgBase = headerFillOverride ?? (headerStyle(frameVariant).background as string);
  const headerBackground =
    dimHeaderChrome && headerBgBase ? translucentFill50(headerBgBase) : headerBgBase;
  const bodyFillBase = bodyBackgroundOverride ?? 'var(--studio-surface-200)';
  const bodyBackground =
    dimHeaderChrome && bodyFillBase ? translucentFill50(bodyFillBase) : bodyFillBase;
  const headerChromeOpacity = dimHeaderChrome ? 0.5 : 1;
  const r = cardBorderRadius;
  const showLeftChevron = showExpandChevron && !rightAlignedChevron;
  const showRightChevron = showExpandChevron && rightAlignedChevron;
  const headerContentLeftPadPx = showLeftChevron
    ? NODE_SHELL_HEADER_PADDING_LEFT_PX
    : 8;
  const titleExtraPadLeftWhenRightChevron = showRightChevron
    ? nodeHeaderTitleExtraPadLeftWhenRightChevron(pinStyle, headerContentLeftPadPx)
    : 0;
  const headerPadRight = headerTrailing != null ? 14 : 8;

  const chevronFlexStyle: CSSProperties = {
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
  };

  const chevronAbsoluteStyle: CSSProperties = {
    ...chevronFlexStyle,
    position: 'absolute',
    right: NODE_GRAPH_RIGHT_EXPAND_CHEVRON_BUTTON_RIGHT_PX,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 3,
  };

  const chevronButton = (style: CSSProperties) => (
    <button
      type="button"
      className="studio-node-chevron"
      aria-expanded={expanded}
      aria-label={expanded ? 'Collapse node' : 'Expand node'}
      style={style}
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
  );

  return (
    <div
      className={clsx(
        'studio-node-card',
        selected && 'studio-node-card--selected'
      )}
      style={{
        width,
        borderRadius: r,
        overflow: 'visible',
        position: 'relative',
      }}
      onPointerDown={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest?.('[data-studio-header]')) return;
        /*
         * Radix Select trigger + node property shells live in the body, not the header. Without
         * these guards, pointerdown bubbles here and runs `onBackgroundPointerDown` (node select),
         * which races Radix and breaks opening/picking dropdown options on the graph.
         */
        if (t.closest?.('.select-root-wrap')) return;
        if (t.closest?.('.node-property-content-area')) return;
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
          /** Lock height so body + input pins stay aligned with `pinGraphPosition` / `HEADER_H`. */
          height: HEADER_H,
          borderRadius: showBody ? `${r}px ${r}px 0 0` : r,
          boxSizing: 'border-box',
          paddingLeft: showLeftChevron ? NODE_SHELL_HEADER_PADDING_LEFT_PX : 8,
          paddingRight: headerPadRight,
        }}
      >
        {showLeftChevron ? chevronButton(chevronFlexStyle) : null}
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
            paddingLeft: titleExtraPadLeftWhenRightChevron,
            paddingRight: showRightChevron
              ? NODE_GRAPH_RIGHT_EXPAND_TITLE_PAD_RIGHT_PX
              : headerTrailing != null
                ? 4
                : 0,
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
        {showRightChevron ? chevronButton(chevronAbsoluteStyle) : null}
        {headerTrailing ? (
          <div
            style={{
              position: 'absolute',
              right: headerTrailingRightCss,
              top: `calc(50% + ${NODE_ROW_PIN_CENTER_Y_OFFSET}px)`,
              transform: 'translateY(-50%)',
              zIndex: headerTrailingZIndex,
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
            borderRadius: `0 0 ${r}px ${r}px`,
            borderTop: 'none',
          }}
        >
          {bodyContent}
        </div>
      ) : null}
    </div>
  );
}
