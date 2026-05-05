/**
 * 12px Builder-style chevron (matches `nodePropertyUi` `.NodeProperty` dropdown affordance).
 */
export function ChevronDown12() {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        lineHeight: 0,
        color: 'var(--studio-content-emphasis)',
      }}
    >
      <svg width={12} height={12} viewBox="0 0 12 12" style={{ display: 'block' }}>
        <path fill="currentColor" d="M2.8 4.2h6.4L6 7.4 2.8 4.2z" />
      </svg>
    </span>
  );
}
