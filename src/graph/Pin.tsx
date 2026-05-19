import clsx from 'clsx';
import { useGraph } from './GraphContext';
import { pinClipOuterForCanvas, pinStyleShowsOuterSurfaceRing } from './geometry';
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
   * **Classic only:** the 2px outer ring (`--studio-surface-0`) is clipped on this side so it only
   * appears over node chrome, not over the wire/canvas (output pins: `right`, inputs: `left`).
   * Ignored when pin styling is orbit or contained (no outer ring).
   */
  clipOuterStrokeOn?: 'left' | 'right';
};

/**
 * 12×12 socket — Figma `73:5524`: **connected** solid categorical fill (no inner ring); **idle** ring uses
 * `--graph-pin-palette` with interior `--studio-surface-0` (`Color/Surface/Surface_0` in variables).
 * **Classic:** outer surface ring (`--studio-surface-0` box-shadow) unchanged + optional canvas clip.
 * **Orbit / contained:** no outer ring — core only.
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

  const showOuterRing = pinStyleShowsOuterSurfaceRing(state.pinStyle);

  const core = (
    <div
      className={clsx('graph-pin-core', connected && 'graph-pin-core--connected')}
      style={{ ['--graph-pin-palette' as string]: hex }}
      aria-label={showColorTooltip ? colorName : undefined}
    />
  );

  const clip =
    showOuterRing && clipOuterStrokeOn != null
      ? pinClipOuterForCanvas(state.pinStyle, clipOuterStrokeOn)
      : undefined;

  const outerSlotClass = showOuterRing
    ? clsx(
        'graph-pin-outer-ring-slot',
        clip === 'left' && 'graph-pin-outer-ring-slot--clip-left',
        clip === 'right' && 'graph-pin-outer-ring-slot--clip-right',
        clip == null && 'graph-pin-outer-ring-slot--no-clip'
      )
    : undefined;

  const dot = (
    <span className="graph-pin-root">
      {showOuterRing ? (
        <span className={outerSlotClass} aria-hidden>
          <span className="graph-pin-outer-ring" />
        </span>
      ) : null}
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
