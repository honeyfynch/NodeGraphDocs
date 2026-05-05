import clsx from 'clsx';
import type { CSSProperties, ReactNode } from 'react';

/**
 * Figma `.NodeProperty` ContentArea shell (`73:5672` Dropdown / `73:5679` TextInput / etc.) —
 * shift-200 fill, 24px min row, horizontal padding + inner gap from foundation tokens.
 */
export function NodePropertyFieldShell({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={clsx('node-property-content-area', className)} style={style}>
      {children}
    </div>
  );
}
