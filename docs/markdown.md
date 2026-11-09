# Notebook Markdown

The source is a Quarto-compatible subset. Text outside executable fences is Markdown. A plain Python fence is display-only; braces make it executable:

````markdown
# A result

```{python}
#| id: a-stable-id
x = 21
```

```{python}
x * 2
```
````

Supported fence kinds: python, sql, r, raw. Leading `#| key: value` lines carry cell options: id, name, output, disabled, hide-code, echo, tags. Unknown options are preserved. JSON scalars/arrays and simple text values are accepted; this is not a full YAML cell-option parser.

A line containing only `<!-- cell -->` separates adjacent Markdown cells. Incomplete fences remain Markdown. Optional YAML front matter is preserved as text. Quarto exports add `notebook-online.mode` to retain execution mode.

Markdown uses markdown-it with raw HTML disabled, an allowlist sanitizer, and KaTeX with trust disabled. Inline `$…$` and display `$$…$$` math are supported. Markdown containing raw HTML takes the isolated iframe rendering path instead of entering the editor DOM.
