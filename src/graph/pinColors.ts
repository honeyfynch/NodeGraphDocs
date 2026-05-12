/**
 * Graph wire / pin / header colors — two modes (Inspector → Experimental → **Extended Palette**):
 *
 * - **Off (default):** Figma **DataCategorical Contrast** tokens from Node-Graph-Draft `155:13740`
 *   — e.g. Blue, Berry, Rainforest. One hex per token for header, pin, and wire (`FOUNDATION_PALETTE_HEX`).
 * - **On:** Legacy extended palette (Lima, Berry, …) with separate socket (`PIN_HEX`) and header
 *   (`NODE_HEADER_HEX`) ramps — Figma Node Pin `73:5524` / shell `73:5757`.
 */

import {
  FOUNDATION_PALETTE_HEX,
  FOUNDATION_PALETTE_IDS,
  FOUNDATION_PALETTE_LABEL,
  type FoundationPaletteId,
  isFoundationPaletteId,
  migrateLegacyFoundationTintId,
} from './foundationPalette';

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

export type GraphWireColorId = PinColorId | FoundationPaletteId;

/** Re-export for menus / inspector when Extended Palette is off. */
export { FOUNDATION_PALETTE_IDS, FOUNDATION_PALETTE_LABEL, type FoundationPaletteId };

/** Extended `PinColorId` → default foundation token (used when turning Extended Palette off). */
const PIN_TO_FOUNDATION: Record<PinColorId, FoundationPaletteId> = {
  gray: 'ice',
  green: 'green',
  magenta: 'purple',
  lima: 'green',
  berry: 'berry',
  orange: 'orange',
  blue: 'blue',
  purple: 'purple',
  ice: 'ice',
  red: 'red',
  yellow: 'orange',
  rainforest: 'rainforest',
};

/** Foundation token → closest extended pin id (used when turning Extended Palette on). */
const FOUNDATION_TO_PIN: Record<FoundationPaletteId, PinColorId> = {
  blue: 'blue',
  berry: 'berry',
  green: 'green',
  ice: 'ice',
  orange: 'orange',
  purple: 'purple',
  rainforest: 'rainforest',
  red: 'red',
};

/**
 * Generate universal socket / gray wire stroke in **foundation** palette mode — Figma
 * `Gray/Gray_900` (`get_variable_defs` on `163:45377`). Matches other node pins’ ring hue.
 */
export const GENERATE_UNIVERSAL_SOCKET_HEX = '#BCBEC8';

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

/** Node color row — extended palette name only. */
export function formatNodeColorOption(id: PinColorId): string {
  return PIN_FIGMA_NAMES[id];
}

export function parsePinColorId(raw: string): PinColorId | null {
  const k = raw.trim().toLowerCase();
  if ((PIN_COLOR_IDS as readonly string[]).includes(k)) return k as PinColorId;
  return null;
}

export function parseGraphWireColorId(raw: string): GraphWireColorId | null {
  const pin = parsePinColorId(raw);
  if (pin) return pin;
  const t = raw.trim();
  const fromTint = migrateLegacyFoundationTintId(t);
  if (fromTint) return fromTint;
  if (isFoundationPaletteId(t)) return t;
  return null;
}

export function toPinColorId(id: GraphWireColorId): PinColorId {
  const s = String(id);
  const legacyBase = migrateLegacyFoundationTintId(s);
  if (legacyBase) return FOUNDATION_TO_PIN[legacyBase];
  if (isFoundationPaletteId(s)) return FOUNDATION_TO_PIN[s];
  return parsePinColorId(s) ?? migrateLegacyPinColorId(s);
}

export function toFoundationPaletteId(id: GraphWireColorId): FoundationPaletteId {
  const s = String(id);
  const legacyBase = migrateLegacyFoundationTintId(s);
  if (legacyBase) return legacyBase;
  if (isFoundationPaletteId(s)) return s;
  return PIN_TO_FOUNDATION[parsePinColorId(s) ?? migrateLegacyPinColorId(s)];
}

/** Coerce any stored id to the active palette mode (call when toggling Extended Palette). */
export function coerceGraphWireColorForPaletteMode(
  id: GraphWireColorId,
  extendedPalette: boolean
): GraphWireColorId {
  return extendedPalette ? toPinColorId(id) : toFoundationPaletteId(id);
}

/** Normalize slot / patch `inputPinColor` for the current palette mode. */
export function normalizeInputPinColor(
  raw: unknown,
  extendedPalette: boolean
): GraphWireColorId {
  const s = String(raw ?? '');
  const dual = parseGraphWireColorId(s);
  if (dual != null) {
    return coerceGraphWireColorForPaletteMode(dual, extendedPalette);
  }
  const leg = migrateLegacyPinColorId(s);
  return extendedPalette ? leg : PIN_TO_FOUNDATION[leg];
}

export function resolveGraphPinHex(id: GraphWireColorId, extendedPalette: boolean): string {
  /**
   * `gray` wires / universal sockets — Figma `Gray/Gray_900` `#BCBEC8` (`163:45377` variable defs),
   * same ring treatment as other graph pins (2px stroke), not categorical `ice` / extended `#6a6f81`.
   */
  if (toPinColorId(id) === 'gray') {
    return GENERATE_UNIVERSAL_SOCKET_HEX;
  }
  if (extendedPalette) {
    return PIN_HEX[toPinColorId(id)];
  }
  return FOUNDATION_PALETTE_HEX[toFoundationPaletteId(id)];
}

export function resolveGraphHeaderHex(id: GraphWireColorId, extendedPalette: boolean): string {
  if (extendedPalette) {
    return NODE_HEADER_HEX[toPinColorId(id)];
  }
  return FOUNDATION_PALETTE_HEX[toFoundationPaletteId(id)];
}

export function formatGraphWireColorOption(
  id: GraphWireColorId,
  extendedPalette: boolean
): string {
  if (extendedPalette) {
    return formatPinColorOption(toPinColorId(id));
  }
  const f = toFoundationPaletteId(id);
  return FOUNDATION_PALETTE_LABEL[f];
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
