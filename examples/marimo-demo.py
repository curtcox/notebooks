import marimo
__generated_with = "0.23.0"
app = marimo.App()

@app.cell
def _():
    import marimo as mo
    return (mo,)

@app.cell
def _(mo):
    mo.md("## Hello from marimo")
    return

@app.cell
def _():
    x = 21
    return (x,)

@app.cell
def _(x):
    x * 2
    return

if __name__ == "__main__":
    app.run()
