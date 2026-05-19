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
import { MANAGEMENT_TASK_DEFAULT_WIDTH_PX, MANAGEMENT_TASK_ROW_HEIGHT_PX } from './managementGraphTemplate';

/** Body layout shared by {@link FunctionNode} and {@link GroupNode} (pins, rows, input groups). */
export type FunctionLayoutBody = Pick<FunctionNode, 'slots' | 'x' | 'y' | 'expanded'>;

export const NODE_W = 200;

/** Minimum / maximum horizontal size for card-style nodes (function, output); min matches default `NODE_W`. */
export const GRAPH_NODE_MIN_W_CARD = NODE_W;
export const GRAPH_NODE_MAX_W = 350;
/** Minimum width for parameter chips when resized. */
export const GRAPH_NODE_MIN_W_PARAMETER = 80;

/** Card width in graph space (function / output / generate / task). */
export function graphNodeCardWidth(
  node: Extract<
    GraphNode,
    { kind: 'function' | 'output' | 'generate' | 'group' | 'groupInput' | 'groupOutput' | 'task' }
  >
): number {
  if (node.kind === 'task') return node.width ?? MANAGEMENT_TASK_DEFAULT_WIDTH_PX;
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
  if (node.kind === 'parameter') return GRAPH_NODE_MIN_W_PARAMETER;
  if (node.kind === 'task') return 120;
  return GRAPH_NODE_MIN_W_CARD;
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
/**
 * Card uses `border: 1px solid transparent` + outer `box-shadow` stroke (`theme.css`); this constant
 * is still the inner inset for pin / row layout math (same as previous inside border).
 */
export const NODE_CARD_CONTENT_INSET = 1;
/** Outer `node.y` / `node.x` are the card top-left; chrome begins one pixel inside the transparent border. */
export const NODE_CARD_BORDER = 1;
/** Inspector → Experimental → Pin styling (socket ring + horizontal anchor vs node frame). */
export type GraphPinStyleId = 'classic' | 'orbit' | 'contained';

export const GRAPH_PIN_STYLE_IDS = ['classic', 'orbit', 'contained'] as const;

export function isGraphPinStyleId(raw: string): raw is GraphPinStyleId {
  return (GRAPH_PIN_STYLE_IDS as readonly string[]).includes(raw);
}

/**
 * Pin ↔ node **outer** frame (px). Orbit: gap from card edge to pin center line — input side
 * `nodeLeft − this − pinRadius`; output side `nodeRight + this + pinRadius`. Contained **inputs** /
 * **outputs** use {@link NODE_HEADER_CHEVRON_CENTER_X_FROM_CARD_INNER} instead (not this anchor).
 */
export const PIN_STYLE_FRAME_ANCHOR_PX = 4;

/** NodeShell header `paddingLeft` before chevron — must match `NodeShell.tsx`. */
export const NODE_SHELL_HEADER_PADDING_LEFT_PX = 4;
/** Chevron hit target width — must match `NodeShell` `.studio-node-chevron`. */
export const NODE_SHELL_HEADER_CHEVRON_W_PX = 24;
/** Radix `.select-trigger-icon` width on node-property dropdowns — must match `theme.css`. */
export const NODE_PROPERTY_SELECT_ICON_W_PX = 12;
/**
 * Right-aligned expand chevron: `position: absolute; right` (px) so the 12px glyph centers on
 * `.select-trigger--node-property` chevrons (`.NodeRow` `paddingSmall` 8px + trigger `paddingXSmall` 4px +
 * half select icon − half expand hit).
 */
export const NODE_GRAPH_RIGHT_EXPAND_CHEVRON_BUTTON_RIGHT_PX =
  8 +
  4 +
  NODE_PROPERTY_SELECT_ICON_W_PX / 2 -
  NODE_SHELL_HEADER_CHEVRON_W_PX / 2;
/** Title `paddingRight` so labels truncate before the positioned right expand chevron. */
export const NODE_GRAPH_RIGHT_EXPAND_TITLE_PAD_RIGHT_PX =
  NODE_SHELL_HEADER_CHEVRON_W_PX + NODE_GRAPH_RIGHT_EXPAND_CHEVRON_BUTTON_RIGHT_PX;
/** `gap-sm` between header chevron and title (`theme.css` / NodeShell `gap-sm`). */
export const NODE_SHELL_HEADER_CHEVRON_TITLE_GAP_PX = 8;

/** X from card **inner** left to header chevron **center** (graph px). */
export const NODE_HEADER_CHEVRON_CENTER_X_FROM_CARD_INNER =
  NODE_SHELL_HEADER_PADDING_LEFT_PX + NODE_SHELL_HEADER_CHEVRON_W_PX / 2;

/**
 * X from card inner left to header **title** / input-group **title** text start (padding + chevron + gap).
 * Matches NodeShell and Function `renderInputGroup` header chains.
 */
export const NODE_HEADER_TITLE_TEXT_X_FROM_CARD_INNER =
  NODE_SHELL_HEADER_PADDING_LEFT_PX +
  NODE_SHELL_HEADER_CHEVRON_W_PX +
  NODE_SHELL_HEADER_CHEVRON_TITLE_GAP_PX;

/**
 * Matches `nodeLabelColumn.paddingLeft` (`figmaNodeTokens`) — row label **text** starts this far past
 * the row’s `paddingLeft`.
 */
export const NODE_ROW_LABEL_TEXT_INSET_FROM_ROW_PADDING_PX = 4;

/**
 * `.NodeRow` horizontal `paddingLeft` when pin style is **contained** so label text lines up with
 * header title text (`NODE_HEADER_TITLE_TEXT_X_FROM_CARD_INNER` − label column inset).
 */
export const NODE_ROW_CONTAINED_ROW_PADDING_LEFT_PX =
  NODE_HEADER_TITLE_TEXT_X_FROM_CARD_INNER - NODE_ROW_LABEL_TEXT_INSET_FROM_ROW_PADDING_PX;

/**
 * Horizontal distance from the **card inner left** to property-row label **text** start: `.NodeRow`
 * `paddingLeft` + `nodeLabelColumn.paddingLeft` (classic/orbit: 8+4; contained: {@link NODE_ROW_CONTAINED_ROW_PADDING_LEFT_PX}+4).
 */
export function nodeRowPropertyLabelTextStartFromCardInnerLeftPx(
  pinStyle: GraphPinStyleId
): number {
  const rowPadLeft =
    pinStyle === 'contained' ? NODE_ROW_CONTAINED_ROW_PADDING_LEFT_PX : 8;
  return rowPadLeft + NODE_ROW_LABEL_TEXT_INSET_FROM_ROW_PADDING_PX;
}

/**
 * Extra `padding-left` on the node header title row when the expand chevron is right-aligned, so the
 * title lines up with `.NodeRow` label text. `headerContentLeftPadPx` is NodeShell’s header `paddingLeft`
 * (4 with leading chevron, 8 when the chevron is trailing-only).
 */
export function nodeHeaderTitleExtraPadLeftWhenRightChevron(
  pinStyle: GraphPinStyleId,
  headerContentLeftPadPx: number
): number {
  return Math.max(
    0,
    nodeRowPropertyLabelTextStartFromCardInnerLeftPx(pinStyle) - headerContentLeftPadPx
  );
}

/**
 * Output-node body row `paddingLeft` when **contained** (no `nodeLabelColumn` pad; span starts at row pad).
 */
export const NODE_OUTPUT_BODY_CONTAINED_ROW_PADDING_LEFT_PX = NODE_HEADER_TITLE_TEXT_X_FROM_CARD_INNER;

/**
 * Horizontal row padding for `.NodeRow`-style property rows by pin style. Uses longhands so **classic**
 * / **orbit** keep symmetric left/right (`--foundation-padding-small`); **contained** uses a larger left
 * inset for title alignment without changing the right inset.
 */
export function nodeRowPaddingForPinStyle(pinStyle: GraphPinStyleId): {
  paddingTop: string;
  paddingBottom: string;
  paddingLeft: string | number;
  paddingRight: string;
} {
  const y = 'var(--foundation-padding-xsmall)';
  const inset = 'var(--foundation-padding-small)';
  if (pinStyle === 'contained') {
    return {
      paddingTop: y,
      paddingBottom: y,
      paddingLeft: NODE_ROW_CONTAINED_ROW_PADDING_LEFT_PX,
      paddingRight: inset,
    };
  }
  return {
    paddingTop: y,
    paddingBottom: y,
    paddingLeft: inset,
    paddingRight: inset,
  };
}

export function pinStyleUsesFullOuterRing(style: GraphPinStyleId): boolean {
  return style !== 'classic';
}

/** 2px `--studio-surface-0` halo (`.graph-pin-outer-ring`) — only **classic**; orbit/contained omit it. */
export function pinStyleShowsOuterSurfaceRing(style: GraphPinStyleId): boolean {
  return style === 'classic';
}

export function pinClipOuterForCanvas(
  style: GraphPinStyleId,
  side: 'left' | 'right'
): 'left' | 'right' | undefined {
  return pinStyleUsesFullOuterRing(style) ? undefined : side;
}

export function outputBodyInputPinCenterX(nodeX: number, pinStyle: GraphPinStyleId): number {
  switch (pinStyle) {
    case 'classic':
      return nodeX + NODE_CARD_BORDER + OUTPUT_INPUT_ROW_PADDING_X;
    case 'orbit':
      return nodeX - PIN_STYLE_FRAME_ANCHOR_PX - NODE_INPUT_PIN_OUTER_R;
    case 'contained':
      return nodeX + NODE_CARD_BORDER + NODE_HEADER_CHEVRON_CENTER_X_FROM_CARD_INNER;
  }
}

/**
 * `left` (px) for body input pins with `translate(-50%, …)` so center matches {@link functionLikeInputPinCenterX}.
 *
 * **Classic:** Browsers align this `left` with the padded content column of the row, so the graph origin
 * includes `NODE_ROW_PADDING_X` (restores half-off pins like the header output).
 *
 * **Orbit:** subtract only `NODE_CARD_BORDER` so sockets match graph centers.
 *
 * **Contained:** same origin as orbit; centers use {@link NODE_HEADER_CHEVRON_CENTER_X_FROM_CARD_INNER}.
 */
export function functionBodyInputPinLeftLocalPx(nodeX: number, pinStyle: GraphPinStyleId): number {
  const center = functionLikeInputPinCenterX(nodeX, pinStyle);
  if (pinStyle === 'classic') {
    return center - (nodeX + NODE_CARD_BORDER + NODE_ROW_PADDING_X);
  }
  return center - (nodeX + NODE_CARD_BORDER);
}

/**
 * `left` (px) for output-node body input with `translate(-50%, …)`; row uses `paddingLeft: OUTPUT_INPUT_ROW_PADDING_X`.
 * Same classic vs orbit/contained origin split as {@link functionBodyInputPinLeftLocalPx}.
 */
export function outputBodyInputPinLeftLocalPx(nodeX: number, pinStyle: GraphPinStyleId): number {
  const center = outputBodyInputPinCenterX(nodeX, pinStyle);
  if (pinStyle === 'classic') {
    return center - (nodeX + NODE_CARD_BORDER + OUTPUT_INPUT_ROW_PADDING_X);
  }
  return center - (nodeX + NODE_CARD_BORDER);
}

/**
 * Collapsed-card input attachment X (graph space). **Classic** and **orbit** use the same flush-left
 * stub so wires meet the frame; expanded **orbit** inputs still use {@link functionLikeInputPinCenterX}.
 * Collapsed **Input Group** child ports (node expanded) use this same stub X so orbit wires meet the frame
 * like a fully collapsed node. **Contained** keeps the chevron-aligned center on the card.
 */
export function collapsedStubInputWireX(nodeX: number, pinStyle: GraphPinStyleId): number {
  if (pinStyle === 'classic' || pinStyle === 'orbit') {
    return nodeX + NODE_CARD_BORDER + NODE_INPUT_WIRE_X_NUDGE;
  }
  return functionLikeInputPinCenterX(nodeX, pinStyle);
}

/**
 * Body-row `left` (with `translate(-50%, …)`) so pin **center** matches {@link collapsedStubInputWireX}
 * in graph space — used for collapsed Input Group stub hits (same contract as fully collapsed node inputs).
 */
export function collapsedInputGroupStubPinCenterXLocalPx(
  nodeX: number,
  pinStyle: GraphPinStyleId
): number {
  return collapsedStubInputWireX(nodeX, pinStyle) - nodeX - NODE_CARD_BORDER;
}

function functionInputPinWireXForFunctionPortIndex(
  node: FunctionLayoutBody,
  portIndex: number,
  pinStyle: GraphPinStyleId
): number {
  const layouts = layoutFunctionInputPorts(node);
  const hit = layouts.find((L) => L.portIndex === portIndex);
  const groupSlot =
    hit?.target.kind === 'inputGroupChild'
      ? node.slots[hit.target.groupSlotIndex]
      : undefined;
  if (groupSlot && !inputGroupExpanded(groupSlot)) {
    return collapsedStubInputWireX(node.x, pinStyle);
  }
  return functionLikeInputPinCenterX(node.x, pinStyle);
}

export function functionLikeInputPinCenterX(nodeX: number, pinStyle: GraphPinStyleId): number {
  switch (pinStyle) {
    case 'classic':
      return nodeX + NODE_CARD_BORDER + NODE_ROW_PADDING_X;
    case 'orbit':
      return nodeX - PIN_STYLE_FRAME_ANCHOR_PX - NODE_INPUT_PIN_OUTER_R;
    case 'contained':
      return nodeX + NODE_CARD_BORDER + NODE_HEADER_CHEVRON_CENTER_X_FROM_CARD_INNER;
  }
}

export function functionLikeOutputPinCenterX(nodeX: number, w: number, pinStyle: GraphPinStyleId): number {
  const innerR = nodeX + w - NODE_CARD_BORDER;
  const outerR = nodeX + w;
  switch (pinStyle) {
    case 'classic':
      return innerR + PIN_OFFSET - NODE_INPUT_PIN_OUTER_R;
    case 'orbit':
      return outerR + PIN_STYLE_FRAME_ANCHOR_PX + NODE_INPUT_PIN_OUTER_R;
    case 'contained':
      return outerR - NODE_CARD_BORDER - NODE_HEADER_CHEVRON_CENTER_X_FROM_CARD_INNER;
  }
}

export function parameterOutputPinCenterX(nodeX: number, w: number, pinStyle: GraphPinStyleId): number {
  const innerR = nodeX + w - NODE_CARD_CONTENT_INSET;
  const outerR = nodeX + w;
  switch (pinStyle) {
    case 'classic':
      return innerR + PIN_OFFSET - NODE_INPUT_PIN_OUTER_R;
    case 'orbit':
      return outerR + PIN_STYLE_FRAME_ANCHOR_PX + NODE_INPUT_PIN_OUTER_R;
    case 'contained':
      return outerR - NODE_CARD_BORDER - NODE_HEADER_CHEVRON_CENTER_X_FROM_CARD_INNER;
  }
}

/** Graph `Pin` socket outer diameter (px); core uses `box-sizing: border-box` at this size. */
export const GRAPH_PIN_DIAMETER_PX = 12;
/** Half of {@link GRAPH_PIN_DIAMETER_PX} — wire endpoints, flow dot, layout math. */
export const NODE_INPUT_PIN_OUTER_R = GRAPH_PIN_DIAMETER_PX / 2;

/** Horizontal resize hit bands in {@link NodeResizeEdges} — below {@link GRAPH_ORBIT_PIN_ABOVE_RESIZE_Z_INDEX}. */
export const GRAPH_NODE_RESIZE_EDGE_Z_INDEX = 4;
/**
 * Orbit sockets sit past the card edge in the same horizontal band as resize targets — stack pin
 * hit wrappers above resize so wiring wins where they overlap.
 */
export const GRAPH_ORBIT_PIN_ABOVE_RESIZE_Z_INDEX = 5;

/** Merge into pin wrapper `style` when sockets must paint above {@link GRAPH_NODE_RESIZE_EDGE_Z_INDEX}. */
export function graphOrbitPinHitStackStyle(pinStyle: GraphPinStyleId): { zIndex: number } | Record<string, never> {
  return pinStyle === 'orbit' ? { zIndex: GRAPH_ORBIT_PIN_ABOVE_RESIZE_Z_INDEX } : {};
}

/**
 * CSS `right` (px) for header / card-trailing output pin — tuned so pin **center** matches
 * {@link functionLikeOutputPinCenterX} / {@link parameterOutputPinCenterX}. Orbit uses
 * {@link PIN_STYLE_FRAME_ANCHOR_PX} + full pin diameter (not {@link PIN_OFFSET}).
 */
export function cardTrailingOutputRightCss(style: GraphPinStyleId): number {
  switch (style) {
    case 'classic':
      return -PIN_OFFSET;
    case 'orbit':
      return -(PIN_STYLE_FRAME_ANCHOR_PX + GRAPH_PIN_DIAMETER_PX);
    case 'contained':
      return NODE_HEADER_CHEVRON_CENTER_X_FROM_CARD_INNER - NODE_INPUT_PIN_OUTER_R;
  }
}

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
  if (!('expanded' in node)) return true;
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
export type NodeHeightOptions = {
  /**
   * When false, expanded Generate body height omits the in-card Run row (Run lives on the context toolbar).
   * Default true.
   */
  includeGenerateRunRow?: boolean;
};

export function generateExpandedBodyHeight(
  node: GenerateNode,
  edges: readonly GraphEdge[],
  opts?: NodeHeightOptions
): number {
  const preview =
    node.generativePhase === 'output' ? generateOutputPreviewStackHeight(node) : 0;
  const inputBodyRows = node.inputGroupExpanded ? generateInputRowCount(node.id, edges) : 0;
  const inputBodyH = inputBodyRows * ROW_H;
  const runH = opts?.includeGenerateRunRow === false ? 0 : GENERATE_RUN_ROW_H;
  return (
    preview +
    GENERATE_TEXTAREA_SECTION_H +
    GENERATE_INPUT_GROUP_HEADER_H +
    inputBodyH +
    runH
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

/** Legacy: management tasks are pinless; bounds use card height only. */
export function taskPinVerticalExtentPx(): number {
  return 0;
}

export function nodeHeight(
  node: GraphNode,
  edges: readonly GraphEdge[] = [],
  opts?: NodeHeightOptions
): number {
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
      return HEADER_H + generateExpandedBodyHeight(node, edges, opts);
    case 'groupInput': {
      const rows = Math.max(1, node.outputs.length);
      return HEADER_H + rows * ROW_H;
    }
    case 'groupOutput':
      return HEADER_H + ROW_H;
    case 'task':
      return MANAGEMENT_TASK_ROW_HEIGHT_PX;
  }
}

/** Graph-space attachment point for edge paths (socket center for most pins; collapsed stubs differ). */
export function pinGraphPosition(
  node: GraphNode,
  port: GraphOutPort | `in-${number}`,
  edges: readonly GraphEdge[] = [],
  pinStyle: GraphPinStyleId = 'classic'
): { x: number; y: number } {
  switch (node.kind) {
    case 'parameter': {
      const w = graphNodeParameterWidth(node);
      return {
        x: parameterOutputPinCenterX(node.x, w, pinStyle),
        y: node.y + PARAMETER_CHIP_H / 2 + NODE_ROW_PIN_CENTER_Y_OFFSET,
      };
    }
    case 'function': {
      const w = graphNodeCardWidth(node);
      if (port === 'out') {
        return {
          x: functionLikeOutputPinCenterX(node.x, w, pinStyle),
          y: graphHeaderPinCenterY(node.y),
        };
      }
      if (collapsed(node)) {
        return {
          x: collapsedStubInputWireX(node.x, pinStyle),
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
        x: functionInputPinWireXForFunctionPortIndex(node, idx, pinStyle),
        y: centerY,
      };
    }
    case 'group': {
      const w = graphNodeCardWidth(node);
      if (port === 'out') {
        return {
          x: functionLikeOutputPinCenterX(node.x, w, pinStyle),
          y: graphHeaderPinCenterY(node.y),
        };
      }
      if (collapsed(node)) {
        return {
          x: collapsedStubInputWireX(node.x, pinStyle),
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
        x: functionInputPinWireXForFunctionPortIndex(node, idx, pinStyle),
        y: centerY,
      };
    }
    case 'output': {
      if (collapsed(node)) {
        return {
          x: collapsedStubInputWireX(node.x, pinStyle),
          y: graphHeaderPinCenterY(node.y),
        };
      }
      return {
        x: outputBodyInputPinCenterX(node.x, pinStyle),
        y: inputSlotRowCenterY(node.y + NODE_CARD_BORDER + HEADER_H),
      };
    }
    case 'generate': {
      const w = graphNodeCardWidth(node);
      if (port === 'out') {
        return {
          x: functionLikeOutputPinCenterX(node.x, w, pinStyle),
          y: graphHeaderPinCenterY(node.y),
        };
      }
      if (collapsed(node)) {
        return {
          x: collapsedStubInputWireX(node.x, pinStyle),
          y: graphHeaderPinCenterY(node.y),
        };
      }
      const cy = generateInputPortCenterY(node, edges, port as `in-${number}`);
      const inputsGroupHeaderTop =
        node.y +
        NODE_CARD_BORDER +
        HEADER_H +
        (node.generativePhase === 'output' ? generateOutputPreviewStackHeight(node) : 0) +
        GENERATE_TEXTAREA_SECTION_H;
      /** Collapsed input group: stub pin centers on the “Inputs” header row. */
      const yFallback = inputSlotRowCenterY(inputsGroupHeaderTop);
      const x =
        !node.inputGroupExpanded
          ? collapsedStubInputWireX(node.x, pinStyle)
          : functionLikeInputPinCenterX(node.x, pinStyle);
      return {
        x,
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
        x: functionLikeOutputPinCenterX(node.x, w, pinStyle),
        y: centerY,
      };
    }
    case 'groupOutput': {
      if (port === 'in-0') {
        return {
          x: functionLikeInputPinCenterX(node.x, pinStyle),
          y: inputSlotRowCenterY(node.y + NODE_CARD_BORDER + HEADER_H),
        };
      }
      return {
        x: collapsedStubInputWireX(node.x, pinStyle),
        y: graphHeaderPinCenterY(node.y),
      };
    }
    case 'task': {
      const w = graphNodeCardWidth(node);
      const cx = node.x + w / 2;
      const h = MANAGEMENT_TASK_ROW_HEIGHT_PX;
      if (port === 'out') {
        return { x: cx, y: node.y + h };
      }
      return { x: cx, y: node.y };
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

/** Vertical cubic — for task-to-task dependency edges (top output → bottom input). */
export function bezierVerticalHandleDy(y1: number, y2: number): number {
  return Math.max(48, Math.abs(y2 - y1) * 0.45);
}

export function bezierVerticalPath(x1: number, y1: number, x2: number, y2: number): string {
  const span = Math.abs(y2 - y1);
  const rawD = bezierVerticalHandleDy(y1, y2);
  const d = span <= 0 ? 0 : Math.min(rawD, Math.max(0, span / 2 - 1e-3));
  if (y2 >= y1) {
    return `M ${x1} ${y1} C ${x1} ${y1 + d} ${x2} ${y2 - d} ${x2} ${y2}`;
  }
  return `M ${x1} ${y1} C ${x1} ${y1 - d} ${x2} ${y2 + d} ${x2} ${y2}`;
}
