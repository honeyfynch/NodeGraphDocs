# Node graph pattern guidelines (draft)

**Audience:** Internal Roblox teams designing and implementing features that use node graphs.  
**Companion:** This document is meant to sit beside the **web prototype** in this repository (`src/graph/*`).  
**Versioning:** Draft — content tracks the prototype as implemented. Update sections when System Management behavior exists in the prototype.

**Figma references:** Slides were captured from **Node-Graph-Draft** (`VxWer5hEenmn5M05lRWrCx`) using **Figma Desktop MCP** `get_screenshot` on the node IDs listed in the [Slide index](#slide-index) (file must be open in Figma Desktop).

---

## 0. Framework overview

The deck frames this work as **CreatorX Foundations — Node graph framework**, organized as:

1. **Guidelines** (this document’s focus)
2. **Resources** (components, tokens, prototype — to be expanded later)

---

## 1.0 Guidelines

### 1.1 Terminology

Two graph families appear in the guidelines deck:

| Concept | Analogy (from slides) | Meaning |
|--------|------------------------|--------|
| **Data flow** | Assembly line | Wires carry **data** (meshes, numbers, pixels, …). If a connection breaks, downstream data may not exist. Typical domains: animation, audio, geometry, VFX. |
| **System management** | Project manager | Wires carry **execution / control** signals (when to run, how resources are orchestrated). Breaking a link may leave data intact but the system unsure **when** to act. Example domain called out: AI-assisted task planning. |

**This draft prioritizes data-flow** behavior and layout that the web prototype already demonstrates. **System management** follows the same slide outline (Layout → Anatomy → Primitives → Interactivity) but remains **TBD** until those interactions and visuals are defined in the prototype.

---

### 1.2 Data flow

Subsections mirror the deck: **Layout**, **Anatomy**, **Primitive standards**, **Interactivity**.

#### 1.2.1 Layout (universal layout)

From the **Universal layout** slides:

1. **Node graph** — Top-level canvas; creators arrange nodes to express their workflow.
   - **A. Output node (data-flow)** — Graphs should include a **persistent endpoint** (“Graph output”) representing the graph’s output.
   - **B. Properties panel (optional)** — Supplemental surface: expanded view of a node’s properties and output previews in a **flat list**.
   - **C. Parameters panel (optional)** — Graph-level “variables,” often represented as **parameter nodes** wired into functions.
2. **Nodes** — Core building blocks; information is intended to read **left-to-right** for legibility; links show flow between nodes.
   - **A. In-line properties** — Controls live on the node body where density allows.
3. **Parameters (optional)** — When a properties panel exists, properties on the node and in the panel should stay **1:1** except for **preview-only** fields. Parameter nodes may omit in-line property rows (single value); values can be edited from the parameters panel. Slides also recommend **color-coding** parameter nodes so they read differently from other nodes and show where they can feed inputs.

**Web prototype today:** The app uses a **main graph canvas** plus a **right-hand inspector** (`InspectorPanel.tsx`) for prototype and node settings — closer to a combined “properties + graph settings” strip than the fully split properties/parameters chrome in every slide variant. The **parameters strip** beside the graph appears when **Parameters** is enabled in graph settings (`GraphParameterPanel.tsx`). Canvas background uses `var(--studio-canvas)` (`theme.css`).

---

#### 1.2.2 Anatomy

This section describes **how the web prototype composes nodes, pins, and wires**, using **Foundations-aligned tokens and local CSS** committed to match Figma / Design Assist recipes. For spacing semantics, the repo treats `src/graph/nodeGraphDesignAssistRecipes.ts` as the **contract** that `src/foundation/theme.css` mirrors (see file header: Design Assist `record_component_recipe` / `get_component_recipe` keys).

##### Node shell (card + header + body)

- **Component structure:** `NodeShell.tsx` implements the card: **header** (collapse chevron, optional leading/trailing chrome, title / `EditableNodeTitle`) and optional **body** (expanded) or **collapsed strip**.
- **Surfaces / colors:**
  - Header fill by `frameVariant`: `var(--studio-header-neutral)`, `var(--studio-header-emphasis)`, or `var(--studio-header-muted)` (`NodeShell` / `theme.css`).
  - Body fill default: `var(--studio-surface-200)`; Generate nodes override with generate-specific variables (`--studio-generate-body`, textarea shift, etc.) per comments in `theme.css`.
- **Typography / emphasis:** Header row uses utility classes such as `text-sm text-emphasis` (mapped to Builder Sans + content tokens on `body.graph-app-body`).
- **Geometry:** Card width from graph state (`geometry.ts`: default `NODE_W` 200px, max `GRAPH_NODE_MAX_W` 350px); header height `HEADER_H` 28px; row height `ROW_H` 32px (locked to Foundation row padding + 24px content min per recipe).
- **Stroke / selection:** `.studio-node-card` uses `border: 1px solid var(--studio-stroke)` (Figma stroke/default intent). Selected: `.studio-node-card--selected` → `var(--studio-stroke-system-contrast)` (`theme.css`).
- **Corners:** Default radius `4px` (`NodeShell` `cardBorderRadius`, ties to `--studio-radius`). Generate uses `8px` (`--studio-generate-node-radius`).
- **Disabled / routing dim:** `dimHeaderChrome` applies `translucentFill50` from `disabledVisual.ts` to header/body fills and reduces chrome opacity — used with progressive wiring (see Interactivity).

##### Pins

- **Component:** `Pin.tsx` — 9px “socket” (`GRAPH_PIN_DIAMETER_PX` / `--graph-pin-diameter`), circular.
- **Fill / stroke:** Idle interior matches canvas / `var(--studio-surface-0)`; stroke and connected fill use **palette hex** from `pinColors.ts` (`resolveGraphPinHex`), either **Data categorical contrast** (`foundationPalette.ts`, Figma variable export `155:13740`) or **extended palette** when Experimental → **Extended palette** is on.
- **Outer ring:** `box-shadow: 0 0 0 2px var(--studio-surface-0)` on `.graph-pin-outer-ring`, clipped left/right so the ring reads on **node chrome** only, not over the wire/canvas (`graph-pin-outer-ring-slot--clip-*` in `theme.css`).
- **Tooltip:** Pin color name tooltip uses `--graph-pin-tooltip-bg`, `--graph-pin-tooltip-text`, BodySmall alpha tokens (`theme.css`; Figma ref `113:20106` in comments).

##### Wires (edges)

- **Geometry:** Bézier paths (`bezierPath` in `GraphCanvas.tsx`); stroke width **`GRAPH_WIRE_STROKE_PX` = 2** (`geometry.ts`), `strokeLinecap="round"`. Ghost wire while dragging uses the same stroke width.
- **Color:** Edge stroke uses the same resolved hex as pins (`resolveGraphPinHex`). Disabled source nodes halve wire opacity (`strokeOpacity` 0.5) on rendered edges.
- **Flow decoration:** Animated flow along path when graph play is active (SMIL `mpath`).

##### Rows and in-node properties

- **Layout tokens:** `figmaNodeTokens.ts` exposes `foundationLayout` and `nodeRow` / `nodeLabelColumn` using `--foundation-gap-xsmall`, `--foundation-padding-xsmall`, `--foundation-padding-small`, `--foundation-label-col-width`, `--foundation-content-min-height`, etc. These values are enumerated in `FOUNDATION_NODE_GRAPH_CSS_VAR_VALUES` / `FOUNDATION_NODE_GRAPH_RULE_SUMMARY` in `nodeGraphDesignAssistRecipes.ts` (Gap.XSmall, Padding.Small/XSmall, 6px between numeric cells, …).
- **Property UI:** `nodePropertyUi.tsx` composes **Foundation** `Dropdown` (`variant="nodeProperty"`), `NodePropertyFieldShell`, and local interactive patterns; ContentArea-style backgrounds use shift tokens such as `rgba(208, 217, 251, 0.08)` aligned to Figma `.NodeProperty` notes in that file.

##### Data visualization guidance → node graph anatomy (Figma slides)

The following slides are **Data visualization** system guidance. They are **not** a separate node-graph spec, but they inform how dense graph UI should relate to chart/iconography standards. Mapped to this prototype:

| Slide topic | Guidance from deck | Where it applies in this prototype | Notes / gaps |
|-------------|-------------------|-----------------------------------|--------------|
| **Line treatment** (`163:35809`) | Chart lines **2px**; dashed secondary/benchmark lines **2px** with **4px dash / 4px gap**. | **Edges and ghost wires** already use **2px** stroke (`GRAPH_WIRE_STROKE_PX`, `GraphCanvas` paths). | Edge dashing for “secondary” wires is **not** implemented; if product adds benchmark/optional links, use the deck’s dash spec for consistency with charts. |
| **Data point sizing** (`163:36084`) | Key markers: **8px** dot diameter; non-dot shapes bounded by **8×8**. | **Pins** are **9px** diameter (Figma socket / graph attach point, not a chart vertex). | Treat **pins** as **ports**, not chart data points. If nodes embed **sparklines or charts**, those markers should follow **8px / 8×8**; the pin size stays governed by node graph Foundations. |
| **Line chart shapes / order** (`163:36873`) | Series get **shape markers in a fixed order** (circle, triangle, square, diamond, inverted triangle, …) so users can distinguish lines **without color alone**. | No shape-encoded series in the prototype. | For **multi-type** or **parallel** edges, consider **redundant coding** (color + stroke pattern or endpoint shape) consistent with this ordered vocabulary. |
| **Data point masks** (`163:36510`) | Active data point: **2px mask** separates the marker from lines beneath so it doesn’t visually merge. | Conceptually aligns with **pin outer ring** (2px `surface-0` ring) and **selection** (`studio-stroke-system-contrast` border) separating the card from background/grid. | Could extend to **hover/focus** states on pins/wires if overlap increases. |
| **Color transparency** (`163:36758`) | Allowed opacities **30%** or **15%**: hover de-emphasizes non-hovered chart elements at **30%**; Sankey threads **30%**; spider/radar fill **15%**. | **Progressive connections** (`graphProgressiveConnections.ts`) dims non-matching nodes/pins to **0.3** opacity while routing a wire — same **30%** rule as “recede everything except the focus.” | Spider-chart **15%** fill has no direct analog yet; could apply to **filled regions** under subgraphs or minimap previews if added. |
| **Spacing (adjacent chart elements)** (`163:36355`) | **2px** gap between adjacent chart segments where segments touch (e.g. donut slices); natural gaps between separate bars exempt. | Micro-layout: pin ring clipping, 1px card border, 2px-ish nudges (`NODE_INPUT_WIRE_X_NUDGE`) are in the same spirit as **intentional hairline separation**. | Node padding still follows **Foundation gap/padding** tokens (`--foundation-*`), not arbitrary 2px everywhere. |

**Placeholder colors:** Pin and wire “colors” in the prototype stand in for **compatibility** (what may connect to what). Replace with **real node types and data types** as defined by each feature team; Foundations categorical colors then encode **semantic categories**, not arbitrary demo hues.

---

#### 1.2.3 Primitive standards

Slides recommend **XSmall** density and **Contrast** `ContentArea` for information-dense node interiors.

**Foundation primitives used in the inspector** (`InspectorPanel.tsx`): `Button`, `Checkbox`, `Dropdown` / `DropdownItem`, `TextInput`, `NodePropertyFieldShell`. Layout uses `p-md`, `gap-md`, `gap-sm`, `border-studio`, `radius-panel`, `bg-surface-inspector` (utility classes in `theme.css`).

**In-node property types** map to Figma `.NodeProperty` variants (`types.ts` `RowPropertyType` / `ROW_PROPERTY_FIGMA_LABEL`). Implemented on-canvas via `nodePropertyUi.tsx` with `variant="nodeProperty"` Foundation controls where applicable.

| Slide primitive | Role | In web prototype | Foundations / tokens (summary) |
|-----------------|------|------------------|----------------------------------|
| **Boolean** | Binary choice | **Yes** — `Checkbox` in inspector; checkbox column in `nodePropertyUi` (custom 16px box styled with `var(--studio-radius)` + stroke rgba) | Inspector: `Checkbox`. Inline: simplified control; consider aligning fully to `Checkbox` later. |
| **Dropdown** | Exclusive options | **Yes** — `Dropdown` `variant="nodeProperty"` | Same; ContentArea shift backgrounds per `nodePropertyUi` / shell. |
| **Number input** | Precise numeric entry | **Yes** — `numberInput3` (three cells), `numberRange` row | Uses Foundation spacing tokens for cell gaps (`--foundation-gap-numeric-cells`, etc.). |
| **Text input** | User text / parameters | **Yes** — `TextInput` / interactive text patterns | Alpha BodySmall tokens; `node-property-field-input` styles in `theme.css`. |
| **Path** | File/folder picker styled as input | **No** | — |
| **Object reference** | Pick from object list (Studio) | **Partial** — type exists (`objectReference`); UI is prototype-level, not full Studio picker. | `NodePropertyFieldShell` + dropdown-style UX. |
| **Color picker** | Color value + advanced UI | **Partial** — `color` row type exists; fidelity TBD vs Foundations color editor. | |
| **Graph** (Studio) | Curve / 2D adjustment | **No** | — |
| **Timeline** (Studio) | Temporal control | **No** | — |

**Inspector-only (not on every slide primitive table):** Graph toggles (**Play mode**, **Parameters**, **Generative nodes**), per-node **kind** (Parameter / Function / Generate), titles, slot counts, pin colors, input groups, Generate phase/prompt, output frame variant, **Connections** list with remove, **Experimental** (guide panel, progressive connections, click-drag wiring, extended palette).

---

#### 1.2.4 Interactivity

Unless noted, interactions apply when focus is **not** inside an `input`, `textarea`, `select`, or `contenteditable` (`GraphCanvas` key handler).

**Canvas & view**

- **Pan:** `Alt` + drag (pointer) on canvas background.
- **Zoom:** Mouse wheel on canvas (implementation in `GraphCanvas` `onWheel`).
- **Background click:** Clears selection (respects targets: not on node cards / parameter frames).
- **Marquee / frame selection:** **F** key runs frame selection (`graphFrameSelection.ts`).

**Selection**
- **Click node:** Select node; 
- **Shift+click** toggles membership in selection order (`GraphContext`: last selected is primary for inspector).


**Move & resize**

- **Drag node:** Pointer on header title row (not on editable title field) moves node; multi-drag preserves selection where implemented.
- **Resize** (card nodes): Drag resize edges (`NodeResizeEdges.tsx` / `GraphCanvas` resize drag state).

**Wiring**

- **Two modes** (Inspector → Experimental → **Click-drag to connect pins**):
  - **Click–click:** Click output pin, then click compatible input (default).
  - **Click-drag:** Hold and drag from output to input (legacy-style).
- **Progressive connections** (Experimental): While a wire is active from an output, nodes with **no** matching input color dim to **30%** opacity; partial match dims only non-matching input pins (`graphProgressiveConnections.ts`).
- **Disconnect / reroute:** Drag from input pin to begin moving an existing edge (threshold in `GraphCanvas`); ghost wire shows routing preview.
- **Compatibility:** Driven by **pin color id** in the prototype — **placeholder** for real type system (see Anatomy).

**Context menus**

- **Canvas context menu** (`GraphContextMenu.tsx`): paste at cursor graph position, etc.
- **Node context menu** (`NodeContextMenu.tsx`): node-scoped actions.

**Clipboard & edit**

| Action | Shortcut |
|--------|----------|
| Copy | ⌘/Ctrl+C |
| Cut | ⌘/Ctrl+X |
| Paste | ⌘/Ctrl+V (centers on graph view) |
| Duplicate | ⌘/Ctrl+D |
| Group | ⌘/Ctrl+G (placeholder until group ships) |
| Ungroup | ⌘/Ctrl+U (placeholder) |
| Delete selection | Delete / Backspace |
| Toggle disabled on selection | ⌘/Ctrl+Shift+H |
| Frame selection | F |

**Node chrome**

- **Expand / collapse** body via chevron (`NodeShell`).
- **Editable titles** where `EditableNodeTitle` is used (double-click, commit/blur behavior per component).
- **Play overlay** when **Play mode** is enabled (`GraphPlayModeControl.tsx`).

**Inspector**

- All controls dispatch to `GraphContext` reducer; connection list can **remove** individual edges.

**Parameters panel**

- Add parameter, expand/collapse, inline edits (`GraphParameterPanel.tsx`) when parameters are enabled.

---

### 1.3 System management

**Status:** Section header exists in the deck (**1.3 System management** — Layout, Anatomy, Primitives, Interactivity). Content is **not** drafted here until the prototype defines system-management-specific behavior and visuals.

---

## 2.0 Resources (stub)

Future: deep links to Foundations library components, variable collections, and this repo’s Design Assist recipe keys (`DESIGN_ASSIST_COMPONENT_RECIPE_KEYS` in `figmaNodeTokens.ts`).

---

## Slide index (Figma `node-id` → `nodeId` for MCP)

**Guidelines — deck flow**

| Topic (approx.) | `nodeId` |
|------------------|----------|
| Cover / framework | `163:23595` |
| Node graphs / DMH (problem, insight, opportunity, objective) | `163:23619` |
| 1.0 Guidelines index | `163:23632` |
| Terminology (data flow vs system management) | `163:23646` |
| 1.2 Data flow section header | `163:23660` |
| Universal layout variants | `163:23690`, `163:23905`, `163:24335`, `163:24550`, `163:24845`, `163:25233`, `163:25622`, `163:26789`, `163:27178`, `163:27618` |
| Component anatomy header | `163:28072` |
| Primitive standards | `163:28104` |
| Interactivity header | `163:28248` |
| 1.3 System management header | `163:28281` |

**Data visualization — design system guidance**

| Topic | `nodeId` |
|-------|----------|
| Line treatment (2px, dashes) | `163:35809` |
| Data point dot size (8px) | `163:36084` |
| Line chart shape order | `163:36873` |
| Data point masks (2px) | `163:36510` |
| Color transparency (30% / 15%) | `163:36758` |
| Adjacent chart spacing (2px) | `163:36355` |

---

## Maintenance

1. Re-run **Figma Desktop** `get_screenshot` when slides change; update this doc’s conceptual bullets if copy drifts.  
2. Reconcile spacing/token numbers with **Design Assist** (`get_component_recipe` / `read_node_properties`) and keep `nodeGraphDesignAssistRecipes.ts` + `theme.css` in sync per repo workflow.  
3. When **System management** lands in the prototype, replace §1.3 stubs and add any new interactions to §1.2.4.
