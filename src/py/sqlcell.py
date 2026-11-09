"""One DuckDB connection per Python kernel; explicit dataframe registration avoids frame-lookup surprises."""
import re
_connection = None


def run(query, namespace, output='_df'):
    global _connection
    import duckdb
    if not isinstance(output, str) or not output.isidentifier():
        raise ValueError('SQL output must be a Python variable name.')
    if _connection is None:
        _connection = duckdb.connect(':memory:')
    registered = []
    try:
        identifiers = set(re.findall(r'\b[A-Za-z_]\w*\b', query))
        for name in identifiers:
            value = namespace.get(name)
            if value is not None and (value.__class__.__module__.startswith(('pandas', 'polars', 'pyarrow'))):
                _connection.register(name, value)
                registered.append(name)
        result = _connection.execute(query)
        frame = result.df() if result.description else None
        namespace[output] = frame
        return frame
    finally:
        for name in registered:
            _connection.unregister(name)
