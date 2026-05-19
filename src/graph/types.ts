import type { GraphWireColorId } from './pinColors';
import { normalizeInputPinColor } from './pinColors';

export type FrameVariant = 'standard' | 'emphasis' | 'muted';

/** Inspector → Graph Settings: dataflow canvas vs management (task-only dependency view). */
export type GraphTypeId = 'dataFlow' | 'management';

export type TaskNodeState = 'pending' | 'in_progress' | 'completed';

/** Leading icon set aligned to Figma Node Graph Draft dependency chart (`2036:29645`). */
export type TaskLeadingIconId =
  | 'prompt'
  | 'community'
  | 'code'
  | 'collect'
  | 'npc'
  | 'verify';

export const TASK_LEADING_ICON_IDS: TaskLeadingIconId[] = [
  'prompt',
  'community',
  'code',
  'collect',
  'npc',
  'verify',
];

export const TASK_LEADING_ICON_LABEL: Record<TaskLeadingIconId, string> = {
  prompt: 'Prompt',
  community: 'Community / terrain',
  code: 'Logic / code',
  collect: 'Collectables',
  npc: 'NPC',
  verify: 'Verify / upscale',
};

/**
 * Management graph node — fixed dependency chain (no pin affordances); header row matches
 * Figma `2036:29659` “Set Pose Cache” task strip (`2036:29645`).
 */
export type TaskNode = {
  kind: 'task';
  id: string;
  x: number;
  y: number;
  title: string;
  frameVariant: FrameVariant;
  /** Legacy wire color fields — management edges are fixed gray; kept for palette / hydrate. */
  inputPinColor: GraphWireColorId;
  outputPinColor: GraphWireColorId;
  disabled?: boolean;
  width?: number;
  taskState: TaskNodeState;
  leadingIconId: TaskLeadingIconId;
  /** Vertical play order and template chain index. */
  managementOrder: number;
};

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
  /** Label column only — no control in the property area (configurable in the inspector). */
  | 'readOnly'
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
  'readOnly',
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
  readOnly: 'Read-only',
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

/** Older builds used `singleValue` / `readonly` (lowercase — mapped away from the new `readOnly` type). */
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
  inputPinColor: GraphWireColorId;
  /** When `propertyType === 'inputGroup'`: child rows visible only when explicitly `true` (default collapsed). */
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

/**
 * Merge partial slot updates and apply defaults for older persisted graph data.
 * `extendedPalette` must match {@link GraphState.extendedPalette} so stored colors coerce correctly.
 */
export function normalizeFunctionSlot(
  s: FunctionSlot,
  extendedPalette: boolean = false
): FunctionSlot {
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
    inputPinColor: normalizeInputPinColor(s.inputPinColor, extendedPalette),
  };
  if (base.propertyType === 'inputGroup') {
    const rawChildren = base.inputGroupChildSlots;
    let children =
      Array.isArray(rawChildren) && rawChildren.length > 0
        ? rawChildren.map((c) =>
            normalizeFunctionSlot(
              {
                ...c,
                propertyType:
                  c.propertyType === 'inputGroup' ? 'textInput' : c.propertyType,
              },
              extendedPalette
            )
          )
        : [];
    if (children.length === 0) {
      children = [0, 1].map((i) =>
        normalizeFunctionSlot(
          {
            label: 'Label',
            propertyType: ROW_PROPERTY_TYPE_IDS_INPUT_GROUP_CHILD[
              i % ROW_PROPERTY_TYPE_IDS_INPUT_GROUP_CHILD.length
            ]!,
            inputPinColor: base.inputPinColor,
            placeholderText: 'Placeholder',
            textValue: null,
            numberValues: [null, null, null],
          },
          extendedPalette
        )
      );
    }
    return {
      ...base,
      label: base.label || 'Inputs',
      inputGroupExpanded: base.inputGroupExpanded === true,
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
  outputPinColor: GraphWireColorId;
  /** When false, only the header row is shown (Figma collapse). */
  expanded: boolean;
  /**
   * When true, node renders at reduced opacity; edges from this node do not show play-mode flow animation.
   * Toggle with **M** or ⌘⇧H (Ctrl⇧H on Windows) on the canvas, context menus, or the context toolbar mute control.
   */
  disabled?: boolean;
  /** Custom width (px); default matches Figma chip width when unset. */
  width?: number;
  /**
   * Carried value when the chip is expanded; wired inputs mirror this until the edge is removed.
   * Empty / unset displays as the label “Value” in previews.
   */
  parameterValue?: string;
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
  outputPinColor: GraphWireColorId;
  expanded: boolean;
  /** See `ParameterNode.disabled`. */
  disabled?: boolean;
  /** Custom card width (px); default `NODE_W` when unset. */
  width?: number;
};

export type OutputNode = {
  kind: 'output';
  id: string;
  x: number;
  y: number;
  title: string;
  frameVariant: FrameVariant;
  inputPinColor: GraphWireColorId;
  expanded: boolean;
  /** See `ParameterNode.disabled` (output has no outgoing edges; dimming still applies). */
  disabled?: boolean;
  /** Custom card width (px); default `NODE_W` when unset. */
  width?: number;
};

/** Generative node — output / input pins use categorical **gray** (same socket color as gray function nodes); header uses neutral gray chrome in the canvas. */
export type GenerateNode = {
  kind: 'generate';
  id: string;
  x: number;
  y: number;
  title: string;
  /** Unused for palette; header is always neutral gray in the canvas. */
  frameVariant: FrameVariant;
  expanded: boolean;
  disabled?: boolean;
  width?: number;
  /** `prompt`: textarea + inputs + Run. `output`: preview strip + same body. */
  generativePhase: 'prompt' | 'output';
  /** Multiline prompt (prompt phase body). */
  promptText: string;
  /** Input group “Inputs” section — body rows (wired + Add input…) only when expanded. */
  inputGroupExpanded: boolean;
};

/** Source pin on an edge — header `out`, or numbered `out-n` on {@link GroupInputNode}. */
export type GraphOutPort = 'out' | `out-${number}`;

export function isGraphOutPort(p: string): p is GraphOutPort {
  return p === 'out' || /^out-\d+$/.test(p);
}

/**
 * Restores external→inner wiring when a {@link GroupNode} is removed (`graphGroupOps`).
 */
export type GroupBridge = {
  groupPortIndex: number;
  innerNodeId: string;
  innerPort: `in-${number}`;
  externalFromNodeId: string;
  externalFromPort: GraphOutPort;
  colorId: GraphWireColorId;
};

/** When the group exposes a value to the parent graph (inner → outside). */
export type GroupExitBridge = {
  innerFromNodeId: string;
  innerFromPort: GraphOutPort;
  externalToNodeId: string;
  externalToPort: `in-${number}`;
  colorId: GraphWireColorId;
};

/**
 * Blender-style **Group Input** — lives inside the group subgraph; each row is an output pin
 * feeding inner nodes that receive parent-graph wires on the {@link GroupNode} shell.
 */
export type GroupInputNode = {
  kind: 'groupInput';
  id: string;
  x: number;
  y: number;
  parentGroupId: string;
  title: string;
  frameVariant: FrameVariant;
  expanded: boolean;
  disabled?: boolean;
  width?: number;
  /** One row per {@link GroupNode.bridges} entry (same order). */
  outputs: { label: string; colorId: GraphWireColorId }[];
};

/**
 * Blender-style **Group Output** — single input row receiving the exit connection that maps to
 * the group node’s header output on the parent graph.
 */
export type GroupOutputNode = {
  kind: 'groupOutput';
  id: string;
  x: number;
  y: number;
  parentGroupId: string;
  title: string;
  frameVariant: FrameVariant;
  expanded: boolean;
  disabled?: boolean;
  width?: number;
  inputPinColor: GraphWireColorId;
  rowLabel: string;
};

/**
 * Subgraph wrapper from **Group selection** / ⌘G — renders like a function node; body uses
 * read-only rows mirroring bridged external inputs (not swappable in the inspector).
 */
export type GroupNode = {
  kind: 'group';
  id: string;
  x: number;
  y: number;
  title: string;
  frameVariant: FrameVariant;
  expanded: boolean;
  disabled?: boolean;
  width?: number;
  slotCount: number;
  slots: FunctionSlot[];
  /** Fallback when no wire feeds the inner Group Output; canvas pin color follows that edge (see `groupCanvasOutputPinColorId`). */
  outputPinColor: GraphWireColorId;
  containedNodeIds: string[];
  bridges: GroupBridge[];
  groupInputNodeId: string;
  groupOutputNodeId: string;
  exitBridge: GroupExitBridge | null;
};

export type GraphNode =
  | ParameterNode
  | FunctionNode
  | OutputNode
  | GenerateNode
  | GroupNode
  | GroupInputNode
  | GroupOutputNode
  | TaskNode;

export type EdgePortOut = { nodeId: string; port: GraphOutPort };
export type EdgePortIn = { nodeId: string; port: `in-${number}` };

export type GraphEdge = {
  id: string;
  from: EdgePortOut;
  to: EdgePortIn;
  colorId: GraphWireColorId;
};
