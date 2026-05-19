---
category: Layout
---

## Specifications

Use the running **nodegraphdocsite** prototype (default graph UI) plus [foundation-graph-node-recontribution.md](../../foundation-graph-node-recontribution.md) as the design substitute. Official FDK sign-off via #foundation when promoting to public API.

## Overview

`GraphNodeShell` is a placeholder name for the Studio node card chrome (header, body, selection, stroke). Implement after copying this scaffold from the docsite repo into Roblox Foundation.

## Usage

```luau
-- After implementation in Foundation:
-- local GraphNodeShell = Foundation.GraphNodeShell
-- React.createElement(GraphNodeShell, { title = "Add", isSelected = false }, { ... body ... })
```
