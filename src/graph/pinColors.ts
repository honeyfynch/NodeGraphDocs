/**
 * Socket / noodle colors — aligned to Figma **Node Pin** component (`73:5524`),
 * file `VxWer5hEenmn5M05lRWrCx`. Hex values from Figma Desktop MCP `get_variable_defs` on that node
 * (palette `*_800`, gray `Gray_700`). Idle pin rendering uses `--studio-surface-0` fill in
 * {@link Pin} (same as `--studio-canvas`) plus a 1px outer ring in that color.
 *
 * Variant names match Figma prop `color`: Gray, Green, Magenta, Lima, Berry, Orange,
 * Blue, Purple, Ice, Red, Yellow, Rainforest.
 */

export const PIN_COLOR_IDS = [
  'gray',
  'green',
  'magenta',
  'lima',
  'berry',
  'orange',
  'blue',
  'purple',
  'ice',
  'red',
  'yellow',
  'rainforest',
] as const;

export type PinColorId = (typeof PIN_COLOR_IDS)[number];

/** Exact hex from Figma variables (Node Pin `73:5524`, `get_variable_defs`). */
export const PIN_HEX: Record<PinColorId, string> = {
  gray: '#6a6f81',
  green: '#2a9835',
  magenta: '#cf54cb',
  lima: '#74900e',
  berry: '#e54c7f',
  orange: '#da611b',
  blue: '#447ffd',
  purple: '#9b6af6',
  ice: '#0c90c0',
  red: '#ed4d3b',
  yellow: '#b27b06',
  rainforest: '#06987b',
};

/**
 * Node header fill — Figma Node shell (`73:5757`): header uses palette `*_600`
 * (e.g. Blue `#2551ef`), distinct from the socket / noodle `*_800` hues in `PIN_HEX`.
 * From Figma Desktop `get_variable_defs` on that file.
 */
export const NODE_HEADER_HEX: Record<PinColorId, string> = {
  gray: '#494d5a',
  green: '#12731d',
  magenta: '#a52ca5',
  lima: '#556b0a',
  berry: '#c20a5d',
  orange: '#ac440c',
  blue: '#2551ef',
  purple: '#773ee0',
  ice: '#166a98',
  red: '#c32418',
  yellow: '#875b03',
  rainforest: '#05715a',
};

/** Figma `color` prop spelling (PascalCase), same order as design component. */
export const PIN_FIGMA_NAMES: Record<PinColorId, string> = {
  gray: 'Gray',
  green: 'Green',
  magenta: 'Magenta',
  lima: 'Lima',
  berry: 'Berry',
  orange: 'Orange',
  blue: 'Blue',
  purple: 'Purple',
  ice: 'Ice',
  red: 'Red',
  yellow: 'Yellow',
  rainforest: 'Rainforest',
};

/** Inspector / menu labels — Figma palette name only. */
export function formatPinColorOption(id: PinColorId): string {
  return PIN_FIGMA_NAMES[id];
}

/** Node color row — Figma palette name only (header + pin colors still follow `NODE_HEADER_HEX` / `PIN_HEX`). */
export function formatNodeColorOption(id: PinColorId): string {
  return PIN_FIGMA_NAMES[id];
}

export function parsePinColorId(raw: string): PinColorId | null {
  const k = raw.trim().toLowerCase();
  if ((PIN_COLOR_IDS as readonly string[]).includes(k)) return k as PinColorId;
  return null;
}

/**
 * Older builds used semantic ids (`neutral`, `emphasis`, …). Map to the closest
 * Figma palette socket color so persisted state keeps working.
 */
const LEGACY_SEMANTIC_TO_PIN: Record<string, PinColorId> = {
  neutral: 'gray',
  emphasis: 'blue',
  success: 'green',
  warning: 'yellow',
  alert: 'red',
  dataA: 'purple',
  dataB: 'ice',
  dataC: 'magenta',
};

export function migrateLegacyPinColorId(raw: string): PinColorId {
  const parsed = parsePinColorId(raw);
  if (parsed) return parsed;
  const mapped = LEGACY_SEMANTIC_TO_PIN[raw];
  if (mapped) return mapped;
  return 'gray';
}

/** Maps to classes in `pin-colors.css`. */
export function pinStrokeClass(id: PinColorId): string {
  return `pin-stroke-${id}`;
}

export function pinFillClass(id: PinColorId): string {
  return `pin-fill-${id}`;
}
