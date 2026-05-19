import { useMemo } from 'react';
import { Dropdown, DropdownItem } from '../foundation/Dropdown';
import { GraphPlayModeControl } from './GraphPlayModeControl';
import { useGraph } from './GraphContext';

const ROOT_SCOPE_VALUE = '__root__';

/**
 * Figma `73:5614` NodeGraphCanvas ribbon (`2009:68781` GraphRibbonContent) — graph scope dropdown (left),
 * graph play/pause (center, same behavior as previous overlay).
 */
export function GraphRibbon() {
  const { state, dispatch } = useGraph();

  const groupNodes = useMemo(
    () => state.nodes.filter((n) => n.kind === 'group'),
    [state.nodes]
  );

  const scopeValue = useMemo(() => {
    if (state.graphScope == null) return ROOT_SCOPE_VALUE;
    return state.nodes.some((n) => n.id === state.graphScope && n.kind === 'group')
      ? state.graphScope
      : ROOT_SCOPE_VALUE;
  }, [state.graphScope, state.nodes]);

  const onScopeChange = (v: string) => {
    if (v === ROOT_SCOPE_VALUE) {
      if (state.graphScope != null) dispatch({ type: 'exitGroupScope' });
      return;
    }
    if (v !== state.graphScope) {
      dispatch({ type: 'enterGroupScope', groupId: v });
    }
  };

  return (
    <div
      className="workbench-graph-ribbon"
      data-node-id="2009:68781"
      role="toolbar"
      aria-label="Graph toolbar"
    >
      <div className="workbench-graph-ribbon__left">
        <div className="graph-ribbon-scope-slot">
          <Dropdown
            value={scopeValue}
            onChange={onScopeChange}
            ariaLabel="Graph view level"
            className="graph-ribbon-scope-trigger"
            contentClassName="select-content--graph-ribbon-menu"
          >
            <DropdownItem value={ROOT_SCOPE_VALUE}>Graph</DropdownItem>
            {groupNodes.map((g) => (
              <DropdownItem key={g.id} value={g.id}>
                {g.title || 'Group'}
              </DropdownItem>
            ))}
          </Dropdown>
        </div>
      </div>
      <div className="workbench-graph-ribbon__center">
        {state.playMode || state.graphType === 'management' ? (
          <GraphPlayModeControl
            ribbon
            graphPlayActive={state.graphPlayActive}
            onToggle={() => dispatch({ type: 'toggleGraphPlay' })}
          />
        ) : null}
      </div>
      <div className="workbench-graph-ribbon__right" />
    </div>
  );
}
