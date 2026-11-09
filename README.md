# Notebook Online

Computational notebooks in the browser, with Python, SQL and Markdown. Reactive execution follows dependencies; linear execution keeps familiar Jupyter order and counts. Python runs locally in an opaque sandbox using Pyodide 314.0.7. No backend or build step.

[Open Notebook Online](https://curtcox.github.io/notebooks/) · [Notebook guide](docs/index.md) · [Implementation evidence](todo/master_plan.md#implementation-status)

- Add, reorder and edit cells, or edit the complete Notebook Markdown source.
- Import/export Jupyter, marimo, Jupytext percent, Quarto and MyST with visible loss reports.
- Use dataframe SQL, native marimo-style widgets, rich outputs, input(), packages and basic IPython magics.
- Share source/settings in compressed URLs or QR images. Recover local drafts explicitly.
- Review AI proposals before accepting; acceptance never runs code. Provider calls are optional, with zero default budgets.
- Install a hash-verified offline copy and optionally cache science/data packages.

R source round-trips, but **R execution is disabled by owner decision**. HashBin loading works; saving requires app registration. Canonical hosting at https://notebook.hashbin.page/ and AI-host origin registration remain separate owner launch actions. See the [limits guide](docs/security.md) and [marimo compatibility table](docs/marimo.md) for the supported subset.

To develop:

```sh
npm ci
python3 -m venv .venv
.venv/bin/pip install -r tests/requirements.txt
npm run serve
```

Open http://127.0.0.1:8000/. Validate with `npm test`, `.venv/bin/python -m unittest discover -s tests`, and `TEST_PACKAGES=1 npm test`. Use `PATH="$PWD/.venv/bin:$PATH" npm run test:formats` for upstream format checks. Browser acceptance: `TEST_PACKAGES=1 FULL_GALLERY=1 npm run test:browser` (set BROWSER to firefox or webkit). Fragment Kit contracts use `FRAGMENT_KIT_BASE_URL=http://127.0.0.1:8000/ FRAGMENT_KIT_CONTRACT_CONFIG=testing-contract.config.mjs npm run test:contracts`.

After editing examples, run `node scripts/examples.mjs` and `npm run gallery`. After docs edits, run `npm run docs`. After any shipped change, run `npm run offline` and `npm run check`. Public deployment stages only verified assets via `scripts/stage.mjs`; GitHub Pages deploys only after unit, engine, format and browser checks.

Original code and examples are MIT. Vendored components retain their licenses; GraphvizOnline lineage notices are preserved. Unaffiliated with Project Jupyter, marimo, Quarto, Jupytext, Posit, DuckDB, Pyodide or the PSF.
