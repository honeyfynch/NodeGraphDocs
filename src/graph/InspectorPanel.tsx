import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '../foundation/Button';
import { Checkbox } from '../foundation/Checkbox';
import { Dropdown, DropdownItem } from '../foundation/Dropdown';
import { NodePropertyFieldShell } from '../foundation/NodePropertyFieldShell';
import { TextInput } from '../foundation/TextInput';
import {
  configurableGraphWireColorIds,
  formatGraphWireColorOption,
  type GraphWireColorId,
} from './pinColors';
import {
  findIncomingParameterSource,
  portForInputGroupChild,
  portForTopLevelFunctionSlot,
} from './graphWiring';
import { isGraphPinStyleId } from './geometry';
import { useGraph } from './GraphContext';
import type { FrameVariant, FunctionSlot, RowPropertyType, GraphTypeId, TaskLeadingIconId } from './types';
import {
  ROW_PROPERTY_FIGMA_LABEL,
  ROW_PROPERTY_TYPE_IDS,
  ROW_PROPERTY_TYPE_IDS_INPUT_GROUP_CHILD,
  normalizeFunctionSlot,
  rowPropertyUsesInputTextPlaceholder,
  TASK_LEADING_ICON_IDS,
  TASK_LEADING_ICON_LABEL,
} from './types';

const FRAME_OPTS: FrameVariant[] = ['standard', 'emphasis', 'muted'];

export function InspectorPanel() {
  const { state, dispatch } = useGraph();
  const sel =
    state.selectedIds.length > 0
      ? state.selectedIds[state.selectedIds.length - 1]!
      : null;
  const node = sel ? state.nodes.find((n) => n.id === sel) : null;
  const configurableWireColorIds = useMemo(
    () => configurableGraphWireColorIds(state.extendedPalette),
    [state.extendedPalette]
  );

  const edgesHere = state.edges.filter(
    (e) =>
      state.selectedIds.includes(e.from.nodeId) ||
      state.selectedIds.includes(e.to.nodeId)
  );

  const [inspectorTab, setInspectorTab] = useState<'settings' | 'experimental'>('settings');
  const settingsTabLabel = node ? 'Node Settings' : 'Graph Settings';

  return (
    <div className="workbench-inspector-panel" data-node-id="2025:8243">
      <div className="workbench-inspector-tabbar">
        <div className="workbench-inspector-tabbar__tabs">
          <button
            type="button"
            className={
              inspectorTab === 'settings'
                ? 'workbench-inspector-tab workbench-inspector-tab--selected'
                : 'workbench-inspector-tab'
            }
            onClick={() => setInspectorTab('settings')}
          >
            <span className="text-label-small font-semibold">{settingsTabLabel}</span>
          </button>
          <button
            type="button"
            className={
              inspectorTab === 'experimental'
                ? 'workbench-inspector-tab workbench-inspector-tab--selected'
                : 'workbench-inspector-tab'
            }
            onClick={() => setInspectorTab('experimental')}
          >
            <span className="text-label-small font-semibold">Experimental Settings</span>
          </button>
        </div>
        <div className="workbench-inspector-tabbar__actions">
          <button
            type="button"
            className="workbench-inspector-tabbar__icon-btn"
            aria-label="Panel menu"
          >
            ⋯
          </button>
        </div>
      </div>
      <div className="workbench-inspector-body overflow-auto foundation-scrollbar">
        {inspectorTab === 'settings' ? (
          <>
            {state.selectedIds.length === 0 ? (
              <div className="p-md flex-col gap-sm workbench-inspector-section-divider">
                <div className="text-xs font-semibold text-emphasis">Graph</div>
                <NodePropertyFieldShell variant="plain">
                  <Field label="Graph type">
                    <Dropdown
                      variant="nodeProperty"
                      value={state.graphType}
                      onChange={(v) =>
                        dispatch({
                          type: 'setGraphType',
                          value: v as GraphTypeId,
                        })
                      }
                    >
                      <DropdownItem value="dataFlow">Data Flow</DropdownItem>
                      <DropdownItem value="management">Management</DropdownItem>
                    </Dropdown>
                  </Field>
                </NodePropertyFieldShell>
                {state.graphType === 'dataFlow' ? (
                  <>
                    <NodePropertyFieldShell variant="plain">
                      <Checkbox
                        label="Play mode"
                        hint="Graph can trigger a runtime mode"
                        checked={state.playMode}
                        onCheckedChange={(value) => dispatch({ type: 'setPlayMode', value })}
                      />
                    </NodePropertyFieldShell>
                    <NodePropertyFieldShell variant="plain">
                      <Checkbox
                        label="Parameters"
                        hint="Graph integrates parameters"
                        checked={state.parametersEnabled}
                        onCheckedChange={(value) =>
                          dispatch({ type: 'setParametersEnabled', value })
                        }
                      />
                    </NodePropertyFieldShell>
                    <NodePropertyFieldShell variant="plain">
                      <Checkbox
                        label="Generative Nodes"
                        hint="Graph integrates generative nodes."
                        checked={state.generativeNodesEnabled}
                        onCheckedChange={(value) =>
                          dispatch({ type: 'setGenerativeNodesEnabled', value })
                        }
                      />
                    </NodePropertyFieldShell>
                  </>
                ) : null}
              </div>
            ) : null}

            <div className="p-md flex-col gap-md workbench-inspector-section-divider">
              <div className="text-xs font-semibold text-emphasis">Node</div>
        {!node && (
          <div className="text-sm text-muted">Select a node on the canvas.</div>
        )}

      {node?.kind === 'parameter' && (
        <div className="flex-col gap-md">
          <Field label="Node type">
            <Dropdown
              variant="nodeProperty"
              value="parameter"
              onChange={(v) =>
                dispatch({
                  type: 'setPrototypeNodeKind',
                  id: node.id,
                  kind: v as 'parameter' | 'function' | 'generate',
                })
              }
            >
              <DropdownItem value="parameter">Parameter</DropdownItem>
              <DropdownItem value="function">Function</DropdownItem>
              {state.generativeNodesEnabled ? (
                <DropdownItem value="generate">Generate</DropdownItem>
              ) : null}
            </Dropdown>
          </Field>
          <Field label="Title">
            <TextInput variant="nodeProperty"
              value={node.title}
              onChange={(e) =>
                dispatch({
                  type: 'updateParameter',
                  id: node.id,
                  patch: { title: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Parameter value">
            <TextInput
              variant="nodeProperty"
              value={node.parameterValue ?? ''}
              onChange={(e) =>
                dispatch({
                  type: 'updateParameter',
                  id: node.id,
                  patch: { parameterValue: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Node color">
            <Dropdown
              variant="nodeProperty"
              value={node.outputPinColor}
              onChange={(v) =>
                dispatch({
                  type: 'updateParameter',
                  id: node.id,
                  patch: { outputPinColor: v as GraphWireColorId },
                })
              }
            >
              {configurableWireColorIds.map((id) => (
                <DropdownItem key={id} value={id}>
                  {formatGraphWireColorOption(id as GraphWireColorId, state.extendedPalette)}
                </DropdownItem>
              ))}
            </Dropdown>
          </Field>
          <NodePropertyFieldShell variant="plain">
            <Checkbox
              label="Value row"
              hint="Optional row below the chip (Figma `73:6071` is single-row)."
              checked={node.expanded}
              onCheckedChange={(expanded) =>
                dispatch({
                  type: 'updateParameter',
                  id: node.id,
                  patch: { expanded },
                })
              }
            />
          </NodePropertyFieldShell>
        </div>
      )}

      {node?.kind === 'function' && (
        <div className="flex-col gap-md">
          <Field label="Node type">
            <Dropdown
              variant="nodeProperty"
              value="function"
              onChange={(v) =>
                dispatch({
                  type: 'setPrototypeNodeKind',
                  id: node.id,
                  kind: v as 'parameter' | 'function' | 'generate',
                })
              }
            >
              {state.parametersEnabled ? (
                <DropdownItem value="parameter">Parameter</DropdownItem>
              ) : null}
              <DropdownItem value="function">Function</DropdownItem>
              {state.generativeNodesEnabled ? (
                <DropdownItem value="generate">Generate</DropdownItem>
              ) : null}
            </Dropdown>
          </Field>
          <Field label="Title">
            <TextInput variant="nodeProperty"
              value={node.title}
              onChange={(e) =>
                dispatch({
                  type: 'updateFunction',
                  id: node.id,
                  patch: { title: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Slot count">
            <TextInput variant="nodeProperty"
              type="number"
              min={1}
              max={12}
              value={String(node.slotCount)}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                dispatch({
                  type: 'updateFunction',
                  id: node.id,
                  patch: { slotCount: n },
                });
              }}
            />
          </Field>
          <Field label="Node color">
            <Dropdown
              variant="nodeProperty"
              value={node.outputPinColor}
              onChange={(v) =>
                dispatch({
                  type: 'updateFunction',
                  id: node.id,
                  patch: { outputPinColor: v as GraphWireColorId },
                })
              }
            >
              {configurableWireColorIds.map((id) => (
                <DropdownItem key={id} value={id}>
                  {formatGraphWireColorOption(id as GraphWireColorId, state.extendedPalette)}
                </DropdownItem>
              ))}
            </Dropdown>
          </Field>

          {node.slots.map((slot, i) => {
            if (slot.propertyType === 'inputGroup') {
              return (
              <div
                key={`slot-${i}`}
                className="flex-col gap-sm p-sm border-studio radius-sm"
                style={{ background: 'rgba(208,217,251,0.04)' }}
              >
                <div className="text-xs font-semibold text-emphasis">Slot {i + 1}</div>
                <Field label="Property type">
                  <Dropdown
                    variant="nodeProperty"
                    value={slot.propertyType}
                    onChange={(v) =>
                      dispatch({
                        type: 'updateFunctionSlot',
                        id: node.id,
                        slotIndex: i,
                        patch: { propertyType: v as RowPropertyType },
                      })
                    }
                  >
                    {ROW_PROPERTY_TYPE_IDS.map((p) => (
                      <DropdownItem key={p} value={p}>
                        {ROW_PROPERTY_FIGMA_LABEL[p]}
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </Field>
                <Field label="Child row count">
                  <TextInput
                    variant="nodeProperty"
                    type="number"
                    min={1}
                    max={12}
                    value={String(slot.inputGroupChildSlots?.length ?? 2)}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n)) return;
                      const c = Math.max(1, Math.min(12, n));
                      const pin = slot.inputPinColor;
                      const prev = slot.inputGroupChildSlots ?? [];
                      const next: FunctionSlot[] = [];
                      for (let j = 0; j < c; j++) {
                        next.push(
                          normalizeFunctionSlot(
                            prev[j] ?? inspectorDefaultChildSlot(j, pin, state.extendedPalette),
                            state.extendedPalette
                          )
                        );
                      }
                      dispatch({
                        type: 'updateFunctionSlot',
                        id: node.id,
                        slotIndex: i,
                        patch: { inputGroupChildSlots: next },
                      });
                    }}
                  />
                </Field>
                <Field label="Input pin color (group)">
                  <Dropdown
                    variant="nodeProperty"
                    value={slot.inputPinColor}
                    onChange={(v) =>
                      dispatch({
                        type: 'updateFunctionSlot',
                        id: node.id,
                        slotIndex: i,
                        patch: { inputPinColor: v as GraphWireColorId },
                      })
                    }
                  >
                    {configurableWireColorIds.map((id) => (
                      <DropdownItem key={id} value={id}>
                        {formatGraphWireColorOption(id as GraphWireColorId, state.extendedPalette)}
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </Field>
                <NodePropertyFieldShell variant="plain">
                  <Checkbox
                    label="Expanded"
                    hint="Show child rows on the node"
                    checked={slot.inputGroupExpanded === true}
                    onCheckedChange={(inputGroupExpanded) =>
                      dispatch({
                        type: 'updateFunctionSlot',
                        id: node.id,
                        slotIndex: i,
                        patch: { inputGroupExpanded },
                      })
                    }
                  />
                </NodePropertyFieldShell>
                {(slot.inputGroupChildSlots ?? []).map((child, ci) => {
                  const childPort = portForInputGroupChild(node, i, ci);
                  const childDriven = !!(
                    childPort &&
                    findIncomingParameterSource(
                      state.nodes,
                      state.edges,
                      node.id,
                      childPort
                    )
                  );
                  return (
                  <div
                    key={`slot-${i}-child-${ci}`}
                    className="flex-col gap-sm p-sm border-studio radius-sm"
                    style={{
                      background: 'rgba(208,217,251,0.06)',
                      ...(childDriven
                        ? { opacity: 0.5, pointerEvents: 'none' as const }
                        : {}),
                    }}
                  >
                    {childDriven ? (
                      <div className="text-xs text-muted">
                        Wired from a parameter — disconnect on the graph to edit this input.
                      </div>
                    ) : null}
                    <div className="text-xs font-semibold text-emphasis">Child {ci + 1}</div>
                    <Field label="Label">
                      <TextInput
                        variant="nodeProperty"
                        value={child.label}
                        onChange={(e) =>
                          dispatch({
                            type: 'updateFunctionInputGroupChild',
                            id: node.id,
                            slotIndex: i,
                            childIndex: ci,
                            patch: { label: e.target.value },
                          })
                        }
                      />
                    </Field>
                    <Field label="Property type">
                      <Dropdown
                        variant="nodeProperty"
                        value={child.propertyType}
                        onChange={(v) =>
                          dispatch({
                            type: 'updateFunctionInputGroupChild',
                            id: node.id,
                            slotIndex: i,
                            childIndex: ci,
                            patch: { propertyType: v as RowPropertyType },
                          })
                        }
                      >
                        {ROW_PROPERTY_TYPE_IDS_INPUT_GROUP_CHILD.map((p) => (
                          <DropdownItem key={p} value={p}>
                            {ROW_PROPERTY_FIGMA_LABEL[p]}
                          </DropdownItem>
                        ))}
                      </Dropdown>
                    </Field>
                    {rowPropertyUsesInputTextPlaceholder(child.propertyType) && (
                      <Field label="Placeholder text">
                        <TextInput
                          variant="nodeProperty"
                          value={child.placeholderText}
                          onChange={(e) =>
                            dispatch({
                              type: 'updateFunctionInputGroupChild',
                              id: node.id,
                              slotIndex: i,
                              childIndex: ci,
                              patch: { placeholderText: e.target.value },
                            })
                          }
                        />
                      </Field>
                    )}
                  </div>
                  );
                })}
              </div>
              );
            }
            const slotPort = portForTopLevelFunctionSlot(node, i);
            const slotDriven = !!(
              slotPort &&
              findIncomingParameterSource(state.nodes, state.edges, node.id, slotPort)
            );
            return (
              <div
                key={`slot-${i}`}
                className="flex-col gap-sm p-sm border-studio radius-sm"
                style={{
                  background: 'rgba(208,217,251,0.04)',
                  ...(slotDriven ? { opacity: 0.5, pointerEvents: 'none' as const } : {}),
                }}
              >
                {slotDriven ? (
                  <div className="text-xs text-muted">
                    Wired from a parameter — disconnect on the graph to edit.
                  </div>
                ) : null}
                <div className="text-xs font-semibold text-emphasis">Slot {i + 1}</div>
                <Field label="Label">
                  <TextInput variant="nodeProperty"
                    value={slot.label}
                    onChange={(e) =>
                      dispatch({
                        type: 'updateFunctionSlot',
                        id: node.id,
                        slotIndex: i,
                        patch: { label: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label="Property type">
                  <Dropdown
                    variant="nodeProperty"
                    value={slot.propertyType}
                    onChange={(v) =>
                      dispatch({
                        type: 'updateFunctionSlot',
                        id: node.id,
                        slotIndex: i,
                        patch: { propertyType: v as RowPropertyType },
                      })
                    }
                  >
                    {ROW_PROPERTY_TYPE_IDS.map((p) => (
                      <DropdownItem key={p} value={p}>
                        {ROW_PROPERTY_FIGMA_LABEL[p]}
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </Field>
                {rowPropertyUsesInputTextPlaceholder(slot.propertyType) && (
                  <Field label="Placeholder text">
                    <TextInput variant="nodeProperty"
                      value={slot.placeholderText}
                      onChange={(e) =>
                        dispatch({
                          type: 'updateFunctionSlot',
                          id: node.id,
                          slotIndex: i,
                          patch: { placeholderText: e.target.value },
                        })
                      }
                    />
                  </Field>
                )}
                <Field label="Input pin color">
                  <Dropdown
                    variant="nodeProperty"
                    value={slot.inputPinColor}
                    onChange={(v) =>
                      dispatch({
                        type: 'updateFunctionSlot',
                        id: node.id,
                        slotIndex: i,
                        patch: { inputPinColor: v as GraphWireColorId },
                      })
                    }
                  >
                    {configurableWireColorIds.map((id) => (
                      <DropdownItem key={id} value={id}>
                        {formatGraphWireColorOption(id as GraphWireColorId, state.extendedPalette)}
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </Field>
              </div>
            );
          })}
        </div>
      )}

      {node?.kind === 'group' && (
        <div className="flex-col gap-md">
          <div className="text-sm text-muted">
            Group wraps a subgraph on the canvas. It is not interchangeable with Parameter / Function /
            Generate in the inspector.
          </div>
          <Field label="Title">
            <TextInput
              variant="nodeProperty"
              value={node.title}
              onChange={(e) =>
                dispatch({
                  type: 'updateGroup',
                  id: node.id,
                  patch: { title: e.target.value },
                })
              }
            />
          </Field>
          <Field label="External inputs (read-only)">
            {node.bridges.length === 0 ? (
              <div className="text-sm text-muted">No edges from outside the group into the selection.</div>
            ) : (
              <ul className="text-sm text-muted m-0 pl-md flex-col gap-xs list-disc">
                {node.bridges.map((b) => {
                  const inner = state.nodes.find((n) => n.id === b.innerNodeId);
                  const rowLabel = node.slots[b.groupPortIndex]?.label ?? `in-${b.groupPortIndex}`;
                  return (
                    <li key={`${b.innerNodeId}-${b.innerPort}`}>
                      {rowLabel} → {inner?.title ?? b.innerNodeId} · {b.innerPort}
                    </li>
                  );
                })}
              </ul>
            )}
          </Field>
        </div>
      )}

      {(node?.kind === 'groupInput' || node?.kind === 'groupOutput') && (
        <div className="text-sm text-muted">
          {node.kind === 'groupInput' ? 'Group Input' : 'Group Output'} is a subgraph boundary. Double-click
          this node (or press Esc) while inside a group to return to the parent graph.
        </div>
      )}

      {node?.kind === 'generate' && (
        <div className="flex-col gap-md">
          <Field label="Node type">
            <Dropdown
              variant="nodeProperty"
              value="generate"
              onChange={(v) =>
                dispatch({
                  type: 'setPrototypeNodeKind',
                  id: node.id,
                  kind: v as 'parameter' | 'function' | 'generate',
                })
              }
            >
              {state.parametersEnabled ? (
                <DropdownItem value="parameter">Parameter</DropdownItem>
              ) : null}
              <DropdownItem value="function">Function</DropdownItem>
              <DropdownItem value="generate">Generate</DropdownItem>
            </Dropdown>
          </Field>
          <Field label="Title">
            <TextInput
              variant="nodeProperty"
              value={node.title}
              onChange={(e) =>
                dispatch({
                  type: 'updateGenerate',
                  id: node.id,
                  patch: { title: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Phase">
            <Dropdown
              variant="nodeProperty"
              value={node.generativePhase}
              onChange={(v) =>
                dispatch({
                  type: 'updateGenerate',
                  id: node.id,
                  patch: { generativePhase: v as 'prompt' | 'output' },
                })
              }
            >
              <DropdownItem value="prompt">Prompt</DropdownItem>
              <DropdownItem value="output">Output</DropdownItem>
            </Dropdown>
          </Field>
          <Field label="Prompt text">
            <textarea
              className="w-full rounded border-studio bg-surface-100 text-sm p-sm outline-none"
              style={{ minHeight: 80, resize: 'vertical' }}
              value={node.promptText}
              onChange={(e) =>
                dispatch({
                  type: 'updateGenerate',
                  id: node.id,
                  patch: { promptText: e.target.value },
                })
              }
            />
          </Field>
          <NodePropertyFieldShell variant="plain">
            <Checkbox
              label="Inputs section expanded"
              hint="When expanded, the node shows the Inputs group rows on the canvas."
              checked={node.inputGroupExpanded}
              onCheckedChange={(inputGroupExpanded) =>
                dispatch({
                  type: 'updateGenerate',
                  id: node.id,
                  patch: { inputGroupExpanded },
                })
              }
            />
          </NodePropertyFieldShell>
          <NodePropertyFieldShell variant="plain">
            <Checkbox
              label="Body expanded"
              hint="When collapsed, only the node header is shown."
              checked={node.expanded}
              onCheckedChange={(expanded) =>
                dispatch({
                  type: 'updateGenerate',
                  id: node.id,
                  patch: { expanded },
                })
              }
            />
          </NodePropertyFieldShell>
        </div>
      )}

      {node?.kind === 'output' && (
        <div className="flex-col gap-md">
          <Field label="Frame">
            <Dropdown
              variant="nodeProperty"
              value={node.frameVariant}
              onChange={(v) =>
                dispatch({
                  type: 'updateOutput',
                  id: node.id,
                  patch: { frameVariant: v as FrameVariant },
                })
              }
            >
              {FRAME_OPTS.map((f) => (
                <DropdownItem key={f} value={f}>
                  {f}
                </DropdownItem>
              ))}
            </Dropdown>
          </Field>
          <Field label="Title">
            <TextInput variant="nodeProperty"
              value={node.title}
              onChange={(e) =>
                dispatch({
                  type: 'updateOutput',
                  id: node.id,
                  patch: { title: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Node color">
            <Dropdown
              variant="nodeProperty"
              value={node.inputPinColor}
              onChange={(v) =>
                dispatch({
                  type: 'updateOutput',
                  id: node.id,
                  patch: { inputPinColor: v as GraphWireColorId },
                })
              }
            >
              {configurableWireColorIds.map((id) => (
                <DropdownItem key={id} value={id}>
                  {formatGraphWireColorOption(id as GraphWireColorId, state.extendedPalette)}
                </DropdownItem>
              ))}
            </Dropdown>
          </Field>
        </div>
      )}

      {node?.kind === 'task' && (
        <div className="flex-col gap-md">
          <Field label="Title">
            <TextInput
              variant="nodeProperty"
              value={node.title}
              onChange={(e) =>
                dispatch({
                  type: 'updateTask',
                  id: node.id,
                  patch: { title: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Leading icon">
            <Dropdown
              variant="nodeProperty"
              value={node.leadingIconId}
              onChange={(v) =>
                dispatch({
                  type: 'updateTask',
                  id: node.id,
                  patch: { leadingIconId: v as TaskLeadingIconId },
                })
              }
            >
              {TASK_LEADING_ICON_IDS.map((id) => (
                <DropdownItem key={id} value={id}>
                  {TASK_LEADING_ICON_LABEL[id]}
                </DropdownItem>
              ))}
            </Dropdown>
          </Field>
          <NodePropertyFieldShell variant="plain">
            <Checkbox
              label="Muted"
              checked={Boolean(node.disabled)}
              onCheckedChange={(disabled) =>
                dispatch({
                  type: 'updateTask',
                  id: node.id,
                  patch: { disabled },
                })
              }
            />
          </NodePropertyFieldShell>
        </div>
      )}
      </div>

      {node && (
        <div className="p-md flex-col gap-sm workbench-inspector-section-divider">
          <div className="text-xs font-semibold text-emphasis">Connections</div>
          {edgesHere.length === 0 && (
            <div className="text-xs text-muted">No edges attached.</div>
          )}
          {edgesHere.map((e) => {
            const fromN = state.nodes.find((n) => n.id === e.from.nodeId);
            const toN = state.nodes.find((n) => n.id === e.to.nodeId);
            const fixedTaskChain =
              state.graphType === 'management' &&
              fromN?.kind === 'task' &&
              toN?.kind === 'task';
            return (
            <div
              key={e.id}
              className="flex-row items-center justify-between gap-sm text-xs"
            >
              <span className="text-muted min-w-0" style={{ wordBreak: 'break-all' }}>
                {e.from.nodeId}:{e.from.port} → {e.to.nodeId}:{e.to.port}
              </span>
              {!fixedTaskChain ? (
              <Button
                variant="standard"
                className="shrink-0"
                onClick={() => dispatch({ type: 'removeEdge', id: e.id })}
              >
                Remove
              </Button>
              ) : (
                <span className="text-muted shrink-0 text-xs">Fixed</span>
              )}
            </div>
            );
          })}
        </div>
      )}
          </>
        ) : (
          <div className="p-md flex-col gap-sm">
            <NodePropertyFieldShell variant="plain">
              <Field label="Pin styling">
                <Dropdown
                  variant="nodeProperty"
                  value={state.pinStyle}
                  onChange={(v) => {
                    if (isGraphPinStyleId(v)) {
                      dispatch({ type: 'setPinStyle', value: v });
                    }
                  }}
                >
                  <DropdownItem value="classic">Classic</DropdownItem>
                  <DropdownItem value="orbit">Orbit</DropdownItem>
                  <DropdownItem value="contained">Contained</DropdownItem>
                </Dropdown>
              </Field>
            </NodePropertyFieldShell>
            <NodePropertyFieldShell variant="plain">
              <Checkbox
                label="Show guide"
                checked={state.showGraphGuide}
                onCheckedChange={(value) =>
                  dispatch({ type: 'setShowGraphGuide', value })
                }
              />
            </NodePropertyFieldShell>
            <NodePropertyFieldShell variant="plain">
              <Checkbox
                label="Progressive connections"
                checked={state.progressiveConnections}
                onCheckedChange={(value) =>
                  dispatch({ type: 'setProgressiveConnections', value })
                }
              />
            </NodePropertyFieldShell>
            <NodePropertyFieldShell variant="plain">
              <Checkbox
                label="Context Toolbar"
                checked={state.contextToolbar}
                onCheckedChange={(value) =>
                  dispatch({ type: 'setContextToolbar', value })
                }
              />
            </NodePropertyFieldShell>
            <NodePropertyFieldShell variant="plain">
              <Checkbox
                label="Expand/Collapse in Toolbar"
                hint={
                  state.contextToolbar
                    ? 'When on, expand/collapse is only in the context toolbar. When off, the node header chevron returns (still follows Right-aligned Chevron).'
                    : 'Turn on Context Toolbar to use this option.'
                }
                checked={state.contextToolbarExpandCollapseInToolbar}
                disabled={!state.contextToolbar}
                onCheckedChange={(value) =>
                  dispatch({ type: 'setContextToolbarExpandCollapseInToolbar', value })
                }
              />
            </NodePropertyFieldShell>
            <NodePropertyFieldShell variant="plain">
              <Checkbox
                label="Docked"
                hint={
                  state.contextToolbar
                    ? 'Keep the context toolbar centered below the graph ribbon (12px gap).'
                    : 'Turn on Context Toolbar to use this option.'
                }
                checked={state.contextToolbarDocked}
                disabled={!state.contextToolbar}
                onCheckedChange={(value) =>
                  dispatch({ type: 'setContextToolbarDocked', value })
                }
              />
            </NodePropertyFieldShell>
            <NodePropertyFieldShell variant="plain">
              <Checkbox
                label="Right-aligned Chevron"
                hint="When off, expand/collapse chevrons stay on the left of node headers and input groups. When on (default), chevrons align to the right of the header row. With Context Toolbar on, header chevrons show only when Expand/Collapse in Toolbar is off."
                checked={state.rightAlignedChevron}
                onCheckedChange={(value) =>
                  dispatch({ type: 'setRightAlignedChevron', value })
                }
              />
            </NodePropertyFieldShell>
            <NodePropertyFieldShell variant="plain">
              <Checkbox
                label="Click-drag to connect pins"
                checked={state.clickDragPinWiring}
                onCheckedChange={(value) =>
                  dispatch({ type: 'setClickDragPinWiring', value })
                }
              />
            </NodePropertyFieldShell>
            <NodePropertyFieldShell variant="plain">
              <Checkbox
                label="Extended palette"
                hint="Lima, Berry, Yellow, … When off, node colors use Figma Data categorical contrast tokens (Blue, Berry, Rainforest, …)."
                checked={state.extendedPalette}
                onCheckedChange={(value) =>
                  dispatch({ type: 'setExtendedPalette', value })
                }
              />
            </NodePropertyFieldShell>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex-col gap-xs">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

function inspectorDefaultChildSlot(
  index: number,
  inputPinColor: GraphWireColorId,
  extendedPalette: boolean
): FunctionSlot {
  return normalizeFunctionSlot(
    {
      label: 'Label',
      propertyType:
        ROW_PROPERTY_TYPE_IDS_INPUT_GROUP_CHILD[
          index % ROW_PROPERTY_TYPE_IDS_INPUT_GROUP_CHILD.length
        ]!,
      inputPinColor,
      placeholderText: 'Placeholder',
      textValue: null,
      numberValues: [null, null, null],
    },
    extendedPalette
  );
}
