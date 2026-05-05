import type { PinColorId } from './pinColors';
import { PIN_HEX } from './pinColors';

type Props = {
  colorId: PinColorId;
  connected: boolean;
};

/**
 * 9×9 socket — `connected`: palette fill. Idle: same inner stroke, fill matches graph canvas /
 * `--studio-surface-0`. Figma adds a 1px **outer** stroke in `Color/Surface/Surface_0` — mirrored
 * with `box-shadow` so noodles stay crisp at `PIN_HEX` only on the inner ring.
 */
export function Pin({ colorId, connected }: Props) {
  const hex = PIN_HEX[colorId];
  return (
    <div
      className="studio-pin"
      style={{
        width: 9,
        height: 9,
        borderRadius: '50%',
        flexShrink: 0,
        boxSizing: 'border-box',
        background: connected ? hex : 'var(--studio-surface-0)',
        border: `2px solid ${hex}`,
        boxShadow: '0 0 0 1px var(--studio-surface-0)',
      }}
    />
  );
}
