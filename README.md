# Notebook Online

A build-free browser notebook editor. Source and settings travel in compressed URL fragments; execution runs in an opaque sandbox with Pyodide 314.0.7. Follow [implementation status](todo/master_plan.md#implementation-status) for progress.

Recovery: https://curtcox.github.io/notebooks/ · planned canonical: https://notebook.hashbin.page/

`npm ci`, `npm run serve`, then open http://127.0.0.1:8000/. Run `npm test`, `npm run test:python`, and `npm run test:browser`. Regenerate offline hashes with `npm run offline`; verify with `npm run check`.

Original code is MIT. Vendored components retain their licenses; lineage notices are preserved. This project is unaffiliated with Project Jupyter, marimo, Quarto, Jupytext, Posit, DuckDB, Pyodide, or the PSF.

R execution remains disabled by owner decision. HashBin saving requires app registration. Deployment uses test-gated GitHub Pages; canonical hosting and AI origin registration need the separate HashBin repository changes described in the plan.
