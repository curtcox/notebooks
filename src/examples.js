// Generated from examples/catalog.json and examples/*.qmd.
export const examples=[
  {
    "id": "welcome",
    "title": "Welcome to Notebook Online",
    "description": "Markdown, Python and reactive dependencies.",
    "guide": "getting-started",
    "tags": [
      "Python",
      "Reactive"
    ],
    "file": "welcome.qmd",
    "settings": {
      "mode": "reactive",
      "autorun": true,
      "stdin": ""
    },
    "src": "# Welcome to Notebook Online\n\nA little code. A notebook you can take anywhere. Change a value, then share the link.\n\n```{python}\nx = 21\n```\n\n```{python}\nx * 2\n```\n\n## Follow the dependencies\n\n**Reactive** mode follows names, even when cells are out of order. **Linear** mode runs cells when you ask.\n"
  },
  {
    "id": "slider-plot",
    "title": "A slider, a curve",
    "description": "A native slider drives a matplotlib figure.",
    "guide": "widgets",
    "tags": [
      "Python",
      "Widgets"
    ],
    "file": "slider-plot.qmd",
    "settings": {
      "mode": "reactive",
      "autorun": true,
      "stdin": ""
    },
    "src": "# A slider, a curve\n\nChange the frequency. Cells that use the slider rerun automatically.\n\n```{python}\nimport marimo as mo\nfrequency = mo.ui.slider(1, 10, value=3, label=\"Frequency\")\nfrequency\n```\n\n```{python}\nimport numpy as np\nimport matplotlib.pyplot as plt\nx = np.linspace(0, 2 * np.pi, 150)\nplt.plot(x, np.sin(frequency.value * x), color=\"#225b50\")\nplt.title(f\"Frequency: {frequency.value}\")\nplt.show()\n```\n"
  },
  {
    "id": "linear",
    "title": "Execution order matters",
    "description": "Manual execution counts, shared state and restart.",
    "guide": "execution",
    "tags": [
      "Python",
      "Linear"
    ],
    "file": "linear.qmd",
    "settings": {
      "mode": "linear",
      "autorun": false,
      "stdin": ""
    },
    "src": "---\nnotebook-online:\n  mode: linear\n---\n\n# Execution order matters\n\nRun cells in any order. Try running the second cell twice. Use Restart and run all to return to a clean state.\n\n```{python}\ncount = 0\n```\n\n```{python}\ncount += 1\ncount\n```\n"
  },
  {
    "id": "pandas",
    "title": "A small data exploration",
    "description": "Explore a pandas table and summary statistics.",
    "guide": "python",
    "tags": [
      "Python",
      "Data"
    ],
    "file": "pandas.qmd",
    "settings": {
      "mode": "reactive",
      "autorun": true,
      "stdin": ""
    },
    "src": "# A small data exploration\n\nA dataframe is available to Python and SQL in the same kernel.\n\n```{python}\nimport pandas as pd\nsales = pd.DataFrame({\"fruit\": [\"apples\", \"pears\", \"plums\"], \"sold\": [12, 8, 15]})\nsales\n```\n\n```{python}\nsales.describe()\n```\n"
  },
  {
    "id": "sql",
    "title": "SQL meets Python",
    "description": "Query a Python dataframe with DuckDB, then plot it.",
    "guide": "sql",
    "tags": [
      "Python",
      "SQL"
    ],
    "file": "sql.qmd",
    "settings": {
      "mode": "reactive",
      "autorun": true,
      "stdin": ""
    },
    "src": "# SQL meets Python\n\nThe SQL result is bound to a Python name with the output option.\n\n```{python}\nimport pandas as pd\norders = pd.DataFrame({\"city\": [\"Austin\", \"Austin\", \"Chicago\"], \"amount\": [18, 12, 40]})\n```\n\n```{sql}\n#| output: totals\nselect city, sum(amount) as total from orders group by city order by city\n```\n\n```{python}\nimport matplotlib.pyplot as plt\nplt.bar(totals[\"city\"], totals[\"total\"], color=\"#225b50\")\nplt.show()\n```\n"
  },
  {
    "id": "polars",
    "title": "A SQL join with Polars",
    "description": "Join two Polars frames through DuckDB.",
    "guide": "sql",
    "tags": [
      "Python",
      "SQL",
      "Data"
    ],
    "file": "polars.qmd",
    "settings": {
      "mode": "reactive",
      "autorun": true,
      "stdin": ""
    },
    "src": "# A SQL join with Polars\n\nDuckDB reads registered pandas, Polars and Arrow tables.\n\n```{python}\nimport polars as pl\npeople = pl.DataFrame({\"id\": [1, 2], \"name\": [\"Ada\", \"Grace\"]})\nresults = pl.DataFrame({\"id\": [1, 2], \"score\": [95, 98]})\n```\n\n```{sql}\n#| output: joined\nselect name, score from people join results using(id) order by name\n```\n"
  },
  {
    "id": "form",
    "title": "Choose a table slice",
    "description": "A submitted form filters a dataframe.",
    "guide": "widgets",
    "tags": [
      "Python",
      "Widgets"
    ],
    "file": "form.qmd",
    "settings": {
      "mode": "reactive",
      "autorun": true,
      "stdin": ""
    },
    "src": "# Choose a table slice\n\nChoose a fruit and submit. Widgets use native controls; worker HTML is never inserted into the editor.\n\n```{python}\nimport marimo as mo\nchoice = mo.ui.dropdown([\"apple\", \"pear\", \"plum\"], value=\"pear\", label=\"Fruit\")\nchoice.form()\n```\n\n```{python}\nimport pandas as pd\nfruit = pd.DataFrame({\"name\": [\"apple\", \"pear\", \"plum\"], \"price\": [2, 3, 4]})\nfruit[fruit[\"name\"] == choice.value]\n```\n"
  },
  {
    "id": "math",
    "title": "Words, tables and equations",
    "description": "Markdown and KaTeX without executable markup.",
    "guide": "markdown",
    "tags": [
      "Markdown"
    ],
    "file": "math.qmd",
    "settings": {
      "mode": "reactive",
      "autorun": true,
      "stdin": ""
    },
    "src": "# Words, tables and equations\n\nInline math: $e^{i\\pi} + 1 = 0$.\n\n$$\n\\int_0^1 x^2\\,dx = \\frac{1}{3}\n$$\n\n| Cell | Purpose |\n| --- | --- |\n| Markdown | Explain the idea |\n| Python | Compute the result |\n| SQL | Query a table |\n\n> A notebook is an argument with executable evidence.\n\n```python\n# A plain fence is display-only.\nprint(\"This does not run\")\n```\n"
  },
  {
    "id": "r-summary",
    "title": "R data and graphics",
    "description": "R source is retained; execution awaits CSP approval.",
    "guide": "r",
    "tags": [
      "R"
    ],
    "file": "r-summary.qmd",
    "settings": {
      "mode": "reactive",
      "autorun": true,
      "stdin": ""
    },
    "src": "# R data and graphics\n\nR execution is disabled by the owner in this build. Source still imports and exports without being executed.\n\n```{r}\nvalues <- data.frame(x = 1:5, y = c(2, 4, 5, 8, 11))\nsummary(values)\nplot(values$x, values$y, type = \"b\")\n```\n"
  },
  {
    "id": "two-languages",
    "title": "Two languages, two namespaces",
    "description": "Python runs; R is preserved pending approval.",
    "guide": "r",
    "tags": [
      "Python",
      "R"
    ],
    "file": "two-languages.qmd",
    "settings": {
      "mode": "reactive",
      "autorun": true,
      "stdin": ""
    },
    "src": "# Two languages, two namespaces\n\nPython and R have separate namespaces. There is no implicit data exchange. R execution is disabled in this build.\n\n```{python}\nmessage = \"Hello from Python\"\nmessage\n```\n\n```{r}\nmessage <- \"Hello from R\"\nmessage\n```\n"
  },
  {
    "id": "jupyter",
    "title": "From a Jupyter notebook",
    "description": "An imported fixture with a retained output.",
    "guide": "formats",
    "tags": [
      "Formats",
      "Linear"
    ],
    "file": "jupyter.qmd",
    "settings": {
      "mode": "linear",
      "autorun": false,
      "stdin": ""
    },
    "src": "---\nnotebook-online:\n  mode: linear\n---\n\n# From a Jupyter notebook\n\nOpen the .ipynb fixture from examples/jupyter.ipynb to inspect imported outputs. Downloads support current outputs; share links contain source and settings only.\n\n```{python}\n#| id: jupyter-cell\nsum([1, 2, 3])\n```\n"
  },
  {
    "id": "marimo",
    "title": "From a marimo notebook",
    "description": "A portable dependency-driven notebook.",
    "guide": "marimo",
    "tags": [
      "Formats",
      "Reactive"
    ],
    "file": "marimo.qmd",
    "settings": {
      "mode": "reactive",
      "autorun": true,
      "stdin": ""
    },
    "src": "# From a marimo notebook\n\nOpen examples/marimo-demo.py to try AST-based import. The compatibility module implements a documented subset of marimo.\n\n```{python}\nimport marimo as mo\nmo.md(\"## Hello from the compatibility subset\")\n```\n"
  },
  {
    "id": "autodiff",
    "title": "A tiny differentiation engine",
    "description": "Build a small computational graph and backpropagate.",
    "guide": "python",
    "tags": [
      "Python",
      "Learning"
    ],
    "file": "autodiff.qmd",
    "settings": {
      "mode": "reactive",
      "autorun": true,
      "stdin": ""
    },
    "src": "# A tiny differentiation engine\n\nAn original, minimal reverse-mode autodiff example inspired by micrograd. Each operation remembers its local derivative.\n\n```{python}\nimport math\nclass Value:\n    def __init__(self, data, parents=()):\n        self.data, self.grad, self.parents = data, 0.0, parents\n    def __add__(self, other):\n        other = other if isinstance(other, Value) else Value(other)\n        return Value(self.data + other.data, ((self, 1.0), (other, 1.0)))\n    def __mul__(self, other):\n        other = other if isinstance(other, Value) else Value(other)\n        return Value(self.data * other.data, ((self, other.data), (other, self.data)))\n    def backward(self):\n        order, seen = [], set()\n        def visit(node):\n            if node in seen:\n                return\n            seen.add(node)\n            for parent, _ in node.parents:\n                visit(parent)\n            order.append(node)\n        visit(self)\n        self.grad = 1.0\n        for node in reversed(order):\n            for parent, derivative in node.parents:\n                parent.grad += derivative * node.grad\n```\n\n```{python}\nx = Value(3)\ny = x * x + x\n# y = x² + x; dy/dx = 2x + 1\ny.backward()\nprint(f\"y = {y.data}; dy/dx = {x.grad}\")\n```\n"
  },
  {
    "id": "input",
    "title": "Input, one line at a time",
    "description": "Provide lines to Python input() and share them.",
    "guide": "python",
    "tags": [
      "Python",
      "Input"
    ],
    "file": "input.qmd",
    "settings": {
      "mode": "reactive",
      "autorun": true,
      "stdin": "Ada\n21\n"
    },
    "src": "# Input, one line at a time\n\nOpen the Input tab, or the Program input panel below the notebook. Input is carried in share links and .ipynb metadata.\n\n```{python}\nname = input(\"Name: \")\nnumber = int(input(\"Number: \"))\nprint(f\"Hello, {name}. Twice your number is {number * 2}.\")\n```\n"
  }
];
