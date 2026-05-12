import clsx from 'clsx';
import { useGraph } from './GraphContext';
import { GRAPH_PIN_DIAMETER_PX } from './geometry';
import type { GraphWireColorId } from './pinColors';
import { formatGraphWireColorOption, resolveGraphPinHex } from './pinColors';

type Props = {
  colorId: GraphWireColorId;
  connected: boolean;
  /**
   * When true (default), show the Figma tooltip (`113:20106`) with the palette name on hover
   * (e.g. “Magenta”). Set false if the pin is not on the graph canvas.
   */
  showColorTooltip?: boolean;
  /**
   * On the graph, the 2px outer ring (`--studio-surface-0`) is clipped on this side so it only
   * appears over node chrome, not over the wire/canvas (output pins: `right`, inputs: `left`).
   */
  clipOuterStrokeOn?: 'left' | 'right';
};

/**
 * 9×9 socket — `connected`: palette fill. Idle: same inner stroke, fill matches graph canvas /
 * `--studio-surface-0`. Outer **surface** ring uses `box-shadow` on a clipped layer so it only
 * paints over node chrome on the inward side; wires meet the pin without a halo on the canvas.
 */
export function Pin({
  colorId,
  connected,
  showColorTooltip = true,
  clipOuterStrokeOn,
}: Props) {
  const { state } = useGraph();
  const hex = resolveGraphPinHex(colorId, state.extendedPalette);
  const colorName = formatGraphWireColorOption(colorId, state.extendedPalette);

  const core = (
    <div
      className="graph-pin-core"
      style={{
        width: GRAPH_PIN_DIAMETER_PX,
        height: GRAPH_PIN_DIAMETER_PX,
        borderRadius: '50%',
        flexShrink: 0,
        boxSizing: 'border-box',
        background: connected ? hex : 'var(--studio-surface-0)',
        border: `2px solid ${hex}`,
      }}
      aria-label={showColorTooltip ? colorName : undefined}
    />
  );

  const outerSlotClass = clsx(
    'graph-pin-outer-ring-slot',
    clipOuterStrokeOn === 'left' && 'graph-pin-outer-ring-slot--clip-left',
    clipOuterStrokeOn === 'right' && 'graph-pin-outer-ring-slot--clip-right',
    clipOuterStrokeOn == null && 'graph-pin-outer-ring-slot--no-clip'
  );

  const dot = (
    <span className="graph-pin-root">
      <span className={outerSlotClass} aria-hidden>
        <span className="graph-pin-outer-ring" />
      </span>
      {core}
    </span>
  );

  if (!showColorTooltip) {
    return dot;
  }

  return (
    <span className="graph-pin-wrap">
      {dot}
      <span className="graph-pin-tooltip" role="tooltip">
        {colorName}
      </span>
    </span>
  );
}
