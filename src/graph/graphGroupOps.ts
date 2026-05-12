import {
  graphNodeWidth,
  inputPinColorForTarget,
  layoutFunctionInputPorts,
  nodeHeight,
} from './geometry';
import type { GraphWireColorId } from './pinColors';
import type {
  FunctionSlot,
  GraphEdge,
  GraphNode,
  GroupBridge,
  GroupExitBridge,
  GroupInputNode,
  GroupNode,
  GroupOutputNode,
} from './types';
import { normalizeFunctionSlot } from './types';

const GROUP_BOUNDARY_GAP = 28;
const GROUP_INPUT_W = 200;

function newId(prefix: string): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Label + pin color for an input port on a node inside a selection (for group UI). */
export function inputLabelAndPinColorForPort(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  targetNodeId: string,
  port: `in-${number}`
): { label: string; inputPinColor: GraphWireColorId } | null {
  const target = nodes.find((n) => n.id === targetNodeId);
  if (!target) return null;
  if (target.kind === 'output' && port === 'in-0') {
    return { label: 'Input', inputPinColor: target.inputPinColor };
  }
  if (target.kind === 'generate') {
    const incoming = edges.find((e) => e.to.nodeId === targetNodeId && e.to.port === port);
    const src = incoming ? nodes.find((n) => n.id === incoming.from.nodeId) : undefined;
    const label = src?.title ?? 'Input';
    return { label, inputPinColor: 'gray' };
  }
  if (target.kind === 'function' || target.kind === 'group') {
    const layouts = layoutFunctionInputPorts(target);
    const L = layouts.find((x) => x.port === port);
    if (!L) return null;
    const c = inputPinColorForTarget(target, L.target);
    if (c == null) return null;
    if (L.target.kind === 'slot') {
      const s = target.slots[L.target.slotIndex];
      return { label: s?.label ?? 'Input', inputPinColor: c };
    }
    const ch =
      target.slots[L.target.groupSlotIndex]?.inputGroupChildSlots?.[L.target.childIndex];
    return { label: ch?.label ?? 'Input', inputPinColor: c };
  }
  return null;
}

/** True if an edge feeds this input directly or via a group bridge. */
export function isInputConnectedWithGroupBridges(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  nodeId: string,
  port: `in-${number}`
): boolean {
  if (edges.some((e) => e.to.nodeId === nodeId && e.to.port === port)) return true;
  for (const n of nodes) {
    if (n.kind !== 'group') continue;
    for (const b of n.bridges) {
      if (b.innerNodeId !== nodeId || b.innerPort !== port) continue;
      const gPort = `in-${b.groupPortIndex}` as `in-${number}`;
      if (edges.some((e) => e.to.nodeId === n.id && e.to.port === gPort)) return true;
    }
  }
  return false;
}

export function restoreEdgesAfterRemovingGroup(
  group: GroupNode,
  edges: readonly GraphEdge[]
): GraphEdge[] {
  let out = edges.filter(
    (e) => !(e.to.nodeId === group.id && /^in-\d+$/.test(e.to.port))
  );
  out = out.filter((e) => !(e.from.nodeId === group.id && e.from.port === 'out'));

  const gi = group.groupInputNodeId;
  const go = group.groupOutputNodeId;
  out = out.filter(
    (e) =>
      e.from.nodeId !== gi &&
      !(e.to.nodeId === go && e.to.port === 'in-0') &&
      !(e.from.nodeId === group.exitBridge?.innerFromNodeId && e.to.nodeId === go)
  );

  for (const b of group.bridges) {
    const taken = out.some(
      (e) => e.to.nodeId === b.innerNodeId && e.to.port === b.innerPort
    );
    if (taken) continue;
    out = [
      ...out,
      {
        id: newId('e'),
        from: { nodeId: b.externalFromNodeId, port: b.externalFromPort },
        to: { nodeId: b.innerNodeId, port: b.innerPort },
        colorId: b.colorId,
      },
    ];
  }

  const ex = group.exitBridge;
  if (ex) {
    const taken = out.some(
      (e) =>
        e.from.nodeId === ex.innerFromNodeId &&
        e.from.port === ex.innerFromPort &&
        e.to.nodeId === ex.externalToNodeId &&
        e.to.port === ex.externalToPort
    );
    if (!taken) {
      out = [
        ...out,
        {
          id: newId('e'),
          from: {
            nodeId: ex.innerFromNodeId,
            port: ex.innerFromPort,
          },
          to: { nodeId: ex.externalToNodeId, port: ex.externalToPort },
          colorId: ex.colorId,
        },
      ];
    }
  }

  return out;
}

function readOnlySlot(
  label: string,
  color: GraphWireColorId,
  extendedPalette: boolean
): FunctionSlot {
  return normalizeFunctionSlot(
    {
      label,
      propertyType: 'readOnly',
      inputPinColor: color,
      placeholderText: '—',
      textValue: null,
      numberValues: [null, null, null],
    },
    extendedPalette
  );
}

/** Apply ⌘G — returns next state or null if grouping is a no-op. */
export function applyGroupSelection(
  nodes: GraphNode[],
  edges: GraphEdge[],
  selectedIds: readonly string[],
  extendedPalette: boolean
): { nodes: GraphNode[]; edges: GraphEdge[]; selectedIds: string[] } | null {
  if (selectedIds.length === 0) return null;

  const selSet = new Set(selectedIds);
  const containedNodes = nodes.filter(
    (n) => selSet.has(n.id) && n.kind !== 'output' && n.kind !== 'group'
  );
  if (containedNodes.length === 0) return null;
  if (nodes.some((n) => n.kind === 'group' && selSet.has(n.id))) return null;

  const containedSet = new Set(containedNodes.map((n) => n.id));

  const externalIn = edges.filter(
    (e) => containedSet.has(e.to.nodeId) && !containedSet.has(e.from.nodeId)
  );

  const bridgeRows: {
    edge: GraphEdge;
    meta: { label: string; inputPinColor: GraphWireColorId };
  }[] = [];
  for (const edge of externalIn) {
    const meta = inputLabelAndPinColorForPort(nodes, edges, edge.to.nodeId, edge.to.port);
    if (!meta) continue;
    bridgeRows.push({ edge, meta });
  }
  bridgeRows.sort((a, b) => {
    const ca = `${a.edge.to.nodeId}:${a.edge.to.port}`;
    const cb = `${b.edge.to.nodeId}:${b.edge.to.port}`;
    return ca.localeCompare(cb);
  });

  const bridges: GroupBridge[] = [];
  const slots: FunctionSlot[] = [];
  let portIdx = 0;
  for (const { edge, meta } of bridgeRows) {
    bridges.push({
      groupPortIndex: portIdx,
      innerNodeId: edge.to.nodeId,
      innerPort: edge.to.port,
      externalFromNodeId: edge.from.nodeId,
      externalFromPort: edge.from.port,
      colorId: edge.colorId,
    });
    slots.push(readOnlySlot(meta.label, meta.inputPinColor, extendedPalette));
    portIdx++;
  }

  if (slots.length === 0) {
    slots.push(readOnlySlot('No external inputs', 'gray', extendedPalette));
  }

  let outColor: GraphWireColorId = 'berry';
  const exitEdge = edges.find(
    (e) => containedSet.has(e.from.nodeId) && !containedSet.has(e.to.nodeId)
  );
  let exitBridge: GroupExitBridge | null = null;
  if (exitEdge) {
    outColor = exitEdge.colorId;
    exitBridge = {
      innerFromNodeId: exitEdge.from.nodeId,
      innerFromPort: exitEdge.from.port,
      externalToNodeId: exitEdge.to.nodeId,
      externalToPort: exitEdge.to.port,
      colorId: exitEdge.colorId,
    };
  } else {
    const fn = containedNodes.find((n) => n.kind === 'function' || n.kind === 'generate');
    if (fn?.kind === 'function') outColor = fn.outputPinColor;
    else if (fn?.kind === 'generate') outColor = 'gray';
  }

  const groupId = newId('n-group');
  const giId = newId('n-gin');
  const goId = newId('n-gout');

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of containedNodes) {
    const w = graphNodeWidth(n);
    const h = nodeHeight(n, edges);
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + w);
    maxY = Math.max(maxY, n.y + h);
  }
  const midY = (minY + maxY) / 2;

  const giOutputs = bridges.map((b, i) => ({
    label: slots[i]?.label ?? `in-${b.groupPortIndex}`,
    colorId: b.colorId,
  }));

  const exitToTitle =
    exitEdge != null ? (nodes.find((n) => n.id === exitEdge.to.nodeId)?.title ?? 'Output') : 'Output';

  const groupInput: GroupInputNode = {
    kind: 'groupInput',
    id: giId,
    x: minX - GROUP_INPUT_W - GROUP_BOUNDARY_GAP,
    y: minY,
    parentGroupId: groupId,
    title: 'Group Input',
    frameVariant: 'muted',
    expanded: true,
    outputs: giOutputs,
  };

  const groupOutput: GroupOutputNode = {
    kind: 'groupOutput',
    id: goId,
    x: maxX + GROUP_BOUNDARY_GAP,
    y: minY,
    parentGroupId: groupId,
    title: 'Group Output',
    frameVariant: 'muted',
    expanded: true,
    inputPinColor: outColor,
    rowLabel: exitBridge ? exitToTitle : 'Output',
  };

  const draftGroup: GroupNode = {
    kind: 'group',
    id: groupId,
    x: 0,
    y: 0,
    title: 'Group',
    frameVariant: 'standard',
    expanded: true,
    slotCount: slots.length,
    slots,
    outputPinColor: outColor,
    containedNodeIds: [...containedSet, giId, goId],
    bridges,
    groupInputNodeId: giId,
    groupOutputNodeId: goId,
    exitBridge,
  };
  const gw = graphNodeWidth(draftGroup);
  const gh = nodeHeight(draftGroup, edges);
  draftGroup.x = minX - gw - 24;
  draftGroup.y = midY - gh / 2;

  let nextEdges = edges.filter(
    (e) => !(containedSet.has(e.to.nodeId) && !containedSet.has(e.from.nodeId))
  );
  nextEdges = nextEdges.filter(
    (e) => !(containedSet.has(e.from.nodeId) && !containedSet.has(e.to.nodeId))
  );

  for (const b of bridges) {
    nextEdges.push({
      id: newId('e'),
      from: { nodeId: b.externalFromNodeId, port: b.externalFromPort },
      to: { nodeId: groupId, port: `in-${b.groupPortIndex}` as `in-${number}` },
      colorId: b.colorId,
    });
  }

  bridges.forEach((b, i) => {
    nextEdges.push({
      id: newId('e'),
      from: { nodeId: giId, port: `out-${i}` as `out-${number}` },
      to: { nodeId: b.innerNodeId, port: b.innerPort },
      colorId: b.colorId,
    });
  });

  if (exitBridge) {
    nextEdges.push({
      id: newId('e'),
      from: { nodeId: exitBridge.innerFromNodeId, port: exitBridge.innerFromPort },
      to: { nodeId: goId, port: 'in-0' },
      colorId: exitBridge.colorId,
    });
    nextEdges.push({
      id: newId('e'),
      from: { nodeId: groupId, port: 'out' },
      to: { nodeId: exitBridge.externalToNodeId, port: exitBridge.externalToPort },
      colorId: exitBridge.colorId,
    });
  }

  const nextNodes = [...nodes, groupInput, groupOutput, draftGroup];
  return { nodes: nextNodes, edges: nextEdges, selectedIds: [groupId] };
}

/** Apply ⌘U — ungroup selected group nodes (or all groups in selection). */
export function applyUngroupSelection(
  nodes: GraphNode[],
  edges: GraphEdge[],
  selectedIds: readonly string[]
): { nodes: GraphNode[]; edges: GraphEdge[]; selectedIds: string[] } | null {
  if (selectedIds.length === 0) return null;
  const groups = nodes.filter(
    (n): n is GroupNode => n.kind === 'group' && selectedIds.includes(n.id)
  );
  if (groups.length === 0) return null;

  let nextNodes = [...nodes];
  let nextEdges = [...edges];
  const restoredSelection = new Set<string>();

  for (const g of groups) {
    nextEdges = restoreEdgesAfterRemovingGroup(g, nextEdges);
    nextNodes = nextNodes.filter(
      (n) =>
        n.id !== g.id &&
        !(
          (n.kind === 'groupInput' || n.kind === 'groupOutput') &&
          n.parentGroupId === g.id
        )
    );
    for (const id of g.containedNodeIds) {
      if (id !== g.groupInputNodeId && id !== g.groupOutputNodeId) {
        restoredSelection.add(id);
      }
    }
  }

  const sel =
    restoredSelection.size > 0
      ? [...restoredSelection]
      : selectedIds.filter((id) => nextNodes.some((n) => n.id === id));

  return { nodes: nextNodes, edges: nextEdges, selectedIds: sel };
}

/** When deleting nodes, restore any group that references a deleted node, then drop that group. */
export function expandDeleteIdsForGroupsAndRestoreEdges(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  deleteIds: ReadonlySet<string>
): { deleteIds: Set<string>; edges: GraphEdge[] } {
  const extra = new Set(deleteIds);
  let nextEdges = [...edges];

  for (const n of nodes) {
    if (n.kind !== 'group') continue;
    const g = n;
    const touched =
      deleteIds.has(g.id) ||
      g.containedNodeIds.some((id) => deleteIds.has(id)) ||
      deleteIds.has(g.groupInputNodeId) ||
      deleteIds.has(g.groupOutputNodeId) ||
      g.bridges.some((b) => deleteIds.has(b.externalFromNodeId));
    if (!touched) continue;
    nextEdges = restoreEdgesAfterRemovingGroup(g, nextEdges);
    extra.add(g.id);
    extra.add(g.groupInputNodeId);
    extra.add(g.groupOutputNodeId);
  }

  return { deleteIds: extra, edges: nextEdges };
}
