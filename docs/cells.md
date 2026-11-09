# Cells and keyboard

Each cell has a kind, a run action, status and an actions menu. The menu moves, duplicates, deletes, disables and hides code. It also runs all cells above or below, clears output and inserts above. Undo structure restores inserts, deletes, moves and kind changes. Ace maintains each mounted editor's text undo history.

In command mode (focus the cell border):

| Shortcut | Action |
| --- | --- |
| Enter / Escape | Edit / return to command mode |
| Ctrl/Cmd+Enter | Run cell |
| Shift+Enter | Run and advance |
| Alt+Enter | Run and insert |
| A / B | Insert above / below |
| D D | Delete |
| M / Y | Markdown / Python |
| Z | Undo structure |
| ↑ / ↓ | Select previous / next cell |

On phones, Notebook / Outline / Input tabs select the workspace. Cell editors are created near the viewport and released when far away in larger notebooks. Markdown headings populate the outline. Program input appears below the notebook on larger screens.
