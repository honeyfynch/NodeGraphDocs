import type { PinColorId } from './pinColors';
import type { FunctionNode, FunctionSlot, GraphNode } from './types';

export const NODE_W = 200;

/** Minimum / maximum horizontal size for card-style nodes (function, output); min matches default `NODE_W`. */
export const GRAPH_NODE_MIN_W_CARD = NODE_W;
export const GRAPH_NODE_MAX_W = 350;
/** Minimum width for parameter chips when resized. */
export const GRAPH_NODE_MIN_W_PARAMETER = 80;

/** Card width in graph space (function / output). */
export function graphNodeCardWidth(node: Extract<GraphNode, { kind: 'function' | 'output' }>): number {
  return node.width ?? NODE_W;
}

/** Parameter chip width in graph space. */
export function graphNodeParameterWidth(node: Extract<GraphNode, { kind: 'parameter' }>): number {
  return node.width ?? PARAMETER_NODE_W;
}

export function graphNodeWidth(node: GraphNode): number {
  if (node.kind === 'parameter') return graphNodeParameterWidth(node);
  return graphNodeCardWidth(node);
}

export function graphNodeMinWidth(node: GraphNode): number {
  return node.kind === 'parameter' ? GRAPH_NODE_MIN_W_PARAMETER : GRAPH_NODE_MIN_W_CARD;
}
export const HEADER_H = 28;
/** `.NodeRow` vertical padding 4px + 24px content + 4px (Figma `73:26702`, Padding.XSmall Y). */
export const ROW_H = 32;
/** Pin center sits this far outside the card edge (Figma full Node header pin). */
export const PIN_OFFSET = 5;
/** `.studio-node-card` uses a 1px border inside border-box; body rows align to this inner X. */
export const NODE_CARD_CONTENT_INSET = 1;
/** 9×9 `Pin` / 2 — wire endpoint sits on the circle’s left so the stroke meets the socket flush. */
export const NODE_INPUT_PIN_OUTER_R = 4.5;
/** Additional +X toward the card after flush math (pixel snap / anti-gap). */
export const NODE_INPUT_WIRE_X_NUDGE = 2;

/** Figma Parameter single-value component (`73:6072`, frame `73:6071`). */
export const PARAMETER_NODE_W = 114;
export const PARAMETER_CHIP_H = 28;
/** Figma `radius/large` on outer frame; inner fill uses outer − 1px so curves meet the stroke (`73:6071`). */
export const PARAMETER_RADIUS_OUTER = 16;
export const PARAMETER_RADIUS_INNER = PARAMETER_RADIUS_OUTER - 1;
function collapsed(node: GraphNode): boolean {
  return !node.expanded;
}

function inputGroupChildren(slot: FunctionSlot): FunctionSlot[] {
  if (slot.propertyType !== 'inputGroup') return [];
  return slot.inputGroupChildSlots ?? [];
}

function inputGroupExpanded(slot: FunctionSlot): boolean {
  return slot.inputGroupExpanded !== false;
}

/** Body height under function header when expanded (Figma `.NodeRow` / Input Group `73:5651`). */
export function functionExpandedBodyHeight(node: FunctionNode): number {
  let h = 0;
  for (const slot of node.slots) {
    if (slot.propertyType !== 'inputGroup') {
      h += ROW_H;
      continue;
    }
    const children = inputGroupChildren(slot);
    h += ROW_H; // group header row
    if (inputGroupExpanded(slot)) h += children.length * ROW_H;
  }
  return h;
}

export type FunctionInputPortTarget =
  | { kind: 'slot'; slotIndex: number }
  | { kind: 'inputGroupChild'; groupSlotIndex: number; childIndex: number };

export type FunctionInputPortLayout = {
  portIndex: number;
  port: `in-${number}`;
  centerY: number;
  target: FunctionInputPortTarget;
};

export function layoutFunctionInputPorts(node: FunctionNode): FunctionInputPortLayout[] {
  const out: FunctionInputPortLayout[] = [];
  let yTop = node.y + HEADER_H;
  let portIndex = 0;

  for (let slotIndex = 0; slotIndex < node.slots.length; slotIndex++) {
    const slot = node.slots[slotIndex]!;
    if (slot.propertyType !== 'inputGroup') {
      out.push({
        portIndex,
        port: `in-${portIndex}` as `in-${number}`,
        centerY: yTop + ROW_H / 2,
        target: { kind: 'slot', slotIndex },
      });
      portIndex++;
      yTop += ROW_H;
      continue;
    }

    const children = inputGroupChildren(slot);
    const expanded = inputGroupExpanded(slot);
    const headerCenterY = yTop + ROW_H / 2;
    yTop += ROW_H;

    if (expanded) {
      for (let childIndex = 0; childIndex < children.length; childIndex++) {
        out.push({
          portIndex,
          port: `in-${portIndex}` as `in-${number}`,
          centerY: yTop + ROW_H / 2,
          target: { kind: 'inputGroupChild', groupSlotIndex: slotIndex, childIndex },
        });
        portIndex++;
        yTop += ROW_H;
      }
    } else {
      for (let childIndex = 0; childIndex < children.length; childIndex++) {
        out.push({
          portIndex,
          port: `in-${portIndex}` as `in-${number}`,
          centerY: headerCenterY,
          target: { kind: 'inputGroupChild', groupSlotIndex: slotIndex, childIndex },
        });
        portIndex++;
      }
    }
  }

  return out;
}

export function inputPinColorForTarget(node: FunctionNode, target: FunctionInputPortTarget): PinColorId | null {
  if (target.kind === 'slot') {
    const s = node.slots[target.slotIndex];
    return s?.inputPinColor ?? null;
  }
  const g = node.slots[target.groupSlotIndex];
  if (!g || g.propertyType !== 'inputGroup') return null;
  return g.inputPinColor;
}

/** All `in-*` ports belonging to one Input Group slot (for stub hit-testing / wiring). */
export function portsForInputGroupSlot(
  node: FunctionNode,
  groupSlotIndex: number
): `in-${number}`[] {
  return layoutFunctionInputPorts(node)
    .filter(
      (L) =>
        L.target.kind === 'inputGroupChild' && L.target.groupSlotIndex === groupSlotIndex
    )
    .map((L) => L.port);
}

export function nodeHeight(node: GraphNode): number {
  switch (node.kind) {
    case 'parameter':
      return collapsed(node) ? PARAMETER_CHIP_H : PARAMETER_CHIP_H + ROW_H;
    case 'function':
      if (collapsed(node)) return HEADER_H;
      return HEADER_H + functionExpandedBodyHeight(node);
    case 'output':
      return collapsed(node) ? HEADER_H : HEADER_H + ROW_H;
  }
}

/** Graph-space center of a socket for edges. */
export function pinGraphPosition(
  node: GraphNode,
  port: 'out' | `in-${number}`
): { x: number; y: number } {
  switch (node.kind) {
    case 'parameter': {
      const w = graphNodeParameterWidth(node);
      /**
       * Pin sits on `parameter-node-surface` (`inset: 1px` under the frame), then
       * `right: -PIN_OFFSET` — center X uses graph width `w`.
       * Subtract frame stroke inset and half the 9px pin (same as `NODE_INPUT_PIN_OUTER_R`).
       */
      return {
        x:
          node.x +
          w -
          NODE_CARD_CONTENT_INSET +
          PIN_OFFSET -
          NODE_INPUT_PIN_OUTER_R,
        y: node.y + PARAMETER_CHIP_H / 2,
      };
    }
    case 'function': {
      const w = graphNodeCardWidth(node);
      if (port === 'out') {
        /** Pin center on X (matches header trailing socket; `+ PIN_OFFSET` alone was the pin’s outer edge). */
        return {
          x: node.x + w + PIN_OFFSET - NODE_INPUT_PIN_OUTER_R,
          y: node.y + HEADER_H / 2,
        };
      }
      /* Collapsed: no input pins — end wires flush on the card’s left edge (not PIN_OFFSET outside). */
      if (collapsed(node)) {
        return {
          x: node.x + NODE_INPUT_WIRE_X_NUDGE,
          y: node.y + HEADER_H / 2,
        };
      }
      const idx = Number(port.slice(3));
      const layouts = layoutFunctionInputPorts(node);
      const hit = layouts.find((L) => L.portIndex === idx);
      const centerY = hit?.centerY ?? node.y + HEADER_H + ROW_H / 2;
      return {
        x:
          node.x +
          NODE_CARD_CONTENT_INSET -
          NODE_INPUT_PIN_OUTER_R +
          NODE_INPUT_WIRE_X_NUDGE,
        y: centerY,
      };
    }
    case 'output': {
      if (collapsed(node)) {
        return {
          x: node.x + NODE_INPUT_WIRE_X_NUDGE,
          y: node.y + HEADER_H / 2,
        };
      }
      return {
        x:
          node.x +
          NODE_CARD_CONTENT_INSET -
          NODE_INPUT_PIN_OUTER_R +
          NODE_INPUT_WIRE_X_NUDGE,
        y: node.y + HEADER_H + ROW_H / 2,
      };
    }
  }
}

/** Horizontal control offset for cubic wires (matches Figma-style routing). */
export function bezierHorizontalHandleDx(x1: number, x2: number): number {
  return Math.max(72, Math.abs(x2 - x1) * 0.45);
}

export function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = bezierHorizontalHandleDx(x1, x2);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`;
}

