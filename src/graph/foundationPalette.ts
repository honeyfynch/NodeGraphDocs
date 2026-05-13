/**
 * Default graph color tokens — Figma **Node-Graph-Draft** `155:13740` (`get_variable_defs` on that node).
 * `DataCategorical Contrast/Categorical_*` → camelCase ids here.
 * Categorical **Gray** — `367:22748` (`get_variable_defs`): pin/wire `Gray/Gray_700`, header `Gray/Gray_600`.
 */

export const FOUNDATION_PALETTE_IDS = [
  'blue',
  'berry',
  'green',
  'ice',
  'orange',
  'purple',
  'rainforest',
  'red',
  'gray',
] as const;

export type FoundationPaletteId = (typeof FOUNDATION_PALETTE_IDS)[number];

/** Hex from Figma Desktop MCP `get_variable_defs` (node `155:13740`). */
export const FOUNDATION_PALETTE_HEX: Record<FoundationPaletteId, string> = {
  blue: '#4c68d2',
  berry: '#b43166',
  green: '#469b4b',
  ice: '#166a98',
  orange: '#d0763e',
  purple: '#724ec0',
  rainforest: '#1b6f5e',
  red: '#d14e42',
  /** Gray_700 — sockets / wires (Figma `367:22748`). */
  gray: '#6a6f81',
};

/** Inspector / menus — human-readable (matches Figma variable suffixes). */
export const FOUNDATION_PALETTE_LABEL: Record<FoundationPaletteId, string> = {
  blue: 'Blue',
  berry: 'Berry',
  green: 'Green',
  ice: 'Ice',
  orange: 'Orange',
  purple: 'Purple',
  rainforest: 'Rainforest',
  red: 'Red',
  gray: 'Gray',
};

/** Removed tint ids → base hue (persisted graphs / URLs may still reference tints). */
const LEGACY_FOUNDATION_TINT_TO_BASE: Record<string, FoundationPaletteId> = {
  berryTint: 'berry',
  iceTint: 'ice',
  purpleTint: 'purple',
  rainforestTint: 'rainforest',
};

export function isFoundationPaletteId(id: string): id is FoundationPaletteId {
  return (FOUNDATION_PALETTE_IDS as readonly string[]).includes(id);
}

/** Map legacy `*Tint` foundation ids to the base categorical token, or null. */
export function migrateLegacyFoundationTintId(raw: string): FoundationPaletteId | null {
  return LEGACY_FOUNDATION_TINT_TO_BASE[raw.trim()] ?? null;
}
