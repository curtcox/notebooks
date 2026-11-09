# R cells

R execution is disabled by the owner's decision on 2026-11-09. webR requires a CSP unsafe-eval allowance that has not been approved for this app. No such allowance is added.

R cells can be edited, shared, imported and exported. Run shows “R requires approval in this build.” R-only Jupyter exports use the ir kernelspec; mixed notebooks use %%R. marimo exports retain R as a disabled Python string and report the conversion.

The planned webR 0.6.0 adapter and R dependency analysis remain deferred. Python and R will have separate namespaces; Python↔R dataframe exchange is outside v1. R package offline caching is also deferred with the runtime.
