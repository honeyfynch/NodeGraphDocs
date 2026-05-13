import * as Select from '@radix-ui/react-select';
import clsx from 'clsx';
import type { CSSProperties, ReactNode } from 'react';
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
  /** Graph canvas zoom; scales node-property menu text/padding to match the transformed trigger. */
  menuScale,
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
  /** When set with `variant="nodeProperty"`, drives `--graph-node-property-dropdown-scale` on the flyout. */
  menuScale?: number;
}) {
  const s =
    variant === 'nodeProperty' && menuScale != null && Number.isFinite(menuScale) && menuScale > 0
      ? menuScale
      : variant === 'nodeProperty'
        ? 1
        : undefined;
  const contentScaleStyle: CSSProperties | undefined =
    s != null
      ? { ['--graph-node-property-dropdown-scale' as string]: String(s) }
      : undefined;

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
            style={contentScaleStyle}
            position="popper"
            sideOffset={4}
            onPointerDown={(e) => {
              /* Keep graph/node card handlers from seeing portaled menu interactions (bubble). */
              if (variant === 'nodeProperty') e.stopPropagation();
            }}
          >
            <Select.ScrollUpButton className="select-scroll-btn" aria-label="Scroll up">
              <span className="select-scroll-chevron select-scroll-chevron--up" aria-hidden>
                <ChevronDown12 style={{ color: 'var(--studio-content-muted)' }} />
              </span>
            </Select.ScrollUpButton>
            <Select.Viewport className="select-viewport">{children}</Select.Viewport>
            <Select.ScrollDownButton className="select-scroll-btn" aria-label="Scroll down">
              <span className="select-scroll-chevron" aria-hidden>
                <ChevronDown12 style={{ color: 'var(--studio-content-muted)' }} />
              </span>
            </Select.ScrollDownButton>
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
