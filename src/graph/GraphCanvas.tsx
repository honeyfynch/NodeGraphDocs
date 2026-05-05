import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGraph } from './GraphContext';
import type { GraphEdge, GraphNode } from './types';
import {
  bezierPath,
  inputPinColorForTarget,
  layoutFunctionInputPorts,
  NODE_INPUT_PIN_OUTER_R,
  pinGraphPosition,
  portsForInputGroupSlot,
} from './geometry';
import { PIN_HEX, type PinColorId } from './pinColors';
import { ParameterNodeView } from './nodes/ParameterNodeView';
import { FunctionNodeView } from './nodes/FunctionNodeView';
import { OutputNodeView } from './nodes/OutputNodeView';
import { GraphPlayModeControl } from './GraphPlayModeControl';

const WORLD_W = 2400;
const WORLD_H = 1600;

/** Seconds for one dot to travel the full wire when graph play is active. */
const EDGE_FLOW_DURATION_SEC = 1.5;

/** Pixels before a drag from a connected *input* pin removes that edge (avoids accidental disconnect on click). */
const WIRE_DRAG_THRESHOLD_PX = 6;

type View = { tx: number; ty: number; scale: number };

type PendingInputWire = {
  edgeId: string;
  fromNodeId: string;
  colorId: PinColorId;
  pinX: number;
  pinY: number;
  startClientX: number;
  startClientY: number;
};

type WireDrag =
  | null
  | {
      fromNodeId: string;
      colorId: PinColorId;
      startX: number;
      startY: number;
      curX: number;
      curY: number;
    };

type NodeDrag =
  | null
  | {
      nodeId: string;
      grabDx: number;
      grabDy: number;
    };

type PanDrag =
  | null
  | {
      startTx: number;
      startTy: number;
      startX: number;
      startY: number;
    };

/** Bézier `d` for the wire; path runs output → input so flow animation matches data direction. */
function edgePath(edge: GraphEdge, nodes: GraphNode[]): string | null {
  const fromNode = nodes.find((n) => n.id === edge.from.nodeId);
  const toNode = nodes.find((n) => n.id === edge.to.nodeId);
  if (!fromNode || !toNode) return null;
  const a = pinGraphPosition(fromNode, 'out');
  const b = pinGraphPosition(toNode, edge.to.port);
  return bezierPath(a.x, a.y, b.x, b.y);
}

function canPreviewEdge(
  nodes: GraphNode[],
  fromNodeId: string,
  toNodeId: string,
  toPort: `in-${number}`
): PinColorId | null {
  const fromNode = nodes.find((n) => n.id === fromNodeId);
  const toNode = nodes.find((n) => n.id === toNodeId);
  if (!fromNode || !toNode) return null;
  let outColor: PinColorId;
  if (fromNode.kind === 'parameter') outColor = fromNode.outputPinColor;
  else if (fromNode.kind === 'function') outColor = fromNode.outputPinColor;
  else return null;
  let inColor: PinColorId;
  if (toNode.kind === 'function') {
    const layouts = layoutFunctionInputPorts(toNode);
    const hit = layouts.find((L) => L.port === toPort);
    if (!hit) return null;
    inColor = inputPinColorForTarget(toNode, hit.target) ?? 'gray';
  } else if (toNode.kind === 'output') {
    if (toPort !== 'in-0') return null;
    inColor = toNode.inputPinColor;
  } else return null;
  if (outColor !== inColor) return null;
  return outColor;
}

function inputsEditableForWiring(node: GraphNode | undefined): boolean {
  if (!node) return false;
  if (node.kind === 'parameter') return false;
  return node.expanded;
}

export function GraphCanvas() {
  const { state, dispatch, connectEdge } = useGraph();
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ tx: 40, ty: 40, scale: 1 });
  const [wireDrag, setWireDrag] = useState<WireDrag>(null);
  const [nodeDrag, setNodeDrag] = useState<NodeDrag>(null);
  const [panDrag, setPanDrag] = useState<PanDrag>(null);

  const pendingInputWireRef = useRef<PendingInputWire | null>(null);
  /** When true, the next window `pointerup` must not clear an in-progress wire (click-to-route mode). */
  const ignoreNextGlobalPointerUpRef = useRef(false);
  const clickDragPinWiringRef = useRef(state.clickDragPinWiring);
  clickDragPinWiringRef.current = state.clickDragPinWiring;

  const wireDragRef = useRef(wireDrag);
  wireDragRef.current = wireDrag;
  const panDragRef = useRef(panDrag);
  panDragRef.current = panDrag;
  const nodeDragRef = useRef(nodeDrag);
  nodeDragRef.current = nodeDrag;
  const viewRef = useRef(view);
  viewRef.current = view;

  /** Bumped when graph play goes inactive → active so flow circles remount and SMIL restarts at path start. */
  const [flowEpoch, setFlowEpoch] = useState(0);
  const prevGraphPlayActiveRef = useRef(state.graphPlayActive);
  useEffect(() => {
    const prev = prevGraphPlayActiveRef.current;
    const active = state.graphPlayActive;
    prevGraphPlayActiveRef.current = active;
    if (state.playMode && active && !prev) {
      setFlowEpoch((e) => e + 1);
    }
  }, [state.graphPlayActive, state.playMode]);

  const clientToGraph = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    const v = viewRef.current;
    const x = (clientX - r.left - v.tx) / v.scale;
    const y = (clientY - r.top - v.ty) / v.scale;
    return { x, y };
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const el = containerRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const mx = e.clientX - r.left;
        const my = e.clientY - r.top;
        const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
        setView((v) => {
          const nextScale = Math.min(2.5, Math.max(0.35, v.scale * zoomFactor));
          const wx = (mx - v.tx) / v.scale;
          const wy = (my - v.ty) / v.scale;
          return {
            scale: nextScale,
            tx: mx - wx * nextScale,
            ty: my - wy * nextScale,
          };
        });
      } else {
        e.preventDefault();
        setView((v) => ({ ...v, tx: v.tx - e.deltaX, ty: v.ty - e.deltaY }));
      }
    },
    []
  );

  const beginWireDragAt = useCallback(
    (
      fromNodeId: string,
      colorId: PinColorId,
      pinX: number,
      pinY: number,
      clientX: number,
      clientY: number
    ) => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const v = viewRef.current;
      const curX = (clientX - r.left - v.tx) / v.scale;
      const curY = (clientY - r.top - v.ty) / v.scale;
      const wd = {
        fromNodeId,
        colorId,
        startX: pinX,
        startY: pinY,
        curX,
        curY,
      };
      if (!clickDragPinWiringRef.current) {
        ignoreNextGlobalPointerUpRef.current = true;
      }
      wireDragRef.current = wd;
      setWireDrag(wd);
    },
    []
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const pi = pendingInputWireRef.current;
      if (pi && !wireDragRef.current) {
        const dx = e.clientX - pi.startClientX;
        const dy = e.clientY - pi.startClientY;
        if (dx * dx + dy * dy >= WIRE_DRAG_THRESHOLD_PX * WIRE_DRAG_THRESHOLD_PX) {
          dispatch({ type: 'removeEdge', id: pi.edgeId });
          pendingInputWireRef.current = null;
          beginWireDragAt(
            pi.fromNodeId,
            pi.colorId,
            pi.pinX,
            pi.pinY,
            e.clientX,
            e.clientY
          );
        }
        return;
      }

      const pd = panDragRef.current;
      if (pd) {
        setView((v) => ({
          ...v,
          tx: pd.startTx + (e.clientX - pd.startX),
          ty: pd.startTy + (e.clientY - pd.startY),
        }));
        return;
      }
      const nd = nodeDragRef.current;
      if (nd) {
        const el = containerRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const v = viewRef.current;
        const x = (e.clientX - r.left - v.tx) / v.scale;
        const y = (e.clientY - r.top - v.ty) / v.scale;
        dispatch({
          type: 'moveNode',
          id: nd.nodeId,
          x: x - nd.grabDx,
          y: y - nd.grabDy,
        });
        return;
      }
      const wd = wireDragRef.current;
      if (wd) {
        const el = containerRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const v = viewRef.current;
        const x = (e.clientX - r.left - v.tx) / v.scale;
        const y = (e.clientY - r.top - v.ty) / v.scale;
        setWireDrag({ ...wd, curX: x, curY: y });
      }
    };

    const onUp = () => {
      pendingInputWireRef.current = null;
      setPanDrag(null);
      setNodeDrag(null);
      if (ignoreNextGlobalPointerUpRef.current) {
        ignoreNextGlobalPointerUpRef.current = false;
      } else {
        setWireDrag(null);
        wireDragRef.current = null;
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dispatch, beginWireDragAt]);

  const startPan = useCallback((e: React.PointerEvent) => {
    if (!e.altKey && e.button !== 1) return;
    e.preventDefault();
    setPanDrag({
      startTx: view.tx,
      startTy: view.ty,
      startX: e.clientX,
      startY: e.clientY,
    });
  }, [view.tx, view.ty]);

  const startDragFromPointer = useCallback(
    (nodeId: string, client: { clientX: number; clientY: number }) => {
      const n = state.nodes.find((x) => x.id === nodeId);
      if (!n) return;
      const { x, y } = clientToGraph(client.clientX, client.clientY);
      setNodeDrag({
        nodeId,
        grabDx: x - n.x,
        grabDy: y - n.y,
      });
    },
    [state.nodes, clientToGraph]
  );

  const moveNodeStart = useCallback(
    (nodeId: string, e: React.PointerEvent) => {
      e.preventDefault();
      startDragFromPointer(nodeId, { clientX: e.clientX, clientY: e.clientY });
    },
    [startDragFromPointer]
  );

  const edgeTaken = useCallback(
    (toNodeId: string, port: `in-${number}`) =>
      state.edges.some((ed) => ed.to.nodeId === toNodeId && ed.to.port === port),
    [state.edges]
  );

  const handleOutputDown = useCallback(
    (nodeId: string, e: React.PointerEvent) => {
      const n = state.nodes.find((x) => x.id === nodeId);
      if (!n || (n.kind !== 'parameter' && n.kind !== 'function')) return;
      const colorId = n.outputPinColor;
      const p = pinGraphPosition(n, 'out');
      e.preventDefault();
      e.stopPropagation();
      pendingInputWireRef.current = null;
      /** Never remove edges from the sender; disconnect only by dragging from the receiving input. */
      const wd = {
        fromNodeId: nodeId,
        colorId,
        startX: p.x,
        startY: p.y,
        curX: p.x,
        curY: p.y,
      };
      if (!clickDragPinWiringRef.current) {
        ignoreNextGlobalPointerUpRef.current = true;
      }
      wireDragRef.current = wd;
      setWireDrag(wd);
    },
    [state.nodes]
  );

  const handleInputPointerDown = useCallback(
    (toNodeId: string, port: `in-${number}`, e: React.PointerEvent) => {
      const toNode = state.nodes.find((x) => x.id === toNodeId);
      if (!inputsEditableForWiring(toNode)) return;
      const incoming = state.edges.find(
        (ed) => ed.to.nodeId === toNodeId && ed.to.port === port
      );
      if (!incoming) return;
      const fromNode = state.nodes.find((x) => x.id === incoming.from.nodeId);
      if (!fromNode || (fromNode.kind !== 'parameter' && fromNode.kind !== 'function')) return;
      const p = pinGraphPosition(fromNode, 'out');
      e.preventDefault();
      e.stopPropagation();
      pendingInputWireRef.current = {
        edgeId: incoming.id,
        fromNodeId: incoming.from.nodeId,
        colorId: incoming.colorId,
        pinX: p.x,
        pinY: p.y,
        startClientX: e.clientX,
        startClientY: e.clientY,
      };
    },
    [state.edges, state.nodes]
  );

  const handleInputUp = useCallback(
    (toNodeId: string, port: `in-${number}`, e: React.PointerEvent) => {
      ignoreNextGlobalPointerUpRef.current = false;
      const wd = wireDragRef.current;
      if (!wd) return;
      e.preventDefault();
      e.stopPropagation();
      const toNode = state.nodes.find((x) => x.id === toNodeId);
      if (!inputsEditableForWiring(toNode)) {
        setWireDrag(null);
        wireDragRef.current = null;
        return;
      }
      const valid = canPreviewEdge(state.nodes, wd.fromNodeId, toNodeId, port);
      if (valid && !edgeTaken(toNodeId, port)) {
        const id =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `e-${Date.now()}`;
        connectEdge({
          id,
          from: { nodeId: wd.fromNodeId, port: 'out' },
          to: { nodeId: toNodeId, port },
          colorId: valid,
        });
      }
      setWireDrag(null);
      wireDragRef.current = null;
    },
    [state.nodes, connectEdge, edgeTaken]
  );

  const ghostPath = useMemo(() => {
    if (!wireDrag) return null;
    return bezierPath(wireDrag.startX, wireDrag.startY, wireDrag.curX, wireDrag.curY);
  }, [wireDrag]);

  const isOutputConnected = useCallback(
    (nodeId: string) =>
      state.edges.some((ed) => ed.from.nodeId === nodeId && ed.from.port === 'out'),
    [state.edges]
  );

  const isInputConnected = useCallback(
    (nodeId: string, port: `in-${number}`) =>
      state.edges.some((ed) => ed.to.nodeId === nodeId && ed.to.port === port),
    [state.edges]
  );

  return (
    <div
      ref={containerRef}
      className="flex-1 min-w-0"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--studio-canvas)',
      }}
      onWheel={onWheel}
    >
      {state.playMode ? (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            pointerEvents: 'auto',
          }}
        >
          <GraphPlayModeControl
            graphPlayActive={state.graphPlayActive}
            onToggle={() => dispatch({ type: 'toggleGraphPlay' })}
          />
        </div>
      ) : null}
      <div
        data-graph-backdrop
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
          transformOrigin: '0 0',
        }}
        onPointerDown={startPan}
      >
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: WORLD_W,
            height: WORLD_H,
          }}
        >
          {state.nodes.map((node) => {
            const selected = state.selectedId === node.id;
            const select = () => dispatch({ type: 'select', id: node.id });

            if (node.kind === 'parameter') {
              return (
                <ParameterNodeView
                  key={node.id}
                  node={node}
                  selected={selected}
                  outputConnected={isOutputConnected(node.id)}
                  onSelect={select}
                  onToggleExpand={() =>
                    dispatch({ type: 'toggleExpanded', id: node.id })
                  }
                  onTitleCommit={(title) =>
                    dispatch({ type: 'updateParameter', id: node.id, patch: { title } })
                  }
                  onTitleDragStart={(c) => startDragFromPointer(node.id, c)}
                  onHeaderDragPointerDown={(e) => moveNodeStart(node.id, e)}
                  onOutputPointerDown={(e) => handleOutputDown(node.id, e)}
                />
              );
            }

            if (node.kind === 'function') {
              const onCollapsedInputGroupPointerDown = (
                groupSlotIndex: number,
                e: React.PointerEvent
              ) => {
                const ports = portsForInputGroupSlot(node, groupSlotIndex);
                for (const p of ports) {
                  const incoming = state.edges.find(
                    (ed) => ed.to.nodeId === node.id && ed.to.port === p
                  );
                  if (incoming) {
                    handleInputPointerDown(node.id, p, e);
                    return;
                  }
                }
              };
              const onCollapsedInputGroupPointerUp = (
                groupSlotIndex: number,
                e: React.PointerEvent
              ) => {
                const ports = portsForInputGroupSlot(node, groupSlotIndex);
                const free = ports.find(
                  (p) =>
                    !state.edges.some((ed) => ed.to.nodeId === node.id && ed.to.port === p)
                );
                if (free) handleInputUp(node.id, free, e);
              };
              return (
                <FunctionNodeView
                  key={node.id}
                  node={node}
                  selected={selected}
                  inputConnected={(port) => isInputConnected(node.id, port)}
                  outputConnected={isOutputConnected(node.id)}
                  onSelect={select}
                  onToggleExpand={() =>
                    dispatch({ type: 'toggleExpanded', id: node.id })
                  }
                  onTitleCommit={(title) =>
                    dispatch({ type: 'updateFunction', id: node.id, patch: { title } })
                  }
                  onTitleDragStart={(c) => startDragFromPointer(node.id, c)}
                  onHeaderDragPointerDown={(e) => moveNodeStart(node.id, e)}
                  onInputPointerDown={(port, e) =>
                    handleInputPointerDown(node.id, port, e)
                  }
                  onInputPointerUp={(port, e) => handleInputUp(node.id, port, e)}
                  onOutputPointerDown={(e) => handleOutputDown(node.id, e)}
                  onSlotPatch={(slotIndex, patch) =>
                    dispatch({
                      type: 'updateFunctionSlot',
                      id: node.id,
                      slotIndex,
                      patch,
                    })
                  }
                  onInputGroupChildPatch={(slotIndex, childIndex, patch) =>
                    dispatch({
                      type: 'updateFunctionInputGroupChild',
                      id: node.id,
                      slotIndex,
                      childIndex,
                      patch,
                    })
                  }
                  onCollapsedInputGroupPointerDown={onCollapsedInputGroupPointerDown}
                  onCollapsedInputGroupPointerUp={onCollapsedInputGroupPointerUp}
                />
              );
            }

            return (
              <OutputNodeView
                key={node.id}
                node={node}
                selected={selected}
                inputConnected={isInputConnected(node.id, 'in-0')}
                onSelect={select}
                onToggleExpand={() =>
                  dispatch({ type: 'toggleExpanded', id: node.id })
                }
                onHeaderDragPointerDown={(e) => moveNodeStart(node.id, e)}
                onInputPointerDown={(e) =>
                  handleInputPointerDown(node.id, 'in-0', e)
                }
                onInputPointerUp={(e) => handleInputUp(node.id, 'in-0', e)}
              />
            );
          })}
        </div>

        <svg
          width={WORLD_W}
          height={WORLD_H}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: 2,
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          {state.edges.map((edge) => {
            const d = edgePath(edge, state.nodes);
            if (!d) return null;
            const hex = PIN_HEX[edge.colorId];
            const wireId = `wire-${edge.id}`;
            const showFlow = state.playMode && state.graphPlayActive;
            return (
              <g key={edge.id}>
                <path
                  id={wireId}
                  d={d}
                  fill="none"
                  stroke={hex}
                  strokeWidth={2}
                />
                {showFlow && (
                  <circle
                    key={`flow-${edge.id}-${flowEpoch}`}
                    r={NODE_INPUT_PIN_OUTER_R}
                    fill={hex}
                    pointerEvents="none"
                  >
                    <animateMotion
                      dur={`${EDGE_FLOW_DURATION_SEC}s`}
                      repeatCount="indefinite"
                      rotate="0"
                      calcMode="linear"
                    >
                      <mpath href={`#${wireId}`} />
                    </animateMotion>
                  </circle>
                )}
              </g>
            );
          })}
          {ghostPath && wireDrag && (
            <path
              d={ghostPath}
              fill="none"
              stroke={PIN_HEX[wireDrag.colorId]}
              strokeWidth={2}
              opacity={0.5}
            />
          )}
        </svg>
      </div>

      <div
        className="text-xs text-muted"
        style={{
          position: 'absolute',
          left: 12,
          bottom: 10,
          pointerEvents: 'none',
        }}
      >
        Scroll to pan · Ctrl/Cmd + wheel zoom · Alt+drag pan · Drag header (or title, after small
        move) to move · Double-click node title to edit · Wiring: use Prototype Settings — with
        click-drag off (default), click an output pin then click a matching input; with click-drag
        on, press and drag from output to input · Pull a connected input pin to disconnect — expand
        a node to change its input wiring when collapsed
      </div>
    </div>
  );
}
