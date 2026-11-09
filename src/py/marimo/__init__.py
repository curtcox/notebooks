"""Original, deliberately bounded compatibility subset of marimo's public Python API."""
import html
import json
import types
from datetime import date as _date

MIME = 'application/vnd.notebook-online.widget+json'
__version__ = '0.23.0-notebook-online'
_cell, _index = '', 0
_emit = lambda item: None
_widgets, _values, _states = {}, {}, {}


class Stop(BaseException):
    pass


def _begin(cell_id, emit):
    global _cell, _index, _emit
    _cell, _index, _emit = cell_id, 0, emit


def _id():
    global _index
    _index += 1
    return f'{_cell}:{_index}'


class Rich:
    def __init__(self, text='', kind='markdown', children=None, label=''):
        self.text, self.kind, self.children, self.label = str(text), kind, children or [], label
    def _repr_mimebundle_(self, **kwargs):
        if self.kind == 'markdown':
            return {'text/markdown': self.text}
        if self.kind == 'html':
            return {'text/html': self.text}
        return {MIME: {'kind': self.kind, 'children': [_spec(c) for c in self.children], 'label': str(self.label)}}
    def __str__(self):
        return self.text


def _spec(obj):
    if isinstance(obj, Widget):
        return obj.spec()
    if isinstance(obj, Rich):
        bundle = obj._repr_mimebundle_()
        if MIME in bundle:
            return bundle[MIME]
        return {'kind': 'markdown' if obj.kind == 'markdown' else 'html', 'text': obj.text}
    return {'kind': 'text', 'text': str(obj)}


class Widget:
    def __init__(self, kind, value=None, label='', start=None, stop=None, step=None, options=None, on_change=None, on_click=None, children=None, **kwargs):
        self.id, self.kind, self.label = _id(), kind, str(label or '')
        self.start, self.stop, self.step = start, stop, step
        self.options = options if options is not None else []
        self.children = children or []
        self.on_change, self.on_click = on_change, on_click
        self._owner = _cell
        self._initial = value
        self.value = _values.get(self.id, value)
        _widgets[self.id] = self
    def spec(self):
        return {'kind': self.kind, 'id': self.id, 'label': self.label, 'value': self.value, 'min': self.start, 'max': self.stop, 'step': self.step, 'options': list(self.options) if not isinstance(self.options, dict) else list(self.options.keys()), 'children': [_spec(c) for c in self.children]}
    def _repr_mimebundle_(self, **kwargs):
        return {MIME: self.spec()}
    def __str__(self):
        # A Markdown value cannot smuggle widget HTML into the editor DOM.
        return f'[{self.label or self.kind}: {self.value}]'
    def form(self, submit_button_label='Submit', **kwargs):
        return Widget('form', value=self.value, label=submit_button_label, children=[self])


def _set_value(widget_id, value):
    widget = _widgets.get(widget_id)
    if widget is None:
        raise ValueError('Widget belongs to an inactive kernel.')
    if widget.kind in ('slider', 'number'):
        if not isinstance(value, (int, float)) or isinstance(value, bool) or (widget.start is not None and value < widget.start) or (widget.stop is not None and value > widget.stop):
            raise ValueError('Widget value is outside its bounds.')
    elif widget.kind in ('checkbox', 'switch', 'run_button') and not isinstance(value, bool):
        raise ValueError('Widget requires a boolean.')
    elif widget.kind in ('text', 'text_area', 'date') and (not isinstance(value, str) or len(value) > 65536):
        raise ValueError('Widget text is too long.')
    elif widget.kind in ('dropdown', 'radio') and value not in widget.options:
        raise ValueError('Unknown widget option.')
    elif widget.kind == 'multiselect' and (not isinstance(value, list) or any(v not in widget.options for v in value)):
        raise ValueError('Unknown widget options.')
    elif widget.kind == 'range_slider' and (not isinstance(value, list) or len(value) != 2 or any(not isinstance(v,(int,float)) or v < widget.start or v > widget.stop for v in value) or value[0] > value[1]):
        raise ValueError('Invalid range.')
    widget.value = value
    _values[widget_id] = value
    if widget.on_change:
        widget.on_change(value)
    if widget.on_click:
        result = widget.on_click(value)
        if result is not None:
            widget.value = result
    return widget._owner


class UI:
    def slider(self, start=0, stop=100, step=1, value=None, **kw):
        return Widget('slider', start if value is None else value, start=start, stop=stop, step=step, **kw)
    def range_slider(self, start=0, stop=100, step=1, value=None, **kw):
        return Widget('range_slider', [start, stop] if value is None else list(value), start=start, stop=stop, step=step, **kw)
    def number(self, start=None, stop=None, step=1, value=0, **kw):
        return Widget('number', value, start=start, stop=stop, step=step, **kw)
    def text(self, value='', **kw):
        return Widget('text', value, **kw)
    def text_area(self, value='', **kw):
        return Widget('text_area', value, **kw)
    def checkbox(self, value=False, **kw):
        return Widget('checkbox', value, **kw)
    switch = checkbox
    def dropdown(self, options, value=None, **kw):
        return Widget('dropdown', next(iter(options), None) if value is None else value, options=options, **kw)
    def radio(self, options, value=None, **kw):
        return Widget('radio', next(iter(options), None) if value is None else value, options=options, **kw)
    def multiselect(self, options, value=None, **kw):
        return Widget('multiselect', value or [], options=options, **kw)
    def button(self, value=0, **kw):
        return Widget('button', value, **kw)
    def run_button(self, **kw):
        return Widget('run_button', False, **kw)
    def date(self, value=None, **kw):
        return Widget('date', str(value or _date.today()), **kw)
    def table(self, data, **kw):
        # Selection is a list of row indices; data is represented inertly.
        records = data.to_dict(orient='records') if hasattr(data, 'to_dict') else list(data)
        return Widget('table', [], options=[json.dumps(row, default=str) for row in records[:1000]], **kw)
    def array(self, elements, **kw):
        return Widget('array', [e.value for e in elements], children=elements, **kw)
    def dictionary(self, elements, **kw):
        return Widget('dictionary', {k:v.value for k,v in elements.items()}, children=list(elements.values()), options=list(elements), **kw)
    def form(self, element, **kw):
        return element.form(**kw)
    def __getattr__(self, name):
        raise NotImplementedError(f'mo.ui.{name} is not supported in Notebook Online. See docs/marimo.html.')
ui = UI()


def md(text):
    return Rich(text)

def plain_text(text):
    return Rich(f'<pre>{html.escape(str(text))}</pre>', 'html')

def as_html(value):
    return value if hasattr(value, '_repr_mimebundle_') else plain_text(value)

def hstack(items, **kwargs):
    return Rich(kind='hstack', children=list(items))

def vstack(items, **kwargs):
    return Rich(kind='vstack', children=list(items))

def callout(value, kind='info'):
    return Rich(kind='callout', children=[value], label=kind)

def accordion(items, **kwargs):
    return Rich(kind='accordion', children=list(items.values()), label=' · '.join(items))

def tabs(items, **kwargs):
    return Rich(kind='tabs', children=list(items.values()), label=' · '.join(items))

def stop(condition, output=None):
    if condition:
        if output is not None:
            import nbruntime
            nbruntime.display(output)
        raise Stop()

def sql(query, output=True, **kwargs):
    import nbruntime
    import sqlcell
    return sqlcell.run(query, nbruntime.namespace)

def state(value):
    key = _id()
    _states.setdefault(key, value)
    owner = _cell
    def get():
        return _states[key]
    def set_(new):
        _states[key] = new(_states[key]) if callable(new) else new
        _emit({'output_type':'state_change','owner':owner})
    return get, set_

class Output:
    def replace(self, value):
        self.clear()
        self.append(value)
    def append(self, value):
        import nbruntime
        nbruntime.display(value)
    def clear(self):
        _emit({'output_type':'clear_output'})
output = Output()

def __getattr__(name):
    raise NotImplementedError(f'mo.{name} is not supported in Notebook Online. See docs/marimo.html.')
