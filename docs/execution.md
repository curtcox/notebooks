# Reactive and linear execution

**Reactive** is the default. A cell defines public names, and other cells depend on those names. Cells run in dependency order, regardless of visual order. A public name has one defining cell; duplicate definitions, cycles and deletion of another cell's name are errors. Names starting with `_` are local to a cell. A failed or stopped cell leaves descendants stale.

**Linear** uses one shared namespace and manual execution. Run cells in any order. Counts show execution order; outputs remain until rerun or cleared. A possibly stale hint is advisory. Imported Jupyter files start in linear mode unless their Notebook Online metadata says otherwise.

Auto-run debounces edits for 750 ms in reactive mode. Automatic batches have five seconds of execution time, excluding package loading. Manual runs have no hard timeout; use Stop for long or infinite programs. Run stale evaluates cells marked stale, idle or error.

Stop kills the worker and discards its namespace. Reactive cells become stale. Linear outputs are marked as belonging to the previous kernel. Restart and run all starts clean. Changing execution mode asks before restarting and offers to run all.

Static analysis uses Python AST and symbol tables. Star imports, exec and dynamic globals are conservative; unknown runtime changes cannot be completely inferred. Python and R have separate graphs, with R execution currently disabled.
