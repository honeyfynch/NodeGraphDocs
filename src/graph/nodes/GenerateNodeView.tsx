import { useCallback } from 'react';
import { useGraph } from '../GraphContext';
import { foundationLayout, nodeLabelColumn, nodeRow } from '../figmaNodeTokens';
import {
  GENERATE_BODY_PAD_Y_PX,
  GENERATE_OUTPUT_MEDIA_ROW_PAD_BOTTOM_PX,
  GENERATE_OUTPUT_MEDIA_ROW_PAD_TOP_PX,
  GENERATE_RUN_ROW_H,
  GENERATE_TEXTAREA_SECTION_H,
  generateOutputPreviewStackHeight,
  generateWiredInIndices,
  graphNodeWidth,
  graphOrbitPinHitStackStyle,
  GRAPH_ORBIT_PIN_ABOVE_RESIZE_Z_INDEX,
  nodeHeight,
  NODE_GRAPH_RIGHT_EXPAND_CHEVRON_BUTTON_RIGHT_PX,
  NODE_GRAPH_RIGHT_EXPAND_TITLE_PAD_RIGHT_PX,
  nodeHeaderTitleExtraPadLeftWhenRightChevron,
  NODE_ROW_PADDING_X,
  NODE_ROW_PIN_CENTER_Y_OFFSET,
  ROW_H,
  cardTrailingOutputRightCss,
  functionBodyInputPinLeftLocalPx,
  nodeRowPaddingForPinStyle,
} from '../geometry';
import type { GenerateNode, GraphEdge, GraphNode, GraphOutPort } from '../types';
import generatePreviewUnionUrl from '../../assets/icons/generate-preview-union.svg?url';
import { EditableNodeTitle } from '../EditableNodeTitle';
import { NodeShell } from '../NodeShell';
import { NodeResizeEdges } from '../NodeResizeEdges';
import { Pin } from '../Pin';
import type { GraphWireColorId } from '../pinColors';
import { Button } from '../../foundation/Button';
import chevronCollapsedUrl from '../../assets/icons/node-header-chevron-collapsed.svg?url';
import chevronExpandedUrl from '../../assets/icons/node-header-chevron-expanded.svg?url';

const GENERATE_HEADER_FILL = 'var(--studio-generate-header)';
const GENERATE_BODY_FILL = 'var(--studio-generate-body)';
/** Figma `368:23582` — `radius/small` on Node frame (`--studio-generate-node-radius`). */
const GENERATE_CARD_RADIUS_PX = 4;
const GENERATE_PIN_COLOR: GraphWireColorId = 'gray';

type Props = {
  node: GenerateNode;
  selected: boolean;
  progressiveCardOpacity?: number;
  progressiveOutputPinOpacity?: (port: GraphOutPort) => number;
  outputConnected: boolean;
  inputConnected: (port: `in-${number}`) => boolean;
  edges: readonly GraphEdge[];
  onSelect: (e: React.PointerEvent) => void;
  onToggleExpand: () => void;
  onTitleCommit: (title: string) => void;
  onTitleDragStart: (start: { clientX: number; clientY: number }) => void;
  onHeaderDragPointerDown: (e: React.PointerEvent) => void;
  onOutputPointerDown: (e: React.PointerEvent) => void;
  onInputPointerDown: (port: `in-${number}`, e: React.PointerEvent) => void;
  onInputPointerUp: (port: `in-${number}`, e: React.PointerEvent) => void;
  onPromptTextChange: (text: string) => void;
  onToggleInputGroup: () => void;
  onRun: () => void;
  onResizeEdgePointerDown?: (edge: 'left' | 'right', e: React.PointerEvent) => void;
  onNodeContextMenu?: (e: React.MouseEvent) => void;
  showExpandChevron?: boolean;
  /** When true (default), node header + Generate input-group chevron align trailing. */
  rightAlignedChevron?: boolean;
  onBoundsEl?: (el: HTMLDivElement | null) => void;
};

function inputLabelForPort(
  nodeId: string,
  port: `in-${number}`,
  edges: readonly GraphEdge[],
  nodes: readonly GraphNode[]
): string {
  const e = edges.find((ed) => ed.to.nodeId === nodeId && ed.to.port === port);
  if (!e) return 'Add input...';
  const src = nodes.find((n) => n.id === e.from.nodeId);
  return src?.title ?? 'Input';
}

export function GenerateNodeView({
  node,
  selected,
  progressiveCardOpacity = 1,
  progressiveOutputPinOpacity,
  outputConnected,
  inputConnected,
  edges,
  onSelect,
  onToggleExpand,
  onTitleCommit,
  onTitleDragStart,
  onHeaderDragPointerDown,
  onOutputPointerDown,
  onInputPointerDown,
  onInputPointerUp,
  onPromptTextChange,
  onToggleInputGroup,
  onRun,
  onResizeEdgePointerDown,
  onNodeContextMenu,
  showExpandChevron = true,
  rightAlignedChevron = true,
  onBoundsEl,
}: Props) {
  const { state } = useGraph();
  const w = graphNodeWidth(node);
  const generateHeightOpts = {
    includeGenerateRunRow: !state.contextToolbar,
  } as const;
  const h = nodeHeight(node, edges, generateHeightOpts);
  const wired = generateWiredInIndices(node.id, edges);
  const nextFree = wired.length === 0 ? 0 : Math.max(...wired) + 1;
  const portOrder = [...wired, nextFree] as number[];

  const boundsRef = useCallback(
    (el: HTMLDivElement | null) => {
      onBoundsEl?.(el);
    },
    [onBoundsEl]
  );

  const headerPin = (
    <div
      style={{
        opacity: progressiveOutputPinOpacity?.('out') ?? 1,
        ...graphOrbitPinHitStackStyle(state.pinStyle),
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onOutputPointerDown(e);
      }}
    >
      <Pin
        colorId={GENERATE_PIN_COLOR}
        connected={outputConnected}
        clipOuterStrokeOn="right"
        showColorTooltip={false}
      />
    </div>
  );

  return (
    <div
      className="absolute"
      ref={boundsRef}
      style={{
        left: node.x,
        top: node.y,
        width: w,
        zIndex: selected ? 4 : 1,
        opacity: (node.disabled ? 0.3 : 1) * progressiveCardOpacity,
      }}
      onContextMenu={(e) => {
        onNodeContextMenu?.(e);
      }}
    >
      <div style={{ position: 'relative', minHeight: h }}>
        {onResizeEdgePointerDown ? (
          <NodeResizeEdges
            node={node}
            edges={edges}
            onEdgePointerDown={onResizeEdgePointerDown}
            nodeHeightOptions={generateHeightOpts}
          />
        ) : null}
        <NodeShell
          title={node.title}
          frameVariant={node.frameVariant}
          headerFillOverride={GENERATE_HEADER_FILL}
          bodyBackgroundOverride={GENERATE_BODY_FILL}
          cardBorderRadius={GENERATE_CARD_RADIUS_PX}
          selected={selected}
          width={w}
          expanded={node.expanded}
          onToggleExpand={onToggleExpand}
          onHeaderDragPointerDown={onHeaderDragPointerDown}
          onBackgroundPointerDown={onSelect}
          dimHeaderChrome={false}
          showExpandChevron={showExpandChevron}
          rightAlignedChevron={rightAlignedChevron}
          pinStyle={state.pinStyle}
          headerTrailing={headerPin}
          headerTrailingRightCss={cardTrailingOutputRightCss(state.pinStyle)}
          headerTrailingZIndex={
            state.pinStyle === 'orbit' ? GRAPH_ORBIT_PIN_ABOVE_RESIZE_Z_INDEX : 2
          }
          titleContent={
            <EditableNodeTitle
              value={node.title}
              onCommit={onTitleCommit}
              onTitleDragStart={onTitleDragStart}
            />
          }
        >
          {node.expanded ? (
            <div className="flex flex-col" style={{ width: '100%' }}>
              {node.generativePhase === 'output' ? (
                <div
                  className="w-full shrink-0"
                  style={{
                    boxSizing: 'border-box',
                    minHeight: generateOutputPreviewStackHeight(node),
                    paddingTop: GENERATE_BODY_PAD_Y_PX,
                    borderBottom: '1px solid var(--studio-generate-divider)',
                  }}
                >
                  {/** Figma `368:23583` — `.NodeRow` padding around `Media` `362:21445`. */}
                  <div
                    style={{
                      boxSizing: 'border-box',
                      paddingTop: GENERATE_OUTPUT_MEDIA_ROW_PAD_TOP_PX,
                      paddingBottom: GENERATE_OUTPUT_MEDIA_ROW_PAD_BOTTOM_PX,
                      paddingLeft: NODE_ROW_PADDING_X,
                      paddingRight: NODE_ROW_PADDING_X,
                    }}
                  >
                    {/**
                     * `362:21445` — `aspect-[200/150]` needs **in-flow** content; all-absolute children
                     * collapse the box to ~0 height (icon missing, label stuck to top).
                     */}
                    <div
                      className="relative w-full overflow-hidden"
                      style={{
                        boxSizing: 'border-box',
                        aspectRatio: '200 / 150',
                        border: '1px solid var(--studio-generate-divider)',
                        borderRadius: 'var(--studio-radius)',
                        background: 'var(--studio-generate-body)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                          zIndex: 0,
                          background: 'var(--studio-generate-highlight)',
                          opacity: 0.1,
                        }}
                        aria-hidden
                      />
                      <div
                        className="flex flex-col items-center justify-center text-center"
                        style={{
                          position: 'relative',
                          zIndex: 1,
                          gap: foundationLayout.gapXSmall,
                        }}
                      >
                        <div
                          style={{
                            position: 'relative',
                            width: 24,
                            height: 24,
                            flexShrink: 0,
                          }}
                          aria-hidden
                        >
                          <div
                            style={{
                              position: 'absolute',
                              top: '10.96%',
                              right: '10.51%',
                              bottom: '10.07%',
                              left: '3.13%',
                            }}
                          >
                            <img
                              src={generatePreviewUnionUrl}
                              alt=""
                              draggable={false}
                              style={{
                                position: 'absolute',
                                display: 'block',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                maxWidth: 'none',
                              }}
                            />
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 'var(--alpha-text-bodylarge-font-size)',
                            lineHeight: 'var(--alpha-text-bodylarge-line-height)',
                            letterSpacing: 'var(--alpha-text-bodylarge-letter-spacing)',
                            fontWeight: 400,
                            color: 'var(--studio-generate-highlight)',
                          }}
                        >
                          Preview
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/**
               * Fixed height must match `GENERATE_TEXTAREA_SECTION_H` (`368:23582` body + `.NodeRow`).
               */}
              <div
                className="flex flex-col w-full min-h-0"
                style={{
                  height: GENERATE_TEXTAREA_SECTION_H,
                  minHeight: GENERATE_TEXTAREA_SECTION_H,
                  boxSizing: 'border-box',
                  padding: `${foundationLayout.paddingSmall} ${foundationLayout.paddingSmall} ${foundationLayout.paddingSmall}`,
                  borderBottom: '1px solid var(--studio-generate-divider)',
                }}
              >
                <div
                  className="generate-node-prompt-shift relative w-full flex-1 min-h-0 flex flex-col"
                  style={{
                    background: 'var(--studio-generate-textarea-shift)',
                    borderRadius: 'var(--studio-generate-textarea-radius)',
                    minHeight: 0,
                    padding: `0 ${foundationLayout.paddingXSmall}`,
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    className="flex flex-col flex-1 min-h-0 w-full"
                    style={{
                      boxSizing: 'border-box',
                      minHeight: 66,
                      padding: `${foundationLayout.paddingSmall} 0 ${foundationLayout.paddingSmall} ${foundationLayout.paddingXXSmall}`,
                    }}
                  >
                    <textarea
                      className="generate-node-prompt-textarea w-full flex-1 min-h-0 text-sm outline-none"
                      style={{
                        minHeight: 0,
                        resize: 'none',
                        fontFamily: 'var(--alpha-font-family)',
                        fontSize: 'var(--alpha-text-bodysmall-font-size)',
                        lineHeight: 'var(--alpha-text-bodysmall-line-height)',
                        color: 'var(--studio-content-default)',
                        background: 'transparent',
                        border: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                        caretColor: 'var(--studio-content-emphasis)',
                      }}
                      placeholder="Type your prompt"
                      value={node.promptText}
                      onChange={(e) => onPromptTextChange(e.target.value)}
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col w-full">
                {/** Figma `368:23582` InputGroup header — match Function `renderInputGroup` chevron placement. */}
                <div
                  className="flex-row items-center gap-sm"
                  style={{
                    position: 'relative',
                    height: ROW_H,
                    boxSizing: 'border-box',
                    paddingLeft: rightAlignedChevron ? 8 : 4,
                    paddingRight: 8,
                  }}
                >
                  <div
                    className="flex-row items-center gap-sm flex-1 min-w-0"
                    style={{
                      paddingLeft: rightAlignedChevron
                        ? nodeHeaderTitleExtraPadLeftWhenRightChevron(state.pinStyle, 8)
                        : 0,
                      paddingRight: rightAlignedChevron
                        ? NODE_GRAPH_RIGHT_EXPAND_TITLE_PAD_RIGHT_PX
                        : 0,
                    }}
                  >
                    {!rightAlignedChevron ? (
                      <button
                        type="button"
                        className="studio-node-chevron shrink-0"
                        aria-expanded={node.inputGroupExpanded}
                        aria-label={node.inputGroupExpanded ? 'Collapse inputs' : 'Expand inputs'}
                        style={{
                          flexShrink: 0,
                          width: 24,
                          height: 24,
                          padding: 0,
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleInputGroup();
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <img
                          src={node.inputGroupExpanded ? chevronExpandedUrl : chevronCollapsedUrl}
                          width={12}
                          height={12}
                          alt=""
                          draggable={false}
                        />
                      </button>
                    ) : null}
                    <div className="flex-1 min-w-0 flex-row items-center text-sm text-muted">
                      <span
                        className="truncate"
                        style={{ lineHeight: 'var(--alpha-text-bodysmall-line-height)' }}
                      >
                        Inputs
                      </span>
                    </div>
                  </div>
                  {rightAlignedChevron ? (
                    <button
                      type="button"
                      className="studio-node-chevron shrink-0"
                      aria-expanded={node.inputGroupExpanded}
                      aria-label={node.inputGroupExpanded ? 'Collapse inputs' : 'Expand inputs'}
                      style={{
                        position: 'absolute',
                        right: NODE_GRAPH_RIGHT_EXPAND_CHEVRON_BUTTON_RIGHT_PX,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 3,
                        flexShrink: 0,
                        width: 24,
                        height: 24,
                        padding: 0,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleInputGroup();
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <img
                        src={node.inputGroupExpanded ? chevronExpandedUrl : chevronCollapsedUrl}
                        width={12}
                        height={12}
                        alt=""
                        draggable={false}
                      />
                    </button>
                  ) : null}
                </div>
                {node.inputGroupExpanded ? (
                  <div className="flex flex-col w-full">
                    {portOrder.map((pNum) => {
                      const port = `in-${pNum}` as `in-${number}`;
                      const conn = inputConnected(port);
                      return (
                        <div
                          key={port}
                          style={{
                            position: 'relative',
                            height: ROW_H,
                            ...nodeRow,
                            ...nodeRowPaddingForPinStyle(state.pinStyle),
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              left: functionBodyInputPinLeftLocalPx(node.x, state.pinStyle),
                              top: `calc(50% + ${NODE_ROW_PIN_CENTER_Y_OFFSET}px)`,
                              transform: 'translate(-50%, -50%)',
                              opacity: 1,
                              ...graphOrbitPinHitStackStyle(state.pinStyle),
                            }}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              onInputPointerDown(port, e);
                            }}
                            onPointerUp={(e) => {
                              e.stopPropagation();
                              onInputPointerUp(port, e);
                            }}
                          >
                            <Pin
                              colorId={GENERATE_PIN_COLOR}
                              connected={conn}
                              clipOuterStrokeOn="left"
                              showColorTooltip={false}
                            />
                          </div>
                          <div
                            className="text-sm truncate shrink-0"
                            style={{
                              ...nodeLabelColumn,
                              paddingLeft: foundationLayout.paddingXSmall,
                              color: 'var(--studio-content-default)',
                            }}
                          >
                            {inputLabelForPort(node.id, port, edges, state.nodes)}
                          </div>
                          <div className="flex-1 min-w-0" />
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              {/** In-card Run — hidden when Context Toolbar is on (Run is on the toolbar). */}
              {!state.contextToolbar ? (
                <div
                  className="flex-row items-stretch w-full"
                  style={{
                    borderTop: '1px solid var(--studio-generate-divider)',
                    padding: `${foundationLayout.paddingSmall} ${foundationLayout.paddingSmall} ${foundationLayout.paddingXSmall}`,
                    boxSizing: 'border-box',
                    minHeight: GENERATE_RUN_ROW_H,
                  }}
                >
                  <Button
                    variant="standard"
                    size="xsmall"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRun();
                    }}
                  >
                    Run
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </NodeShell>
      </div>
    </div>
  );
}
