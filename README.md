# Cheating Graph Viewer

A local-first [Cytoscape.js](https://js.cytoscape.org/) viewer for graphs whose
edges carry a **confidence** value and a set of **exercise files**.

Edges are drawn with a thickness proportional to their confidence. Click an edge
and the files for that exercise open side by side in a read-only split view, with
lightweight syntax highlighting based on the file extension.

No build step, no framework, no runtime dependencies. Cytoscape.js is vendored in
`vendor/`.

## Run it

```bash
npm start
```

Then open <http://127.0.0.1:3000>. Use `PORT=3001 npm start` if port 3000 is busy.

The page must be served over HTTP (or HTTPS). Opening `index.html` directly from
the filesystem will not work because the app uses ES modules and the File System
Access API.

## Open a graph

There are three ways in:

1. **Drop a graph JSON file** anywhere on the drop card or, once a graph is open,
   anywhere on the window.
2. **Browse graph file** to pick one JSON file.
3. **Open folder…** to grant access to a folder and choose from the `.json` files
   inside it. This is the quickest way to get both the graph and its exercise
   files.

Try the included example:

- Drop `examples/graph.json` onto the page, or
- choose **Open folder…** and select the `examples/` directory.

### Folder access

Exercise files are read from the local filesystem, so the browser needs explicit
permission. Access to the directory containing the graph file is requested **as
soon as the JSON file is loaded**; the graph still renders if you cancel the
prompt. You can grant or change access later from the **Grant** / **Change**
button in the graph panel.

Paths in the JSON are resolved **relative to the graph file's directory**.

- In Chromium browsers (Chrome, Edge, Brave, Arc, …) the app uses the
  [File System Access API](https://developer.mozilla.org/docs/Web/API/File_System_Access_API)
  and asks for read access to one folder.
- In browsers without that API (Firefox, Safari, …) the app falls back to a
  standard folder picker (`<input webkitdirectory>`). The selected folder's files
  are read through the browser's normal file-list mechanism.

If the browser requires a fresh click before it will show a folder picker, use
the **Grant** button in the graph panel.

Access is **read-only**. Nothing is uploaded, and the Node server serves only the
app's own static files. File reads happen entirely in the browser.

## Use it

- **Pan** by dragging the background, **zoom** with the scroll wheel or trackpad.
- **Click an edge** to open its exercise files in the split inspector.
- If an edge has several exercises, use the tabs above the split to switch.
- The **confidence badge** in the inspector shows the edge's value; the line
  thickness follows it.
- The **Confidence range** slider has two thumbs (0–100%). Only edges whose
  confidence falls inside the selected range are shown; edges with no confidence
  value stay visible. The graph stats show how many edges the filter hides.
- **Exercise panel size** can be dragged by its top handle on desktop. Press
  `Esc` or the close button to dismiss it.
- The floating panel controls node size, edge scale, the confidence range,
  labels, tooltips, arrowheads, neighbor highlighting, and layout. Arrowheads
  are **off by default**.

The split pane is deliberately **not editable**. Text can be selected and copied
with the per-file copy button.

Files over 1 MB are previewed up to 1 MB. Syntax highlighting is skipped for very
large previews and the code is shown as plain, escaped text. Images are previewed
inline; other binary files show a size notice instead.

## JSON format

The document is standard Cytoscape.js element JSON, plus two keys inside edge
`data`:

```json
{
  "name": "My graph",
  "elements": {
    "nodes": [
      {
        "data": { "id": "a" },
        "style": {
          "label": "Node A",
          "width": 48,
          "height": 48,
          "background-color": "#ff7a90",
          "shape": "diamond"
        }
      },
      {
        "data": { "id": "b" },
        "style": { "label": "Node B" }
      }
    ],
    "edges": [
      {
        "data": {
          "id": "a-b",
          "source": "a",
          "target": "b",
          "confidence": 0.6,
          "exercises": {
            "exercise-name": ["file1", "file2"],
            "exercise2-name": ["file21", "file22"]
          }
        },
        "style": {
          "label": "connects",
          "width": 4,
          "line-color": "#7ee2b8",
          "target-arrow-color": "#7ee2b8",
          "line-style": "dashed"
        }
      }
    ]
  }
}
```

Accepted element shapes:

- `{ "elements": { "nodes": [...], "edges": [...] } }`
- `{ "elements": [ ...nodes and edges... ] }` (edges are detected by `source` /
  `target`)

This viewer intentionally does **not** support the legacy aliases from the
original viewer (`links`, root-level `nodes`/`edges`, `data.style`,
`data.size`, `data.color` as a style API, etc.). Use standard Cytoscape element
JSON with a top-level per-element `style` object.

### `confidence`

A number between `0` and `1`. It controls edge thickness:

```text
base width = 1.2 + 8.3 × confidence   (CSS pixels at 1× edge scale)
```

The **Edge scale** slider multiplies that width. Values outside `[0, 1]` are
clamped with a warning. Edges without a valid `confidence` fall back to the
element's `style.width` (or `2`), so they are still visible.

The **Confidence range** slider filters edges by percentage: set a lower and an
upper bound between 0% and 100%. Hidden edges are excluded from the layout's
visible extent. Edges without a confidence value are never hidden by the filter.

Because confidence defines the thickness, an edge's `style.width` is ignored
when `confidence` is present.

### `exercises`

An object mapping an exercise name to an array of file paths. The viewer shows
the files side by side. The format is pair-oriented, but any number of paths is
accepted; two panes are the normal layout and extra files wrap to another row.

Paths are resolved relative to the **directory containing the graph JSON**:

- `"exercises/two-sum/mira.py"` → `<graph dir>/exercises/two-sum/mira.py`
- `"../shared/file.js"` → `<parent of graph dir>/shared/file.js`

Absolute paths and paths that escape the granted folder are rejected.

### Per-element styles

The top-level `style` object on a node or edge is applied as a Cytoscape element
style. Standard properties such as `label`, `background-color`, `shape`,
`border-color`, `line-color`, `line-style`, `target-arrow-color`,
`target-arrow-shape`, `font-size`, etc. work.

- Numeric node `width` / `height` are used as base sizes and multiplied by the
  **Node size** slider.
- Edge `width` is used only when the edge has no `confidence`.
- If an edge sets `line-color` but not `target-arrow-color`, the arrow color
  follows the line color.
- The **Arrowheads** switch adds arrowheads to every edge. It is **off by
  default**. An explicit per-element `target-arrow-shape` wins.

## Files

```text
index.html                 Page structure
styles.css                 UI, split inspector, and syntax theme
js/app.js                  Drag/drop, Cytoscape setup, inspector, file loading
js/graph.js                Graph parsing and validation
js/fs.js                   Folder abstractions and path resolution
js/highlight.js            Lightweight extension-based syntax highlighting
server.js                  Zero-dependency static server
examples/graph.json        Example graph
examples/exercises/        Example exercise file pairs
test/                      Node test suite
vendor/                    Vendored Cytoscape.js and its license
```

## Tests

```bash
npm test
```

The tests cover graph parsing/validation, relative path handling, folder file
lists, and the syntax highlighter (including HTML-escaping of untrusted file
content).

## Notes

This is a fresh viewer inspired by the earlier `../cytoscape` project's UI and
drop-screen layout. The legacy parsing compatibility layer was intentionally left
out, and the UI was extended for confidence-weighted edges and the exercise split
view. Cytoscape.js is Copyright © The Cytoscape Consortium and is distributed
under the MIT license in `vendor/LICENSE-cytoscape.txt`.
