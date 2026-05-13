import clsx from 'clsx';
import type { CSSProperties } from 'react';
import { useCallback, useContext, useEffect, useState } from 'react';
import { Dropdown, DropdownItem } from '../foundation/Dropdown';
import { ChevronDown12 } from '../foundation/ChevronDown12';
import { NodePropertyFieldShell } from '../foundation/NodePropertyFieldShell';
import { foundationLayout } from './figmaNodeTokens';
import { GraphCanvasUiScaleContext } from './graphCanvasUiScaleContext';
import type { FunctionSlot, RowPropertyType } from './types';

/** Figma `.NodeProperty` field shell — `73:5672` / `73:5679` / `73:5695` (`get_design_context` on symbols). */
const SHIFT_200 = 'rgba(208, 217, 251, 0.08)';
const SHIFT_300 = 'rgba(208, 217, 251, 0.12)';
const BODY: CSSProperties = {
  fontSize: 'var(--alpha-text-bodysmall-font-size)',
  lineHeight: 'var(--alpha-text-bodysmall-line-height)',
  letterSpacing: 'var(--alpha-text-bodysmall-letter-spacing)',
  fontWeight: 400,
  fontFamily: 'var(--alpha-font-family)',
};

function textEmphasis(): CSSProperties {
  return { ...BODY, color: 'var(--studio-content-emphasis)' };
}

function textDefault(): CSSProperties {
  return { ...BODY, color: 'var(--studio-content-default)' };
}

type OnPatch = (patch: Partial<FunctionSlot>) => void;

/** Radix Select requires a non-empty value; maps to `textValue: null`. */
const NODE_PROP_DROPDOWN_EMPTY = '__node_prop_dropdown_empty__';

function Dropdown1X({ slot, onPatch }: { slot: FunctionSlot; onPatch: OnPatch }) {
  const v = slot.textValue ?? '';
  const value = v === '' ? NODE_PROP_DROPDOWN_EMPTY : v;
  const menuScale = useContext(GraphCanvasUiScaleContext);
  return (
    <div
      className="flex-1 min-w-0"
      style={{ display: 'flex', width: '100%', alignItems: 'stretch', minWidth: 0 }}
    >
      <Dropdown
        variant="nodeProperty"
        menuScale={menuScale}
        ariaLabel={slot.label}
        placeholder={slot.placeholderText}
        value={value}
        onChange={(next) =>
          onPatch({ textValue: next === NODE_PROP_DROPDOWN_EMPTY ? null : next })
        }
      >
        <DropdownItem value={NODE_PROP_DROPDOWN_EMPTY}>{slot.placeholderText}</DropdownItem>
        <DropdownItem value="Value">Value</DropdownItem>
        <DropdownItem value="Option">Option</DropdownItem>
      </Dropdown>
    </div>
  );
}

function Checkbox1X({ checked }: { checked: boolean }) {
  return (
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: 'var(--studio-radius)',
        border: '1px solid rgba(208, 217, 251, 0.4)',
        background: checked ? 'var(--studio-content-emphasis)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
      aria-hidden
    >
      {checked ? (
        <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden>
          <path
            d="M2 5.2 3.8 7 8 2.6"
            stroke="#191a1f"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </div>
  );
}

function InteractiveTextLine({
  committed,
  placeholderText,
  onCommit,
  ariaLabel,
}: {
  committed: string | null;
  placeholderText: string;
  onCommit: (v: string | null) => void;
  ariaLabel: string;
}) {
  const [focus, setFocus] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (focus) setDraft(committed ?? '');
  }, [focus, committed]);

  const commit = useCallback(() => {
    const t = draft.trim();
    onCommit(t === '' ? null : t);
    setFocus(false);
  }, [draft, onCommit]);

  if (focus) {
    return (
      <input
        type="text"
        aria-label={ariaLabel}
        autoFocus
        value={draft}
        className="node-property-field-input"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setDraft(committed ?? '');
            setFocus(false);
          }
        }}
      />
    );
  }

  if (committed !== null && committed !== '') {
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setFocus(true)}
        className={clsx('node-property-interactive-btn node-property-interactive-btn--emphasis truncate')}
      >
        {committed}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => setFocus(true)}
      className={clsx('node-property-interactive-btn node-property-interactive-btn--default truncate')}
    >
      {placeholderText}
    </button>
  );
}

function TextInput1X({ slot, onPatch }: { slot: FunctionSlot; onPatch: OnPatch }) {
  return (
    <NodePropertyFieldShell style={{ flex: 1, minWidth: 0 }}>
      <InteractiveTextLine
        committed={slot.textValue}
        placeholderText={slot.placeholderText}
        ariaLabel={slot.label}
        onCommit={(v) => onPatch({ textValue: v })}
      />
    </NodePropertyFieldShell>
  );
}

function ObjectReference1X({ slot, onPatch }: { slot: FunctionSlot; onPatch: OnPatch }) {
  const v = slot.textValue ?? '';
  return (
    <NodePropertyFieldShell>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          paddingLeft: foundationLayout.paddingXXSmall,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 2,
            background: SHIFT_300,
            flexShrink: 0,
          }}
        />
      </div>
      <select
        aria-label={slot.label}
        className="node-property-native-select"
        value={v}
        onChange={(e) => {
          const next = e.target.value;
          onPatch({ textValue: next === '' ? null : next });
        }}
        style={{
          color: v ? 'var(--studio-content-emphasis)' : 'var(--studio-content-default)',
        }}
      >
        <option value="">{slot.placeholderText}</option>
        <option value="Value A">Value A</option>
        <option value="Value B">Value B</option>
      </select>
      <ChevronDown12 />
    </NodePropertyFieldShell>
  );
}

function patchNumberAt(
  row: [string | null, string | null, string | null],
  index: 0 | 1 | 2,
  cell: string | null
): [string | null, string | null, string | null] {
  const next: [string | null, string | null, string | null] = [...row];
  next[index] = cell;
  return next;
}

function NumberInputCell({
  committed,
  placeholderText,
  ariaLabel,
  onCommit,
}: {
  committed: string | null;
  placeholderText: string;
  ariaLabel: string;
  onCommit: (v: string | null) => void;
}) {
  const [focus, setFocus] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (focus) setDraft(committed ?? '');
  }, [focus, committed]);

  const commit = useCallback(() => {
    const t = draft.trim();
    onCommit(t === '' ? null : t);
    setFocus(false);
  }, [draft, onCommit]);

  if (focus) {
    return (
      <NodePropertyFieldShell style={{ flex: 1, minWidth: 0 }}>
        <input
          type="text"
          inputMode="decimal"
          aria-label={ariaLabel}
          autoFocus
          value={draft}
          className="node-property-field-input"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setDraft(committed ?? '');
              setFocus(false);
            }
          }}
        />
      </NodePropertyFieldShell>
    );
  }

  if (committed !== null && committed !== '') {
    return (
      <NodePropertyFieldShell style={{ flex: 1, minWidth: 0 }}>
        <button
          type="button"
          aria-label={ariaLabel}
          onClick={() => setFocus(true)}
          className={clsx('node-property-interactive-btn node-property-interactive-btn--emphasis truncate')}
        >
          {committed}
        </button>
      </NodePropertyFieldShell>
    );
  }

  return (
    <NodePropertyFieldShell style={{ flex: 1, minWidth: 0 }}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setFocus(true)}
        className={clsx('node-property-interactive-btn node-property-interactive-btn--default truncate')}
      >
        {placeholderText}
      </button>
    </NodePropertyFieldShell>
  );
}

function NumberInput3X({ slot, onPatch }: { slot: FunctionSlot; onPatch: OnPatch }) {
  const nv = slot.numberValues;
  return (
    <div
      style={{
        display: 'flex',
        gap: foundationLayout.gapNumericCells,
        alignItems: 'stretch',
        width: '100%',
        minWidth: 0,
      }}
    >
      {([0, 1, 2] as const).map((i) => (
        <NumberInputCell
          key={i}
          committed={nv[i]}
          placeholderText={slot.placeholderText}
          ariaLabel={`${slot.label} value ${i + 1}`}
          onCommit={(cell) => onPatch({ numberValues: patchNumberAt(nv, i, cell) })}
        />
      ))}
    </div>
  );
}

function NumberRange1X() {
  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        minWidth: 0,
        height: foundationLayout.contentMinHeight,
        paddingLeft: foundationLayout.gapXSmall,
        paddingRight: foundationLayout.paddingRangeEnd,
        paddingTop: foundationLayout.paddingXSmall,
        paddingBottom: foundationLayout.paddingXSmall,
        borderRadius: 'var(--studio-radius)',
        background: SHIFT_200,
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          right: '40%',
          background: SHIFT_300,
          borderRadius: 'var(--studio-radius)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          display: 'flex',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
          alignItems: 'center',
          flex: 1,
          minWidth: 0,
        }}
      >
        <span style={{ ...textEmphasis() }}>5</span>
        <span style={{ ...textDefault(), paddingLeft: foundationLayout.paddingXXSmall }}>0.6</span>
      </div>
    </div>
  );
}

function parseHexFill(raw: string | null): string {
  if (!raw) return '#335fff';
  const t = raw.trim();
  const m = /^#?([0-9a-fA-F]{6})$/.exec(t);
  if (m) return `#${m[1]}`;
  return '#335fff';
}

function Material1X({ slot, onPatch }: { slot: FunctionSlot; onPatch: OnPatch }) {
  return (
    <NodePropertyFieldShell>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          paddingLeft: foundationLayout.paddingXXSmall,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 9999,
            border: '1px solid var(--studio-stroke)',
            background: 'linear-gradient(135deg, #6a7cff, #c44dff)',
            flexShrink: 0,
          }}
        />
      </div>
      <InteractiveTextLine
        committed={slot.textValue}
        placeholderText={slot.placeholderText}
        ariaLabel={`${slot.label} material`}
        onCommit={(v) => onPatch({ textValue: v })}
      />
    </NodePropertyFieldShell>
  );
}

function Color1X({ slot, onPatch }: { slot: FunctionSlot; onPatch: OnPatch }) {
  const fill = parseHexFill(slot.textValue);
  return (
    <NodePropertyFieldShell>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          paddingLeft: foundationLayout.paddingXXSmall,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 2,
            border: '1px solid var(--studio-stroke)',
            background: fill,
            flexShrink: 0,
          }}
        />
      </div>
      <InteractiveTextLine
        committed={slot.textValue}
        placeholderText={slot.placeholderText}
        ariaLabel={`${slot.label} color`}
        onCommit={(v) => onPatch({ textValue: v })}
      />
    </NodePropertyFieldShell>
  );
}

function ParameterDrivenPropertyPreview({
  value,
  propertyType,
}: {
  value: string;
  propertyType: RowPropertyType;
}) {
  switch (propertyType) {
    case 'checkbox': {
      const checked =
        value.trim().toLowerCase() === 'true' ||
        value === '1' ||
        value.trim().toLowerCase() === 'yes';
      return (
        <NodePropertyFieldShell style={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Checkbox1X checked={checked} />
        </NodePropertyFieldShell>
      );
    }
    case 'numberInput3':
      return (
        <NodePropertyFieldShell style={{ flex: 1, minWidth: 0, width: '100%' }}>
          <span
            className="truncate"
            style={{
              ...textEmphasis(),
              flex: 1,
              minWidth: 0,
              textAlign: 'left',
              width: '100%',
              display: 'block',
            }}
          >
            {value}
          </span>
        </NodePropertyFieldShell>
      );
    case 'numberRange':
      return (
        <NodePropertyFieldShell style={{ flex: 1, minWidth: 0, width: '100%' }}>
          <span
            className="truncate"
            style={{ ...textEmphasis(), flex: 1, minWidth: 0, width: '100%' }}
          >
            {value}
          </span>
        </NodePropertyFieldShell>
      );
    case 'color': {
      const fill = parseHexFill(value);
      return (
        <NodePropertyFieldShell style={{ flex: 1, minWidth: 0, width: '100%' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              paddingLeft: foundationLayout.paddingXXSmall,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                border: '1px solid var(--studio-stroke)',
                background: fill,
                flexShrink: 0,
              }}
            />
          </div>
          <span className="truncate" style={{ ...textEmphasis(), flex: 1, minWidth: 0 }}>
            {value}
          </span>
        </NodePropertyFieldShell>
      );
    }
    case 'inputGroup':
      return null;
    case 'readOnly':
      return (
        <NodePropertyFieldShell style={{ flex: 1, minWidth: 0, width: '100%' }}>
          <span
            className="truncate"
            style={{
              ...textEmphasis(),
              flex: 1,
              minWidth: 0,
              width: '100%',
              textAlign: 'left',
              display: 'block',
            }}
          >
            {value}
          </span>
        </NodePropertyFieldShell>
      );
    case 'material':
      return (
        <NodePropertyFieldShell style={{ flex: 1, minWidth: 0, width: '100%' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              paddingLeft: foundationLayout.paddingXXSmall,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 9999,
                border: '1px solid var(--studio-stroke)',
                background: 'linear-gradient(135deg, #6a7cff, #c44dff)',
                flexShrink: 0,
              }}
            />
          </div>
          <span className="truncate" style={{ ...textEmphasis(), flex: 1, minWidth: 0 }}>
            {value}
          </span>
        </NodePropertyFieldShell>
      );
    default:
      return (
        <NodePropertyFieldShell style={{ flex: 1, minWidth: 0, width: '100%' }}>
          <span
            className="truncate"
            style={{
              ...textEmphasis(),
              flex: 1,
              minWidth: 0,
              width: '100%',
              textAlign: 'left',
              display: 'block',
            }}
          >
            {value}
          </span>
        </NodePropertyFieldShell>
      );
  }
}

type Props = {
  slot: FunctionSlot;
  onPatch: OnPatch;
  /** When set, this row is fed by a parameter — read-only mirror at reduced opacity. */
  parameterDrivenValue?: string | null;
};

/** Node property row: Figma `.NodeProperty` variants with graph-backed values where applicable. */
export function NodePropertySlotControl({ slot, onPatch, parameterDrivenValue }: Props) {
  if (parameterDrivenValue != null) {
    return (
      <div
        className="flex-1 min-w-0"
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'stretch',
          minWidth: 0,
          opacity: 0.5,
          pointerEvents: 'none',
        }}
        aria-disabled
        title="Controlled by a parameter. Disconnect the incoming wire to edit this input."
      >
        <ParameterDrivenPropertyPreview
          value={parameterDrivenValue}
          propertyType={slot.propertyType}
        />
      </div>
    );
  }
  switch (slot.propertyType) {
    case 'dropdown':
      return <Dropdown1X slot={slot} onPatch={onPatch} />;
    case 'checkbox':
      return <Checkbox1X checked />;
    case 'textInput':
      return <TextInput1X slot={slot} onPatch={onPatch} />;
    case 'objectReference':
      return <ObjectReference1X slot={slot} onPatch={onPatch} />;
    case 'numberInput3':
      return <NumberInput3X slot={slot} onPatch={onPatch} />;
    case 'numberRange':
      return <NumberRange1X />;
    case 'material':
      return <Material1X slot={slot} onPatch={onPatch} />;
    case 'color':
      return <Color1X slot={slot} onPatch={onPatch} />;
    case 'readOnly':
      return (
        <div
          className="flex-1 min-w-0"
          style={{
            minHeight: foundationLayout.contentMinHeight,
            boxSizing: 'border-box',
          }}
          aria-hidden
        />
      );
    case 'inputGroup':
      return null;
  }
}
