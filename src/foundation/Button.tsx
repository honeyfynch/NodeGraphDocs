import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'standard' | 'emphasis';
/** Figma Foundation Button `size` — e.g. Generate Run uses `XSmall` (`163:47480`). */
type ButtonSize = 'default' | 'xsmall';

export function Button({
  variant = 'standard',
  size = 'default',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: ButtonSize;
}) {
  return (
    <button
      type="button"
      className={clsx(
        'btn-studio',
        variant === 'emphasis' && 'btn-studio-emphasis',
        size === 'xsmall' && 'btn-studio--xsmall',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
