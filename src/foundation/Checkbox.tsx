import clsx from 'clsx';

/**
 * Foundation-style checkbox row: box and label on one horizontal axis (placement Start),
 * optional hint under the label text.
 */
export function Checkbox({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={clsx(
        'foundation-web-checkbox-row',
        disabled && 'foundation-web-checkbox-row--disabled',
        className,
      )}
    >
      <input
        type="checkbox"
        className="foundation-web-checkbox-input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
      <span className="foundation-web-checkbox-box" aria-hidden>
        <svg
          className="foundation-web-checkbox-check"
          width={10}
          height={10}
          viewBox="0 0 10 10"
          aria-hidden
        >
          <path
            d="M2 5.2 3.8 7 8 2.6"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="foundation-web-checkbox-text">
        <span className="foundation-web-checkbox-text-title">{label}</span>
        {hint ? <span className="foundation-web-checkbox-text-hint">{hint}</span> : null}
      </span>
    </label>
  );
}
