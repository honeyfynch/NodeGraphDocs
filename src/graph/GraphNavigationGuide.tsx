import type { ReactNode } from 'react';
import { GuideIconMouseClickRight, GuideIconMouseScroll } from './GraphGuideFigmaIcons';

/** Figma `133:7964` Guide — `get_design_context` frame size. */
const PANEL_W = 260;
const PANEL_H = 292;
const SECTION_TITLE_MIN_H = 24;
const ROW_MIN_H = 25;

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--alpha-font-family)',
  fontSize: 10,
  lineHeight: 1.4,
  fontWeight: 600,
  letterSpacing: 0,
  color: 'var(--studio-content-default)',
  padding: `0 var(--foundation-padding-medium)`,
  minHeight: SECTION_TITLE_MIN_H,
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
};

/** Row primary label — Figma uses Color/Content/Emphasis on menu item title text. */
const rowLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--alpha-font-family)',
  fontSize: 'var(--alpha-text-bodysmall-font-size)',
  lineHeight: 1.4,
  letterSpacing: 'var(--alpha-text-bodysmall-letter-spacing)',
  fontWeight: 400,
  color: 'var(--studio-content-emphasis)',
};

/** Hotkey / accessory text — Figma `.HotkeyText`: Color/Content/Muted, 12px, line-height 1. */
const hotkeyTextStyle: React.CSSProperties = {
  fontFamily: 'var(--alpha-font-family)',
  fontSize: 'var(--alpha-text-bodysmall-font-size)',
  lineHeight: 1,
  letterSpacing: 'var(--alpha-text-bodysmall-letter-spacing)',
  fontWeight: 400,
  color: 'var(--studio-content-muted)',
  whiteSpace: 'nowrap',
};

function GuideMenuRow({ label, trailing }: { label: string; trailing: ReactNode }) {
  return (
    <div
      style={{
        minHeight: ROW_MIN_H,
        width: '100%',
        boxSizing: 'border-box',
        padding: `var(--foundation-padding-xsmall) var(--foundation-padding-medium)`,
        borderRadius: 'var(--studio-radius)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--foundation-gap-medium)',
      }}
    >
      <div
        style={{
          flex: '1 1 0',
          minWidth: 0,
          minHeight: 16,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 'var(--foundation-gap-xxsmall)',
        }}
      >
        <span style={rowLabelStyle}>{label}</span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          flexShrink: 0,
          minHeight: 16,
          gap: 0,
        }}
      >
        {trailing}
      </div>
    </div>
  );
}

function SectionDivider() {
  return (
    <div
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: `var(--foundation-padding-xsmall) 0`,
      }}
    >
      <div
        style={{
          height: 1,
          width: '100%',
          background: 'var(--studio-stroke)',
        }}
      />
    </div>
  );
}

type Props = {
  visible: boolean;
};

/**
 * Bottom-left graph navigation reference — Figma `133:7964`.
 * Tokens: `get_variable_defs` on this node; spacing from Foundation Padding/Gap/Radius;
 * icons from Dev Mode SVG exports in `src/graph/assets/guide/`.
 */
export function GraphNavigationGuide({ visible }: Props) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        bottom: 12,
        zIndex: 30,
        width: PANEL_W,
        minHeight: PANEL_H,
        boxSizing: 'border-box',
        padding: 'var(--foundation-padding-small)',
        gap: 'var(--foundation-gap-xxsmall)',
        borderRadius: 'var(--studio-radius-panel)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'var(--studio-stroke)',
        background: 'var(--studio-surface-200)',
        filter: 'drop-shadow(0px 4px 2px rgba(0, 0, 0, 0.25))',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        fontFamily: 'var(--alpha-font-family)',
      }}
    >
      <div style={sectionTitleStyle}>Navigation</div>
      <GuideMenuRow label="Pan" trailing={<GuideIconMouseScroll />} />
      <GuideMenuRow
        label="Drag pan"
        trailing={
          <>
            <span style={hotkeyTextStyle}>Alt</span>
            <GuideIconMouseScroll />
          </>
        }
      />
      <GuideMenuRow
        label="Zoom"
        trailing={
          <>
            <span style={hotkeyTextStyle}>⌘</span>
            <GuideIconMouseScroll />
          </>
        }
      />
      <SectionDivider />
      <div style={sectionTitleStyle}>Shortcuts</div>
      <GuideMenuRow label="Add node" trailing={<GuideIconMouseClickRight />} />
      <GuideMenuRow label="Frame selection" trailing={<span style={hotkeyTextStyle}>F</span>} />
      <GuideMenuRow
        label="Enable/disable selection"
        trailing={<span style={hotkeyTextStyle}>⌘ Shift H</span>}
      />
      <GuideMenuRow label="Group selection" trailing={<span style={hotkeyTextStyle}>⌘G</span>} />
      <GuideMenuRow label="Ungroup selection" trailing={<span style={hotkeyTextStyle}>⌘U</span>} />
    </div>
  );
}
