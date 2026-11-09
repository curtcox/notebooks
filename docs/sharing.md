# Sharing, QR and HashBin

Share links contain source, execution mode, Auto-run and Program input. Outputs and secrets do not belong in links. Uncheck Run on open in the Share dialog to add `?run=0`. Shortening uses is.gd; a failed shortening request keeps the original link available.

QR shows the last saved CID when the notebook still matches it; otherwise it encodes the compressed link. Download SVG or PNG, scan with a camera after granting permission, or upload a QR image. Oversized links recommend saving to HashBin first. Arbitrary scanned text is shown inertly and never navigated automatically.

HashBin loads verify the content CID. Notebook envelopes and bare Jupyter, marimo, percent, Quarto and MyST content are sniffed. Saving is unavailable until the owner registers Notebook Online. The registered return URL must be exactly https://notebook.hashbin.page/ including its slash. The SDK handles review and approval on HashBin; this editor does not store credentials.

Drafts are local to this browser. Opening an incoming link never overwrites an earlier draft. More → Resume saved work offers explicit recovery. Editing the newly opened notebook preserves the previous draft in history. Download important work as a separate backup.
