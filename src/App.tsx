import { GraphProvider } from './graph/GraphContext';
import { GraphCanvas } from './graph/GraphCanvas';
import { InspectorPanel } from './graph/InspectorPanel';

export default function App() {
  return (
    <GraphProvider>
      <div className="app-shell flex-row flex-1">
        <GraphCanvas />
        <InspectorPanel />
      </div>
    </GraphProvider>
  );
}
