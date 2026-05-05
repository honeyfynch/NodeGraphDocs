import type { PinColorId } from './pinColors';

export type FrameVariant = 'standard' | 'emphasis' | 'muted';

/**
 * `.NodeProperty` variants — Figma `73:5669` (names match symbol `↳ type=…`).
 * Example composition: node `73:26702`.
 */
export type RowPropertyType =
  | 'dropdown'
  | 'checkbox'
  | 'textInput'
  | 'objectReference'
  | 'numberInput3'
  | 'numberRange'
  | 'material'
  | 'color'
  /** Figma `73:5651` Input Group — nested rows; one shared input pin color on the parent slot. */
  | 'inputGroup';

export const ROW_PROPERTY_TYPE_IDS: RowPropertyType[] = [
  'dropdown',
  'checkbox',
  'textInput',
  'objectReference',
  'numberInput3',
  'numberRange',
  'material',
  'color',
  'inputGroup',
];

/** Property types allowed inside an Input Group child row (no nested groups). */
export const ROW_PROPERTY_TYPE_IDS_INPUT_GROUP_CHILD: RowPropertyType[] =
  ROW_PROPERTY_TYPE_IDS.filter((t) => t !== 'inputGroup');

export const ROW_PROPERTY_FIGMA_LABEL: Record<RowPropertyType, string> = {
  dropdown: '1X Dropdown',
  checkbox: '1X Checkbox',
  textInput: '1X TextInput',
  objectReference: '1X Object Reference',
  numberInput3: '3X NumberInput',
  numberRange: '1X NumberRange',
  material: '1X Material',
  color: '1X Color',
  inputGroup: 'Input Group',
};

/** Figma `BaseInput/InputText` (`80:68682`): one visible line — placeholder OR committed value. */
export function rowPropertyUsesInputTextPlaceholder(type: RowPropertyType): boolean {
  return (
    type === 'dropdown' ||
    type === 'textInput' ||
    type === 'objectReference' ||
    type === 'numberInput3' ||
    type === 'material' ||
    type === 'color'
  );
}

/** Older builds used `singleValue` / `readonly`. */
export function migrateRowPropertyType(raw: string): RowPropertyType {
  const legacy: Record<string, RowPropertyType> = {
    singleValue: 'textInput',
    readonly: 'objectReference',
  };
  const mapped = legacy[raw];
  if (mapped) return mapped;
  if ((ROW_PROPERTY_TYPE_IDS as readonly string[]).includes(raw)) return raw as RowPropertyType;
  return 'dropdown';
}

export type FunctionSlot = {
  label: string;
  propertyType: RowPropertyType;
  inputPinColor: PinColorId;
  /** When `propertyType === 'inputGroup'`: expand/collapse child rows (Figma `73:5652` toggle). */
  inputGroupExpanded?: boolean;
  /** Nested property rows; `inputPinColor` on children is ignored — use parent slot color for pins. */
  inputGroupChildSlots?: FunctionSlot[];
  /**
   * Empty-state copy for InputText-style controls (Figma prototyping uses two text layers;
   * runtime shows only this until a value is committed).
   */
  placeholderText: string;
  /**
   * Committed value for dropdown, textInput, objectReference, material label, color token text.
   * `null` = show placeholderText only (Figma placeholder layer).
   */
  textValue: string | null;
  /** Per-cell values for `numberInput3`; `null` = that cell shows placeholderText. */
  numberValues: [string | null, string | null, string | null];
};

/** Merge partial slot updates and apply defaults for older persisted graph data. */
export function normalizeFunctionSlot(s: FunctionSlot): FunctionSlot {
  const num = s.numberValues;
  const numberValues: [string | null, string | null, string | null] =
    Array.isArray(num) && num.length === 3
      ? [num[0] ?? null, num[1] ?? null, num[2] ?? null]
      : [null, null, null];
  let textValue = s.textValue ?? null;
  if (textValue === '') textValue = null;
  const base: FunctionSlot = {
    ...s,
    placeholderText: s.placeholderText ?? 'Placeholder',
    textValue,
    numberValues,
  };
  if (base.propertyType === 'inputGroup') {
    const rawChildren = base.inputGroupChildSlots;
    let children =
      Array.isArray(rawChildren) && rawChildren.length > 0
        ? rawChildren.map((c) =>
            normalizeFunctionSlot({
              ...c,
              propertyType:
                c.propertyType === 'inputGroup' ? 'textInput' : c.propertyType,
            })
          )
        : [];
    if (children.length === 0) {
      children = [0, 1].map((i) =>
        normalizeFunctionSlot({
          label: 'Label',
          propertyType: ROW_PROPERTY_TYPE_IDS_INPUT_GROUP_CHILD[
            i % ROW_PROPERTY_TYPE_IDS_INPUT_GROUP_CHILD.length
          ]!,
          inputPinColor: base.inputPinColor,
          placeholderText: 'Placeholder',
          textValue: null,
          numberValues: [null, null, null],
        })
      );
    }
    return {
      ...base,
      label: base.label || 'Inputs',
      inputGroupExpanded: base.inputGroupExpanded !== false,
      inputGroupChildSlots: children,
    };
  }
  return {
    label: base.label,
    propertyType: base.propertyType,
    inputPinColor: base.inputPinColor,
    placeholderText: base.placeholderText ?? 'Placeholder',
    textValue,
    numberValues,
  };
}

export type ParameterNode = {
  kind: 'parameter';
  id: string;
  x: number;
  y: number;
  title: string;
  frameVariant: FrameVariant;
  outputPinColor: PinColorId;
  /** When false, only the header row is shown (Figma collapse). */
  expanded: boolean;
};

export type FunctionNode = {
  kind: 'function';
  id: string;
  x: number;
  y: number;
  title: string;
  frameVariant: FrameVariant;
  slotCount: number;
  slots: FunctionSlot[];
  outputPinColor: PinColorId;
  expanded: boolean;
};

export type OutputNode = {
  kind: 'output';
  id: string;
  x: number;
  y: number;
  title: string;
  frameVariant: FrameVariant;
  inputPinColor: PinColorId;
  expanded: boolean;
};

export type GraphNode = ParameterNode | FunctionNode | OutputNode;

export type EdgePortOut = { nodeId: string; port: 'out' };
export type EdgePortIn = { nodeId: string; port: `in-${number}` };

export type GraphEdge = {
  id: string;
  from: EdgePortOut;
  to: EdgePortIn;
  colorId: PinColorId;
};
