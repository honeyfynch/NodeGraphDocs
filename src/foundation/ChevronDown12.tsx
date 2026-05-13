import type { CSSProperties } from 'react';

/**
 * 12px Builder-style chevron — same geometry as `node-header-chevron-expanded.svg` (input group
 * header “open” chevron), for dropdown triggers and scroll affordances.
 */
export function ChevronDown12({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        lineHeight: 0,
        color: 'var(--studio-content-emphasis)',
        ...style,
      }}
    >
      <svg width={12} height={12} viewBox="0 0 12 12" style={{ display: 'block' }}>
        <path
          fill="currentColor"
          d="M5.73484 8.51516C5.88128 8.66161 6.11872 8.66161 6.26516 8.51516L10.0152 4.76516C10.1616 4.61872 10.1616 4.38128 10.0152 4.23483C9.86872 4.08839 9.63128 4.08839 9.48483 4.23483L6 7.71967L2.51517 4.23483C2.36872 4.08839 2.13128 4.08839 1.98483 4.23483C1.83839 4.38128 1.83839 4.61872 1.98483 4.76516L5.73484 8.51516Z"
        />
      </svg>
    </span>
  );
}
