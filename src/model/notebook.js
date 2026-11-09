import {parse, serialize, cell, KINDS} from './notebook-markdown.js';
export const MAX_BYTES = 5 * 1024 * 1024;
export function normalize(value) {
  if (typeof value?.src !== 'string') throw Error('Notebook source must be text.');
  const settings = value.notebook ?? {}, mode = settings.mode ?? 'reactive';
  if (!['reactive', 'linear'].includes(mode)) throw Error('Mode must be reactive or linear.');
  if (settings.stdin != null && typeof settings.stdin !== 'string') throw Error('Program input must be text.');
  if (settings.autorun != null && typeof settings.autorun !== 'boolean') throw Error('Auto-run must be true or false.');
  const doc = {src: value.src, notebook: {mode, autorun: settings.autorun ?? mode === 'reactive', stdin: settings.stdin ?? ''}};
  if (new TextEncoder().encode(JSON.stringify(doc)).length > MAX_BYTES) throw Error('Notebook exceeds the 5 MiB limit.');
  return doc;
}
export class Notebook {
  constructor(doc = {src: ''}) { this.revision = 0; this.undoStack = []; this.load(doc); }
  load(doc) { const normalized = normalize(doc); Object.assign(this, parse(normalized.src), {settings: normalized.notebook, metadata: {}}); this.revision++; }
  snapshot() { return normalize({src: serialize(this), notebook: {...this.settings}}); }
  editSource(source) { Object.assign(this, parse(source, this.cells)); this.revision++; }
  saveUndo() { this.undoStack.push({cells: structuredClone(this.cells), frontMatter: this.frontMatter}); if (this.undoStack.length > 100) this.undoStack.shift(); }
  undo() { const previous = this.undoStack.pop(); if (previous) { Object.assign(this, previous); this.revision++; } }
  insert(index, kind = 'python') { this.saveUndo(); const next = cell(kind); this.cells.splice(index, 0, next); this.revision++; return next; }
  remove(id) { this.saveUndo(); this.cells = this.cells.filter(item => item.id !== id); this.revision++; }
  move(id, delta) { const i = this.cells.findIndex(item => item.id === id), j = Math.max(0, Math.min(this.cells.length - 1, i + delta)); if (i < 0 || i === j) return; this.saveUndo(); const [item] = this.cells.splice(i, 1); this.cells.splice(j, 0, item); this.revision++; }
  duplicate(id) { const i = this.cells.findIndex(item => item.id === id); if (i < 0) return; this.saveUndo(); const item = this.cells[i], copy = cell(item.kind, item.source, {...item.options}); delete copy.options.id; copy.id = cell().id; this.cells.splice(i + 1, 0, copy); this.revision++; return copy; }
  setKind(id, kind) { if (!KINDS.includes(kind)) throw Error('Unknown cell kind.'); this.saveUndo(); const item = this.cells.find(item => item.id === id); item.kind = kind; item.outputs = []; item.status = 'stale'; this.revision++; }
}
