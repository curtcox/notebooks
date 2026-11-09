# Python, packages and magics

Python 3.14.2 runs through Pyodide 314.0.7 inside an opaque worker. No Python code runs on a server. The namespace survives between cells until restart. Python files and installed packages remain in this kernel's memory; persistent browser files are outside v1.

The last expression displays its value. A trailing semicolon suppresses it. IPython.display supplies HTML, Markdown, Latex, Math, SVG, Image and JSON representation objects. display(), clear_output() and display-id updates use the app's MIME publisher. matplotlib uses Agg and captures SVG plus a 2× PNG.

Imports automatically load packages available in the pinned Pyodide release. Use `%pip install package` for compatible pure Python wheels. A PEP 723 script metadata block may declare dependencies. Browser wheels must match Pyodide; native desktop wheels do not work here.

Supported magics: `%pip install`, `%time`, `%timeit` (one bounded iteration), `%matplotlib inline`, `%%sql`, `%%html`, `%%markdown`, `%%latex`. `%%R` is represented as an R cell on format import; R cannot execute yet. Shell commands and other magics raise UsageError. This is a compatibility dispatcher, not a complete interactive IPython shell.

input() consumes and echoes lines from Program input; Run all resets the stream. Exhausted input raises EOFError. Python and installed packages can make network requests, including during auto-run.
