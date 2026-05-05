/**
 * Play / pause control — Figma IconButton `109:7339`: **32×32**, icon **20×20** (Codegen
 * `size-[20px]` inside the button), `media-play-large` / `media-pause-large` assets scaled with
 * `preserveAspectRatio="xMidYMid meet"` (no stretch).
 */
import mediaPlayLargeUrl from '../assets/icons/media-play-large.svg?url';
import mediaPauseLargeUrl from '../assets/icons/media-pause-large.svg?url';

type Props = {
  /** When true, graph “runtime” is active — control shows Play (user can pause). */
  graphPlayActive: boolean;
  onToggle: () => void;
};

export function GraphPlayModeControl({ graphPlayActive, onToggle }: Props) {
  const label = graphPlayActive ? 'Pause graph runtime' : 'Play graph runtime';
  const src = graphPlayActive ? mediaPlayLargeUrl : mediaPauseLargeUrl;
  return (
    <button
      type="button"
      className="graph-play-mode-control"
      aria-label={label}
      aria-pressed={graphPlayActive}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="graph-play-mode-control__icon-slot">
        <img src={src} alt="" className="graph-play-mode-control__img" />
      </span>
    </button>
  );
}
