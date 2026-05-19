# Foundation-ready Lua graph node documentation

**Purpose:** Hand off pixel-accurate node graph **chrome** from this repository’s web prototype to **Roblox Foundation** as reusable Lua (Luau) components, then migrate the internal **Blueprints** Studio plugin to consume those components.

**Audience:** Engineers contributing to Foundation (`github.com/Roblox/foundation`) and maintaining `StudioPlugins/InternalLibraries/Blueprints`.

**Design source of truth:** This prototype’s **default UI and interactions** (running build) plus [node-graph-patterns.md](node-graph-patterns.md), [geometry.ts](../src/graph/geometry.ts), [theme.css](../src/foundation/theme.css), and [nodeGraphDesignAssistRecipes.ts](../src/graph/nodeGraphDesignAssistRecipes.ts) stand in for a live Figma loop. Capture **screenshots and short screen recordings** of the default graph when opening Foundation PRs. Still coordinate with **#foundation** for public API names, token choices, and FDK ownership.

---

## Phased roadmap

| Phase | Where | Outcome |
| ----- | ----- | ------- |
| **0** | This repo (`docs/`) | This document + pixel appendix + pin/wire checklist + link to scaffold templates |
| **1** | Foundation clone | New `modules/foundation/src/Components/*` folders, exports in `init.lua`, FFlags, `.changes/`, stories, tests, benches per [AGENTS.md](file:///Users/awebb/git/roblox/foundation/AGENTS.md) |
| **2** | `StudioPlugins/…/Blueprints` | Bump Foundation dependency; swap node/pin/wire **visuals** to Foundation components; **keep** Graphing + `CompositorConnectionContext` behavior |

Dependency order for Phase 1 implementation: **`GraphNodeShell`** → **`GraphPin`** (visuals) → **`GraphWire`** (stroke/theming props; curve math stays consumer-side initially).

---

## Locked component boundaries (names TBD with #foundation)

| Working name | Responsibility | Stays out of Foundation (initially) |
| ------------ | ---------------- | ------------------------------------- |
| **GraphNodeShell** | Card: header row, collapse affordance, body slot, selection/disabled styling, row `LayoutOrder` contract | Node drag/resize handlers (`UIDragDetector`), graph reducer, math node semantics |
| **GraphPin** | Token-driven socket fill/stroke/ring, `UIScale` hook for zoom, `testId`s | `Graphing.Point`, `Graphing.InputDetector`, `pushAnchor`, `onStartDrag`, `usePinPositioner` math |
| **GraphNodeRow** | Fixed-height row (32px prototype), label column alignment, optional property slot | Concrete property editors (dropdown, number cells) beyond layout shell |
| **GraphWire** | Themed stroke color/thickness props (and optional wrapper for children) | `Graphing.Curve`, `observeAnchorPosition`, ghost/preview merge, collapsed pin fallback |

Domain-specific **math function** nodes remain in a **consumer** package (Blueprints or feature plugin), composing the pieces above and supplying a **node library** (same separation as `NodeLibraryContext` + `synthesizeDefinition` in Blueprints).

---

## Appendix A — Pixel and token mapping (prototype → Foundation)

**Zoom policy:** Blueprints uses `ViewportRectContext.observeZoomRatio` for `UIScale` on pins and thickness on curves. Lua offsets in the first column are **graph/plot space** or **css px at 1:1 zoom** unless noted. Foundation `View`/`Text` use **style tags** and **`useTokens()`** for colors; replicate recipe numbers via tokens (e.g. `Color.Surface.Surface_200`, `Color.Stroke.Default`) rather than hard-coded `Color3` where FDK provides a match.

### A.1 Core node chrome

| Source (TS / CSS) | Value / variable | Foundation direction (Luau) |
| ----------------- | ---------------- | --------------------------- |
| `geometry.NODE_W` | 200 | Default `Size.X.Offset` or width prop on `GraphNodeShell`; `UDim2.fromOffset(200, …)` |
| `geometry.GRAPH_NODE_MAX_W` | 350 | `maxWidth` clamp prop |
| `geometry.HEADER_H` | 28 | Header row `Size = UDim2.new(1, 0, 0, 28)` |
| `geometry.ROW_H` | 32 | `GraphNodeRow` height; must match `FOUNDATION_NODE_GRAPH_SPACING` recipe in `nodeGraphDesignAssistRecipes.ts` |
| `geometry.NODE_CARD_BORDER` | 1 | Stroke: `stroke` prop / tag; align with `BorderSizePixel` / Foundation stroke tokens |
| `geometry.GRAPH_PIN_DIAMETER_PX` | 9 | Match `CompositorPin` → `Graphing.Point` `Size = 9`; `GraphPin` outer visual |
| `geometry.GRAPH_WIRE_STROKE_PX` | 2 | **Prototype** wire width. Blueprints `CompositorCurve` defaults to **3** × scale — set consumer default to **2** when migrating for parity |
| `theme.css` `--studio-surface-200` | body fill | `tokens.Color.Surface.Surface_200` or cumulative background helper |
| `--studio-header-neutral` / emphasis / muted | header variants | Map `frameVariant` to token triplets; see `CompositorNode` parameter vs generic `useCumulativeBackground` pattern |
| `--studio-stroke` | card border | `tokens.Color.Stroke.Default` (verify exact token name in target Foundation version) |
| `--studio-stroke-system-contrast` | selected border | Selection state on `GraphNodeShell` |
| `--studio-radius` | 4px card | `tokens.Radius.*` or style tag `radius-small` per FDK |
| `--studio-generate-node-radius` | 8px generate | Separate variant prop on shell |
| `geometry.PARAMETER_NODE_W` / `PARAMETER_CHIP_H` | 114 × 28 | Parameter chip `GraphNodeShell` variant or sibling component |

### A.2 Pins and wires (geometry constants)

| Source | Value | Notes for Lua |
| ------ | ----- | ------------- |
| `PIN_OFFSET` | 5 | Classic output pin inset from inner card edge |
| `PIN_STYLE_FRAME_ANCHOR_PX` | 2 | Orbit/contained anchoring vs frame |
| `NODE_ROW_PADDING_X` | 8 | Maps to `--foundation-padding-small` in prototype CSS |
| `NODE_INPUT_WIRE_X_NUDGE` | 2 | Collapsed stub wire X — keep in wire attachment math |
| `NODE_ROW_PIN_CENTER_Y_OFFSET` | 0.5 | Sub-pixel pin row centering; Studio may use fractional layout carefully |
| `bezierHorizontalHandleDx` | `max(72, abs(dx)*0.45)` | Align `CompositorCurve` tangent policy or document intentional diff |
| Pin colors | `pinColors.ts` / `resolveGraphPinHex` | Use **Foundation extended / categorical** tokens in `GraphPin` props; avoid raw hex in Foundation components |

### A.3 Z-order (prototype)

| Source | Value | Studio |
| ------ | ----- | ------ |
| `GRAPH_NODE_RESIZE_EDGE_Z_INDEX` | 4 | Resize bands |
| `GRAPH_ORBIT_PIN_ABOVE_RESIZE_Z_INDEX` | 5 | Orbit pins above resize hits — Blueprints `graphOrbitPinHitStackStyle` |

---

## Appendix B — Blueprints pin and wire stack (audit)

Read **in this order** when porting or debugging. Paths are under `StudioPlugins/InternalLibraries/Blueprints/src/`.

### B.1 `CompositorPin.lua`

- Renders `Graphing.Point` with **`Size = 9`** (matches `GRAPH_PIN_DIAMETER_PX`).
- Child **`UIScale`** for zoom (`props.Scale`).
- Child **`Graphing.InputDetector`** wires pointer drag to `OnDragStart` / `OnDragMoved` / `OnDragEnded`.
- **Foundation:** not used here; visual ring/color live in `RenderedCompositorPin`.

### B.2 `RenderedCompositorPin.lua`

- **`usePinPositioner`:** compares **absolute** position of a positioner frame vs **compositor node** absolute rect → **percent offset** → **plot-space `pinOffset`** (rounded). Prevents internal scale drift vs node scale.
- **`getPinAnchorKey`:** stable keys `anchor_{nodeId}_{side}_{name}_{dynamicIndex?}` (`Util/getPinAnchorKey.lua`).
- **`React.useEffect`:** subscribes to `pinPositioner.observeOffsetInNodeSpace` and `nodePayloadDispatcher.observe(pinNodeId)`; calls **`compositorConnectionContext.pushAnchor(anchorKey, anchorData)`**; returns cleanup that disposes effect and anchor subscription.
- **Connection / preview:** `observeCurvePreviewInfo(anchorKey)`, `boundAnchorKey` for partner pin, `isPinConnected` merges preview drag + graph payload.
- **Drag:** `onStartDrag` → **`compositorConnectionContext.onStartDrag(...)`** (full signature includes dynamic index for parameter pins).
- **Visuals:** `Foundation.Hooks.useTokens()` for connected vs idle colors; parameter pins use green ramp.

### B.3 `CompositorCurve.lua`

- Builds **two control points** with horizontal tangents: `0.5 * abs(start.X - finish.X)` spacing.
- **Thickness:** `(ObserveScale() or 1) * 3` when scale provided, else constant **3**. **Action:** align default to prototype **2** when Foundation migration sets thickness from props.
- Renders **`Graphing.Curve`** with reactive `Points` from signal getters.

### B.4 `RenderedCompositorCurve.lua`

- **`observeOutputPosition` / `observeInputPosition`:** `SignalExperimentalUtils.createComputed` merging:
  - **`observeAnchorPosition(anchorKey)`** for pinned endpoints,
  - **`observeCurvePreviewInfo`** for **ghost** wire while dragging,
  - **`observeCollapsedPinPosition(nodeId)`** when input node collapsed.
- **`ObserveScale`:** `viewportRectContext.observeZoomRatio`.
- **Color:** `useFoundationStudioTheme` + `useTokens` (parameter vs generic gray/green).

### B.5 `CompositorConnectionContext.lua`

Public **orchestration** surface (do **not** duplicate inside Foundation initially):

- `pushAnchor`, `observeAnchorPosition`, `observeCollapsedPinPosition`
- `observeCurvePreviewInfo`, `observeGlobalCurvePreviewInfo`
- `onStartDrag`, `onDragMoved`, `onDragEnded`
- Node drag: `onDragNodeStart`, `onDragNodeMoved`, `onDragNodeEnded`
- `observeNodePosition`, `observeNodePreviewData`

Foundation **`GraphWire`** should accept **precomputed** endpoints and thickness/color as props or bindings so this context stays in Blueprints.

### B.6 Pin and wire porting checklist (Phase 2)

- [ ] **Anchor lifecycle:** every `pushAnchor` has matching cleanup on unmount / dependency change (see `RenderedCompositorPin` effect).
- [ ] **Preview precedence:** ghost curve uses `CurvePreviewInfo` when source pin matches; verify both output→input and input-side preview paths.
- [ ] **Collapsed nodes:** `observeCollapsedPinPosition` feeds input end when body hidden.
- [ ] **Zoom:** pin `UIScale` + curve thickness track same zoom ratio as canvas.
- [ ] **Wire width:** default **2px** for prototype parity vs Blueprints **3**.
- [ ] **Parameter pins:** `getFFlagAnimGraphUI_FixInputPanelParameters` branches for dynamic index — keep behavior when swapping visuals.
- [ ] **Z-order:** orbit pin hits above resize edges.
- [ ] **Regression:** click-click vs click-drag wiring, disconnect drag, progressive dimming (if replicated in plugin).

---

## Foundation contribution mechanics (checklist)

From Foundation **AGENTS** / **CONTRIBUTING** (summarized):

1. **Setup:** `foreman install`, `lute run install`.
2. **Per component folder** `modules/foundation/src/Components/<Name>/`:
   - `init.lua` — export types + `return` implementation module.
   - `<Name>.lua` — main component.
   - `<Name>.story.lua` — `{ summary = "…", stories = { … } }`; use `useTokens()` where colors matter.
   - `<Name>.test.lua` — `FoundationTestingLibrary.setupTest`, `getByTestId`, **`testCommonProps`**; no `FindFirstChild` for Foundation-owned nodes.
   - `<Name>.bench.lua` — `mountComponentTimes`, `scrollComponentTimes` as appropriate.
   - `<Name>.code.md` — YAML frontmatter (`category: …`); body from `docs/DOC_TEMPLATE.md`; wikilinks `[[OtherComponent]]` per develop guidelines.
3. **Imports:** `local Foundation = script:FindFirstAncestor("Foundation")` — do **not** use `game:GetService("CorePackages")` inside Foundation.
4. **Layout:** every child in `row` / `col` **must** have `LayoutOrder`.
5. **Hooks:** `React.useEffect(fn, { a, b } :: { unknown })` when multiple deps.
6. **testId:** root `--foundation-<kebab-name>`; children `--foundation-<name>--segment`.
7. **PR:** FFlag for behavior changes, `.changes/<name>.md`, full CI chain (`stylua -c`, `selene`, `lute lint`, `lute run analyze`, `lest`).

**Reference component:** [`modules/foundation/src/Components/View`](file:///Users/awebb/git/roblox/foundation/modules/foundation/src/Components/View) (thin `init.lua`, `View.lua`, story, test, bench, `View.code.md`).

---

## Phase 2 — Blueprints migration steps

1. **Rotriever:** bump `Foundation` to the release containing `GraphNodeShell`, `GraphPin`, etc.
2. **`CompositorNode/init.lua`:** Replace local Frame styling with **`GraphNodeShell`** (or `View` + style tags) for card/header/body; **retain** `UIDragDetector`, `Graphing.useViewportBinding`, `GraphContext` callbacks.
3. **`CompositorPin` + `RenderedCompositorPin`:** Render **`GraphPin`** inside `Graphing.Point` (or as sibling) for rings/colors; **retain** `InputDetector`, `pushAnchor`, `usePinPositioner`, `onStartDrag`.
4. **`CompositorCurve` + `RenderedCompositorCurve`:** Drive **`Thickness`** and **`Color3`** from Foundation tokens / `GraphWire` props; **retain** `Graphing.Curve` and all `observe*` wiring.
5. **Verify** pin drag, wire preview, zoom, collapsed nodes, parameter dynamic pins.

---

## Scaffold templates (copy into Foundation)

After Phase 0 review, copy the reference Lua under [foundation-recontribution-scaffold/](foundation-recontribution-scaffold/) into `modules/foundation/src/Components/<Name>/`, then wire exports in `modules/foundation/src/init.lua`, add `Flags.lua` entries, and changelog per AGENTS.

The scaffold **`GraphNodeShell`** is a minimal placeholder—not production-ready—intended to show file layout and import style only.

**Included files (mirror View):** `init.lua`, `GraphNodeShell.lua`, `GraphNodeShell.story.lua`, `GraphNodeShell.test.lua`, `GraphNodeShell.bench.lua`, `GraphNodeShell.code.md`. Add **`GraphPin`** and **`GraphWire`** folders the same way when starting those components.

---

## Out of scope (first contribution)

- Porting **`CompositorConnectionContext`** or the full **Signals** graph model into Foundation.
- Replacing **`Graphing`** (separate package); document integration at props boundaries only.

---

## Related docs

- [node-graph-patterns.md](node-graph-patterns.md) — Anatomy, interactivity, Figma slide index.
- Foundation: [AGENTS.md](file:///Users/awebb/git/roblox/foundation/AGENTS.md), [CONTRIBUTING.md](file:///Users/awebb/git/roblox/foundation/CONTRIBUTING.md), [docs/DOC_TEMPLATE.md](file:///Users/awebb/git/roblox/foundation/docs/DOC_TEMPLATE.md), [docs/develop/guidelines.md](file:///Users/awebb/git/roblox/foundation/docs/develop/guidelines.md).
