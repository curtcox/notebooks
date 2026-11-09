# marimo compatibility

`import marimo as mo` loads an original, unaffiliated compatibility subset. It is not marimo's React frontend or its full Python API. Real marimo is used in CI to validate generated files.

| Surface | Support |
| --- | --- |
| mo.md | Markdown, including f-string values |
| mo.plain_text / as_html | Inert text / representation objects |
| hstack / vstack / callout / accordion / tabs | Data-driven layouts with native tabs and disclosure controls |
| output.append / replace / clear | Current cell output |
| stop | Stops current cell and descendants cleanly |
| sql | DuckDB over notebook dataframe names |
| state | Persistent getter/setter; changes schedule downstream reactive cells |
| ui | Native controls listed in the widgets guide |
| Unsupported APIs | Clear NotImplementedError with a guide link |

UI objects displayed directly or embedded into mo.md f-strings render as native controls. hstack/vstack arrange controls without interpreting worker-supplied HTML. Python↔R exchange, anywidget, interactive Altair/Plotly, files and chat widgets are outside this release.
