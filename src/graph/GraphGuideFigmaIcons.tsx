import type { ReactNode } from 'react';

/**
 * Icons from Figma Node Graph Draft `133:7964` (Figma Desktop `get_design_context` asset hashes).
 * Vector paths are duplicated in `src/graph/assets/guide/*.svg` for design exports; keep in sync.
 * Render at 11×14 inside a 16×16 accessory box per Foundation `AccessorySize` 16.
 */
const ICON_BOX = 16;
const VW = 11;
const VH = 14;

function IconWrap({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        width: ICON_BOX,
        height: ICON_BOX,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: 'var(--studio-content-emphasis)',
      }}
    >
      <span style={{ width: VW, height: VH, display: 'block', lineHeight: 0 }}>{children}</span>
    </span>
  );
}

/** @uiblox.icons/controls/mouse/scroll — used for Pan, Drag pan, Zoom rows. */
export function GuideIconMouseScroll() {
  return (
    <IconWrap>
      <svg width={VW} height={VH} viewBox="0 0 11 14" fill="none" aria-hidden>
        <path
          d="M5.5 2.5C5.08579 2.5 4.75 2.83579 4.75 3.25V4.25C4.75 4.66421 5.08579 5 5.5 5C5.91421 5 6.25 4.66421 6.25 4.25V3.25C6.25 2.83579 5.91421 2.5 5.5 2.5Z"
          fill="currentColor"
        />
        <path
          d="M0 4.5C0 2.01472 2.01472 0 4.5 0H6.5C8.98528 0 11 2.01472 11 4.5V9.5C11 11.9853 8.98528 14 6.5 14H4.5C2.01472 14 0 11.9853 0 9.5V4.5ZM4.5 1C2.567 1 1 2.567 1 4.5V9.5C1 11.433 2.567 13 4.5 13H6.5C8.433 13 10 11.433 10 9.5V4.5C10 2.567 8.433 1 6.5 1H4.5Z"
          fill="currentColor"
        />
      </svg>
    </IconWrap>
  );
}

/** @uiblox.icons/controls/mouse/clickRight — Add node row. */
export function GuideIconMouseClickRight() {
  return (
    <IconWrap>
      <svg width={VW} height={VH} viewBox="0 0 11 14" fill="none" aria-hidden>
        <path
          d="M11 5C11 2.23858 8.76142 0 6 0H5C2.23858 0 0 2.23858 0 5V9C0 11.7614 2.23858 14 5 14H6C8.76142 14 11 11.7614 11 9V5ZM5.5 1V4.5C5.5 4.77614 5.72386 5 6 5H10V9C10 11.2091 8.20914 13 6 13H5C2.79086 13 1 11.2091 1 9V5C1 2.79086 2.79086 1 5 1H5.5Z"
          fill="currentColor"
        />
      </svg>
    </IconWrap>
  );
}
