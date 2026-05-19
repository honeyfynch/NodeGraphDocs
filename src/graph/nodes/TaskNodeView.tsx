import { useCallback } from 'react';
import { useGraph } from '../GraphContext';
import { graphNodeWidth, nodeHeight } from '../geometry';
import type { TaskLeadingIconId, TaskNode } from '../types';
import { EditableNodeTitle } from '../EditableNodeTitle';
import { NodeResizeEdges } from '../NodeResizeEdges';

import progressCapUrl from '../../assets/icons/management-task/figma-progress-cap.svg';
import progressSegmentUrl from '../../assets/icons/management-task/figma-progress-segment.svg';
import progressTrackUrl from '../../assets/icons/management-task/figma-progress-track.svg';
import statusCheckMaskUrl from '../../assets/icons/management-task/figma-status-check-mask.svg';
import leadingCodeUrl from '../../assets/icons/management-task/figma-leading-code.svg';
import leadingCollectUrl from '../../assets/icons/management-task/figma-leading-collect.svg';
import leadingCommunityUrl from '../../assets/icons/management-task/figma-leading-community.svg';
import leadingNpcUrl from '../../assets/icons/management-task/figma-leading-npc.svg';
import leadingPromptUrl from '../../assets/icons/management-task/figma-leading-prompt.svg';
import leadingVerifyUrl from '../../assets/icons/management-task/figma-leading-verify.svg';

/**
 * Leading glyphs exported from Figma Node-Graph-Draft via Desktop MCP `get_design_context`
 * (localhost asset bridge). Node ids: prompt `2036:13282` Plus (message field); community `2036:23954`;
 * code `2036:24001`; collect `2036:24011`; npc `2036:24016`; verify `2036:24006` (HammerCode).
 *
 * State trailing icons: in-progress `2036:29672` ProgressCircleDeterminate (track + arc segments);
 * completed `2036:29665` check-contained-fill (success fill + mask shape).
 */
const LEADING_SRC: Record<TaskLeadingIconId, string> = {
  prompt: leadingPromptUrl,
  community: leadingCommunityUrl,
  code: leadingCodeUrl,
  collect: leadingCollectUrl,
  npc: leadingNpcUrl,
  verify: leadingVerifyUrl,
};

type Props = {
  node: TaskNode;
  selected: boolean;
  progressiveCardOpacity?: number;
  onSelect: (e: React.PointerEvent) => void;
  onTitleCommit: (title: string) => void;
  onTitleDragStart: (start: { clientX: number; clientY: number }) => void;
  onHeaderDragPointerDown: (e: React.PointerEvent) => void;
  onResizeEdgePointerDown?: (edge: 'left' | 'right', e: React.PointerEvent) => void;
  onNodeContextMenu?: (e: React.MouseEvent) => void;
  onBoundsEl?: (el: HTMLDivElement | null) => void;
};

/**
 * Management graph task row — no pins; fixed dependency wiring only.
 * States: pending / in_progress / completed (Figma Node Graph Draft task strip).
 */
export function TaskNodeView({
  node,
  selected,
  progressiveCardOpacity = 1,
  onSelect,
  onTitleCommit,
  onTitleDragStart,
  onHeaderDragPointerDown,
  onResizeEdgePointerDown,
  onNodeContextMenu,
  onBoundsEl,
}: Props) {
  const { state: graphState } = useGraph();
  const w = graphNodeWidth(node);
  const cardH = nodeHeight(node);

  const boundsRef = useCallback(
    (el: HTMLDivElement | null) => {
      onBoundsEl?.(el);
    },
    [onBoundsEl]
  );

  const stateClass =
    node.taskState === 'in_progress'
      ? 'management-task-node--in_progress'
      : node.taskState === 'completed'
        ? 'management-task-node--completed'
        : 'management-task-node--pending';

  return (
    <div
      className={`management-task-node ${stateClass}${selected ? ' management-task-node--selected' : ''}`}
      ref={boundsRef}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: w,
        height: cardH,
        zIndex: selected ? 4 : 1,
        opacity: (node.disabled ? 0.3 : 1) * progressiveCardOpacity,
        boxSizing: 'border-box',
      }}
      onContextMenu={(e) => {
        onNodeContextMenu?.(e);
      }}
    >
      {onResizeEdgePointerDown ? (
        <NodeResizeEdges
          node={node}
          edges={graphState.edges}
          onEdgePointerDown={onResizeEdgePointerDown}
        />
      ) : null}
      <div
        className="management-task-node__row"
        onPointerDownCapture={(e) => onSelect(e)}
        onPointerDown={(e) => {
          e.stopPropagation();
          onHeaderDragPointerDown(e);
        }}
      >
        <img
          className="management-task-node__leading"
          src={LEADING_SRC[node.leadingIconId] ?? LEADING_SRC.prompt}
          alt=""
          width={14}
          height={14}
          draggable={false}
        />
        <div className="management-task-node__title">
          <EditableNodeTitle
            value={node.title}
            onCommit={onTitleCommit}
            onTitleDragStart={onTitleDragStart}
          />
        </div>
        <div className="management-task-node__trailing" aria-hidden>
          {node.taskState === 'in_progress' ? (
            <div className="management-task-node__progress" data-figma-node="2036:29672">
              <img src={progressTrackUrl} alt="" className="management-task-node__progress-track" />
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="management-task-node__progress-arc"
                  style={{ transform: `rotate(${90 * i}deg)` }}
                >
                  <div className="management-task-node__progress-arc-inner">
                    <img
                      src={i === 3 ? progressCapUrl : progressSegmentUrl}
                      alt=""
                      draggable={false}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {node.taskState === 'completed' ? (
            <div
              className="management-task-node__done"
              data-figma-node="2036:29665"
              style={{
                maskImage: `url(${statusCheckMaskUrl})`,
                WebkitMaskImage: `url(${statusCheckMaskUrl})`,
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
