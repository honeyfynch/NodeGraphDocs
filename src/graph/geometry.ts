import type { GraphWireColorId } from './pinColors';
import type {
  FunctionNode,
  FunctionSlot,
  GenerateNode,
  GraphEdge,
  GraphNode,
  GraphOutPort,
} from './types';
import { isGraphOutPort } from './types';

/** Body layout shared by {@link FunctionNode} and {@link GroupNode} (pins, rows, input groups). */
export type FunctionLayoutBody = Pick<FunctionNode, 'slots' | 'x' | 'y' | 'expanded'>;

export const NODE_W = 200;

/** Minimum / maximum horizontal size for card-style nodes (function, output); min matches default `NODE_W`. */
export const GRAPH_NODE_MIN_W_CARD = NODE_W;
export const GRAPH_NODE_MAX_W = 350;
/** Minimum width for parameter chips when resized. */
export const GRAPH_NODE_MIN_W_PARAMETER = 80;

/** Card width in graph space (function / output / generate). */
export function graphNodeCardWidth(
  node: Extract<
    GraphNode,
    { kind: 'function' | 'output' | 'generate' | 'group' | 'groupInput' | 'groupOutput' }
  >
): number {
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

/**
 * Figma Generate node `368:23582` (dev) — prompt `.NodeRow` + TextArea `163:47986`:
 * body `padding/y xsmall` + row `pt xsmall` `pb small` `px small` (4+4+8+8) around shift block;
 * inner field `min-h 50` + `py small` + `pl xxsmall` → 66px shift stack.
 */
const GENERATE_TEXTAREA_ROW_PAD_TOP_PX = 8;
const GENERATE_TEXTAREA_SHIFT_MIN_H_PX = 66;
const GENERATE_TEXTAREA_ROW_PAD_BOTTOM_PX = 8;
/** 1px rule under subsection (matches `borderBottom` in `GenerateNodeView`). */
const GENERATE_TEXTAREA_BOTTOM_RULE_PX = 1;
/** Border-box height of prompt TextArea subsection — must match `GenerateNodeView` outer wrapper. */
export const GENERATE_TEXTAREA_SECTION_H =
  GENERATE_TEXTAREA_ROW_PAD_TOP_PX +
  GENERATE_TEXTAREA_SHIFT_MIN_H_PX +
  GENERATE_TEXTAREA_ROW_PAD_BOTTOM_PX +
  GENERATE_TEXTAREA_BOTTOM_RULE_PX;
/** “Inputs” group header row. */
export const GENERATE_INPUT_GROUP_HEADER_H = 32;
/**
 * Run / CTA row — Figma `368:23582` `CTA Button`: `border-t` + `pt small` + 24px control + `pb xsmall`.
 */
export const GENERATE_RUN_ROW_H = 37;
/**
 * Figma `368:23583` — body `py-[padding/xsmall]` before stacked `.NodeRow`s (Design Assist `node-graph.node-row`).
 */
export const GENERATE_BODY_PAD_Y_PX = 4;
/** Output first `.NodeRow` around `Media`: `pt` xsmall, `pb` small (`I368:23689;367:22782`). */
export const GENERATE_OUTPUT_MEDIA_ROW_PAD_TOP_PX = 4;
export const GENERATE_OUTPUT_MEDIA_ROW_PAD_BOTTOM_PX = 8;

/** Inner width of Generate card body (inside 1px stroke). */
export function graphGenerateBodyInnerWidth(node: GenerateNode): number {
  return graphNodeCardWidth(node) - 2 * NODE_CARD_BORDER;
}

/** `Media` `aspect-[200/150]` height from inner width minus row horizontal padding (`368:23583`). */
export function generateMediaPlaceholderHeight(node: GenerateNode): number {
  const inner = graphGenerateBodyInnerWidth(node);
  const mediaW = Math.max(0, inner - 2 * NODE_ROW_PADDING_X);
  return Math.ceil((mediaW * 150) / 200);
}

/** Border-box height of output preview `.NodeRow` (row padding + framed media). */
export function generateOutputMediaRowHeight(node: GenerateNode): number {
  return (
    GENERATE_OUTPUT_MEDIA_ROW_PAD_TOP_PX +
    generateMediaPlaceholderHeight(node) +
    GENERATE_OUTPUT_MEDIA_ROW_PAD_BOTTOM_PX
  );
}

/** Body top pad + media `.NodeRow` — matches height before TextArea in output (`368:23583`). */
export function generateOutputPreviewStackHeight(node: GenerateNode): number {
  return GENERATE_BODY_PAD_Y_PX + generateOutputMediaRowHeight(node);
}

/** Pin center sits this far outside the card edge (Figma full Node header pin). */
export const PIN_OFFSET = 5;
/** `.studio-node-card` uses a 1px border inside border-box; body rows align to this inner X. */
export const NODE_CARD_CONTENT_INSET = 1;
/** Outer `node.y` / `node.x` are the card top-left; chrome begins one pixel inside the border. */
export const NODE_CARD_BORDER = 1;
/** Graph `Pin` socket outer diameter (px); core uses `box-sizing: border-box` at this size. */
export const GRAPH_PIN_DIAMETER_PX = 9;
/** Half of {@link GRAPH_PIN_DIAMETER_PX} — wire endpoints, flow dot, layout math. */
export const NODE_INPUT_PIN_OUTER_R = GRAPH_PIN_DIAMETER_PX / 2;
/** Bézier edge paths and ghost wire — SVG `stroke-width` (px). */
export const GRAPH_WIRE_STROKE_PX = 2;
/** Additional +X toward the card after flush math (pixel snap / anti-gap). */
export const NODE_INPUT_WIRE_X_NUDGE = 2;
/** `.NodeRow` horizontal padding (Padding.Small) — must match `figmaNodeTokens` `nodeRow`. */
export const NODE_ROW_PADDING_X = 8;
/** Output node body input row `paddingLeft` — must match `OutputNodeView`. */
export const OUTPUT_INPUT_ROW_PADDING_X = 12;
/**
 * Figma `.NodeRow` pin: `top: calc(50% + 0.5px)` for stroke/grid alignment — wire `centerY` must match.
 */
export const NODE_ROW_PIN_CENTER_Y_OFFSET = 0.5;

function inputSlotRowCenterY(yTop: number): number {
  return yTop + ROW_H / 2 + NODE_ROW_PIN_CENTER_Y_OFFSET;
}

/** Header trailing pin — must match `NodeShell` (`calc(50% + …)` inside fixed `HEADER_H` row). */
export function graphHeaderPinCenterY(nodeY: number): number {
  return nodeY + NODE_CARD_BORDER + HEADER_H / 2 + NODE_ROW_PIN_CENTER_Y_OFFSET;
}

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
  return slot.inputGroupExpanded === true;
}

export function generateWiredInIndices(nodeId: string, edges: readonly GraphEdge[]): number[] {
  const s = new Set<number>();
  for (const e of edges) {
    if (e.to.nodeId !== nodeId) continue;
    const m = /^in-(\d+)$/.exec(e.to.port);
    if (m) s.add(Number(m[1]));
  }
  return [...s].sort((a, b) => a - b);
}

/** Wired input ports + one “Add input…” row (Figma `163:45377`). */
export function generateInputRowCount(nodeId: string, edges: readonly GraphEdge[]): number {
  return generateWiredInIndices(nodeId, edges).length + 1;
}

/** Pixel height of Generate node body under header (requires edges for input row count). */
export function generateExpandedBodyHeight(
  node: GenerateNode,
  edges: readonly GraphEdge[]
): number {
  const preview =
    node.generativePhase === 'output' ? generateOutputPreviewStackHeight(node) : 0;
  const inputBodyRows = node.inputGroupExpanded ? generateInputRowCount(node.id, edges) : 0;
  const inputBodyH = inputBodyRows * ROW_H;
  return (
    preview +
    GENERATE_TEXTAREA_SECTION_H +
    GENERATE_INPUT_GROUP_HEADER_H +
    inputBodyH +
    GENERATE_RUN_ROW_H
  );
}

function generateInputPortCenterY(
  node: GenerateNode,
  edges: readonly GraphEdge[],
  port: `in-${number}`
): number | null {
  if (!node.inputGroupExpanded) return null;
  const wired = generateWiredInIndices(node.id, edges);
  const nextFree = wired.length === 0 ? 0 : Math.max(...wired) + 1;
  const portNum = Number(port.slice(3));
  const order = [...wired, nextFree];
  const idx = order.indexOf(portNum);
  if (idx < 0) return null;
  const rowTop =
    node.y +
    NODE_CARD_BORDER +
    HEADER_H +
    (node.generativePhase === 'output' ? generateOutputPreviewStackHeight(node) : 0) +
    GENERATE_TEXTAREA_SECTION_H +
    GENERATE_INPUT_GROUP_HEADER_H +
    idx * ROW_H;
  return inputSlotRowCenterY(rowTop);
}

/** Body height under function header when expanded (Figma `.NodeRow` / Input Group `73:5651`). */
export function functionExpandedBodyHeight(node: FunctionLayoutBody): number {
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

export function layoutFunctionInputPorts(node: FunctionLayoutBody): FunctionInputPortLayout[] {
  const out: FunctionInputPortLayout[] = [];
  let yTop = node.y + NODE_CARD_BORDER + HEADER_H;
  let portIndex = 0;

  for (let slotIndex = 0; slotIndex < node.slots.length; slotIndex++) {
    const slot = node.slots[slotIndex]!;
    if (slot.propertyType !== 'inputGroup') {
      out.push({
        portIndex,
        port: `in-${portIndex}` as `in-${number}`,
        centerY: inputSlotRowCenterY(yTop),
        target: { kind: 'slot', slotIndex },
      });
      portIndex++;
      yTop += ROW_H;
      continue;
    }

    const children = inputGroupChildren(slot);
    const expanded = inputGroupExpanded(slot);
    const headerCenterY = inputSlotRowCenterY(yTop);
    yTop += ROW_H;

    if (expanded) {
      for (let childIndex = 0; childIndex < children.length; childIndex++) {
        out.push({
          portIndex,
          port: `in-${portIndex}` as `in-${number}`,
          centerY: inputSlotRowCenterY(yTop),
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

export function inputPinColorForTarget(
  node: Pick<FunctionNode, 'slots'>,
  target: FunctionInputPortTarget
): GraphWireColorId | null {
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
  node: FunctionLayoutBody,
  groupSlotIndex: number
): `in-${number}`[] {
  return layoutFunctionInputPorts(node)
    .filter(
      (L) =>
        L.target.kind === 'inputGroupChild' && L.target.groupSlotIndex === groupSlotIndex
    )
    .map((L) => L.port);
}

export function nodeHeight(node: GraphNode, edges: readonly GraphEdge[] = []): number {
  switch (node.kind) {
    case 'parameter':
      return collapsed(node) ? PARAMETER_CHIP_H : PARAMETER_CHIP_H + ROW_H;
    case 'function':
      if (collapsed(node)) return HEADER_H;
      return HEADER_H + functionExpandedBodyHeight(node);
    case 'group':
      if (collapsed(node)) return HEADER_H;
      return HEADER_H + functionExpandedBodyHeight(node);
    case 'output':
      return collapsed(node) ? HEADER_H : HEADER_H + ROW_H;
    case 'generate':
      if (collapsed(node)) return HEADER_H;
      return HEADER_H + generateExpandedBodyHeight(node, edges);
    case 'groupInput': {
      const rows = Math.max(1, node.outputs.length);
      return HEADER_H + rows * ROW_H;
    }
    case 'groupOutput':
      return HEADER_H + ROW_H;
  }
}

/** Graph-space attachment point for edge paths (socket center for most pins; collapsed stubs differ). */
export function pinGraphPosition(
  node: GraphNode,
  port: GraphOutPort | `in-${number}`,
  edges: readonly GraphEdge[] = []
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
        y: node.y + PARAMETER_CHIP_H / 2 + NODE_ROW_PIN_CENTER_Y_OFFSET,
      };
    }
    case 'function': {
      const w = graphNodeCardWidth(node);
      if (port === 'out') {
        /**
         * Header pin: `right: -PIN_OFFSET` from inner chrome — same inner-right base as parameter
         * (`w - border` + offset − radius), not `node.x + w` (border-box outer would sit 1px too far).
         */
        return {
          x: node.x + w - NODE_CARD_BORDER + PIN_OFFSET - NODE_INPUT_PIN_OUTER_R,
          y: graphHeaderPinCenterY(node.y),
        };
      }
      /* Collapsed: no input pins — end wires flush on the card’s left edge (not PIN_OFFSET outside). */
      if (collapsed(node)) {
        return {
          x: node.x + NODE_CARD_BORDER + NODE_INPUT_WIRE_X_NUDGE,
          y: graphHeaderPinCenterY(node.y),
        };
      }
      const idx = Number(port.slice(3));
      const layouts = layoutFunctionInputPorts(node);
      const hit = layouts.find((L) => L.portIndex === idx);
      const centerY =
        hit?.centerY ??
        node.y + NODE_CARD_BORDER + HEADER_H + ROW_H / 2 + NODE_ROW_PIN_CENTER_Y_OFFSET;
      /** Horizontal center of input socket (`left: 0` + `translate(-50%)` in padded row). */
      return {
        x: node.x + NODE_CARD_BORDER + NODE_ROW_PADDING_X,
        y: centerY,
      };
    }
    case 'group': {
      const w = graphNodeCardWidth(node);
      if (port === 'out') {
        return {
          x: node.x + w - NODE_CARD_BORDER + PIN_OFFSET - NODE_INPUT_PIN_OUTER_R,
          y: graphHeaderPinCenterY(node.y),
        };
      }
      if (collapsed(node)) {
        return {
          x: node.x + NODE_CARD_BORDER + NODE_INPUT_WIRE_X_NUDGE,
          y: graphHeaderPinCenterY(node.y),
        };
      }
      const idx = Number(port.slice(3));
      const layouts = layoutFunctionInputPorts(node);
      const hit = layouts.find((L) => L.portIndex === idx);
      const centerY =
        hit?.centerY ??
        node.y + NODE_CARD_BORDER + HEADER_H + ROW_H / 2 + NODE_ROW_PIN_CENTER_Y_OFFSET;
      return {
        x: node.x + NODE_CARD_BORDER + NODE_ROW_PADDING_X,
        y: centerY,
      };
    }
    case 'output': {
      if (collapsed(node)) {
        return {
          x: node.x + NODE_CARD_BORDER + NODE_INPUT_WIRE_X_NUDGE,
          y: graphHeaderPinCenterY(node.y),
        };
      }
      return {
        x: node.x + NODE_CARD_BORDER + OUTPUT_INPUT_ROW_PADDING_X,
        y: inputSlotRowCenterY(node.y + NODE_CARD_BORDER + HEADER_H),
      };
    }
    case 'generate': {
      const w = graphNodeCardWidth(node);
      if (port === 'out') {
        return {
          x: node.x + w - NODE_CARD_BORDER + PIN_OFFSET - NODE_INPUT_PIN_OUTER_R,
          y: graphHeaderPinCenterY(node.y),
        };
      }
      if (collapsed(node)) {
        return {
          x: node.x + NODE_CARD_BORDER + NODE_INPUT_WIRE_X_NUDGE,
          y: graphHeaderPinCenterY(node.y),
        };
      }
      const cy = generateInputPortCenterY(node, edges, port as `in-${number}`);
      const yFallback =
        node.y +
        NODE_CARD_BORDER +
        HEADER_H +
        (node.generativePhase === 'output' ? generateOutputPreviewStackHeight(node) : 0) +
        GENERATE_TEXTAREA_SECTION_H +
        GENERATE_INPUT_GROUP_HEADER_H +
        ROW_H / 2 +
        NODE_ROW_PIN_CENTER_Y_OFFSET;
      return {
        x: node.x + NODE_CARD_BORDER + NODE_ROW_PADDING_X,
        y: cy ?? yFallback,
      };
    }
    case 'groupInput': {
      const w = graphNodeCardWidth(node);
      const rowCount = Math.max(1, node.outputs.length);
      let rowIdx = 0;
      if (isGraphOutPort(port) && port !== 'out') {
        rowIdx = Number(port.slice(4));
      }
      rowIdx = Math.min(Math.max(0, rowIdx), Math.max(0, rowCount - 1));
      const centerY =
        node.y +
        NODE_CARD_BORDER +
        HEADER_H +
        rowIdx * ROW_H +
        ROW_H / 2 +
        NODE_ROW_PIN_CENTER_Y_OFFSET;
      return {
        x: node.x + w - NODE_CARD_BORDER + PIN_OFFSET - NODE_INPUT_PIN_OUTER_R,
        y: centerY,
      };
    }
    case 'groupOutput': {
      if (port === 'in-0') {
        return {
          x: node.x + NODE_CARD_BORDER + NODE_ROW_PADDING_X,
          y: inputSlotRowCenterY(node.y + NODE_CARD_BORDER + HEADER_H),
        };
      }
      return {
        x: node.x + NODE_CARD_BORDER + NODE_INPUT_WIRE_X_NUDGE,
        y: graphHeaderPinCenterY(node.y),
      };
    }
  }
}

/** Horizontal control offset for cubic wires (matches Figma-style routing). */
export function bezierHorizontalHandleDx(x1: number, x2: number): number {
  return Math.max(72, Math.abs(x2 - x1) * 0.45);
}

export function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const span = Math.abs(x2 - x1);
  const rawD = bezierHorizontalHandleDx(x1, x2);
  // Keep controls on the correct side of each endpoint and before the midpoint so
  // tangents stay horizontal (fixes RTL edges, e.g. parameter right → function left).
  const d =
    span <= 0 ? 0 : Math.min(rawD, Math.max(0, span / 2 - 1e-3));

  if (x2 >= x1) {
    return `M ${x1} ${y1} C ${x1 + d} ${y1} ${x2 - d} ${y2} ${x2} ${y2}`;
  }
  return `M ${x1} ${y1} C ${x1 - d} ${y1} ${x2 + d} ${y2} ${x2} ${y2}`;
}

