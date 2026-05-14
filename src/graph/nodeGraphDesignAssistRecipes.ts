/**
 * Committed copy of Design Assist `record_component_recipe` payloads for the node graph.
 * The MCP local store can differ by machine; this file is the **project source of truth**
 * for recipe text and for the pixel contract that `theme.css` / `figmaNodeTokens.ts` implement.
 *
 * When Figma spacing changes: edit `FOUNDATION_NODE_GRAPH_SPACING_PX` and
 * `FOUNDATION_NODE_GRAPH_CSS_VAR_VALUES` here, mirror the same numbers into
 * `src/foundation/theme.css` `:root`, then optionally re-run Design Assist
 * `record_component_recipe` so MCP-local copies stay aligned.
 */

import { ROW_H } from './geometry';

export type RecipeTargetHint = { type: 'property' | 'node'; identifier: string };

export type NodeGraphDesignAssistRecipeSnapshot = {
  componentKey: string;
  capability: string;
  prerequisites: Record<string, string | boolean>;
  targetHints: RecipeTargetHint[];
  notes: string;
  confidence: number;
};

/** Canonical MCP `componentKey` strings (also re-exported as `DESIGN_ASSIST_COMPONENT_RECIPE_KEYS`). */
export const NODE_GRAPH_RECIPE_COMPONENT_KEYS = {
  nodeRow: 'node-graph.node-row',
  contentArea: 'node-graph.content-area',
  nodeProperty: 'node-graph.node-property',
  /** Bottom-left Guide panel (`133:7964`) — Navigation + Shortcuts menu. */
  graphGuide: 'node-graph.graph-guide',
} as const;

/**
 * Pixel values that must match `src/foundation/theme.css` `:root` `--foundation-*` and
 * `--studio-radius` (4px) for ContentArea corners.
 */
export const FOUNDATION_NODE_GRAPH_SPACING_PX = {
  gapXXSmall: 2,
  gapXSmall: 4,
  /** Figma `Gap/Medium` — label column ↔ trailing accessory on Guide menu rows. */
  gapMedium: 12,
  paddingXXSmall: 2,
  paddingXSmall: 4,
  paddingSmall: 8,
  /** Figma `Padding/Medium` — menu row + section title horizontal inset on Guide `133:7964`. */
  paddingMedium: 12,
  contentGap: 4,
  contentMinHeight: 24,
  gapNumericCells: 6,
  gapNumberRangeInner: 2,
  labelColWidth: 96,
  paddingRangeEnd: 6,
  studioRadius: 4,
} as const;

/**
 * Each `--foundation-*` token in `theme.css` must use this numeric value (and `--studio-radius`
 * for 4px corners on ContentArea / number range). `--foundation-size-xsmall` aliases content min height.
 */
export const FOUNDATION_NODE_GRAPH_CSS_VAR_VALUES = {
  '--foundation-gap-xxsmall': FOUNDATION_NODE_GRAPH_SPACING_PX.gapXXSmall,
  '--foundation-gap-xsmall': FOUNDATION_NODE_GRAPH_SPACING_PX.gapXSmall,
  '--foundation-gap-medium': FOUNDATION_NODE_GRAPH_SPACING_PX.gapMedium,
  '--foundation-padding-xxsmall': FOUNDATION_NODE_GRAPH_SPACING_PX.paddingXXSmall,
  '--foundation-padding-xsmall': FOUNDATION_NODE_GRAPH_SPACING_PX.paddingXSmall,
  '--foundation-padding-small': FOUNDATION_NODE_GRAPH_SPACING_PX.paddingSmall,
  '--foundation-padding-medium': FOUNDATION_NODE_GRAPH_SPACING_PX.paddingMedium,
  '--foundation-content-gap': FOUNDATION_NODE_GRAPH_SPACING_PX.contentGap,
  '--foundation-content-min-height': FOUNDATION_NODE_GRAPH_SPACING_PX.contentMinHeight,
  '--foundation-size-xsmall': FOUNDATION_NODE_GRAPH_SPACING_PX.contentMinHeight,
  '--foundation-gap-numeric-cells': FOUNDATION_NODE_GRAPH_SPACING_PX.gapNumericCells,
  '--foundation-gap-number-range-inner': FOUNDATION_NODE_GRAPH_SPACING_PX.gapNumberRangeInner,
  '--foundation-label-col-width': FOUNDATION_NODE_GRAPH_SPACING_PX.labelColWidth,
  '--foundation-padding-range-end': FOUNDATION_NODE_GRAPH_SPACING_PX.paddingRangeEnd,
  '--studio-radius': FOUNDATION_NODE_GRAPH_SPACING_PX.studioRadius,
} as const;

export type DesignAssistNodeGraphRecipeKey =
  (typeof NODE_GRAPH_RECIPE_COMPONENT_KEYS)[keyof typeof NODE_GRAPH_RECIPE_COMPONENT_KEYS];

/**
 * Foundation spacing rules (summary) — aligns with Design Assist `get_design_system_guidance`
 * topics `spacing` / `padding` / `gap`: use semantic Padding/Gap families, avoid ad hoc mix,
 * `Gap.XXSmall` is vertical micro-adjustment only (we use 2px as Padding.XXSmall in inputs).
 */
export const FOUNDATION_NODE_GRAPH_RULE_SUMMARY: readonly string[] = [
  'Use Gap.XSmall (4px) for horizontal gap between label column and property control in `.NodeRow`.',
  'Use Padding.Small (8px) horizontal and Padding.XSmall (4px) vertical on `.NodeRow` outer padding.',
  'Use Padding.XSmall (4px) for label column inset and ContentArea horizontal padding.',
  'Use dedicated 6px gap between 3× NumberInput cells (Figma `gap` token default on wrapperContent).',
  'Guide panel `133:7964`: outer Padding.Small 8px; vertical stack Gap.XXSmall 2px; menu option rows Foundation Size XSmall (24px) frame height with Padding.Medium 12px horizontal; label↔trailing Gap.Medium 12px; section titles height 24px; backplate Color/Surface/Surface_200; stroke Color/Stroke/Default.',
  'Do not replace component padding with ad hoc values unless matching an updated Figma export.',
];

export const NODE_GRAPH_DESIGN_ASSIST_RECIPE_SNAPSHOTS: readonly NodeGraphDesignAssistRecipeSnapshot[] =
  [
    {
      componentKey: NODE_GRAPH_RECIPE_COMPONENT_KEYS.nodeRow,
      capability: 'layout.spacing',
      prerequisites: {},
      targetHints: [{ type: 'node', identifier: '73:26702' }],
      notes:
        'Figma Node-Graph-Draft example node 73:26702 (.NodeRow). Row: gap Gap.XSmall=4px; paddingY Padding.XSmall=4px; paddingX Padding.Small=8px. Label column: width 96px; paddingLeft Padding.XSmall=4px. Pin: top calc(50% + 0.5px). Maps to CSS vars --foundation-gap-xsmall, --foundation-padding-xsmall (row Y), --foundation-padding-small, --foundation-label-col-width.',
      confidence: 0.95,
    },
    {
      componentKey: NODE_GRAPH_RECIPE_COMPONENT_KEYS.contentArea,
      capability: 'layout.spacing',
      prerequisites: {},
      targetHints: [{ type: 'node', identifier: '73:5672' }],
      notes:
        'Figma BaseInput ContentArea inside .NodeProperty variants (e.g. 73:5672 Dropdown, 73:5679 TextInput, 73:5695 NumberInput cells). minHeight 24px; horizontal padding 4px (Padding token default 4 / XSmall); internal gap content/gap 4px; border-radius 4px (--studio-radius). Background shift-200 rgba(208,217,251,0.08). Maps to --foundation-content-min-height, --foundation-padding-xsmall, --foundation-content-gap.',
      confidence: 0.95,
    },
    {
      componentKey: NODE_GRAPH_RECIPE_COMPONENT_KEYS.nodeProperty,
      capability: 'layout.spacing',
      prerequisites: {},
      targetHints: [{ type: 'node', identifier: '73:5669' }],
      notes:
        'Figma component set .NodeProperty 73:5669 (variants 73:5672, 73:5679, 73:5674, 73:5695, 73:5685, etc.). Root width 212px in library; on canvas sits in .NodeRow input column with flex-1. Variant-specific: 3X NumberInput uses gap 6px between cells (--foundation-gap-numeric-cells). 1X NumberRange: height 24px, pl 4px (gap/xsmall), pr 6px, py 4px (padding/xsmall), inner numeric placeholder pl 2px (--foundation-padding-xxsmall). Leading accessory (object ref): pl 2px before 12px icon.',
      confidence: 0.92,
    },
    {
      componentKey: NODE_GRAPH_RECIPE_COMPONENT_KEYS.graphGuide,
      capability: 'layout.spacing',
      prerequisites: {},
      targetHints: [{ type: 'node', identifier: '133:7964' }],
      notes:
        'Figma Guide `133:7964` (get_design_context + get_variable_defs). Frame 260×292; outer p Padding.Small 8px; column gap Gap.XXSmall 2px; drop-shadow 0 4px 2px rgba(0,0,0,0.25). Menu fill Color/Surface/Surface_200 (#202227); border Stroke/Standard 1px Color/Stroke/Default. Section titles (.MenuSectionTitle): Typography CaptionSmall 10px semibold, Color/Content/Default, h 24px, px Padding.Medium 12px. Menu rows: BodySmall 12px regular; row label Color/Content/Emphasis; hotkey text Color/Content/Muted, leading 1 (line-height 1); py Padding.XSmall 4px; px Padding.Medium 12px; gap Gap.Medium 12px between text column and trailing; Radius.Small 4px on row; trailing icons 16px (uiblox mouse/scroll + mouse/clickRight SVGs). Divider: py Padding.XSmall 4px, 1px stroke default @ 12% opacity.',
      confidence: 0.96,
    },
  ];

/** Vertical padding on `.NodeRow` / node property rows (matches `nodeRow` in `figmaNodeTokens.ts`). */
const NODE_ROW_PADDING_Y_PX = FOUNDATION_NODE_GRAPH_SPACING_PX.paddingXSmall;
const _slotRowHeightPx =
  NODE_ROW_PADDING_Y_PX * 2 + FOUNDATION_NODE_GRAPH_SPACING_PX.contentMinHeight;
if (ROW_H !== _slotRowHeightPx) {
  throw new Error(
    `geometry.ROW_H (${String(ROW_H)}) must match recipe row padding + content min (${String(_slotRowHeightPx)}px = 2×nodeRowPaddingY + contentMinHeight). Update geometry.ts and/or FOUNDATION_NODE_GRAPH_SPACING_PX / figmaNodeTokens.nodeRow.`,
  );
}
