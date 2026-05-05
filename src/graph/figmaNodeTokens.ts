/**
 * Foundation spacing tokens for node graph UI — pixel values match Figma Dev Mode
 * defaults from `get_design_context` on focused sublayers (e.g. `.NodeRow` `73:26702`).
 *
 * **Committed Design Assist data** (recipes + pixel contract + Foundation rule summary):
 * `nodeGraphDesignAssistRecipes.ts` — same content as MCP `record_component_recipe` / contract
 * that `theme.css` must mirror. Call `get_component_recipe` with `DESIGN_ASSIST_COMPONENT_RECIPE_KEYS`
 * for IDE-only copies; trust the repo file when they differ.
 *
 * CSS variables are defined in `src/foundation/theme.css` (`:root`).
 */

export type {
  DesignAssistNodeGraphRecipeKey,
  NodeGraphDesignAssistRecipeSnapshot,
} from './nodeGraphDesignAssistRecipes';
export {
  FOUNDATION_NODE_GRAPH_CSS_VAR_VALUES,
  FOUNDATION_NODE_GRAPH_RULE_SUMMARY,
  FOUNDATION_NODE_GRAPH_SPACING_PX,
  NODE_GRAPH_DESIGN_ASSIST_RECIPE_SNAPSHOTS,
  NODE_GRAPH_RECIPE_COMPONENT_KEYS,
} from './nodeGraphDesignAssistRecipes';
export { NODE_GRAPH_RECIPE_COMPONENT_KEYS as DESIGN_ASSIST_COMPONENT_RECIPE_KEYS } from './nodeGraphDesignAssistRecipes';

export const foundationLayout = {
  gapXSmall: 'var(--foundation-gap-xsmall)',
  paddingXXSmall: 'var(--foundation-padding-xxsmall)',
  paddingXSmall: 'var(--foundation-padding-xsmall)',
  paddingSmall: 'var(--foundation-padding-small)',
  contentGap: 'var(--foundation-content-gap)',
  contentMinHeight: 'var(--foundation-content-min-height)',
  gapNumericCells: 'var(--foundation-gap-numeric-cells)',
  gapNumberRangeInner: 'var(--foundation-gap-number-range-inner)',
  labelColWidth: 'var(--foundation-label-col-width)',
  paddingRangeEnd: 'var(--foundation-padding-range-end)',
} as const;

export const nodeRow = {
  display: 'flex' as const,
  flexDirection: 'row' as const,
  alignItems: 'flex-start' as const,
  gap: foundationLayout.gapXSmall,
  /** Figma `.NodeRow`: paddingY Padding.XSmall (4px), paddingX Padding.Small (8px). */
  padding: `${foundationLayout.paddingXSmall} ${foundationLayout.paddingSmall}`,
  boxSizing: 'border-box' as const,
};

export const nodeLabelColumn = {
  width: foundationLayout.labelColWidth,
  minWidth: foundationLayout.labelColWidth,
  maxWidth: foundationLayout.labelColWidth,
  paddingLeft: foundationLayout.paddingXSmall,
  boxSizing: 'border-box' as const,
  minHeight: foundationLayout.contentMinHeight,
  display: 'flex' as const,
  alignItems: 'center' as const,
};
