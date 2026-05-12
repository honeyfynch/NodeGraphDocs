---
category: Node graph
---

## Overview

This note is the **component-oriented companion** to the node graph guidelines in `docs/node-graph-patterns.md`. It describes how **Roblox Foundation** primitives—components, enums, style tags, and variable collections—should compose **on-graph** and **adjacent** UI for node-based editors, using the **web prototype** in this repository only as a **visual and interaction contract** (spacing, states, density).

**Intended runtime:** Luau + Foundation in Studio (or other host surfaces). This file does **not** document how the prototype is built in React (`src/graph/*`, `src/foundation/*`).

**Out of scope:** Step-by-step construction of the **inspector / properties panel**. That surface is mentioned only as the place where many **graph- and node-level** settings live in the prototype; see **Inspector reference** below and the patterns doc for behavior.

Where details are still TBD, sections are deliberately left open.

---

## Scope and non-goals

| In scope | Out of scope |
|----------|----------------|
| Mapping card, rows, pins, wires, and dense controls to Foundation concepts | React component APIs, hooks, or file layout |
| Token and recipe alignment (`theme.css`, Design Assist snapshots) | Full parity with every Foundation `*.code.md` example |
| Which inspector-driven options exist (for product consistency) | Inspector layout recipes or implementation |

---

## Design contracts (tokens and recipes)

Implementation should track the same contracts the prototype mirrors from Design Assist and Figma:

- **CSS variable names** in `src/foundation/theme.css` (`:root`) — Studio equivalents should bind to the same **semantic** roles (canvas, surfaces, strokes, content emphasis/default, header variants, generate-node overrides, pin tooltip colors, and Foundation gap/padding keys).
- **Spacing contract** — `src/graph/nodeGraphDesignAssistRecipes.ts` and `FOUNDATION_NODE_GRAPH_*` summaries describe **Gap**, **Padding**, label column width, numeric cell gaps, and row min heights. Treat that file as the **pixel recipe**, not the React source.
- **Typography** — Prototype uses **alpha / Builder Sans** text roles (e.g. BodySmall, LabelSmall) for dense rows; map to the same **text styles** Foundation exposes for Studio.

Individual Foundation components are documented in their own `*.code.md` files under the Foundation repo (e.g. `Button.code.md`, `View.code.md`, `Dropdown.code.md`).

---

## Composition map

High-level mapping from **prototype surfaces** (names refer to behavior in `node-graph-patterns.md`) to **Foundation roles**. Replace prototype-only wrappers with the closest shipped Foundation APIs.

| Surface | Foundation role | Notes |
|--------|------------------|--------|
| Graph canvas background | [[View]] (or host frame) + canvas/surface tokens | Match `--studio-canvas` semantic. |
| Node **card** (outer chrome) | [[View]] + borders/radius tokens | Selection uses system contrast stroke semantic (`--studio-stroke-system-contrast` in prototype). |
| Node **header** | [[View]] row + [[Text]] | Header fill variants: neutral / emphasis / muted semantics; optional overrides for special node kinds (e.g. generate). |
| Expand / collapse control | [[IconButton]] or icon + [[Interactable]] | Prototype uses 24×24 hit target, 12×12 chevron asset; match touch targets and focus behavior to Foundation guidance. |
| Node **title** | [[Text]]; editable titles | Double-click to edit pattern in prototype; use Foundation text input or inline edit patterns when available. |
| Node **body** | [[View]] + scroll if needed ([[ScrollView]]) | Body fill uses surface-200 semantic by default; disabled / routing-dim uses translucent fills (see patterns: progressive connections). |
| **Property rows** (`.NodeRow`) | [[View]] row layout + style tags | Use Foundation **XSmall** density and **ContentArea** contrast guidance for dense interiors (patterns §1.2.3). |
| Row **label** column | Fixed width + `LabelSmall` / emphasis color | Align to `--foundation-label-col-width` semantics. |
| Row **dropdown** | [[Dropdown]] | Prototype uses a **nodeProperty** density variant on web; use the closest Foundation **size / variant** for compact node interiors when available. |
| Row **checkbox** | [[Checkbox]] | Inline prototype checkbox may be simplified; prefer Foundation [[Checkbox]] for accessibility parity. |
| Row **text** | [[TextInput]], [[InputField]], or [[InternalTextInput]] via [[InputField]] | `nodeProperty`-style density on web; compose with [[InputField]] for label/hint/error in inspector-style surfaces. |
| Row **numeric** | [[NumberInput]] or segmented numeric pattern | Multiple cells and range rows in prototype; spacing uses `--foundation-gap-numeric-cells` and related keys. |
| **Field shell** (label + control stack) | [[InputField]] or composed [[View]] | Prototype `NodePropertyFieldShell` is a local wrapper; in Foundation, prefer **InputField**’s label/hint structure where it fits. |
| **Pins** (ports) | Custom geometry + stroke/fill | Not a standard Foundation component; **9px** socket, **2px** border, outer ring semantic (surface-0 halo clipped toward node). |
| **Wires** | Vector stroke (host-specific) | **2px** stroke, round caps; color matches pin **compatibility** / categorical palette (see patterns). |
| Pin **tooltip** (color name) | [[Tooltip]] | BodySmall-on-tooltip semantics in prototype (`--graph-pin-tooltip-*`). |

---

## Pins, wires, and palette

- **Pins** are **ports**, not chart markers; size and ring behavior follow node-graph specs in `node-graph-patterns.md` §1.2.2 (including relationship to data-viz line/mask guidance).
- **Colors** stand in for **type compatibility** in the prototype; real products should map wire/pin colors to **semantic categories** using Foundations **Data categorical** colors (and optional **extended** palette for experiments).
- **Tooltip** copy on pins should remain **non-blocking** and consistent with palette naming from Design tokens.

---

## Inspector reference (configurable aspects only)

The prototype inspector (`InspectorPanel.tsx`) is the **authoring** surface for many values that also appear on-node or on-canvas. When implementing in Lua, you do **not** need to replicate this panel first, but you **should** plan for the same **data model** so node chrome and panels stay 1:1 where the patterns doc requires it.

**Graph-level (examples):** play mode, parameters strip visibility, generative node toggles, experimental flags (guide panel, progressive connections, click-drag wiring, extended palette).

**Per-node (examples):** node kind (parameter / function / generate), display title, slot rows and **row property types** (boolean, dropdown, text, number, color, object reference, etc.), pin colors / groups, generate-specific fields (phase, prompt, output frame variant), **connections** list with remove actions.

For interaction details (shortcuts, wiring modes, selection), use `docs/node-graph-patterns.md` §1.2.4.

**Foundation primitives that appear in the prototype inspector** (for token/component alignment only): [[Button]], [[Checkbox]], [[Dropdown]] / items, [[TextInput]], and field-shell patterns shared with dense node rows.

---

## Parameters strip

When **parameters** are enabled, the prototype shows a side strip (`GraphParameterPanel.tsx`) for graph-level parameter nodes: add parameter, expand/collapse, inline label/value edits. Map to [[View]] + [[Text]] + list/row patterns + menus ([[Menu]] / [[Dropdown]]) as appropriate; typography aligns to LabelSmall / BodySmall semantics used elsewhere in node chrome.

---

## Usage

At a high level, a node **card** in Studio is a **stack of [[View]]** containers: header row (leading chevron, title, trailing pins), optional body with **property rows**, and pin sockets positioned per layout math from the geometry contract (header height, row height, pin offsets—see patterns doc and recipe snapshots).

```luau
-- Illustrative only — actual props depend on shipped Foundation APIs.
local Foundation = require(Packages.Foundation)
local View = Foundation.View
local Text = Foundation.Text
-- local IconButton = Foundation.IconButton
-- local Dropdown = Foundation.Dropdown
-- local Checkbox = Foundation.Checkbox

-- Example: header row with style tags; body contains row layouts and inputs.
return React.createElement(View, {
	tag = "col radius-small border-stroke-default overflow-hidden",
}, {
	Header = React.createElement(View, {
		tag = "row align-y-center padding-x-small gap-xsmall",
		-- background from header variant token
	}, {
		-- Chevron = React.createElement(IconButton, { ... }),
		Title = React.createElement(Text, {
			text = "Node title",
			-- font style = LabelSmall / emphasis
		}),
	}),
	Body = React.createElement(View, {
		tag = "col",
		-- surface-200 semantic
	}, {
		-- Property rows: each row is a View with label column + control
	}),
})
```

Prefer **Bindings** and stable callbacks for hover/press/drag on headers and pins per Foundation performance guidance (see [[View]] `onStateChanged` notes in Foundation docs).

---

## Maintenance

1. When Figma or Design Assist recipes change, update `nodeGraphDesignAssistRecipes.ts` / `theme.css` first, then reconcile this doc and `node-graph-patterns.md`.
2. When new Foundation components or variants (e.g. dense **nodeProperty**-class dropdowns) ship, update the **Composition map** table rather than embedding React prop names here.
