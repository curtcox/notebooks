# Formats and round trips

Open supports file selection, drag-and-drop, an explicit HTTPS fetch, and HashBin content. A URL with `?open=` only suggests a download; you must click Fetch notebook. Imported code always starts with Auto-run off.

Every import/export shows a kept / converted / dropped report. These conversions are partial:

| Format | Retained | Important limits |
| --- | --- | --- |
| Jupyter nbformat 4 | Source, ids, unknown notebook/cell metadata, attachments, optional outputs | nbformat 3 must be converted first; interactive JavaScript outputs are inert |
| marimo Python | Cell bodies, function names and regenerated dependencies | AST import; raw cells dropped, R stored as disabled Python source; layout configuration omitted |
| Jupytext percent | Source, kinds, cell options, mode | IDs/function names and outputs omitted; unknown YAML header metadata is not mapped |
| Quarto | Source, cell options, front matter, mode | Outputs, Jupyter metadata and stdin omitted |
| MyST Markdown | Code-cell fences, options and cell breaks | Converted to the Notebook Markdown subset; same metadata limits as Quarto |

Jupyter imports larger than 5 MiB omit embedded outputs before normalizing source. Files above 50 MiB are rejected. Documents and links are limited to 5 MiB after normalization.

Jupyter SQL and R cells use `%%sql` / `%%R`; R-only exports use the ir kernel. Attachment images are inlined for Markdown formats and returned to attachments on Jupyter export. Unknown metadata is kept in the current editor model but does not travel in source-only share links.
