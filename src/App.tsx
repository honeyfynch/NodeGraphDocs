import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { GraphProvider } from './graph/GraphContext';
import { GraphCanvas } from './graph/GraphCanvas';
import { InspectorPanel } from './graph/InspectorPanel';

const DEFAULT_INSPECTOR_WIDTH_PX = 400;
const MIN_INSPECTOR_WIDTH_PX = 260;

function maxInspectorWidthPx() {
  return Math.max(MIN_INSPECTOR_WIDTH_PX, Math.floor(window.innerWidth * 0.65));
}

export default function App() {
  const [inspectorWidth, setInspectorWidth] = useState(DEFAULT_INSPECTOR_WIDTH_PX);
  const dragRef = useRef<{
    pointerId: number;
    edge: 'left' | 'right';
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
      const raw = d.edge === 'right' ? d.startW + delta : d.startW - delta;
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

  const onResizeEdgePointerDown =
    (edge: 'left' | 'right') => (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        pointerId: e.pointerId,
        edge,
        startX: e.clientX,
        startW: inspectorWidth,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    };

  return (
    <GraphProvider>
      <div className="flex-col flex-1 min-h-0">
        <div className="workbench-frame flex-1" data-node-id="384:29872">
          <div className="workbench-frame__presentation" aria-hidden>
            <header>
              <p className="workbench-frame__presentation-title">Node graph workbench</p>
            </header>
            <div className="workbench-frame__presentation-footer" />
          </div>
          <div className="workbench-frame__main">
            <aside
              className="workbench-control-column"
              style={{ width: inspectorWidth }}
            >
              <div
                className="workbench-resize-handle workbench-resize-handle--left"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize inspector from the left edge"
                onPointerDown={onResizeEdgePointerDown('left')}
              />
              <InspectorPanel />
              <div
                className="workbench-resize-handle workbench-resize-handle--right"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize inspector from the right edge"
                onPointerDown={onResizeEdgePointerDown('right')}
              />
            </aside>
            <div className="workbench-media-column">
              <div className="workbench-graph-legacy-panel" data-node-id="2009:70166">
                <div className="workbench-graph-slot">
                  <GraphCanvas />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GraphProvider>
  );
}
