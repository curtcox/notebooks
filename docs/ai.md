# AI assistance

Ask proposes edits to Notebook Markdown. You review the summary, text diff and changed cells before accepting. Settings cannot be changed by a proposal. Acceptance saves undo/history and never runs code. Reactive proposals are checked with Python dependency analysis before acceptance. Try proposal runs only after an explicit click, in a disposable opaque kernel.

AI settings support paste handoff, OpenAI, OpenRouter, Anthropic, Gemini, local and browser routes through Fragment Kit. Default budgets are zero. Provider keys are entered by the visitor into the integration UI and are not part of the notebook. Review the destination and consent before sending code.

Canonical uses the separate AI host once its allowedOrigins is configured. Recovery and localhost use direct routes. Canonical origin registration remains an owner launch action; no paid provider calls are made during automated tests.

A per-cell Ask action includes the selected cell position and bounded traceback text. Requests include the full notebook so changes can preserve context. Do not put secrets in code or prompts. Imported/proposed markup remains inert.
