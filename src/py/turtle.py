"""A small original, recording turtle implementation for Python Online (no Tk)."""
import math

MAX_COMMANDS = 200_000
_emit = lambda item: None
_screen = None
_default = None


def _reset(emit=None):
    global _emit, _screen, _default
    _emit = emit or (lambda item: None)
    _screen = _default = None


def _finish():
    if _screen and _screen.commands:
        _emit({'type': 'turtle', 'commands': _screen.commands, 'width': _screen.width, 'height': _screen.height})


def _unsupported(*args, **kwargs):
    raise NotImplementedError('Turtle event APIs are unavailable in Python Online. See docs/turtle.html (use loops to draw).')


class _Screen:
    def __init__(self):
        self.commands = []
        self.width, self.height = 800, 600
        self._mode, self._tracer, self._delay = 1.0, 1, 10
        self._bg = 'white'

    def record(self, command):
        if len(self.commands) >= MAX_COMMANDS:
            raise RuntimeError('Turtle command limit (200,000) reached.')
        if not self.commands:
            _emit({'type': 'turtle-start'})
        self.commands.append(command)

    def color(self, values):
        if len(values) == 1 and isinstance(values[0], str):
            return values[0]
        values = values[0] if len(values) == 1 else values
        if len(values) != 3:
            raise ValueError('Expected a color name or three RGB components.')
        if any(not 0 <= v <= self._mode for v in values):
            raise ValueError('Color components are outside colormode range.')
        return '#%02x%02x%02x' % tuple(round(v / self._mode * 255) for v in values)

    def bgcolor(self, *args):
        if not args:
            return self._bg
        self._bg = self.color(args)
        self.record({'op': 'bg', 'color': self._bg})

    def setup(self, width=800, height=600, **kwargs):
        self.width, self.height = int(width), int(height)

    def screensize(self, canvwidth=None, canvheight=None, bg=None):
        if canvwidth is None:
            return self.width, self.height
        self.setup(canvwidth, canvheight or self.height)
        if bg is not None:
            self.bgcolor(bg)

    def title(self, title):
        pass

    def tracer(self, n=None, delay=None):
        if n is None:
            return self._tracer
        self._tracer = n
        self.record({'op': 'speed', 'value': 0 if not n else 6})
        if delay is not None:
            self._delay = delay

    def delay(self, value=None):
        if value is None:
            return self._delay
        self._delay = value

    def update(self):
        pass

    def colormode(self, value=None):
        if value is None:
            return self._mode
        if value not in (1.0, 255):
            raise ValueError('colormode must be 1.0 or 255')
        self._mode = value

    onclick = onkey = onkeypress = onkeyrelease = ontimer = listen = _unsupported
    mainloop = exitonclick = bye = update


def Screen():
    global _screen
    if _screen is None:
        _screen = _Screen()
    return _screen


class Turtle:
    def __init__(self, shape='classic', visible=True):
        self.screen = Screen()
        self._x = self._y = self._heading = 0.0
        self._down, self._visible = True, visible
        self._pencolor = self._fillcolor = 'black'
        self._width, self._speed, self._shape = 1, 6, shape
        self._fill = None
        self._stamp = 0

    def _move(self, x, y):
        x, y = float(x), float(y)
        if not math.isfinite(x) or not math.isfinite(y):
            raise ValueError('Turtle coordinates must be finite.')
        if self._down:
            self.screen.record({'op': 'line', 'x1': self._x, 'y1': self._y, 'x2': x, 'y2': y, 'color': self._pencolor, 'width': self._width, 'speed': self._speed if self.screen._tracer else 0})
        if self._fill is not None:
            self._fill.append([x, y])
        self._x, self._y = x, y

    def forward(self, distance):
        angle = math.radians(self._heading)
        self._move(self._x + math.cos(angle) * distance, self._y + math.sin(angle) * distance)

    fd = forward

    def backward(self, distance):
        self.forward(-distance)

    back = bk = backward

    def left(self, angle):
        self._heading = (self._heading + angle) % 360

    lt = left

    def right(self, angle):
        self.left(-angle)

    rt = right

    def goto(self, x, y=None):
        self._move(*(x if y is None else (x, y)))

    setpos = setposition = goto

    def teleport(self, x=None, y=None, *, fill_gap=False):
        down = self._down
        self._down = False
        self._move(self._x if x is None else x, self._y if y is None else y)
        self._down = down

    def setx(self, x):
        self._move(x, self._y)

    def sety(self, y):
        self._move(self._x, y)

    def setheading(self, angle):
        self._heading = angle % 360

    seth = setheading

    def home(self):
        self.goto(0, 0)
        self.setheading(0)

    def circle(self, radius, extent=None, steps=None):
        extent = 360 if extent is None else extent
        if radius == 0:
            return
        steps = max(1, int(steps if steps is not None else max(1, abs(extent) / 6)))
        angle = extent / steps * (1 if radius >= 0 else -1)
        length = 2 * abs(radius) * math.sin(math.radians(abs(extent) / steps / 2))
        if extent < 0:
            length = -length
        self.left(angle / 2)
        for _ in range(steps):
            self.forward(length)
            self.left(angle)
        self.right(angle / 2)

    def penup(self):
        self._down = False

    pu = up = penup

    def pendown(self):
        self._down = True

    pd = down = pendown

    def pensize(self, value=None):
        if value is None:
            return self._width
        self._width = max(0, float(value))

    width = pensize

    def pencolor(self, *args):
        if not args:
            return self._pencolor
        self._pencolor = self.screen.color(args)

    def fillcolor(self, *args):
        if not args:
            return self._fillcolor
        self._fillcolor = self.screen.color(args)

    def color(self, *args):
        if not args:
            return self._pencolor, self._fillcolor
        if len(args) == 2:
            self.pencolor(args[0])
            self.fillcolor(args[1])
        else:
            self.pencolor(*args)
            self.fillcolor(*args)

    def begin_fill(self):
        self._fill = [[self._x, self._y]]
        self._fill_index = len(self.screen.commands)

    def end_fill(self):
        if self._fill is not None:
            command = {'op': 'fill', 'points': self._fill, 'color': self._fillcolor}
            self.screen.record(command)
            self.screen.commands.insert(self._fill_index, self.screen.commands.pop())
            self._fill = None

    def filling(self):
        return self._fill is not None

    def dot(self, size=None, *color):
        self.screen.record({'op': 'dot', 'x': self._x, 'y': self._y, 'size': size or max(self._width + 4, 2 * self._width), 'color': self.screen.color(color) if color else self._pencolor})

    def write(self, arg, move=False, align='left', font=('Arial', 12, 'normal')):
        self.screen.record({'op': 'text', 'x': self._x, 'y': self._y, 'text': str(arg), 'align': align, 'font': list(font), 'color': self._pencolor})
        if move:
            self.teleport(self._x + len(str(arg)) * float(font[1]) * .6, self._y)

    def stamp(self):
        self._stamp += 1
        self.screen.record({'op': 'stamp', 'id': self._stamp, 'x': self._x, 'y': self._y, 'heading': self._heading, 'shape': self._shape, 'color': self._fillcolor, 'stroke': self._pencolor})
        return self._stamp

    def speed(self, value=None):
        if value is None:
            return self._speed
        self._speed = {'fastest': 0, 'fast': 10, 'normal': 6, 'slow': 3, 'slowest': 1}.get(value, value)
        self.screen.record({'op': 'speed', 'value': self._speed})

    def shape(self, name=None):
        if name is None:
            return self._shape
        if name not in ('classic', 'arrow', 'turtle', 'circle', 'square', 'triangle'):
            raise ValueError('Unsupported turtle shape: ' + str(name))
        self._shape = name

    def hideturtle(self):
        self._visible = False

    ht = hideturtle

    def showturtle(self):
        self._visible = True

    st = showturtle

    def isvisible(self):
        return self._visible

    def position(self):
        return self._x, self._y

    pos = position

    def xcor(self):
        return self._x

    def ycor(self):
        return self._y

    def heading(self):
        return self._heading

    def towards(self, x, y=None):
        x, y = x.position() if isinstance(x, Turtle) else (x if y is None else (x, y))
        return math.degrees(math.atan2(y - self._y, x - self._x)) % 360

    def distance(self, x, y=None):
        x, y = x.position() if isinstance(x, Turtle) else (x if y is None else (x, y))
        return math.hypot(x - self._x, y - self._y)

    def isdown(self):
        return self._down

    def getscreen(self):
        return self.screen

    onclick = ondrag = onrelease = _unsupported


Pen = RawTurtle = Turtle


def _get_default():
    global _default
    if _default is None:
        _default = Turtle()
    return _default


def _bind(name):
    return lambda *args, **kwargs: getattr(_get_default(), name)(*args, **kwargs)


for _name in dir(Turtle):
    if not _name.startswith('_'):
        globals()[_name] = _bind(_name)
for _name in ('bgcolor', 'title', 'setup', 'screensize', 'tracer', 'update', 'colormode', 'delay', 'onclick', 'onkey', 'onkeypress', 'onkeyrelease', 'ontimer', 'listen'):
    globals()[_name] = (lambda name: lambda *args, **kwargs: getattr(Screen(), name)(*args, **kwargs))(_name)


def done():
    pass


mainloop = exitonclick = bye = done
