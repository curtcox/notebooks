# SQL cells

SQL uses DuckDB 1.5.1 inside the Python worker. It loads on demand with pandas; there is no separate SQL worker. One in-memory connection survives across cells.

A SQL cell can query pandas, Polars and Arrow objects by their Python names. Its result is a pandas dataframe. Set an output option to make the result available to other Python cells:

````markdown
```{sql}
#| output: totals
select city, sum(amount) as total
from orders
group by city
```
````

Without an output name, the result uses `_df`. In reactive mode, explicit public output names define graph dependencies. SQL references are conservatively inferred from identifiers matching notebook names. Name matching in string literals/comments may overapproximate dependencies.

Python cells may use %%sql or mo.sql(). An explicit SQL cell with an output option gives the analyzer the clearest dependency information. DuckDB databases and files live in kernel memory and are discarded on restart.
