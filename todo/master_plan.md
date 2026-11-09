# Notebook Online — master plan

A static GitHub Pages site where people create and run computational notebooks in the browser,
the way [Python Online](https://curtcox.github.io/PythonOnline/) works for single Python programs.
No server: Python runs as WebAssembly (Pyodide) and R runs as WebAssembly (webR), each inside a
Web Worker inside the HashBin SDK's opaque-origin sandbox. Notebooks open, save and share as
compressed URL fragments, QR codes and HashBin CIDs, and round-trip (partially) with Jupyter,
marimo, Jupytext and Quarto/MyST files.

Recovery copy: **https://curtcox.github.io/notebooks/** (this repo, `curtcox/notebooks`).
Canonical: **https://notebook.hashbin.page/** (added to HashBin's owned-app registry).
The HashBin return URL must match the canonical address exactly, including the trailing slash.

## Decisions (agreed)

| Topic | Decision |
|---|---|
| Name | **Notebook Online**. Slug `notebook`, storage prefix `notebookonline`, cache prefix `notebookonline-`. |
| Execution model | **Both, per notebook.** *Reactive* (marimo-style dependency graph) is the default for new notebooks; a per-notebook switch selects *Linear* (Jupyter-style: run cells manually in any order, shared namespace, execution counts). The mode travels with the document. |
| Cell kinds | **Python** (Pyodide), **Markdown** (with KaTeX math), **SQL** (DuckDB), **R** (webR). Raw cells are kept for ipynb round-trips and are not executed. |
| Formats | Import and export **Jupyter `.ipynb`** (nbformat 4), **marimo `.py`**, **Jupytext percent `.py`**, and **Quarto `.qmd` / MyST `.md`**. Round-trips are partial; every lossy step is reported to the user, never silent. |
| Hosting | GitHub Pages via the shared Fragment Kit `pages.yml` workflow, gated by tests, exactly as PythonOnline. Canonical deployment through HashBin's `deploy-owned-apps.mjs`. |
| HashBin | The owner registers a new "Notebook Online" app. The code ships with an empty `hashbin-client-id` meta tag until then; Save is disabled with an explanation while it is empty, Load works without it. |

## Defaults chosen in this plan (say so to change any)

| Topic | Default |
|---|---|
| Canonical document text | The document's `src` is **Notebook Markdown**: a Quarto-compatible Markdown subset with ```` ```{python} ````, ```` ```{r} ````, ```` ```{sql} ```` fences and `#|` cell options. One readable text string keeps URLs small, makes `.qmd` export near-identity, and lets Fragment Kit's AI edits, drafts and legacy-free URL state work unchanged on `/src`. |
| Outputs in links | Share links and HashBin saves carry **source and settings only**, never outputs. Outputs are recomputed. `.ipynb` export can include current outputs; imported `.ipynb` outputs are shown as *imported (not yet run)* until the cell runs. A later phase may add an explicit “Save with outputs” snapshot. |
| SQL engine | **DuckDB inside the Python worker** (Pyodide ships `duckdb` 1.5.1), as marimo's `mo.sql` does. SQL sees Python dataframes by name and returns a dataframe bound to a Python variable. No separate DuckDB-WASM download. |
| Language data sharing | Python, SQL and Markdown share the Python worker's namespace. R has its own worker and namespace in v1. Python↔R exchange is a later phase (see Open items). |
| Editor | Ace (vendored, as in the lineage), one editor per cell, created lazily as cells scroll into view. |
| Workflow | One branch + PR per phase, merged after CI passes (Fragment Kit's practice). Say so if you'd rather commit directly to `main`, as PythonOnline did initially. |
| Kit pins | Fragment Kit **v0.4.3** (the release PythonOnline and R ship) vendored at `vendor/fragment-kit-v0.4.3/`; shared workflows at immutable **`@v2`**. A `v3` workflow tag exists upstream; adopt it only after reading its changelog and with an explicit change. |
| Runtime pins | Pyodide **314.0.7** (CPython 3.14.2) and webR **0.6.0** (R 4.6.0), the same pins and CDN prefixes as PythonOnline and R Online. |

## What I checked before planning

- **PythonOnline** (`curtcox/PythonOnline`): build-free root deploy; `deploy.yml` calls
  `curtcox/Tools-for-pages-with-state-in-URL-fragments/.github/workflows/pages.yml@v2` with a
  `verify-marker` meta tag after `test.yml` calls the shared `test.yml@v2` and `kit-check.yml@v2`.
  It uses Fragment Kit v0.4.3 for the shell, mobile tabs, share/QR dialogs, HashBin panel, drafts,
  offline, gallery and optional AI; app-owned code is the Pyodide worker, sandbox, output view,
  traceback mapping and turtle. Its `AGENTS.md` contracts (opaque sandbox, inert output, 750 ms
  auto-run, 5 s limit, Stop kills the worker, links never silently replace drafts, hash-verified
  service worker, CSP) apply here unchanged unless this plan says otherwise.
- **Fragment Kit** (`curtcox/Tools-for-pages-with-state-in-URL-fragments`): tags through `v0.4.3`;
  workflow tags `v1`, `v2`, `v3`. `pages.yml` inputs: `path`, `stage-command`, `verify-marker`,
  `needs-tests`. `test.yml` inputs: `pre-test`, `kit-path`, `contract-config`, `server-command`,
  `browser-command`, `browsers`, `mobile`, `gallery-command`. AI is a separate entry point
  (`src/ai/index.js`) configured by an `ai` block in the app config and `type.ai` on the
  DocumentType; accepted proposals must never auto-run.
- **HashBin** (`curtcox/hashbin.org`): first-party editors live at `<slug>.hashbin.page`, each a
  `hashbin-client-<slug>` Cloudflare static deployment staged by `scripts/deploy-owned-apps.mjs`
  from an allowlist; `scripts/owned-apps.mjs` is the address/app-ID registry. Saves go through the
  SDK's `publish()` (approved on hashbin.org); the app never holds a credential. The AI host
  (`ai.hashbin.page`) has an exact `allowedOrigins` list.
- **R Online** (`curtcox/R`): webR 0.6.0 pinned; runs only inside the HashBin SDK opaque sandbox;
  **webR's dynamic linker requires CSP `'unsafe-eval'`**, which the owner approved for R Online
  specifically. This app needs its own approval (see Open items).
- **apptron**: a precedent for heavy runtimes behind the same kit, and for the canonical host
  serving COOP/COEP headers. Not used as a kernel in v1.
- **Pinned Pyodide 314.0.7 lockfile** includes `duckdb` 1.5.1, `ipython` 9.12.0, `jedi` 0.19.2,
  `pandas` 3.0.2, `polars` 1.33.1, `pyarrow` 22.0.0, `numpy` 2.4.6, `matplotlib` 3.10.8,
  `altair` 6.0.0, `narwhals` 2.18.1, `pygments` 2.20.0 and `micropip` 0.11.1.
- **npm**: `katex` 0.19.1 and `webr` 0.6.0 are current; `@duckdb/duckdb-wasm` publishes only dev
  versions, another reason to use Pyodide's `duckdb`.
- **marimo** file format: `import marimo`, `__generated_with`, `app = marimo.App(...)`,
  `@app.cell` functions whose parameters are refs and whose `return` tuple is defs, optional
  `with app.setup:`, `@app.function`, `@app.class_definition`, and
  `if __name__ == "__main__": app.run()`. marimo semantics: a global name may be defined by only
  one cell; `_`-prefixed names are cell-local; cycles are errors; UI elements re-run the cells that
  reference them. The real `marimo` frontend is a React app; we implement a **compatibility
  subset** of the `marimo` Python API, not its UI.

## Lineage features to carry over (from PythonOnline / GraphvizOnline)

1. **Links to docs and gallery.** Header and More drawer: *Notebook guide* (our `docs/`),
   *Sample gallery* (`gallery.html`), *Python docs ↗*, *Pyodide packages ↗*, *R docs ↗*,
   *DuckDB SQL ↗*, *marimo docs ↗*, *Jupyter docs ↗*. Gallery cards link to the relevant guide page.
2. **Mobile friendly.** Kit `compactShell` and `mountMobileTabs`. At ≤760 px width or ≤500 px
   height: a single-column cell list with **Notebook / Outline / Input** tabs, sticky
   *Run cell* / *Run all* / *Stop* bar, cell actions in a per-cell `⋯` menu, ≥40 px targets,
   16 px inputs, `100dvh`, virtual-keyboard-aware scrolling. Pinch/pan on figures with
   `svg-pan-zoom`.
3. **HashBin load and save.** Kit `HashBinStore`/`HashBinPanel`: `#<cid>` loads automatically,
   Save → *Review on HashBin* with price and balance, popup or redirect, document restored after
   approved or cancelled returns. Bare `.ipynb`, marimo, percent and Markdown content also loads
   from a CID by sniffing (see Formats).
4. **QR code of the URL.** Kit `createQrDialog`: CID link when the notebook matches its last save,
   otherwise the compressed link; SVG/PNG download; scanning a QR image loads it; size warning and
   *Save to HashBin first* when the link is too long for a QR code.
5. **AI assistance.** Kit AI entry point: Ask panel, settings (paste/OpenAI/OpenRouter/Anthropic/
   Gemini/local/browser routes), budgets, review-then-accept proposals, never auto-run. Canonical
   uses the `ai.hashbin.page` host; recovery and localhost use direct connections.
6. Also inherited: compressed share links with *Don't run on open*, is.gd shortening, explicit
   local draft recovery, installable PWA with atomic hash-verified offline install, optional
   offline package caching, download of source/exports/images, Ctrl/Cmd+Enter.

## Repository layout

```
index.html                  editor page; CSP; hashbin-client-id + fragment-kit meta tags
gallery.html                sample gallery (kit gallery)
manifest.webmanifest, icon.svg, icons/   PWA
service-worker.js, offline-assets.js, offline.config.json   kit offline, hash-verified
fragment-kit.config.json    slug, prefixes, origins, ai block
ai-suite.json               AI eval corpus (as PythonOnline)
testing-contract.config.mjs kit browser contract adapter
gallery.config.mjs
package.json, package-lock.json   test/maintenance only: playwright, pyodide, webr
AGENTS.md, README.md, LICENSE, LICENSE-graphvizonline, LICENSE-* (vendor notices)
ace/                        ace.js, theme, ext-language_tools, mode-{python,r,sql,markdown}
vendor/fragment-kit-v0.4.3/ immutable kit pin (includes HashBin SDK v0.4.0 + QR encoder)
vendor/markdown-it-<ver>/, vendor/katex-<ver>/ (+ fonts), vendor/svg-pan-zoom
src/
  app.js                    orchestration (shell, URL state, drafts, HashBin, QR, AI)
  app.css
  fragment-config.mjs       createConfig, DocumentType 'notebook', urlState, HashBinStore
  model/
    notebook.js             in-memory model: cells, ids, options, settings, revision guards
    notebook-markdown.js    parse/serialize canonical Notebook Markdown (src)
  formats/
    sniff.js                content detection
    ipynb.js                nbformat 4 import/export
    marimo.js               marimo .py import/export (parse step runs in the Python worker)
    percent.js              Jupytext percent import/export
    quarto-myst.js          .qmd / MyST .md import/export
    report.js               lossiness report shown after import/export
  ui/
    cell-list.js            cells, lazy Ace editors, drag reorder, keyboard modes
    cell-toolbar.js, outline.js, widgets.js (renders marimo-style UI specs), status.js
    markdown-view.js        markdown-it + KaTeX + DOM allowlist sanitizer
    output-view.js          MIME bundle renderer (from PythonOnline, extended)
  kernels/
    kernel.js               common client interface (start, run, interrupt-by-kill, dispose)
    python-client.js, python-sandbox.js, python-worker.js   from PythonOnline, adapted
    r-client.js, r-sandbox.js, r-worker.js                  from R Online, adapted
    scheduler.js            reactive and linear schedulers
  py/                       real importable Python files installed in the worker
    nbruntime.py            run cell, capture outputs, displayhook, MIME bundles
    analyze.py              ast defs/refs, marimo parse, magics transform
    ipython_compat.py       get_ipython() stub, display, %pip/%time/%timeit/%matplotlib
    marimo/__init__.py …    compatibility subset of the marimo API (mo.md, mo.ui.*, mo.sql …)
    sqlcell.py              DuckDB connection, dataframe binding
  r/runtime.R, r/analyze.R  R cell runner and defs/refs via getParseData
  examples.js               gallery catalog (source of truth in examples/)
examples/                   *.qmd sample notebooks (+ ipynb/marimo fixtures for import demos)
docs/*.md → docs/*.html     guide: cells, reactive vs linear, formats, SQL, R, widgets, limits
scripts/                    check, offline, docs, gallery render, preview render (as PythonOnline)
tests/                      node unit, python unit, browser (Playwright) suites, format fixtures
.github/workflows/deploy.yml, test.yml
todo/master_plan.md         this file
```

## Document model

### Envelope

```json
{"format":"hashbin-diagram","version":1,"type":"notebook",
 "src":"---\ntitle: Hello\n---\n\n# Hello\n\n```{python}\nx = 1\n```\n\n```{python}\nx * 2\n```\n",
 "notebook":{"mode":"reactive","autorun":true,"stdin":""}}
```

- `type: "notebook"`. `normalize` validates text types, `mode ∈ {reactive, linear}`, defaults
  `autorun: true` (reactive) and `stdin: ""`. `isDefault` is true when settings are defaults, so
  the common case encodes as compressed `src` alone.
- 5 MiB limit including the envelope, as in PythonOnline. Larger imports (typically `.ipynb`
  with embedded outputs) are imported without outputs and the report says so.

### Notebook Markdown (`src`)

- Optional YAML front matter: `title`, plus `notebook-online:` keys written only on `.qmd`
  export (mode). Unknown front matter is preserved verbatim.
- Text between code fences is Markdown; consecutive Markdown is split into cells at a line
  containing only `<!-- cell -->` (written by the serializer when two Markdown cells are adjacent),
  otherwise one Markdown cell per run of text.
- Code cells: ```` ```{python} ````, ```` ```{r} ````, ```` ```{sql} ````, and ```` ```{raw} ````.
  Plain ```` ```python ```` (no braces) is display-only code inside Markdown, as in Quarto.
- Cell options as leading `#| key: value` lines (Quarto syntax, also used in `{r}`/`{sql}`):
  `id`, `name` (marimo function name), `output` (SQL result variable), `hide-code`,
  `disabled`, `echo`, `tags`. Unknown options are preserved.
- Cell ids: kept when present (from ipynb/marimo); otherwise generated in memory and written only
  when needed for round-trips, so hand-written notebooks stay clean.
- The parser is total: any text is a valid notebook (worst case one Markdown cell). Serializer
  output re-parses to the same model (tested as a property).

### Source view

A *Source* toggle shows the whole `src` in one Ace editor (Markdown mode with embedded code
highlighting). Edits there re-parse on pause; cell identity is preserved by matching ids, then
position+kind.

## Execution design

### Kernels and isolation

- **Python kernel**: PythonOnline's worker and sandbox, unchanged in isolation: HashBin SDK v0.4.0
  `createSandbox()` opaque origin (`sandbox="allow-scripts"`, origin `null`), storage APIs and
  inherited getters removed before user code, no DOM. The difference is lifetime: a notebook
  kernel keeps its `__main__` namespace across cell runs (PythonOnline resets each run).
  *Restart kernel* replaces the worker. Persistent files (hosted run origin) are out of scope for v1.
- **R kernel**: R Online's webR 0.6.0 worker adapter in its own opaque sandbox, started lazily
  the first time a notebook contains an R cell. Global environment persists across cells.
- **SQL**: a Python cell under the hood. `sqlcell.py` holds one in-memory DuckDB connection per
  kernel; the query runs with the notebook's Python globals visible (DuckDB replacement scans over
  pandas/polars/pyarrow objects) and the result dataframe is bound to the cell's `output` name
  (default `_df`, cell-local). SQL is first loaded on demand (`duckdb` package).
- **Markdown**: rendered in the editor page, not executed. Reactive mode additionally supports
  marimo-style dynamic Markdown through Python cells (`mo.md(f"...")`), never through Markdown cells.
- **Stop** terminates the busy worker (no SharedArrayBuffer on GitHub Pages, so no cooperative
  interrupt). The kernel is gone: reactive mode marks every Python cell stale and offers
  *Re-run all*; linear mode shows *Kernel restarted — outputs are from the previous kernel*.

### Reactive mode (marimo semantics)

1. On every edit pause (750 ms), `analyze.py` computes each Python/SQL cell's **defs** (top-level
   assignment targets, `import` names, `def`/`class` names, `global` declarations, walrus at top
   level) and **refs** (loaded names not defined earlier in the same cell, excluding builtins).
   `_`-prefixed names are cell-local (mangled per cell). SQL refs = identifiers in the query that
   match notebook defs. R cells use `analyze.R` (`getParseData` assignment targets and symbols)
   and form a separate graph in the R kernel.
2. The graph has an edge from the defining cell to each referencing cell. Errors shown on the cell,
   not executed: **multiple definitions** of a name, **cycles**, and **delete/del of a global defined
   elsewhere**. Cell order on screen does not matter.
3. Running a cell (edit + auto-run, Run cell, or a widget change) first deletes the names it
   previously defined, runs it, then runs all descendants in topological order. Descendants of a
   failed cell are marked *stale (ancestor error)* and skipped. `mo.stop(cond, output)` stops a
   cell and its descendants cleanly.
4. **Auto-run** on (default): edits run after 750 ms, limited to 5 s per triggered batch after
   dependency loading, as PythonOnline; exceeding it kills the kernel (above). Auto-run off
   (“lazy” in marimo terms): edited cells and descendants are marked stale; *Run stale* runs them.
5. Deleting a cell removes its defs from the namespace and re-runs (or marks stale) dependents.
6. Opening a notebook runs all cells once in topological order (unless `?run=0` or the link's
   autorun is off).
7. `Program input` (stdin) is available to `input()` and resets each full run, as in PythonOnline.

### Linear mode (Jupyter semantics)

- Cells run only when asked: *Run cell*, *Run cell and advance* (Shift+Enter), *Run all*, *Run all
  above/below*, *Restart and run all*. Execution counts `[n]` shown; outputs persist until re-run
  or cleared. No dependency analysis, but a *possibly stale* hint appears on cells that reference
  names redefined by a later run (computed with the same analyzer, advisory only).
- Auto-run is off by default in linear mode; *Run all on open* is a setting that travels with the
  document (`autorun`), default off for imported `.ipynb`.
- Switching mode prompts once, offers *Restart and run all*, and is recorded in the document.

### Python runtime surface (Jupyter compatibility)

- **Display hook**: the last expression's value is displayed (Jupyter and marimo agree), using
  `_repr_mimebundle_`, `_repr_html_`, `_repr_markdown_`, `_repr_svg_`, `_repr_png_`, `_repr_jpeg_`,
  `_repr_latex_`, `_repr_json_`, then `repr()`. Trailing `;` suppresses output.
- `IPython.display`: `display`, `HTML`, `Markdown`, `Latex`, `Math`, `SVG`, `Image`, `JSON`,
  `clear_output`, `update_display` (display ids). Pyodide's `ipython` package supplies the classes;
  `ipython_compat.py` supplies `get_ipython()` and the display publisher.
- **Magics** via IPython's `TransformerManager` (input transforms only, no IPython shell):
  `%pip install` → micropip; `%time`, `%timeit` (bounded); `%matplotlib inline` (no-op);
  `%%sql` → SQL cell; `%%R` → R cell (rpy2 convention, for ipynb round-trips); `%%html`,
  `%%markdown`, `%%latex`. `!cmd` and other magics raise a clear `UsageError`.
- matplotlib (Agg, eager SVG + 2× PNG capture per figure, as PythonOnline), pandas/polars tables
  as HTML, Pillow images, PEP 723 dependencies at the top of the notebook's first Python cell,
  auto-loading Pyodide packages from imports.
- Turtle (PythonOnline's subset) available but not featured.

### marimo compatibility subset (`import marimo as mo`)

Implemented as real Python in `src/py/marimo/`, documented as an unaffiliated compatibility subset:

- Output: `mo.md` (with f-strings and embedded UI elements), `mo.hstack`, `mo.vstack`, `mo.callout`,
  `mo.accordion`, `mo.tabs`, `mo.plain_text`, `mo.as_html`, `mo.output.replace/append/clear`,
  `mo.stop`, `mo.sql`, `mo.state` (getter/setter with reactive re-run of referencing cells).
- UI (`mo.ui`): `slider`, `range_slider`, `number`, `text`, `text_area`, `checkbox`, `switch`,
  `dropdown`, `radio`, `multiselect`, `button` (with `on_click`, `value`), `run_button`, `date`,
  `table` (read-only selection), `array`, `dictionary`, `form` (submit). `.value` reads the current
  value.
- UI rendering: the worker emits an inert **widget spec** (kind, id, label, bounds, options, value)
  as data; `ui/widgets.js` renders native page controls from that spec (never worker-supplied
  HTML/JS). Value changes post `{widgetId, value}` back to the kernel, which updates the element and
  re-runs the cells that reference the element's variable (marimo semantics, debounced for
  sliders). In linear mode widget changes update `.value` only and re-run nothing.
- Unsupported `mo.*` raises `NotImplementedError("mo.X is not supported in Notebook Online")` with a
  doc link. `mo.ui.anywidget`, `mo.ui.altair_chart`, `mo.ui.plotly`, `mo.ui.file`, `mo.ui.chat` are
  out of scope for v1.

### Rich output rendering

- Every output is a MIME bundle; priority as Jupyter: `application/vnd.notebook-online.widget+json`
  (our specs), `text/html`, `image/svg+xml`, `image/png`, `image/jpeg`, `text/markdown`,
  `text/latex`, `application/json`, `text/plain`. Errors render as tracebacks with links to the
  cell line.
- Inherited isolation (PythonOnline contracts): text as text nodes; HTML and HTML-bearing Markdown
  outputs in empty-`sandbox` script-less iframes with a restrictive CSP and auto-height via
  `ResizeObserver` inside our own trusted wrapper; arbitrary SVG as inert `<img>` blobs; LaTeX via
  KaTeX with `trust:false`; JSON as a collapsible tree built from text nodes.
- `application/javascript`, `application/vnd.jupyter.widget-view+json`, Bokeh/Plotly/Vega bundles
  are not executed in v1; a placeholder names the MIME type and falls back to the bundle's
  `text/html`/`image/*`/`text/plain` representation if present.

### Markdown cells

- `markdown-it` (vendored, `html:false`, `linkify`, tables, strikethrough) + `markdown-it` KaTeX
  rule for `$…$` / `$$…$$`, then a DOM **allowlist sanitizer** (tags, attributes; `http(s):`,
  `mailto:` and in-document `#` links get `rel="noopener noreferrer"`; images `https:`, `data:` and
  ipynb `attachment:` resolved to blob URLs). Rendered into the page DOM for speed.
- Markdown containing raw HTML (common in ipynb) renders in the same sandboxed script-less iframe
  path as HTML output, so no user HTML enters the editor DOM.
- Double-click / Enter edits; Escape or Shift+Enter renders.

## Formats (import / export)

All importers produce the internal model, then `src`. All exporters start from the model. Each
operation returns a **report** (kept, converted, dropped) shown in a dismissible panel and included
in tests. Importers never execute code; imported notebooks open with Auto-run **off** and
*Run all* clearly offered, because their code came from a file.

| Feature | `.ipynb` | marimo `.py` | percent `.py` | `.qmd` / MyST `.md` |
|---|---|---|---|---|
| Markdown cells | `markdown` | `mo.md(r"""…""")`-only cells | `# %% [markdown]` + `# ` lines | text between fences |
| Python cells | `code` | `@app.cell` body (refs/defs regenerated on export) | `# %%` | ```` ```{python} ```` / ```` ```{code-cell} python ```` |
| SQL cells | `%%sql` cell magic | `name = mo.sql(f"""…""")` | `# %%` + `%%sql` (commented per Jupytext) | ```` ```{sql} ```` |
| R cells | `%%R` (rpy2 convention); R-only notebooks use the `ir` kernelspec and plain cells | not representable: exported as a disabled Python cell holding the R text; reported | `# %%` + `%%R` | ```` ```{r} ```` |
| Raw cells | `raw` | dropped, reported | `# %% [raw]` | ```` ```{raw} ```` |
| Cell ids / names | `id` | function name (`_` when unnamed) | — (reported) | `#| id` / `#| name` |
| Outputs | imported for display; optional export | — | — | — |
| Attachments | `attachment:` images kept as data URLs in model, re-exported as attachments | — | — | inlined data URLs, reported |
| Mode | `metadata.notebook_online.mode` (default linear on import) | reactive | metadata header comment (default linear) | front matter `notebook-online.mode` (default reactive) |

- **ipynb**: accept nbformat 4.0–4.5 (and 3 → convert minimal subset or reject with a clear
  message); write 4.5 with ids, `kernelspec` (`python3`, or `ir` when every code cell is R),
  `language_info`, and our metadata namespace; preserve unknown notebook/cell metadata.
  Validate exports against the vendored nbformat 4.5 JSON schema in unit tests, and with Python
  `nbformat` in CI.
- **marimo**: parsing uses Python's `ast` inside the Python worker (exact, handles decorators,
  `with app.setup:`, `@app.function`, `@app.class_definition`, `app = marimo.App(width=…)`).
  Export generates refs as function parameters and defs as the return tuple from the analyzer, with
  `__generated_with` set to the compatibility version we test against. CI runs real `marimo check`
  / `marimo export script` on exports.
- **percent**: Jupytext conventions (`# %%`, titles, `[markdown]`, cell metadata in `key=value`
  form), optional Jupytext YAML header. CI cross-checks with real `jupytext --to ipynb`.
- **Quarto/MyST**: Quarto is the native format (near identity). MyST `{code-cell}` directives with
  `:tags:` options and `+++` cell breaks import; MyST export is offered as a second Markdown flavor.
- **Sniffing** (CID loads, drag-and-drop, Open file): JSON with `nbformat` → ipynb; our envelope →
  document; `import marimo` + `@app.cell` → marimo; leading `# %%` → percent; `{code-cell}` → MyST;
  otherwise Notebook Markdown.
- **Entry points**: *Open file* (picker and drag-and-drop), *Open from URL* (user-entered https URL,
  e.g. a GitHub raw link; fetched on click, CORS permitting; a `?open=<url>` link only *suggests* the
  URL and waits for a click), *Download as…* each format, HashBin CID load.

## Editor page (`index.html`, `src/app.js`)

- Kit shell header (brand, docs/gallery links, More), compact toolbar: **Run** (cell), **Run all**,
  **Stop**, **Restart**, mode badge (Reactive/Linear), Auto-run, **+ Cell** (kind menu),
  Download, Share, QR, Open, Source view.
- Cell chrome: kind selector (Python/Markdown/SQL/R/Raw), run button, status (idle, queued,
  running timer, stale, error, disabled), execution count (linear) or dependency chips
  (reactive: “uses x, df · defines y”), hide code, `⋯` menu (move, duplicate, delete, disable,
  ask AI about this cell, copy cell link).
- Keyboard: Jupyter-style command/edit modes subset — Enter/Esc, Shift+Enter, Ctrl/Cmd+Enter,
  Alt+Enter, `A`/`B` insert, `D D` delete, `M`/`Y` to Markdown/code, `Z` undo delete, arrow
  navigation. Documented in a *Keyboard shortcuts* dialog.
- Outline panel from Markdown headings (also the mobile *Outline* tab), with cell error markers.
- Program input panel (stdin), as PythonOnline, collapsed by default.
- Undo: Ace per cell, plus a notebook-level structural undo stack (insert/delete/move/kind change).
- Drafts: kit editor drafts keyed by `notebookonline:`; links never silently replace the stored
  notebook; *Resume saved work* in More.
- Performance: virtualized rendering beyond ~50 cells; Ace instances created on first
  intersection, released when far off-screen; outputs capped (1 MiB text / 20,000 lines per cell,
  images capped by size) with *Show full output* where retained.
- `globalThis.NotebookOnline` inspection surface for tests (model, kernels, run, select).

## Sharing and URLs

- Kit `urlState` v1 format only (no legacy writer; this app has no legacy links). Supported:
  `#<compressed document>`, `#<cid>`, `?example=<id>`, `?run=0`, `?view=` (kit workspace view),
  `?open=<https url>` (suggestion only, see Formats).
- Share dialog: copy link, *Don't run on open*, shorten via is.gd, size readout; when the link
  exceeds the QR/URL budget the dialog recommends *Save to HashBin*.
- Incoming links always open the linked notebook but never overwrite the stored draft
  (PythonOnline contract).

## HashBin

- Kit `HashBinStore`/`HashBinPanel` with `type: notebook`; Save requires the registered client ID.
  Registration (owner action): app name “Notebook Online”, return URL exactly
  `https://notebook.hashbin.page/`. Recovery origin saves use the same client if the registry
  allows it, else the recovery site offers a lossless handoff to canonical (PythonOnline pattern).
- Add `notebook` to `hashbin.org` `scripts/owned-apps.mjs` and the staging allowlist in
  `deploy-owned-apps.mjs` (a separate PR in that repo), then dispatch `deploy-owned-apps.yml -f app=notebook`.
- Save formats: the envelope (default). *Save as .ipynb/.qmd to HashBin* is a later option; loads
  already sniff all formats.

## AI assistance

- `fragment-kit.config.json` `ai` block as PythonOnline: deployments (canonical → host
  `https://ai.hashbin.page/v0.4.0/`; recovery, `127.0.0.1:8000`, `localhost` → direct), all routes,
  zero default budget, pinned model list with prices.
- `type.ai`: `describe` explains Notebook Markdown, cell kinds, the two modes and the marimo subset;
  `output: 'edits'`; `paths: ['/src']`; `settingsKeys: []` (AI cannot change mode/autorun unless a
  later decision allows it); `validate` re-parses `src` and checks the reactive graph has no new
  multiple-definition or cycle errors; named `checks` (`parses`, `graphValid`, `runsAndOutputs`
  for evals).
- Prompts carry the current notebook, the selected cell index and, for *Explain this error* /
  *Fix this cell*, the cell's traceback text (bounded). Proposals render as a per-cell diff;
  accepting applies through the normal edit path, records the pre-acceptance snapshot, and never
  runs (contract). *Try* runs the proposal in a throwaway kernel only on an explicit click.
- `ai-suite.json` eval corpus: add a cell, fix an error, convert a loop to a dataframe op, write a
  SQL query over an existing dataframe, add a slider that drives a plot (reactive), keep settings
  unchanged.
- Owner action: add `https://notebook.hashbin.page` to the AI host's `allowedOrigins`.

## Security

Same posture as PythonOnline, extended for multiple kernels and widgets:

- User code never runs with the editor's origin: both kernels run in HashBin SDK opaque sandboxes;
  workers lose storage/script/worker APIs before user code.
- Nothing from a kernel is interpreted as page HTML or script: outputs follow the rendering rules
  above; widget specs are validated data (closed set of kinds, numeric bounds, bounded strings and
  option counts) rendered by our own code; display ids and widget ids are opaque tokens scoped to
  the current kernel generation, and stale messages are ignored.
- Markdown cells: `html:false` + DOM allowlist; raw-HTML Markdown goes to the sandbox iframe path.
- Imported files and links are data until the user runs them; imported notebooks start with
  Auto-run off. `?open=` never fetches without a click.
- CSP in `index.html`/`gallery.html`: as PythonOnline (self, sandbox bootstrap hash, `blob:`,
  `'wasm-unsafe-eval'`, the AI host frame), plus the jsDelivr runtime prefixes for Pyodide and
  webR in `connect-src`. **`'unsafe-eval'` for webR is not added without the owner's explicit
  approval** (see Open items); until then R cells show *R requires approval in this build*.
- Shared origin (`curtcox.github.io`): service worker scope, cache names (`notebookonline-…`) and
  storage keys are prefixed; served bytes are hash-verified (kit offline).
- Python and R code have network access (fetch, micropip, `install.packages` via webR repo); the
  docs say so, and auto-run on open can repeat network side effects.

## Gallery and docs

- Gallery (kit gallery, real rendered previews generated by running each notebook with the pinned
  engines in CI, as PythonOnline's `gallery:python`):
  1. Welcome (Markdown + Python, reactive basics)
  2. Reactive slider → matplotlib plot (`mo.ui.slider`)
  3. Linear-mode tutorial (execution counts, restart and run all)
  4. pandas data exploration
  5. SQL over a dataframe (DuckDB), result into a chart
  6. Polars + SQL join
  7. Form and dropdown driving a table filter
  8. Markdown and math showcase (KaTeX)
  9. R: data frame summary and base graphics
  10. R and Python side by side (separate namespaces, explained)
  11. Imported Jupyter notebook demo (ipynb fixture with outputs)
  12. Imported marimo notebook demo
  13. micrograd-style autodiff walkthrough (adapted from PythonOnline's sample, MIT notice kept)
  14. Program input (`input()`) notebook
- Docs (`docs/*.md` → `docs/*.html` via `npm run docs`): Getting started; Cells and keyboard;
  Reactive vs linear; Notebook Markdown reference; Formats and what round-trips; Python, packages
  and magics; marimo compatibility table; SQL cells; R cells; Widgets; Sharing, QR and HashBin;
  AI assistance; Limits and security; Offline use.

## Offline / PWA

- Kit offline: atomic precache of the app, kit, vendor files and Pyodide core, hash-verified via
  `offline-assets.js` and `scripts/remote-hashes.json`; *Update and reload* preserves work.
- Optional *Make packages available offline* (as PythonOnline): `duckdb`, `pandas`, `polars`,
  `numpy`, `matplotlib`, `ipython`, `pyarrow` from the pinned Pyodide lockfile.
- Optional *Make R available offline*: the pinned webR core in its own `notebookonline-webr-v1`
  cache with hashes pinned in `scripts/remote-hashes.json`.

## Tests

- **Node unit** (`node --test`): Notebook Markdown parse/serialize round-trip and property tests;
  each format importer/exporter against fixtures (including real-world `.ipynb` from Jupyter,
  marimo examples, Jupytext and Quarto samples, stored with their licenses); sniffing; report
  contents; reactive scheduler (topological order, multiple-def, cycles, stale propagation,
  delete cell) with a fake kernel; widget spec validation; sanitizer allowlist; URL state and
  envelope `normalize`; kit `sharing.test.js`-style SDK hash checks.
- **Python unit** (`python3 -m unittest`): `analyze.py` defs/refs against marimo's rules
  (comprehensions, `global`, walrus, `del`, class scopes, `_` locals), magics transforms, display
  hook MIME selection, marimo subset API behavior, `sqlcell.py` with real `duckdb` + pandas.
- **Cross-tool CI checks** (Python job): `nbformat.validate` on ipynb exports; `jupytext` round
  trip of percent exports; `marimo check` and `marimo export` on marimo exports; `quarto inspect`
  if available, else schema-free parse checks.
- **Engine tests** (`TEST_PACKAGES=1`): real Pyodide in Node for kernels (namespace persistence,
  reactive re-runs, SQL, matplotlib capture); real webR for R cells.
- **Browser** (Playwright, Chromium/Firefox/WebKit, desktop + phone): kit shared contracts via
  `testing-contract.config.mjs`; cell editing, keyboard modes, reactive slider re-run, linear
  run-all/restart, Stop and recovery, imports via file input and drag-and-drop, exports download,
  share link and QR round-trip, HashBin load from a fixture CID and mocked Publish returns, AI with
  mocked provider, offline reload, mobile tabs and 360 px layout, every gallery URL
  (`FULL_GALLERY=1`).
- `npm run check`: JS syntax, offline hashes, preview fingerprints, docs freshness, vendored pin
  integrity.

## CI and deployment

`.github/workflows/test.yml`:

```yaml
name: Test Notebook Online
on: { pull_request: {}, workflow_call: {}, workflow_dispatch: {} }
permissions: { contents: read }
jobs:
  test:
    uses: curtcox/Tools-for-pages-with-state-in-URL-fragments/.github/workflows/test.yml@v2
    with:
      pre-test: python3 -m pip install -r tests/requirements.txt && python3 -m unittest discover -s tests && TEST_PACKAGES=1 npm test
      kit-path: vendor/fragment-kit-v0.4.3
      contract-config: testing-contract.config.mjs
      server-command: PORT=8000 node tests/browser/server.cjs
      browser-command: FULL_GALLERY=1 npm run test:browser
  kit:
    uses: curtcox/Tools-for-pages-with-state-in-URL-fragments/.github/workflows/kit-check.yml@v2
    with: { kit-path: vendor/fragment-kit-v0.4.3 }
```

`.github/workflows/deploy.yml`:

```yaml
name: Deploy Notebook Online
on: { push: { branches: [main] }, workflow_dispatch: {} }
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: notebook-pages-${{ github.ref }}, cancel-in-progress: true }
jobs:
  test:
    uses: ./.github/workflows/test.yml
  deploy:
    needs: test
    uses: curtcox/Tools-for-pages-with-state-in-URL-fragments/.github/workflows/pages.yml@v2
    with: { path: '.', verify-marker: notebook-fragment-kit-v0.4.3 }
```

- `index.html` carries `<meta name="fragment-kit" content="notebook-fragment-kit-v0.4.3">`.
- `tests/requirements.txt` pins `nbformat`, `jupytext`, `marimo` (CLI checks only; never shipped).
- Owner action: **Settings → Pages → Source → GitHub Actions** on `curtcox/notebooks`.
- Canonical: separate `hashbin.org` PR adding the `notebook` slug, then dispatch its
  `deploy-owned-apps.yml`. Never claim a deployment without checking the run and the live page.

## Phases

Each phase is a branch + PR, merged when CI passes, with the README/AGENTS.md updated.

1. **Skeleton and deploy.** Vendor Fragment Kit v0.4.3 (`tools/vendor-sync.mjs`), Ace with
   python/r/sql/markdown modes, markdown-it, KaTeX, svg-pan-zoom with licenses. Kit shell, empty
   notebook page, config, `type: notebook` with `normalize`, URL state, drafts, share, QR, offline,
   manifest, icon. `test.yml`/`deploy.yml`, AGENTS.md, README. *Done when*: the recovery URL serves
   a page with the marker, kit contracts pass in three browsers.
2. **Notebook model and editor.** Notebook Markdown parser/serializer, cell list with lazy Ace,
   Markdown cells (render + sanitize + KaTeX), add/move/delete/kind change, keyboard modes, outline,
   source view, structural undo, mobile layout. No execution yet.
3. **Python kernel, linear mode.** Port PythonOnline's sandbox/worker/client with a persistent
   namespace, `nbruntime.py` display hook and MIME bundles, output view, tracebacks mapped to cells,
   Run/Run all/Restart/Stop, execution counts, stdin, matplotlib, packages, `%pip` and basic magics.
4. **Reactive mode.** `analyze.py`, graph, scheduler, stale states, multiple-def/cycle errors,
   auto-run with limits, mode switch, dependency chips.
5. **SQL cells.** `sqlcell.py`, DuckDB loading, dataframe binding, results table, `%%sql`.
6. **marimo subset and widgets.** `marimo` package subset, widget specs and renderer, reactive
   widget re-runs, `mo.state`, `mo.stop`, layout helpers.
7. **Formats.** ipynb, marimo, percent, Quarto/MyST import/export, sniffing, reports, Open file /
   drag-and-drop / Open from URL, Download as…, cross-tool CI checks.
8. **HashBin and QR polish.** HashBin panel with `type: notebook`, CID loads of all formats,
   QR save-first flow. Save stays disabled until registration.
9. **AI assistance.** Kit AI integration, `type.ai`, per-cell Ask/Explain/Fix, `ai-suite.json`, AI
   browser tests with a mocked provider.
10. **R kernel** (after the CSP decision). Port R Online's webR adapter, lazy start, `analyze.R`
    reactive graph for R cells, base graphics capture, `%%R` round-trips, optional R offline cache.
11. **Gallery, docs, offline packages.** Gallery notebooks with real rendered previews, docs pages,
    offline package caching, full-gallery browser runs.
12. **Canonical launch.** Owner registers the HashBin app; fill the client ID; `hashbin.org` PR for
    the `notebook` slug and AI host origin; deploy canonical; live acceptance on both origins
    (links, CID, QR upload, 360 px, offline reload, Publish approved and cancelled).

Phases 5–7 can proceed in parallel after phase 4 (they touch separate modules); phase 10 is
independent of 5–9 once phase 3 lands.

## Licensing notes

- This repo: choose a license at phase 1 (PythonOnline's lineage is under GraphvizOnline's license,
  kept as `LICENSE-graphvizonline`).
- Vendored: Fragment Kit (its license), HashBin SDK (its license), Ace (BSD), markdown-it (MIT),
  KaTeX (MIT, fonts OFL), svg-pan-zoom (BSD), Project Nayuki QR (MIT, in the kit), lz-string (MIT,
  in the kit). Pyodide (MPL-2.0) and webR (MIT; R is GPL — loaded unmodified from the CDN, not
  vendored) and packages keep their own licenses.
- The marimo compatibility subset is an original implementation of a public API; no marimo source
  is copied; marimo is Apache-2.0 and named only to describe compatibility. Format fixtures copied
  from other projects carry their licenses beside them.
- Unaffiliated with Project Jupyter, marimo, Quarto, Jupytext, Posit, DuckDB, Pyodide or the PSF;
  the README says so and the app uses its own icon.

## Risks and open items

- **webR needs CSP `'unsafe-eval'`.** Approval was given for R Online only. Options: (a) approve it
  for this app's page CSP; (b) move the R sandbox's CSP so only the opaque R frame relaxes it, if the
  SDK v0.4.0 sandbox allows a per-frame policy (to investigate in phase 10); (c) ship without R.
  **Needs the owner's decision before phase 10.**
- **webR under SDK v0.4.0.** R Online runs webR in SDK v0.3.0's sandbox; v0.4.0 compatibility must
  be proven in phase 10.
- **Python↔R data exchange** (e.g. a dataframe from Python used in R). Not in v1. Later: an explicit
  `#| export: df` / `#| import: df` option that relays Arrow IPC bytes through the page between the
  two sandboxes, participating in the reactive graph.
- **No cooperative interrupt** on GitHub Pages. The canonical host could send COOP/COEP (apptron
  precedent) to enable SharedArrayBuffer and `pyodide.setInterruptBuffer`, keeping state on Stop;
  requires the sandbox frames to be COEP-compatible. Later phase, canonical only.
- **Many Ace instances / large notebooks** on phones: mitigated by lazy creation and virtualization;
  measure in phase 2 with a 200-cell fixture.
- **marimo static analysis edge cases** (star imports, `exec`, dynamic globals): match marimo's
  documented behavior where known; otherwise report *cannot analyze* on the cell and treat it as
  defining nothing and depending on everything above it.
- **ipynb with interactive outputs** (ipywidgets, Plotly, Bokeh): shown as placeholders or static
  fallbacks. ipywidgets support (via a spec bridge like `mo.ui`) is a possible later phase.
- **Interactive charts** (Altair/Vega, Plotly): need a trusted script-capable renderer frame with
  no network and data passed by message. Later phase; v1 uses static SVG/PNG where libraries can
  produce them.
- **Persistent files** (hosted run origin) as PythonOnline's *Keep files between runs*: later, after
  registration provides the hosted origin.
- **Workflow tag `v3`** exists upstream; staying on `v2` until reviewed.
- **Owner actions**: enable GitHub Actions Pages; register the HashBin app; approve (or not) webR's
  `'unsafe-eval'`; approve the `hashbin.org` registry/AI-host PRs; choose this repo's license.

## Implementation status

2026-11-09: Implementation is underway directly on `main`, as requested by the owner (overriding the phase PR workflow). Original code is MIT. The owner explicitly chose to keep R execution disabled pending a later CSP decision; phase 10 execution is deferred, while R source cells and formats remain supported.

Foundation: Fragment Kit v0.4.3 vendored unchanged, Ace and Markdown/KaTeX vendored with licenses; Notebook Markdown model, structural editor, source view, sharing, QR, draft recovery, mobile tabs and hash-verified offline shell implemented. Parser/property and URL-state tests pass. Runtime, formats, integrations and acceptance checks are still in progress.

Runtime/formats checkpoint: persistent opaque Python kernel, linear and reactive scheduler, SQL dataframe binding, MIME output, basic IPython magics, marimo widgets/state/layouts, and all five format entry points are implemented. Node graph/format/model tests, 12 native Python tests (including real DuckDB), real Pyodide SQL/matplotlib/widget tests, browser cross-cell Python execution and upstream nbformat/Jupytext/marimo export checks pass. Format loss reports are surfaced. HashBin and AI UI integration is wired; their shared contract acceptance and full gallery/offline/deployment checks remain in progress.

Gallery/offline/integration checkpoint: all fourteen gallery notebooks have real Pyodide-rendered previews (R execution is explicitly marked disabled); fourteen guide topics plus index are generated and freshness checked. HashBin load/sniff and mocked Publish approval/cancellation/redirect, QR image scan/save-first, draft protection, atomic offline install/reload/corruption repair, source-only sharing and 44px mobile controls are covered by shared contracts. The expanded app acceptance suite passes real reactive/linear execution, SQL, widget changes, Stop/recovery, imports/exports, opaque-worker capability removal, mocked AI accept/undo/no-auto-run and 200-cell lazy editor creation. markdown-it is pinned to patched 14.3.3 (npm audit: zero advisories). Python startup's IPython dependencies join the verified core offline set; optional data/science packages have a separately verified cache. Public deploys stage only the offline allowlist.

Local Firefox cannot launch its profile in this desktop environment; Linux CI remains the Firefox acceptance gate. GitHub Pages is already configured to use Actions (verified through the GitHub API). R runtime/analysis/offline execution remain intentionally deferred by owner decision. HashBin app registration, client ID, external registry/AI origin review and live canonical Publish acceptance remain owner launch steps; no registration ID is invented.

CI correction: the first deployment gate found Python 3.12's inlined-comprehension symbol-table behavior. Module references now come from an AST visitor with explicit comprehension scopes, while nested-function globals still use symbol tables. Regression checks cover outer iterator references and disabled-cell namespace cleanup. Native Python tests: 14 passing; Node tests: 22 passing plus the opt-in real-engine test. Chromium and WebKit app acceptance pass; 24 targeted desktop/Pixel/iPhone QR, camera, draft and layout contracts pass after making QR a visible phone action.

CI packaging correction: native Python tests create interpreter-specific `__pycache__` files under the runtime source tree. Offline generation now expands its public roots into an explicit file allowlist that excludes bytecode/hidden build state, so local and Linux hashes describe the same shipped bytes. The patched marimo 0.23.9 CLI validates generated exports and replaces the initial test-only pin.

Deployment orchestration: GitHub returned internal server errors (before creating the complete job graph) on multiple nested reusable-workflow runs. Deploy now invokes the same pinned shared test.yml@v2 and kit-check.yml@v2 directly, then gates pages.yml@v2 on both jobs. PR/standalone tests keep test.yml. This removes a nesting level without bypassing unit, engine, format, gallery, browser or vendor checks. The owner confirmed HashBin is not registered and saving must remain disabled.
