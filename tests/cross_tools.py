"""Validate actual exported bytes with the upstream format tools, not an imitation schema."""
import os
import sys
import json
import subprocess
from pathlib import Path
import nbformat
import jsonschema
import jupytext
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'src'/'py'))
import analyze
root=Path('test-results/formats')
(root/'marimo.py').unlink(missing_ok=True)
notebook=nbformat.read(root/'notebook.ipynb',as_version=4)
nbformat.validate(notebook)
jsonschema.validate(json.loads((root/'notebook.ipynb').read_text()), json.loads(Path('tests/fixtures/nbformat/nbformat.v4.5.schema.json').read_text()))
percent=jupytext.read(root/'percent.py')
assert [c.cell_type for c in percent.cells] == [c.cell_type for c in notebook.cells]
assert percent.cells[1].source == notebook.cells[1].source
cells=[{'kind':c.cell_type if c.cell_type!='code' else 'python','source':c.source,'options':{}} for c in notebook.cells]
exported=analyze.export_marimo(cells)
(root/'sample_marimo.py').write_text(exported['source'])
subprocess.run([sys.executable,'-m','marimo','check',str(root/'sample_marimo.py')],check=True)
subprocess.run([sys.executable,'-m','marimo','export','script',str(root/'sample_marimo.py'),'-o',str(root/'script.py')],check=True)
subprocess.run([sys.executable,str(root/'script.py')],check=True)
print('nbformat, Jupytext and marimo cross-tool checks passed.')
