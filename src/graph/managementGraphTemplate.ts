import { forbidReservedShellWireColor, type GraphWireColorId } from './pinColors';
import type { GraphEdge, GraphNode, TaskLeadingIconId, TaskNode } from './types';

export const MANAGEMENT_TASK_DEFAULT_WIDTH_PX = 180;
export const MANAGEMENT_TASK_ROW_HEIGHT_PX = 28;
/** Vertical distance from one task card top to the next (card + inter-card gap). */
export const MANAGEMENT_TASK_VERTICAL_STEP_PX = 52;
export const MANAGEMENT_TASK_COLUMN_CENTER_X = 400;
export const MANAGEMENT_TASK_WIRE_END_GAP_ABOVE_TOP_PX = 4;

function taskX(width: number): number {
  return MANAGEMENT_TASK_COLUMN_CENTER_X - width / 2;
}

function taskY(order: number, startY: number): number {
  return startY + order * MANAGEMENT_TASK_VERTICAL_STEP_PX;
}

function makeTask(
  id: string,
  order: number,
  title: string,
  leadingIconId: TaskLeadingIconId,
  startY: number,
  width: number = MANAGEMENT_TASK_DEFAULT_WIDTH_PX
): TaskNode {
  const gray = forbidReservedShellWireColor('gray');
  return {
    kind: 'task',
    id,
    x: taskX(width),
    y: taskY(order, startY),
    title,
    frameVariant: 'muted',
    inputPinColor: gray,
    outputPinColor: gray,
    taskState: 'pending',
    leadingIconId,
    managementOrder: order,
    width,
  };
}

/**
 * Default management dependency graph (Figma `2036:29645` structure, top-to-bottom chain).
 * “Prompt” replaces the message field as the first step; labels/icons follow the draft chart.
 */
export function createManagementDemoGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const startY = 48;
  const specs: { id: string; title: string; icon: TaskLeadingIconId; order: number; width?: number }[] = [
    { id: 'mgmt-prompt', title: 'Prompt', icon: 'prompt', order: 0, width: 360 },
    { id: 'mgmt-terrain', title: 'Terrain_sculpt', icon: 'community', order: 1 },
    { id: 'mgmt-layout', title: 'Layout_scaffolding', icon: 'community', order: 2 },
    { id: 'mgmt-logic-dmg', title: 'Logic_damage', icon: 'code', order: 3 },
    { id: 'mgmt-collect', title: 'Collectables', icon: 'collect', order: 4 },
    { id: 'mgmt-npc-sys', title: 'NPC_System', icon: 'npc', order: 5 },
    { id: 'mgmt-logic-npc', title: 'Logic_NPC', icon: 'code', order: 6 },
    { id: 'mgmt-logic-col', title: 'Logic_collectables', icon: 'code', order: 7 },
    { id: 'mgmt-upres', title: 'UpRes', icon: 'verify', order: 8 },
    { id: 'mgmt-verifier', title: 'Verifier', icon: 'verify', order: 9 },
  ];

  const nodes: GraphNode[] = specs.map((s) =>
    makeTask(s.id, s.order, s.title, s.icon, startY, s.width ?? MANAGEMENT_TASK_DEFAULT_WIDTH_PX)
  );

  const wireColor: GraphWireColorId = forbidReservedShellWireColor('gray');
  const edges: GraphEdge[] = [];
  for (let i = 0; i < specs.length - 1; i++) {
    edges.push({
      id: `mgmt-e-${i}`,
      from: { nodeId: specs[i]!.id, port: 'out' },
      to: { nodeId: specs[i + 1]!.id, port: 'in-0' },
      colorId: wireColor,
    });
  }

  return { nodes, edges };
}

export function managementDependencyWireD(from: TaskNode, to: TaskNode): string {
  const wf = from.width ?? MANAGEMENT_TASK_DEFAULT_WIDTH_PX;
  const wt = to.width ?? MANAGEMENT_TASK_DEFAULT_WIDTH_PX;
  const x1 = from.x + wf / 2;
  const y1 = from.y + MANAGEMENT_TASK_ROW_HEIGHT_PX;
  const x2 = to.x + wt / 2;
  const y2 = to.y - MANAGEMENT_TASK_WIRE_END_GAP_ABOVE_TOP_PX;
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

export function sortedManagementTasks(nodes: readonly GraphNode[]): TaskNode[] {
  return nodes
    .filter((n): n is TaskNode => n.kind === 'task')
    .sort((a, b) => (a.managementOrder ?? 0) - (b.managementOrder ?? 0));
}
