# Limits and security

User Python runs in a worker inside an SDK opaque sandbox, never with the editor's origin. Storage APIs and nested script/worker capabilities are removed before notebook code executes. Runtime helpers are fetched as trusted app assets. Worker generations scope pending requests, outputs and widget controls.

Text uses text nodes. User HTML is isolated in an empty-sandbox iframe with restrictive CSP. SVG is an inert image. Markdown is sanitized and KaTeX trust is disabled. JavaScript and interactive notebook MIME types are not executed. Rich iframes use a bounded height; they can scroll internally.

Documents have a 5 MiB limit. Imports above that may discard Jupyter outputs; files above 50 MiB are rejected. Text output is capped at 1 MiB / 20,000 lines per cell; large rich bundles are rejected. Automatic execution has a five-second batch limit after dependency loading. Stop discards kernel memory. Manual runs can continue until stopped.

Python code can access the network, install packages and have network side effects. Runtime packages are third-party code. Auto-run links can repeat those effects. Review untrusted notebooks and use `?run=0` when sharing examples that should not execute on open.

R execution, JavaScript chart renderers, ipywidgets, shared-origin persistent files, cross-language exchange and cooperative interruption are outside this build. The service worker and local storage use notebookonline prefixes for this project's GitHub Pages scope.
