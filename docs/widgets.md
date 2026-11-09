# Widgets

Display a widget in its own cell, then reference its value from another cell:

```python
import marimo as mo
count = mo.ui.slider(1, 20, value=5, label="Count")
count
```

```python
list(range(count.value))
```

Reactive mode reruns descendants of the defining cell after a value changes. Linear mode updates .value without rerunning code. Widgets belong to a kernel generation; controls from a stopped kernel require rerunning their cell.

Native controls: slider, range_slider, number, text, text_area, checkbox, switch, dropdown, radio, multiselect, button, run_button, date, table selection, array, dictionary, form. Text and option counts are bounded; numeric bounds are validated. Tables show at most 1,000 rows. Forms submit their child values explicitly.

Layout specs are inert data; the page creates its own controls. Unsupported kinds and oversized specs are rejected. Callbacks execute in the Python kernel. Complex nested form/container value aggregation is a limited compatibility subset, not a complete marimo UI model.
