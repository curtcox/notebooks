# Offline use

The service worker installs an atomic, SHA-256 verified app copy. The app shell, vendors, examples, docs and pinned Python core are cached together. Offline status appears in More. Updates wait for activation; Update and reload saves a draft before switching copies.

Python startup also requires IPython and its pinned dependencies, which are part of the core offline set. Optional data/science packages can be cached through More → Make packages available offline. This includes DuckDB, pandas, Polars, Arrow, numpy and matplotlib and their pinned dependencies. Downloads may be large; the UI reports progress.

A failed offline install does not replace the previous verified copy. Reconnect and use Repair offline copy to retry. Browser storage can be evicted, so keep downloads/backups of important notebooks. Network-based Python code and packages not explicitly cached need a connection. R offline use is deferred because R execution is disabled.
