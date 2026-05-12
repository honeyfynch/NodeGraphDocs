import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { viewToFrameNodes } from './graphFrameSelection';
import { graphInsertNodeSubmenuRows } from './graphInsertNodeMenu';
import { GraphContextMenu } from './GraphContextMenu';
import { GraphParameterPanel } from './GraphParameterPanel';
import { NodeContextMenu } from './NodeContextMenu';
import { GraphNavigationGuide } from './GraphNavigationGuide';
import { useGraph } from './GraphContext';
import { isInputConnectedWithGroupBridges } from './graphGroupOps';
import { edgeVisibleForGraphScope, nodeVisibleForGraphScope } from './graphGroupScope';
import type { GraphEdge, GraphNode, GraphOutPort } from './types';
import {
  bezierPath,
  generateWiredInIndices,
  GRAPH_NODE_MAX_W,
  graphNodeMinWidth,
  graphNodeWidth,
  inputPinColorForTarget,
  layoutFunctionInputPorts,
  GRAPH_WIRE_STROKE_PX,
  NODE_INPUT_PIN_OUTER_R,
  pinGraphPosition,
  portsForInputGroupSlot,
} from './geometry';
import {
  progressiveInputPinMultiplier,
  progressiveWholeNodeOpacity,
} from './graphProgressiveConnections';
import { resolveGraphPinHex, type GraphWireColorId } from './pinColors';
import { findIncomingEdgeToPort } from './graphWiring';
import { ParameterNodeView } from './nodes/ParameterNodeView';
import { FunctionNodeView } from './nodes/FunctionNodeView';
import { OutputNodeView } from './nodes/OutputNodeView';
import { GenerateNodeView } from './nodes/GenerateNodeView';
import { GroupInputNodeView } from './nodes/GroupInputNodeView';
import { GroupOutputNodeView } from './nodes/GroupOutputNodeView';
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
  fromPort: GraphOutPort;
  colorId: GraphWireColorId;
  pinX: number;
  pinY: number;
  startClientX: number;
  startClientY: number;
};

type WireDrag =
  | null
  | {
      fromNodeId: string;
      fromPort: GraphOutPort;
      colorId: GraphWireColorId;
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
function edgePath(edge: GraphEdge, nodes: GraphNode[], edges: GraphEdge[]): string | null {
  const fromNode = nodes.find((n) => n.id === edge.from.nodeId);
  const toNode = nodes.find((n) => n.id === edge.to.nodeId);
  if (!fromNode || !toNode) return null;
  const a = pinGraphPosition(fromNode, edge.from.port, edges);
  const b = pinGraphPosition(toNode, edge.to.port, edges);
  return bezierPath(a.x, a.y, b.x, b.y);
}

function canPreviewEdge(
  nodes: GraphNode[],
  edges: readonly GraphEdge[],
  fromNodeId: string,
  toNodeId: string,
  toPort: `in-${number}`,
  fromPort: GraphOutPort = 'out'
): GraphWireColorId | null {
  const fromNode = nodes.find((n) => n.id === fromNodeId);
  const toNode = nodes.find((n) => n.id === toNodeId);
  if (!fromNode || !toNode) return null;
  let outColor: GraphWireColorId;
  if (fromNode.kind === 'parameter') outColor = fromNode.outputPinColor;
  else if (fromNode.kind === 'function' || fromNode.kind === 'group') outColor = fromNode.outputPinColor;
  else if (fromNode.kind === 'generate') outColor = 'gray';
  else if (fromNode.kind === 'groupInput') {
    const idx = fromPort === 'out' ? 0 : Number(fromPort.slice(4));
    const row = fromNode.outputs[idx];
    if (!row) return null;
    outColor = row.colorId;
  } else return null;
  if (toNode.kind === 'function' || toNode.kind === 'group') {
    const layouts = layoutFunctionInputPorts(toNode);
    const hit = layouts.find((L) => L.port === toPort);
    if (!hit) return null;
    const inColor = inputPinColorForTarget(toNode, hit.target) ?? 'gray';
    if (outColor !== inColor) return null;
    return outColor;
  }
  if (toNode.kind === 'output') {
    if (toPort !== 'in-0') return null;
    if (outColor !== toNode.inputPinColor) return null;
    return outColor;
  }
  if (toNode.kind === 'groupOutput') {
    if (toPort !== 'in-0') return null;
    if (outColor !== toNode.inputPinColor) return null;
    return outColor;
  }
  if (toNode.kind === 'generate') {
    if (!toNode.expanded || !toNode.inputGroupExpanded) return null;
    const wired = generateWiredInIndices(toNode.id, edges);
    const nextFree = wired.length === 0 ? 0 : Math.max(...wired) + 1;
    const allowed = new Set([...wired, nextFree]);
    const n = Number(toPort.slice(3));
    if (!allowed.has(n)) return null;
    return outColor;
  }
  return null;
}

function inputsEditableForWiring(node: GraphNode | undefined): boolean {
  if (!node) return false;
  if (node.kind === 'parameter') return false;
  if (node.kind === 'generate') {
    return node.expanded && node.inputGroupExpanded;
  }
  if (node.kind === 'groupOutput') return true;
  return node.expanded;
}

export function GraphCanvas() {
  const { state, dispatch, connectEdge } = useGraph();
  const insertNodeColorRows = useMemo(
    () => graphInsertNodeSubmenuRows(state.extendedPalette),
    [state.extendedPalette]
  );
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
    const ids =
      state.selectedIds.length > 0
        ? state.selectedIds
        : state.nodes.map((n) => n.id);
    const next = viewToFrameNodes(
      state.nodes,
      ids,
      box.width,
      box.height,
      48,
      0.35,
      2.5,
      state.edges
    );
    if (next) setView(next);
  }, [state.nodes, state.selectedIds, state.edges]);

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
      colorId: GraphWireColorId,
      pinX: number,
      pinY: number,
      clientX: number,
      clientY: number,
      fromPort: GraphOutPort = 'out'
    ) => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const v = viewRef.current;
      const curX = (clientX - r.left - v.tx) / v.scale;
      const curY = (clientY - r.top - v.ty) / v.scale;
      const wd = {
        fromNodeId,
        fromPort,
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
            e.clientY,
            pi.fromPort
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
      for (const id of moveIds) {
        const node = state.nodes.find((x) => x.id === id);
        if (node?.kind !== 'group') continue;
        for (const cid of node.containedNodeIds) {
          if (origins[cid] != null) continue;
          const inner = state.nodes.find((x) => x.id === cid);
          if (inner) origins[cid] = { x: inner.x, y: inner.y };
        }
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
      isInputConnectedWithGroupBridges(state.nodes, state.edges, toNodeId, port),
    [state.edges, state.nodes]
  );

  const handleOutputDown = useCallback(
    (nodeId: string, e: React.PointerEvent, fromPort: GraphOutPort = 'out') => {
      const n = state.nodes.find((x) => x.id === nodeId);
      if (
        !n ||
        (n.kind !== 'parameter' &&
          n.kind !== 'function' &&
          n.kind !== 'generate' &&
          n.kind !== 'group' &&
          n.kind !== 'groupInput')
      ) {
        return;
      }
      dispatch({ type: 'select', id: nodeId, additive: false });
      let colorId: GraphWireColorId;
      if (n.kind === 'generate') colorId = 'gray';
      else if (n.kind === 'groupInput') {
        const idx = fromPort === 'out' ? 0 : Number(fromPort.slice(4));
        colorId = n.outputs[idx]?.colorId ?? 'gray';
      } else {
        colorId = n.outputPinColor;
      }
      const p = pinGraphPosition(n, fromPort, state.edges);
      e.preventDefault();
      e.stopPropagation();
      pendingInputWireRef.current = null;
      /** Never remove edges from the sender; disconnect only by dragging from the receiving input. */
      const wd = {
        fromNodeId: nodeId,
        fromPort,
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
    [state.nodes, state.edges, dispatch]
  );

  const handleInputPointerDown = useCallback(
    (toNodeId: string, port: `in-${number}`, e: React.PointerEvent) => {
      const toNode = state.nodes.find((x) => x.id === toNodeId);
      if (!inputsEditableForWiring(toNode)) return;
      const incoming = findIncomingEdgeToPort(state.nodes, state.edges, toNodeId, port);
      if (!incoming) return;
      dispatch({ type: 'select', id: toNodeId, additive: false });
      const fromNode = state.nodes.find((x) => x.id === incoming.from.nodeId);
      if (
        !fromNode ||
        (fromNode.kind !== 'parameter' &&
          fromNode.kind !== 'function' &&
          fromNode.kind !== 'generate' &&
          fromNode.kind !== 'group' &&
          fromNode.kind !== 'groupInput')
      ) {
        return;
      }
      const p = pinGraphPosition(fromNode, incoming.from.port, state.edges);
      e.preventDefault();
      e.stopPropagation();
      pendingInputWireRef.current = {
        edgeId: incoming.id,
        fromNodeId: incoming.from.nodeId,
        fromPort: incoming.from.port,
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
      const valid = canPreviewEdge(
        state.nodes,
        state.edges,
        wd.fromNodeId,
        toNodeId,
        port,
        wd.fromPort
      );
      if (valid && !edgeTaken(toNodeId, port)) {
        const id =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `e-${Date.now()}`;
        connectEdge({
          id,
          from: { nodeId: wd.fromNodeId, port: wd.fromPort },
          to: { nodeId: toNodeId, port },
          colorId: valid,
        });
      }
      setWireDrag(null);
      wireDragRef.current = null;
    },
    [state.nodes, state.edges, connectEdge, edgeTaken, dispatch]
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
        if (state.selectedIds.length === 0) return;
        e.preventDefault();
        dispatch({ type: 'groupSelection' });
        return;
      }
      if (mod && e.code === 'KeyU') {
        if (state.selectedIds.length === 0) return;
        e.preventDefault();
        dispatch({ type: 'ungroupSelection' });
        return;
      }
      if (e.code === 'Escape' && state.graphScope) {
        e.preventDefault();
        dispatch({ type: 'exitGroupScope' });
        return;
      }
      if (
        e.code === 'Enter' &&
        !mod &&
        !e.shiftKey &&
        !state.graphScope &&
        state.selectedIds.length === 1
      ) {
        const id = state.selectedIds[0]!;
        const gn = state.nodes.find((n) => n.id === id && n.kind === 'group');
        if (gn) {
          e.preventDefault();
          dispatch({ type: 'enterGroupScope', groupId: gn.id });
          return;
        }
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
  }, [
    dispatch,
    graphViewCenter,
    runFrameSelection,
    state.selectedIds.length,
    state.graphScope,
    state.nodes,
    state.selectedIds,
  ]);

  const isOutputConnected = useCallback(
    (nodeId: string) =>
      state.edges.some(
        (ed) =>
          ed.from.nodeId === nodeId &&
          (ed.from.port === 'out' || /^out-\d+$/.test(ed.from.port))
      ),
    [state.edges]
  );

  const isInputConnected = useCallback(
    (nodeId: string, port: `in-${number}`) =>
      isInputConnectedWithGroupBridges(state.nodes, state.edges, nodeId, port),
    [state.edges, state.nodes]
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
      {state.graphScope ? (
        <div
          className="flex-row items-center gap-sm text-sm"
          style={{
            position: 'absolute',
            top: state.playMode ? 52 : 12,
            left: 12,
            zIndex: 21,
            pointerEvents: 'auto',
            padding: '6px 10px',
            borderRadius: 8,
            background: 'var(--studio-surface-100)',
            border: '1px solid var(--studio-stroke)',
            maxWidth: 480,
          }}
        >
          <button
            type="button"
            className="text-sm underline-offset-2 hover:underline"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={() => dispatch({ type: 'exitGroupScope' })}
          >
            ← Parent graph
          </button>
          <span className="text-muted">/</span>
          <span className="font-medium">
            {state.nodes.find((n) => n.id === state.graphScope && n.kind === 'group')?.title ??
              'Group'}
          </span>
          <span className="text-muted text-xs">
            Esc or double-click Group Input / Group Output to exit
          </span>
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
          {state.edges
            .filter((edge) => edgeVisibleForGraphScope(edge, state.graphScope, state.nodes))
            .map((edge) => {
            const d = edgePath(edge, state.nodes, state.edges);
            if (!d) return null;
            const hex = resolveGraphPinHex(edge.colorId, state.extendedPalette);
            const wireId = `wire-${edge.id}`;
            const fromNode = state.nodes.find((n) => n.id === edge.from.nodeId);
            const fromDisabled = Boolean(
              fromNode && 'disabled' in fromNode && fromNode.disabled
            );
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
          {state.nodes
            .filter((node) => nodeVisibleForGraphScope(node.id, state.graphScope, state.nodes))
            .map((node) => {
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
                state.progressiveConnections,
                state.edges
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
                  const incoming = findIncomingEdgeToPort(
                    state.nodes,
                    state.edges,
                    node.id,
                    p
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
                    !isInputConnectedWithGroupBridges(
                      state.nodes,
                      state.edges,
                      node.id,
                      p
                    )
                );
                if (free) handleInputUp(node.id, free, e);
              };
              const progressiveCardOpacity = progressiveWholeNodeOpacity(
                node,
                wireDrag,
                state.progressiveConnections,
                state.edges
              );
              const progressiveInputPinMult = (port: `in-${number}`) =>
                progressiveInputPinMultiplier(
                  node,
                  port,
                  wireDrag,
                  state.progressiveConnections,
                  state.edges
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

            if (node.kind === 'group') {
              const onCollapsedInputGroupPointerDown = (
                groupSlotIndex: number,
                e: React.PointerEvent
              ) => {
                const ports = portsForInputGroupSlot(node, groupSlotIndex);
                for (const p of ports) {
                  const incoming = findIncomingEdgeToPort(
                    state.nodes,
                    state.edges,
                    node.id,
                    p
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
                    !isInputConnectedWithGroupBridges(
                      state.nodes,
                      state.edges,
                      node.id,
                      p
                    )
                );
                if (free) handleInputUp(node.id, free, e);
              };
              const progressiveCardOpacity = progressiveWholeNodeOpacity(
                node,
                wireDrag,
                state.progressiveConnections,
                state.edges
              );
              const progressiveInputPinMult = (port: `in-${number}`) =>
                progressiveInputPinMultiplier(
                  node,
                  port,
                  wireDrag,
                  state.progressiveConnections,
                  state.edges
                );
              return (
                <FunctionNodeView
                  key={node.id}
                  node={node}
                  canvasReadOnly
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
                    dispatch({ type: 'updateGroup', id: node.id, patch: { title } })
                  }
                  onTitleDragStart={(c) => startDragFromPointer(node.id, c)}
                  onHeaderDragPointerDown={(e) => moveNodeStart(node.id, e)}
                  onInputPointerDown={(port, e) =>
                    handleInputPointerDown(node.id, port, e)
                  }
                  onInputPointerUp={(port, e) => handleInputUp(node.id, port, e)}
                  onOutputPointerDown={(e) => handleOutputDown(node.id, e)}
                  onSlotPatch={() => {}}
                  onInputGroupChildPatch={() => {}}
                  onCollapsedInputGroupPointerDown={onCollapsedInputGroupPointerDown}
                  onCollapsedInputGroupPointerUp={onCollapsedInputGroupPointerUp}
                  onResizeEdgePointerDown={(edge, e) =>
                    startNodeResize(node.id, edge, e)
                  }
                  onNodeContextMenu={(e) => handleNodeContextMenu(node.id, e)}
                  onGraphShellDoubleClick={() =>
                    dispatch({ type: 'enterGroupScope', groupId: node.id })
                  }
                />
              );
            }

            if (node.kind === 'generate') {
              const progressiveCardOpacity = progressiveWholeNodeOpacity(
                node,
                wireDrag,
                state.progressiveConnections,
                state.edges
              );
              return (
                <GenerateNodeView
                  key={node.id}
                  node={node}
                  selected={selected}
                  progressiveCardOpacity={progressiveCardOpacity}
                  outputConnected={isOutputConnected(node.id)}
                  inputConnected={(port) => isInputConnected(node.id, port)}
                  edges={state.edges}
                  onSelect={select}
                  onToggleExpand={() =>
                    dispatch({ type: 'toggleExpanded', id: node.id })
                  }
                  onTitleCommit={(title) =>
                    dispatch({
                      type: 'updateGenerate',
                      id: node.id,
                      patch: { title },
                    })
                  }
                  onTitleDragStart={(c) => startDragFromPointer(node.id, c)}
                  onHeaderDragPointerDown={(e) => moveNodeStart(node.id, e)}
                  onOutputPointerDown={(e) => handleOutputDown(node.id, e)}
                  onInputPointerDown={(port, e) =>
                    handleInputPointerDown(node.id, port, e)
                  }
                  onInputPointerUp={(port, e) => handleInputUp(node.id, port, e)}
                  onPromptTextChange={(promptText) =>
                    dispatch({
                      type: 'updateGenerate',
                      id: node.id,
                      patch: { promptText },
                    })
                  }
                  onToggleInputGroup={() =>
                    dispatch({
                      type: 'updateGenerate',
                      id: node.id,
                      patch: { inputGroupExpanded: !node.inputGroupExpanded },
                    })
                  }
                  onRun={() =>
                    dispatch({
                      type: 'updateGenerate',
                      id: node.id,
                      patch: {
                        generativePhase:
                          node.generativePhase === 'prompt' ? 'output' : 'prompt',
                      },
                    })
                  }
                  onResizeEdgePointerDown={(edge, e) =>
                    startNodeResize(node.id, edge, e)
                  }
                  onNodeContextMenu={(e) => handleNodeContextMenu(node.id, e)}
                />
              );
            }

            if (node.kind === 'groupInput') {
              const progressiveCardOpacity = progressiveWholeNodeOpacity(
                node,
                wireDrag,
                state.progressiveConnections,
                state.edges
              );
              return (
                <GroupInputNodeView
                  key={node.id}
                  node={node}
                  selected={selected}
                  progressiveCardOpacity={progressiveCardOpacity}
                  outputConnected={(port) =>
                    state.edges.some(
                      (ed) => ed.from.nodeId === node.id && ed.from.port === port
                    )
                  }
                  onSelect={select}
                  onTitleDragStart={(c) => startDragFromPointer(node.id, c)}
                  onHeaderDragPointerDown={(e) => moveNodeStart(node.id, e)}
                  onOutputPointerDown={(port, e) => handleOutputDown(node.id, e, port)}
                  onResizeEdgePointerDown={(edge, e) =>
                    startNodeResize(node.id, edge, e)
                  }
                  onNodeContextMenu={(e) => handleNodeContextMenu(node.id, e)}
                  onExitSubgraph={
                    state.graphScope ? () => dispatch({ type: 'exitGroupScope' }) : undefined
                  }
                />
              );
            }

            if (node.kind === 'groupOutput') {
              const progressiveCardOpacity = progressiveWholeNodeOpacity(
                node,
                wireDrag,
                state.progressiveConnections,
                state.edges
              );
              return (
                <GroupOutputNodeView
                  key={node.id}
                  node={node}
                  selected={selected}
                  progressiveCardOpacity={progressiveCardOpacity}
                  inputConnected={isInputConnected(node.id, 'in-0')}
                  onSelect={select}
                  onTitleDragStart={(c) => startDragFromPointer(node.id, c)}
                  onHeaderDragPointerDown={(e) => moveNodeStart(node.id, e)}
                  onInputPointerDown={(e) =>
                    handleInputPointerDown(node.id, 'in-0', e)
                  }
                  onInputPointerUp={(e) => handleInputUp(node.id, 'in-0', e)}
                  onResizeEdgePointerDown={(edge, e) =>
                    startNodeResize(node.id, edge, e)
                  }
                  onNodeContextMenu={(e) => handleNodeContextMenu(node.id, e)}
                  onExitSubgraph={
                    state.graphScope ? () => dispatch({ type: 'exitGroupScope' }) : undefined
                  }
                />
              );
            }

            if (node.kind !== 'output') return null;

            const progressiveCardOpacity = progressiveWholeNodeOpacity(
              node,
              wireDrag,
              state.progressiveConnections,
              state.edges
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
              stroke={resolveGraphPinHex(wireDrag.colorId, state.extendedPalette)}
              strokeWidth={GRAPH_WIRE_STROKE_PX}
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
        colorRows={insertNodeColorRows}
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
        ungroupDisabled={
          !state.nodes.some(
            (n) => n.kind === 'group' && state.selectedIds.includes(n.id)
          )
        }
      />

      <NodeContextMenu
        open={nodeContextMenu != null}
        position={nodeContextMenu}
        onClose={() => setNodeContextMenu(null)}
        hasClipboard={(state.clipboard?.nodes.length ?? 0) > 0}
        hasSelection={state.selectedIds.length > 0}
        ungroupDisabled={
          !state.nodes.some(
            (n) => n.kind === 'group' && state.selectedIds.includes(n.id)
          )
        }
        swapNodeDisabled={
          nodeContextMenu
            ? state.nodes.find((n) => n.id === nodeContextMenu.nodeId)?.kind === 'group'
            : false
        }
        colorRows={insertNodeColorRows}
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
