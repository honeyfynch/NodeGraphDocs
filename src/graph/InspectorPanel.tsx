import type { ReactNode } from 'react';
import { Button } from '../foundation/Button';
import { Checkbox } from '../foundation/Checkbox';
import { Dropdown, DropdownItem } from '../foundation/Dropdown';
import { NodePropertyFieldShell } from '../foundation/NodePropertyFieldShell';
import { TextInput } from '../foundation/TextInput';
import {
  PIN_COLOR_IDS,
  formatNodeColorOption,
  formatPinColorOption,
  type PinColorId,
} from './pinColors';
import {
  findIncomingParameterSource,
  portForInputGroupChild,
  portForTopLevelFunctionSlot,
} from './graphWiring';
import { useGraph } from './GraphContext';
import type { FrameVariant, FunctionSlot, RowPropertyType } from './types';
import {
  ROW_PROPERTY_FIGMA_LABEL,
  ROW_PROPERTY_TYPE_IDS,
  ROW_PROPERTY_TYPE_IDS_INPUT_GROUP_CHILD,
  normalizeFunctionSlot,
  rowPropertyUsesInputTextPlaceholder,
} from './types';

const FRAME_OPTS: FrameVariant[] = ['standard', 'emphasis', 'muted'];

export function InspectorPanel() {
  const { state, dispatch } = useGraph();
  const sel =
    state.selectedIds.length > 0
      ? state.selectedIds[state.selectedIds.length - 1]!
      : null;
  const node = sel ? state.nodes.find((n) => n.id === sel) : null;

  const edgesHere = state.edges.filter(
    (e) =>
      state.selectedIds.includes(e.from.nodeId) ||
      state.selectedIds.includes(e.to.nodeId)
  );

  return (
    <aside
      className="bg-surface-inspector border-studio shrink-0 overflow-auto radius-panel"
      style={{ width: 320, maxHeight: '100vh' }}
    >
      <div className="p-md flex-col gap-md border-studio border-b">
        <div>
          <h2 className="text-label-small text-emphasis m-0">Prototype Settings</h2>
          <p className="text-xs text-muted m-0 inspector-sub">Configure the selected node</p>
        </div>
      </div>

      <div className="p-md flex-col gap-sm border-studio border-b">
        <div className="text-xs font-semibold text-emphasis">Graph Settings</div>
        <NodePropertyFieldShell>
          <Checkbox
            label="Play mode"
            checked={state.playMode}
            onCheckedChange={(value) => dispatch({ type: 'setPlayMode', value })}
          />
        </NodePropertyFieldShell>
        <NodePropertyFieldShell>
          <Checkbox
            label="Parameters"
            checked={state.parametersEnabled}
            onCheckedChange={(value) =>
              dispatch({ type: 'setParametersEnabled', value })
            }
          />
        </NodePropertyFieldShell>
      </div>

      <div className="p-md flex-col gap-md border-studio border-b">
        <div className="text-xs font-semibold text-emphasis">Node Settings</div>
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
                  kind: v as 'parameter' | 'function',
                })
              }
            >
              <DropdownItem value="parameter">Parameter</DropdownItem>
              <DropdownItem value="function">Function</DropdownItem>
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
                  patch: { outputPinColor: v as PinColorId },
                })
              }
            >
              {PIN_COLOR_IDS.map((id) => (
                <DropdownItem key={id} value={id}>
                  {formatNodeColorOption(id)}
                </DropdownItem>
              ))}
            </Dropdown>
          </Field>
          <NodePropertyFieldShell>
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
                  kind: v as 'parameter' | 'function',
                })
              }
            >
              {state.parametersEnabled ? (
                <DropdownItem value="parameter">Parameter</DropdownItem>
              ) : null}
              <DropdownItem value="function">Function</DropdownItem>
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
                  patch: { outputPinColor: v as PinColorId },
                })
              }
            >
              {PIN_COLOR_IDS.map((id) => (
                <DropdownItem key={id} value={id}>
                  {formatNodeColorOption(id)}
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
                            prev[j] ??
                              inspectorDefaultChildSlot(j, pin)
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
                        patch: { inputPinColor: v as PinColorId },
                      })
                    }
                  >
                    {PIN_COLOR_IDS.map((id) => (
                      <DropdownItem key={id} value={id}>
                        {formatPinColorOption(id)}
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </Field>
                <NodePropertyFieldShell>
                  <Checkbox
                    label="Expanded"
                    hint="Show child rows on the node"
                    checked={slot.inputGroupExpanded !== false}
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
                        patch: { inputPinColor: v as PinColorId },
                      })
                    }
                  >
                    {PIN_COLOR_IDS.map((id) => (
                      <DropdownItem key={id} value={id}>
                        {formatPinColorOption(id)}
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </Field>
              </div>
            );
          })}
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
                  patch: { inputPinColor: v as PinColorId },
                })
              }
            >
              {PIN_COLOR_IDS.map((id) => (
                <DropdownItem key={id} value={id}>
                  {formatNodeColorOption(id)}
                </DropdownItem>
              ))}
            </Dropdown>
          </Field>
        </div>
      )}
      </div>

      {node && (
        <div className="p-md flex-col gap-sm border-studio border-t">
          <div className="text-xs font-semibold text-emphasis">Connections</div>
          {edgesHere.length === 0 && (
            <div className="text-xs text-muted">No edges attached.</div>
          )}
          {edgesHere.map((e) => (
            <div
              key={e.id}
              className="flex-row items-center justify-between gap-sm text-xs"
            >
              <span className="text-muted min-w-0" style={{ wordBreak: 'break-all' }}>
                {e.from.nodeId}:{e.from.port} → {e.to.nodeId}:{e.to.port}
              </span>
              <Button
                variant="standard"
                className="shrink-0"
                onClick={() => dispatch({ type: 'removeEdge', id: e.id })}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="p-md flex-col gap-sm border-studio border-t">
        <div className="text-xs font-semibold text-emphasis">Experimental Settings</div>
        <NodePropertyFieldShell>
          <Checkbox
            label="Show guide"
            checked={state.showGraphGuide}
            onCheckedChange={(value) =>
              dispatch({ type: 'setShowGraphGuide', value })
            }
          />
        </NodePropertyFieldShell>
        <NodePropertyFieldShell>
          <Checkbox
            label="Click-drag to connect pins"
            checked={state.clickDragPinWiring}
            onCheckedChange={(value) =>
              dispatch({ type: 'setClickDragPinWiring', value })
            }
          />
        </NodePropertyFieldShell>
      </div>
    </aside>
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

function inspectorDefaultChildSlot(index: number, inputPinColor: PinColorId): FunctionSlot {
  return normalizeFunctionSlot({
    label: 'Label',
    propertyType:
      ROW_PROPERTY_TYPE_IDS_INPUT_GROUP_CHILD[
        index % ROW_PROPERTY_TYPE_IDS_INPUT_GROUP_CHILD.length
      ]!,
    inputPinColor,
    placeholderText: 'Placeholder',
    textValue: null,
    numberValues: [null, null, null],
  });
}
