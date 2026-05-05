import * as Select from '@radix-ui/react-select';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { ChevronDown12 } from './ChevronDown12';

export type DropdownVariant = 'default' | 'nodeProperty';

export function Dropdown({
  value,
  onChange,
  placeholder,
  children,
  id,
  className,
  variant = 'default',
  ariaLabel,
  contentClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  children: ReactNode;
  id?: string;
  className?: string;
  variant?: DropdownVariant;
  /** Accessibility; defaults to `placeholder` when set. */
  ariaLabel?: string;
  /** Extra classes on the portaled menu (same shell as `.select-content`). */
  contentClassName?: string;
}) {
  return (
    <div
      className={clsx(
        'select-root-wrap',
        variant === 'nodeProperty' && 'select-root-wrap--node-property',
      )}
    >
      <Select.Root value={value} onValueChange={onChange}>
        <Select.Trigger
          id={id}
          className={clsx(
            'select-trigger',
            variant === 'nodeProperty' && 'select-trigger--node-property',
            className,
          )}
          aria-label={ariaLabel ?? placeholder}
        >
          <span className="select-trigger-value-wrap">
            <Select.Value className="select-trigger-value" placeholder={placeholder} />
          </span>
          <Select.Icon aria-hidden className="select-trigger-icon">
            <ChevronDown12 />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className={clsx(
              'select-content',
              variant === 'nodeProperty' && 'select-content--menu-stable',
              contentClassName,
            )}
            position="popper"
            sideOffset={4}
          >
            <Select.ScrollUpButton className="select-scroll-btn">⌃</Select.ScrollUpButton>
            <Select.Viewport className="select-viewport">{children}</Select.Viewport>
            <Select.ScrollDownButton className="select-scroll-btn">⌄</Select.ScrollDownButton>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

export function DropdownItem({ value, children }: { value: string; children: ReactNode }) {
  return (
    <Select.Item value={value} className="select-item">
      <Select.ItemText>{children}</Select.ItemText>
    </Select.Item>
  );
}
