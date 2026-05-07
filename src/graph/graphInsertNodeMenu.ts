import type { PinColorId } from './pinColors';

/**
 * Figma `145:32069` Create Parameter Sub-Menu — `.MenuSectionTitle` copy (exact casing).
 * Same palette row order as {@link GRAPH_INSERT_NODE_SUBMENU_ROWS}.
 */
export const GRAPH_NEW_PARAMETER_MENU_SECTION_TITLE = 'New parameter';

/**
 * Figma `139:47052` Insert node flyout — color row titles in document order
 * (after the "Insert node" header). Order matches `145:32069` New parameter palette list.
 */
export const GRAPH_INSERT_NODE_SUBMENU_ROWS: readonly {
  label: string;
  colorId: PinColorId;
}[] = [
  { label: 'Gray', colorId: 'gray' },
  { label: 'Red', colorId: 'red' },
  { label: 'Orange', colorId: 'orange' },
  { label: 'Yellow', colorId: 'yellow' },
  { label: 'Lima', colorId: 'lima' },
  { label: 'Green', colorId: 'green' },
  { label: 'Rainforest', colorId: 'rainforest' },
  { label: 'Ice', colorId: 'ice' },
  { label: 'Blue', colorId: 'blue' },
  { label: 'Purple', colorId: 'purple' },
  { label: 'Magenta', colorId: 'magenta' },
  { label: 'Berry', colorId: 'berry' },
];

/** Figma `139:47052` Node Sub-Menu frame width (matches graph context menu). */
export const GRAPH_INSERT_NODE_SUBMENU_W = 260;
