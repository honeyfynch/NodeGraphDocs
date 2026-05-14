import { useLayoutEffect, useMemo, useState, type ReactNode, type RefObject } from 'react';
import type { GraphNode } from './types';
import mediaPlayLargeUrl from '../assets/icons/media-play-large.svg?url';
import mediaPauseLargeUrl from '../assets/icons/media-pause-large.svg?url';
import frameCollapseUrl from '../assets/icons/context-toolbar-frame-collapse.svg?url';
import frameExpandUrl from '../assets/icons/context-toolbar-frame-expand.svg?url';
import viewOnUrl from '../assets/icons/context-toolbar-view-on.svg?url';
import viewOffUrl from '../assets/icons/context-toolbar-view-off.svg?url';
import generateRunUrl from '../assets/icons/context-toolbar-generate-run.svg?url';

const TOOLBAR_GAP_ABOVE_SELECTION_PX = 4;
const TOOLBAR_BACKPLATE_H_PX = 34;
/** Docked mode: top of toolbar (absolute in graph surface) = this gap below the graph ribbon. */
const TOOLBAR_DOCKED_TOP_OFFSET_PX = 12;

export type GraphSelectionContextToolbarProps = {
  open: boolean;
  /** When true, anchor toolbar centered below the ribbon instead of above the selection. */
  docked: boolean;
  selectedIds: readonly string[];
  nodes: readonly GraphNode[];
  /** Map node id → element used for union bounding rect (client coords). */
  nodeElById: ReadonlyMap<string, HTMLElement>;
  /** Graph surface element — toolbar `left`/`top` are relative to this box and clip with `overflow: hidden`. */
  positionRootRef: RefObject<HTMLElement | null>;
  playMode: boolean;
  graphPlayActive: boolean;
  generativeNodesEnabled: boolean;
  localPlayNodeIds: readonly string[];
  /** Bumps toolbar position when the graph view transform or node mounts change. */
  viewLayoutKey: string;
  onUnifyExpand: () => void;
  onToggleMute: () => void;
  onToggleSelectionPlay: () => void;
  onRunGenerateSelection: () => void;
};

/** Pin-style hover label (`graph-pin-tooltip`); toolbar positions it below to avoid surface clip. */
function ContextToolbarTooltipWrap({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="graph-pin-wrap">
      {children}
      <span className="graph-pin-tooltip" role="tooltip">
        {label}
      </span>
    </span>
  );
}

function unionClientRect(
  ids: readonly string[],
  nodeElById: ReadonlyMap<string, HTMLElement>
): DOMRect | null {
  let u: DOMRect | null = null;
  for (const id of ids) {
    const el = nodeElById.get(id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (!u) {
      u = new DOMRect(r.x, r.y, r.width, r.height);
    } else {
      const left = Math.min(u.left, r.left);
      const top = Math.min(u.top, r.top);
      const right = Math.max(u.right, r.right);
      const bottom = Math.max(u.bottom, r.bottom);
      u = new DOMRect(left, top, right - left, bottom - top);
    }
  }
  return u;
}

export function GraphSelectionContextToolbar({
  open,
  docked,
  selectedIds,
  nodes,
  nodeElById,
  positionRootRef,
  playMode,
  graphPlayActive,
  generativeNodesEnabled,
  localPlayNodeIds,
  viewLayoutKey,
  onUnifyExpand,
  onToggleMute,
  onToggleSelectionPlay,
  onRunGenerateSelection,
}: GraphSelectionContextToolbarProps) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const firstNode = useMemo(() => {
    const id = selectedIds[0];
    return id ? nodes.find((n) => n.id === id) : undefined;
  }, [nodes, selectedIds]);

  const selectionIsOnlyGenerate = useMemo(() => {
    if (selectedIds.length === 0) return false;
    for (const id of selectedIds) {
      const n = nodes.find((x) => x.id === id);
      if (!n || n.kind !== 'generate') return false;
    }
    return true;
  }, [nodes, selectedIds]);

  /** Local play applies to function-like outputs; hide when selection is only Generate nodes (Run covers them). */
  const showPlayBtn =
    playMode && !(generativeNodesEnabled && selectionIsOnlyGenerate);
  const selectionHasGenerate =
    generativeNodesEnabled &&
    selectedIds.some((id) => nodes.some((n) => n.id === id && n.kind === 'generate'));

  const expandShowsCollapse =
    Boolean(firstNode && 'expanded' in firstNode && firstNode.expanded);
  const muteShowsMuted = Boolean(firstNode?.disabled);
  const playSet = useMemo(() => new Set(localPlayNodeIds), [localPlayNodeIds]);
  const firstId = selectedIds[0];
  const playShowsPause = Boolean(firstId && playSet.has(firstId));

  useLayoutEffect(() => {
    if (!open || selectedIds.length === 0) {
      setPos(null);
      return;
    }
    const measure = () => {
      const root = positionRootRef.current;
      if (!root) {
        setPos(null);
        return;
      }
      const rr = root.getBoundingClientRect();
      if (docked) {
        setPos({ left: rr.width / 2, top: TOOLBAR_DOCKED_TOP_OFFSET_PX });
        return;
      }
      const u = unionClientRect(selectedIds, nodeElById);
      if (!u || u.width <= 0 || u.height <= 0) {
        setPos(null);
        return;
      }
      setPos({
        left: u.left - rr.left + u.width / 2,
        top: u.top - rr.top - TOOLBAR_GAP_ABOVE_SELECTION_PX - TOOLBAR_BACKPLATE_H_PX,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, docked, selectedIds, nodeElById, nodes, viewLayoutKey, positionRootRef]);

  if (!open || selectedIds.length === 0 || !firstNode || !pos) return null;

  /** During graph runtime, mirror the ribbon graph play control (pause affordance). */
  const playIconShowsPause = graphPlayActive || playShowsPause;
  const playIconSrc = playIconShowsPause ? mediaPauseLargeUrl : mediaPlayLargeUrl;
  const playDisabled = graphPlayActive;
  const playTooltip = playIconShowsPause ? 'Pause' : 'Play';
  const playAriaLabel = graphPlayActive
    ? 'Graph runtime is active — pause from the graph toolbar'
    : playShowsPause
      ? 'Pause selection playback'
      : 'Play selection playback';

  const expandTooltip = expandShowsCollapse ? 'Collapse' : 'Expand';
  const muteTooltip = muteShowsMuted ? 'Unmute' : 'Mute';

  return (
    <div
      className="graph-context-toolbar"
      style={{
        left: pos.left,
        top: pos.top,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="graph-context-toolbar__backplate" role="toolbar" aria-label="Node actions">
        <ContextToolbarTooltipWrap label={expandTooltip}>
          <button
            type="button"
            className="graph-context-toolbar__btn"
            aria-label={expandShowsCollapse ? 'Collapse selected nodes' : 'Expand selected nodes'}
            onClick={onUnifyExpand}
          >
            <img
              src={expandShowsCollapse ? frameCollapseUrl : frameExpandUrl}
              width={expandShowsCollapse ? 12 : 16}
              height={expandShowsCollapse ? 12 : 16}
              alt=""
              draggable={false}
              className="graph-context-toolbar__img"
            />
          </button>
        </ContextToolbarTooltipWrap>
        <ContextToolbarTooltipWrap label={muteTooltip}>
          <button
            type="button"
            className="graph-context-toolbar__btn"
            aria-label={muteShowsMuted ? 'Unmute selected nodes' : 'Mute selected nodes'}
            onClick={onToggleMute}
          >
            <img
              src={muteShowsMuted ? viewOffUrl : viewOnUrl}
              width={16}
              height={16}
              alt=""
              draggable={false}
              className="graph-context-toolbar__img"
            />
          </button>
        </ContextToolbarTooltipWrap>
        {showPlayBtn ? (
          <ContextToolbarTooltipWrap label={playTooltip}>
            <button
              type="button"
              className="graph-context-toolbar__btn"
              aria-label={playAriaLabel}
              aria-pressed={playIconShowsPause}
              disabled={playDisabled}
              style={playDisabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
              onClick={onToggleSelectionPlay}
            >
              <img
                src={playIconSrc}
                width={16}
                height={16}
                alt=""
                draggable={false}
                className="graph-context-toolbar__img"
              />
            </button>
          </ContextToolbarTooltipWrap>
        ) : null}
        {selectionHasGenerate ? (
          <ContextToolbarTooltipWrap label="Generate">
            <button
              type="button"
              className="graph-context-toolbar__btn"
              aria-label="Run generative nodes in selection"
              onClick={onRunGenerateSelection}
            >
              <img
                src={generateRunUrl}
                width={16}
                height={16}
                alt=""
                draggable={false}
                className="graph-context-toolbar__img"
              />
            </button>
          </ContextToolbarTooltipWrap>
        ) : null}
      </div>
    </div>
  );
}
