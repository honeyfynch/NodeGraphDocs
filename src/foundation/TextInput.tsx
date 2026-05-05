import clsx from 'clsx';
import type { InputHTMLAttributes } from 'react';
import { NodePropertyFieldShell } from './NodePropertyFieldShell';

export type TextInputVariant = 'default' | 'nodeProperty';

export function TextInput({
  className,
  variant = 'default',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { variant?: TextInputVariant }) {
  if (variant === 'nodeProperty') {
    return (
      <NodePropertyFieldShell>
        <input className={clsx('node-property-field-input', className)} {...rest} />
      </NodePropertyFieldShell>
    );
  }
  return <input className={clsx('foundation-web-input', className)} {...rest} />;
}
