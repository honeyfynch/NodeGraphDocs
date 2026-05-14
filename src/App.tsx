import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { WorkbenchInspectorToggleIcon } from './assets/icons/WorkbenchInspectorToggleIcon';
import { GraphProvider } from './graph/GraphContext';
import { GraphCanvas } from './graph/GraphCanvas';
import { InspectorPanel } from './graph/InspectorPanel';

const DEFAULT_INSPECTOR_WIDTH_PX = 400;
/** Figma `2025:8242` ControlColumn — `min-w-[288px]` on the inspector stack. */
const MIN_INSPECTOR_WIDTH_PX = 288;

function maxInspectorWidthPx() {
  return Math.max(MIN_INSPECTOR_WIDTH_PX, Math.floor(window.innerWidth * 0.65));
}

export default function App() {
  const [inspectorEnabled, setInspectorEnabled] = useState(true);
  const [inspectorWidth, setInspectorWidth] = useState(DEFAULT_INSPECTOR_WIDTH_PX);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startW: number;
  } | null>(null);

  useEffect(() => {
    const clamp = () => {
      setInspectorWidth((w) => Math.min(w, maxInspectorWidthPx()));
    };
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const delta = e.clientX - d.startX;
      /** Left splitter of the right-rail inspector: drag right widens the panel. */
      const raw = d.startW - delta;
      const clamped = Math.max(MIN_INSPECTOR_WIDTH_PX, Math.min(maxInspectorWidthPx(), raw));
      setInspectorWidth(clamped);
    };
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const onResizeSplitterPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startW: inspectorWidth,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  return (
    <GraphProvider>
      <div className="flex-col flex-1 min-h-0">
        <div className="workbench-frame flex-1" data-node-id="2025:7877">
          <header className="workbench-frame__header" data-node-id="2025:8147">
            <h1 className="workbench-frame__title">Node graph workbench</h1>
            <button
              type="button"
              className="workbench-inspector-visibility-toggle"
              data-node-id="2025:8818"
              aria-pressed={inspectorEnabled}
              aria-label={inspectorEnabled ? 'Hide inspector panel' : 'Show inspector panel'}
              title={inspectorEnabled ? 'Hide inspector' : 'Show inspector'}
              onClick={() => setInspectorEnabled((v) => !v)}
            >
              <span className="workbench-inspector-visibility-toggle__pad">
                <WorkbenchInspectorToggleIcon className="workbench-inspector-visibility-toggle__icon" />
              </span>
            </button>
          </header>
          <div className="workbench-frame__content" data-node-id="2025:8241">
            <div className="workbench-media-column" data-node-id="2025:8148">
              <div className="workbench-graph-legacy-panel" data-node-id="2025:8149">
                <div className="workbench-graph-slot">
                  <GraphCanvas />
                </div>
              </div>
            </div>
            {inspectorEnabled ? (
              <aside
                className="workbench-control-column"
                data-node-id="2025:8242"
                aria-label="Inspector"
                style={{ width: inspectorWidth }}
              >
                <div
                  className="workbench-resize-handle workbench-resize-handle--splitter"
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize inspector"
                  onPointerDown={onResizeSplitterPointerDown}
                />
                <InspectorPanel />
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </GraphProvider>
  );
}
