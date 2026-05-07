import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { viewToFrameNodes } from './graphFrameSelection';
import { GraphContextMenu } from './GraphContextMenu';
import { GraphParameterPanel } from './GraphParameterPanel';
import { NodeContextMenu } from './NodeContextMenu';
import { GraphNavigationGuide } from './GraphNavigationGuide';
import { useGraph } from './GraphContext';
import type { GraphEdge, GraphNode } from './types';
import {
  bezierPath,
  GRAPH_NODE_MAX_W,
  graphNodeMinWidth,
  graphNodeWidth,
  inputPinColorForTarget,
  layoutFunctionInputPorts,
  NODE_INPUT_PIN_OUTER_R,
  pinGraphPosition,
  portsForInputGroupSlot,
} from './geometry';
import {
  progressiveInputPinMultiplier,
  progressiveWholeNodeOpacity,
} from './graphProgressiveConnections';
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
      /** Node under the pointer (drives grab offset and delta). */
      primaryId: string;
      grabDx: number;
      grabDy: number;
      /** Graph-space positions at pointer down for every node that moves with this drag. */
      origins: Record<string, { x: number; y: number }>;
    };

/** Horizontal edge resize in graph space (baseline captured at pointer down). */
type ResizeDrag =
  | null
  | {
      nodeId: string;
      edge: 'left' | 'right';
      startGraphX: number;
      startWidth: number;
      startNodeX: number;
      minWidth: number;
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
  const [resizeDrag, setResizeDrag] = useState<ResizeDrag>(null);
  const [contextMenu, setContextMenu] = useState<{
    clientX: number;
    clientY: number;
    /** Graph-space point for Paste from this menu (right-click location). */
    pasteOriginGraph: { x: number; y: number };
  } | null>(null);
  const contextMenuRef = useRef(contextMenu);
  contextMenuRef.current = contextMenu;

  const [nodeContextMenu, setNodeContextMenu] = useState<{
    nodeId: string;
    clientX: number;
    clientY: number;
    pasteOriginGraph: { x: number; y: number };
  } | null>(null);
  const nodeContextMenuRef = useRef(nodeContextMenu);
  nodeContextMenuRef.current = nodeContextMenu;

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
  const resizeDragRef = useRef(resizeDrag);
  resizeDragRef.current = resizeDrag;
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

  /** Graph-space center of the visible viewport (for paste). */
  const graphViewCenter = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { x: WORLD_W / 2, y: WORLD_H / 2 };
    const r = el.getBoundingClientRect();
    const v = viewRef.current;
    const cx = r.width / 2;
    const cy = r.height / 2;
    return {
      x: (cx - v.tx) / v.scale,
      y: (cy - v.ty) / v.scale,
    };
  }, []);

  const runFrameSelection = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const next = viewToFrameNodes(
      state.nodes,
      state.selectedIds,
      box.width,
      box.height,
      48,
      0.35,
      2.5
    );
    if (next) setView(next);
  }, [state.nodes, state.selectedIds]);

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

      const rz = resizeDragRef.current;
      if (rz) {
        const gx = clientToGraph(e.clientX, e.clientY).x;
        const d = gx - rz.startGraphX;
        if (rz.edge === 'right') {
          const nw = Math.min(GRAPH_NODE_MAX_W, Math.max(rz.minWidth, rz.startWidth + d));
          dispatch({ type: 'setNodeDimensions', id: rz.nodeId, width: nw });
        } else {
          const nw = Math.min(GRAPH_NODE_MAX_W, Math.max(rz.minWidth, rz.startWidth - d));
          const nx = rz.startNodeX + (rz.startWidth - nw);
          dispatch({ type: 'setNodeDimensions', id: rz.nodeId, width: nw, x: nx });
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
        const primaryOrigin = nd.origins[nd.primaryId];
        if (!primaryOrigin) return;
        const newPrimaryX = x - nd.grabDx;
        const newPrimaryY = y - nd.grabDy;
        const dx = newPrimaryX - primaryOrigin.x;
        const dy = newPrimaryY - primaryOrigin.y;
        for (const id of Object.keys(nd.origins)) {
          const o = nd.origins[id]!;
          dispatch({ type: 'moveNode', id, x: o.x + dx, y: o.y + dy });
        }
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
      resizeDragRef.current = null;
      setResizeDrag(null);
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
  }, [dispatch, beginWireDragAt, clientToGraph]);

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

  const backdropPointerDown = useCallback(
    (e: React.PointerEvent) => {
      setContextMenu(null);
      setNodeContextMenu(null);
      startPan(e);
      if (e.button !== 0 || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest?.('.studio-node-card') || t.closest?.('.parameter-node-frame')) return;
      dispatch({ type: 'select', id: null });
    },
    [startPan, dispatch]
  );

  const worldContextMenu = useCallback(
    (e: React.MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest?.('.studio-node-card') || t.closest?.('.parameter-node-frame')) return;
      e.preventDefault();
      e.stopPropagation();
      setNodeContextMenu(null);
      const pasteOriginGraph = clientToGraph(e.clientX, e.clientY);
      setContextMenu({
        clientX: e.clientX,
        clientY: e.clientY,
        pasteOriginGraph,
      });
    },
    [clientToGraph]
  );

  const handleNodeContextMenu = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu(null);
      const pasteOriginGraph = clientToGraph(e.clientX, e.clientY);
      setNodeContextMenu({
        nodeId,
        clientX: e.clientX,
        clientY: e.clientY,
        pasteOriginGraph,
      });
      dispatch({ type: 'selectMany', ids: [nodeId] });
    },
    [clientToGraph, dispatch]
  );

  const startDragFromPointer = useCallback(
    (
      nodeId: string,
      client: { clientX: number; clientY: number; shiftKey?: boolean }
    ) => {
      const n = state.nodes.find((x) => x.id === nodeId);
      if (!n) return;
      const additive = Boolean(client.shiftKey);
      let nextSelection: string[];
      if (additive) {
        const cur = state.selectedIds;
        const i = cur.indexOf(nodeId);
        nextSelection = i >= 0 ? cur.filter((id) => id !== nodeId) : [...cur, nodeId];
      } else if (state.selectedIds.length > 1 && state.selectedIds.includes(nodeId)) {
        nextSelection = [...state.selectedIds];
      } else {
        nextSelection = [nodeId];
      }

      const sameSelection =
        nextSelection.length === state.selectedIds.length &&
        nextSelection.every((id, idx) => id === state.selectedIds[idx]);
      if (!sameSelection) {
        dispatch({ type: 'selectMany', ids: nextSelection });
      }

      const moveIds =
        nextSelection.includes(nodeId) && nextSelection.length > 0
          ? nextSelection
          : [nodeId];

      const origins: Record<string, { x: number; y: number }> = {};
      for (const id of moveIds) {
        const node = state.nodes.find((x) => x.id === id);
        if (node) origins[id] = { x: node.x, y: node.y };
      }

      const { x, y } = clientToGraph(client.clientX, client.clientY);
      setNodeDrag({
        primaryId: nodeId,
        grabDx: x - n.x,
        grabDy: y - n.y,
        origins,
      });
    },
    [state.nodes, state.selectedIds, clientToGraph, dispatch]
  );

  const moveNodeStart = useCallback(
    (nodeId: string, e: React.PointerEvent) => {
      e.preventDefault();
      startDragFromPointer(nodeId, {
        clientX: e.clientX,
        clientY: e.clientY,
        shiftKey: e.shiftKey,
      });
    },
    [startDragFromPointer]
  );

  const startNodeResize = useCallback(
    (nodeId: string, edge: 'left' | 'right', e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dispatch({ type: 'select', id: nodeId, additive: false });
      const n = state.nodes.find((x) => x.id === nodeId);
      if (!n) return;
      const { x: gx } = clientToGraph(e.clientX, e.clientY);
      const next: NonNullable<ResizeDrag> = {
        nodeId,
        edge,
        startGraphX: gx,
        startWidth: graphNodeWidth(n),
        startNodeX: n.x,
        minWidth: graphNodeMinWidth(n),
      };
      resizeDragRef.current = next;
      setResizeDrag(next);
    },
    [state.nodes, clientToGraph, dispatch]
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
      dispatch({ type: 'select', id: nodeId, additive: false });
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
    [state.nodes, dispatch]
  );

  const handleInputPointerDown = useCallback(
    (toNodeId: string, port: `in-${number}`, e: React.PointerEvent) => {
      const toNode = state.nodes.find((x) => x.id === toNodeId);
      if (!inputsEditableForWiring(toNode)) return;
      const incoming = state.edges.find(
        (ed) => ed.to.nodeId === toNodeId && ed.to.port === port
      );
      if (!incoming) return;
      dispatch({ type: 'select', id: toNodeId, additive: false });
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
    [state.edges, state.nodes, dispatch]
  );

  const handleInputUp = useCallback(
    (toNodeId: string, port: `in-${number}`, e: React.PointerEvent) => {
      ignoreNextGlobalPointerUpRef.current = false;
      const wd = wireDragRef.current;
      if (!wd) return;
      dispatch({ type: 'select', id: toNodeId, additive: false });
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
    [state.nodes, connectEdge, edgeTaken, dispatch]
  );

  const ghostPath = useMemo(() => {
    if (!wireDrag) return null;
    return bezierPath(wireDrag.startX, wireDrag.startY, wireDrag.curX, wireDrag.curY);
  }, [wireDrag]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('input, textarea, select, [contenteditable=true]')) return;
      if (contextMenuRef.current || nodeContextMenuRef.current) return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.code === 'KeyC' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'copySelection' });
        return;
      }
      if (mod && e.code === 'KeyX') {
        e.preventDefault();
        dispatch({ type: 'cutSelection' });
        return;
      }
      if (mod && e.code === 'KeyV') {
        e.preventDefault();
        const c = graphViewCenter();
        dispatch({ type: 'pasteClipboard', center: c });
        return;
      }
      if (mod && e.code === 'KeyD') {
        e.preventDefault();
        dispatch({ type: 'duplicateSelection' });
        return;
      }
      if (mod && e.code === 'KeyG') {
        e.preventDefault();
        dispatch({ type: 'groupSelection' });
        return;
      }
      if (mod && e.code === 'KeyU') {
        e.preventDefault();
        dispatch({ type: 'ungroupSelection' });
        return;
      }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        dispatch({ type: 'deleteSelection' });
        return;
      }

      if (e.code === 'KeyH' && e.shiftKey && mod) {
        e.preventDefault();
        dispatch({ type: 'toggleNodeDisabled' });
        return;
      }
      if (e.code === 'KeyF' && !mod) {
        e.preventDefault();
        runFrameSelection();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, graphViewCenter, runFrameSelection]);

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
      tabIndex={0}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--studio-canvas)',
        outline: 'none',
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
        onPointerDown={backdropPointerDown}
        onContextMenu={worldContextMenu}
      >
        <svg
          width={WORLD_W}
          height={WORLD_H}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            zIndex: 1,
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          {state.edges.map((edge) => {
            const d = edgePath(edge, state.nodes);
            if (!d) return null;
            const hex = PIN_HEX[edge.colorId];
            const wireId = `wire-${edge.id}`;
            const fromNode = state.nodes.find((n) => n.id === edge.from.nodeId);
            const fromDisabled = fromNode?.disabled === true;
            const showFlow =
              state.playMode && state.graphPlayActive && !fromDisabled;
            return (
              <g key={edge.id}>
                <path
                  id={wireId}
                  d={d}
                  fill="none"
                  stroke={hex}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeOpacity={fromDisabled ? 0.5 : 1}
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
        </svg>

        <div
          style={{
            position: 'relative',
            zIndex: 2,
            width: WORLD_W,
            height: WORLD_H,
          }}
        >
          {state.nodes.map((node) => {
            const selected = state.selectedIds.includes(node.id);
            const select = (ev: React.PointerEvent) =>
              dispatch({
                type: 'select',
                id: node.id,
                additive: ev.shiftKey,
              });

            if (node.kind === 'parameter') {
              const progressiveCardOpacity = progressiveWholeNodeOpacity(
                node,
                wireDrag,
                state.progressiveConnections
              );
              return (
                <ParameterNodeView
                  key={node.id}
                  node={node}
                  selected={selected}
                  progressiveCardOpacity={progressiveCardOpacity}
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
                  onResizeEdgePointerDown={(edge, e) =>
                    startNodeResize(node.id, edge, e)
                  }
                  onNodeContextMenu={(e) => handleNodeContextMenu(node.id, e)}
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
              const progressiveCardOpacity = progressiveWholeNodeOpacity(
                node,
                wireDrag,
                state.progressiveConnections
              );
              const progressiveInputPinMult = (port: `in-${number}`) =>
                progressiveInputPinMultiplier(
                  node,
                  port,
                  wireDrag,
                  state.progressiveConnections
                );
              return (
                <FunctionNodeView
                  key={node.id}
                  node={node}
                  selected={selected}
                  progressiveCardOpacity={progressiveCardOpacity}
                  progressiveInputPinMultiplier={progressiveInputPinMult}
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
                  onResizeEdgePointerDown={(edge, e) =>
                    startNodeResize(node.id, edge, e)
                  }
                  onNodeContextMenu={(e) => handleNodeContextMenu(node.id, e)}
                />
              );
            }

            const progressiveCardOpacity = progressiveWholeNodeOpacity(
              node,
              wireDrag,
              state.progressiveConnections
            );
            return (
              <OutputNodeView
                key={node.id}
                node={node}
                selected={selected}
                progressiveCardOpacity={progressiveCardOpacity}
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
                onResizeEdgePointerDown={(edge, e) =>
                  startNodeResize(node.id, edge, e)
                }
                onNodeContextMenu={(e) => handleNodeContextMenu(node.id, e)}
              />
            );
          })}
        </div>

        {ghostPath && wireDrag ? (
          <svg
            width={WORLD_W}
            height={WORLD_H}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              zIndex: 3,
              pointerEvents: 'none',
              overflow: 'visible',
            }}
          >
            <path
              d={ghostPath}
              fill="none"
              stroke={PIN_HEX[wireDrag.colorId]}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.5}
            />
          </svg>
        ) : null}
      </div>

      <GraphNavigationGuide visible={state.showGraphGuide} />

      {state.parametersEnabled ? <GraphParameterPanel /> : null}

      <GraphContextMenu
        open={contextMenu != null}
        position={contextMenu}
        onClose={() => setContextMenu(null)}
        hasSelection={state.selectedIds.length > 0}
        hasClipboard={(state.clipboard?.nodes.length ?? 0) > 0}
        parametersEnabled={state.parametersEnabled}
        parameterRows={state.nodes
          .filter((n) => n.kind === 'parameter')
          .map((n) => ({ id: n.id, title: n.title }))}
        onInsertFunctionNode={(outputPinColor) => {
          if (!contextMenu) return;
          dispatch({
            type: 'addFunctionNodeAt',
            graphX: contextMenu.pasteOriginGraph.x,
            graphY: contextMenu.pasteOriginGraph.y,
            outputPinColor,
          });
          setContextMenu(null);
        }}
        onInsertParameterFromTemplate={(parameterId) => {
          if (!contextMenu) return;
          const { x, y } = contextMenu.pasteOriginGraph;
          dispatch({
            type: 'addParameter',
            graphX: x,
            graphY: y,
            mode: 'clone',
            cloneFromId: parameterId,
          });
          setContextMenu(null);
        }}
        onInsertParameterNew={(outputPinColor) => {
          if (!contextMenu) return;
          const { x, y } = contextMenu.pasteOriginGraph;
          dispatch({
            type: 'addParameter',
            graphX: x,
            graphY: y,
            mode: 'new',
            outputPinColor,
          });
          setContextMenu(null);
        }}
        onCut={() => {
          setContextMenu(null);
          dispatch({ type: 'cutSelection' });
        }}
        onCopy={() => {
          setContextMenu(null);
          dispatch({ type: 'copySelection' });
        }}
        onPaste={() => {
          const center = contextMenu?.pasteOriginGraph ?? graphViewCenter();
          setContextMenu(null);
          dispatch({ type: 'pasteClipboard', center });
        }}
        onDuplicate={() => {
          setContextMenu(null);
          dispatch({ type: 'duplicateSelection' });
        }}
        onDelete={() => {
          setContextMenu(null);
          dispatch({ type: 'deleteSelection' });
        }}
        onRename={() => {
          setContextMenu(null);
        }}
        onFrameSelection={() => {
          setContextMenu(null);
          runFrameSelection();
        }}
        onGroup={() => {
          setContextMenu(null);
          dispatch({ type: 'groupSelection' });
        }}
        onUngroup={() => {
          setContextMenu(null);
          dispatch({ type: 'ungroupSelection' });
        }}
      />

      <NodeContextMenu
        open={nodeContextMenu != null}
        position={nodeContextMenu}
        onClose={() => setNodeContextMenu(null)}
        hasClipboard={(state.clipboard?.nodes.length ?? 0) > 0}
        onSwapNode={(outputPinColor) => {
          if (!nodeContextMenu) return;
          dispatch({
            type: 'swapNodeWithFunction',
            nodeId: nodeContextMenu.nodeId,
            outputPinColor,
          });
          setNodeContextMenu(null);
        }}
        onCut={() => {
          setNodeContextMenu(null);
          dispatch({ type: 'cutSelection' });
        }}
        onCopy={() => {
          setNodeContextMenu(null);
          dispatch({ type: 'copySelection' });
        }}
        onPaste={() => {
          const center = nodeContextMenu?.pasteOriginGraph ?? graphViewCenter();
          setNodeContextMenu(null);
          dispatch({ type: 'pasteClipboard', center });
        }}
        onDuplicate={() => {
          setNodeContextMenu(null);
          dispatch({ type: 'duplicateSelection' });
        }}
        onDelete={() => {
          setNodeContextMenu(null);
          dispatch({ type: 'deleteSelection' });
        }}
        onRename={() => {
          setNodeContextMenu(null);
        }}
        onFrameSelection={() => {
          setNodeContextMenu(null);
          runFrameSelection();
        }}
        onGroup={() => {
          setNodeContextMenu(null);
          dispatch({ type: 'groupSelection' });
        }}
        onUngroup={() => {
          setNodeContextMenu(null);
          dispatch({ type: 'ungroupSelection' });
        }}
      />
    </div>
  );
}
