# Notebook Online

Build-free static browser notebook app. The owner requests direct commits and pushes on main.

## Contracts

- Follow todo/master_plan.md. Keep implementation status honest; owner setup and external deployments are separate from implementation.
- Fragment Kit v0.4.3 is immutable. Verify its manifest; shared CI workflows stay @v2.
- Pyodide 314.0.7 runs only in a worker inside the SDK v0.4.0 opaque sandbox. No user code in an editor-origin worker. Hide inherited storage, script and nested worker APIs before user code. Stop kills the kernel; ignore messages from prior generations.
- Preserve Python namespace between cells. Reactive edits debounce 750 ms. Automatic execution is limited to five seconds after package loading. Manual execution offers Stop.
- Text uses textContent. User HTML uses empty-sandbox iframes with restrictive CSP; SVG uses inert images. Widgets are validated specs rendered by trusted code.
- R execution is disabled by explicit owner decision (2026-11-09). Do not add unsafe-eval. Keep R sources and format round trips.
- Imports never auto-run. AI acceptance never auto-runs. Incoming links never silently overwrite existing drafts. Sharing and HashBin save source/settings only.
- HashBin client ID remains empty until registration. No credentials on this shared origin. Canonical return URL: https://notebook.hashbin.page/ (exact).
- Prefix storage and caches notebookonline. Offline assets are atomically hash verified; never change vendor pins in place.
- Original code is MIT by owner decision. Preserve vendor and lineage licenses.

## Checks

Run npm test, npm run test:python, npm run test:browser (BROWSER=firefox/webkit as needed).
TEST_PACKAGES=1 npm test exercises the pinned Python runtime. npm run test:formats checks real format tools.
After shipped changes: npm run docs, npm run gallery when examples change, npm run offline, npm run check.
Never claim deployment without checking the workflow and live page.
