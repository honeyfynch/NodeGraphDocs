import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'standard' | 'emphasis';

export function Button({
  variant = 'standard',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={clsx(
        'btn-studio',
        variant === 'emphasis' && 'btn-studio-emphasis',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
