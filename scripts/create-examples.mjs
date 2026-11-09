import fs from 'node:fs/promises';
const entries=[
 ['welcome','Welcome to Notebook Online','Markdown, Python and reactive dependencies.','getting-started',['Python','Reactive'],`# Welcome to Notebook Online

A little code. A notebook you can take anywhere. Change a value, then share the link.

\`\`\`{python}
x = 21
\`\`\`

\`\`\`{python}
x * 2
\`\`\`

## Follow the dependencies

**Reactive** mode follows names, even when cells are out of order. **Linear** mode runs cells when you ask.
`],
 ['slider-plot','A slider, a curve','A native slider drives a matplotlib figure.','widgets',['Python','Widgets'],`# A slider, a curve

Change the frequency. Cells that use the slider rerun automatically.

\`\`\`{python}
import marimo as mo
frequency = mo.ui.slider(1, 10, value=3, label="Frequency")
frequency
\`\`\`

\`\`\`{python}
import numpy as np
import matplotlib.pyplot as plt
x = np.linspace(0, 2 * np.pi, 150)
plt.plot(x, np.sin(frequency.value * x), color="#225b50")
plt.title(f"Frequency: {frequency.value}")
plt.show()
\`\`\`
`],
 ['linear','Execution order matters','Manual execution counts, shared state and restart.','execution',['Python','Linear'],`---
notebook-online:
  mode: linear
---

# Execution order matters

Run cells in any order. Try running the second cell twice. Use Restart and run all to return to a clean state.

\`\`\`{python}
count = 0
\`\`\`

\`\`\`{python}
count += 1
count
\`\`\`
`],
 ['pandas','A small data exploration','Explore a pandas table and summary statistics.','python',['Python','Data'],`# A small data exploration

A dataframe is available to Python and SQL in the same kernel.

\`\`\`{python}
import pandas as pd
sales = pd.DataFrame({"fruit": ["apples", "pears", "plums"], "sold": [12, 8, 15]})
sales
\`\`\`

\`\`\`{python}
sales.describe()
\`\`\`
`],
 ['sql','SQL meets Python','Query a Python dataframe with DuckDB, then plot it.','sql',['Python','SQL'],`# SQL meets Python

The SQL result is bound to a Python name with the output option.

\`\`\`{python}
import pandas as pd
orders = pd.DataFrame({"city": ["Austin", "Austin", "Chicago"], "amount": [18, 12, 40]})
\`\`\`

\`\`\`{sql}
#| output: totals
select city, sum(amount) as total from orders group by city order by city
\`\`\`

\`\`\`{python}
import matplotlib.pyplot as plt
plt.bar(totals["city"], totals["total"], color="#225b50")
plt.show()
\`\`\`
`],
 ['polars','A SQL join with Polars','Join two Polars frames through DuckDB.','sql',['Python','SQL','Data'],`# A SQL join with Polars

DuckDB reads registered pandas, Polars and Arrow tables.

\`\`\`{python}
import polars as pl
people = pl.DataFrame({"id": [1, 2], "name": ["Ada", "Grace"]})
results = pl.DataFrame({"id": [1, 2], "score": [95, 98]})
\`\`\`

\`\`\`{sql}
#| output: joined
select name, score from people join results using(id) order by name
\`\`\`
`],
 ['form','Choose a table slice','A submitted form filters a dataframe.','widgets',['Python','Widgets'],`# Choose a table slice

Choose a fruit and submit. Widgets use native controls; worker HTML is never inserted into the editor.

\`\`\`{python}
import marimo as mo
choice = mo.ui.dropdown(["apple", "pear", "plum"], value="pear", label="Fruit")
choice.form()
\`\`\`

\`\`\`{python}
import pandas as pd
fruit = pd.DataFrame({"name": ["apple", "pear", "plum"], "price": [2, 3, 4]})
fruit[fruit["name"] == choice.value]
\`\`\`
`],
 ['math','Words, tables and equations','Markdown and KaTeX without executable markup.','markdown',['Markdown'],`# Words, tables and equations

Inline math: $e^{i\\pi} + 1 = 0$.

$$
\\int_0^1 x^2\\,dx = \\frac{1}{3}
$$

| Cell | Purpose |
| --- | --- |
| Markdown | Explain the idea |
| Python | Compute the result |
| SQL | Query a table |

> A notebook is an argument with executable evidence.

\`\`\`python
# A plain fence is display-only.
print("This does not run")
\`\`\`
`],
 ['r-summary','R data and graphics','R source is retained; execution awaits CSP approval.','r',['R'],`# R data and graphics

R execution is disabled by the owner in this build. Source still imports and exports without being executed.

\`\`\`{r}
values <- data.frame(x = 1:5, y = c(2, 4, 5, 8, 11))
summary(values)
plot(values$x, values$y, type = "b")
\`\`\`
`],
 ['two-languages','Two languages, two namespaces','Python runs; R is preserved pending approval.','r',['Python','R'],`# Two languages, two namespaces

Python and R have separate namespaces. There is no implicit data exchange. R execution is disabled in this build.

\`\`\`{python}
message = "Hello from Python"
message
\`\`\`

\`\`\`{r}
message <- "Hello from R"
message
\`\`\`
`],
 ['jupyter','From a Jupyter notebook','An imported fixture with a retained output.','formats',['Formats','Linear'],`---
notebook-online:
  mode: linear
---

# From a Jupyter notebook

Open the .ipynb fixture from examples/jupyter.ipynb to inspect imported outputs. Downloads support current outputs; share links contain source and settings only.

\`\`\`{python}
#| id: jupyter-cell
sum([1, 2, 3])
\`\`\`
`],
 ['marimo','From a marimo notebook','A portable dependency-driven notebook.','marimo',['Formats','Reactive'],`# From a marimo notebook

Open examples/marimo-demo.py to try AST-based import. The compatibility module implements a documented subset of marimo.

\`\`\`{python}
import marimo as mo
mo.md("## Hello from the compatibility subset")
\`\`\`
`],
 ['autodiff','A tiny differentiation engine','Build a small computational graph and backpropagate.','python',['Python','Learning'],`# A tiny differentiation engine

An original, minimal reverse-mode autodiff example inspired by micrograd. Each operation remembers its local derivative.

\`\`\`{python}
import math
class Value:
    def __init__(self, data, parents=()):
        self.data, self.grad, self.parents = data, 0.0, parents
    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        return Value(self.data + other.data, ((self, 1.0), (other, 1.0)))
    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        return Value(self.data * other.data, ((self, other.data), (other, self.data)))
    def backward(self):
        order, seen = [], set()
        def visit(node):
            if node in seen:
                return
            seen.add(node)
            for parent, _ in node.parents:
                visit(parent)
            order.append(node)
        visit(self)
        self.grad = 1.0
        for node in reversed(order):
            for parent, derivative in node.parents:
                parent.grad += derivative * node.grad
\`\`\`

\`\`\`{python}
x = Value(3)
y = x * x + x
# y = x² + x; dy/dx = 2x + 1
y.backward()
print(f"y = {y.data}; dy/dx = {x.grad}")
\`\`\`
`],
 ['input','Input, one line at a time','Provide lines to Python input() and share them.','python',['Python','Input'],`# Input, one line at a time

Open the Input tab, or the Program input panel below the notebook. Input is carried in share links and .ipynb metadata.

\`\`\`{python}
name = input("Name: ")
number = int(input("Number: "))
print(f"Hello, {name}. Twice your number is {number * 2}.")
\`\`\`
`]
];
await fs.mkdir('examples',{recursive:true});const catalog=[];
for(const [id,title,description,guide,tags,src]of entries){await fs.writeFile(`examples/${id}.qmd`,src);catalog.push({id,title,description,guide,tags,file:id+'.qmd',settings:{mode:tags.includes('Linear')?'linear':'reactive',autorun:!tags.includes('Linear'),stdin:id==='input'?'Ada\n21\n':''}});}
await fs.writeFile('examples/catalog.json',JSON.stringify(catalog,null,2)+'\n');
