import clsx from 'clsx';
import type { CSSProperties, ReactNode } from 'react';

/**
 * Figma `.NodeProperty` BaseInput ContentArea shell (`73:5672` / `73:5679`) — **property** variant:
 * shift-200 fill + focus ring. **plain** variant: transparent shell for checkbox-only inspector rows
 * (no shift fill / no focus-within ring from the shell).
 */
export function NodePropertyFieldShell({
  children,
  className,
  style,
  variant = 'property',
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  variant?: 'property' | 'plain';
}) {
  return (
    <div
      className={clsx(
        'node-property-content-area',
        variant === 'plain' && 'node-property-content-area--plain',
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}
