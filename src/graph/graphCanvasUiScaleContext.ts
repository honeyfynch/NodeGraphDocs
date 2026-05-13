import { createContext } from 'react';

/**
 * Graph canvas zoom (`view.scale`). Drives `--graph-node-property-dropdown-scale` on portaled
 * property dropdowns so menu text/padding match the scaled trigger. Default `1` (inspector, tests).
 */
export const GraphCanvasUiScaleContext = createContext(1);
