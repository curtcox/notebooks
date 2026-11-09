/** Notebook Markdown is deliberately total: incomplete fences remain Markdown. */
export const KINDS = ['python', 'markdown', 'sql', 'r', 'raw'];
let sequence = 0;
export const newId = () => globalThis.crypto?.randomUUID?.().replaceAll('-', '').slice(0, 12) ?? `cell${++sequence}`;
export function cell(kind = 'python', source = '', options = {}) {
  return {id: typeof options.id === 'string' ? options.id : newId(), kind, source, options: {...options}, outputs: [], status: 'idle', executionCount: null};
}
const scalar = text => { try { return JSON.parse(text); } catch { return text; } };
export function parse(source, previous = []) {
  if (typeof source !== 'string') throw Error('Notebook source must be text.');
  const lines = source.replaceAll('\r\n', '\n').split('\n');
  let frontMatter = '', start = 0;
  if (lines[0] === '---') {
    const end = lines.findIndex((line, i) => i > 0 && /^(---|\.\.\.)\s*$/.test(line));
    if (end > 0) { frontMatter = lines.slice(0, end + 1).join('\n'); start = end + 1; }
  }
  const cells = []; let markdown = [];
  const flush = (force = false) => {
    const text = markdown.join('\n').replace(/^\n+|\n+$/g, ''); markdown = [];
    if (text || force) cells.push(cell('markdown', text));
  };
  for (let i = start; i < lines.length; i++) {
    const open = /^( {0,3})(`{3,}|~{3,})\{(python|r|sql|raw)\}\s*$/.exec(lines[i]);
    if (open) {
      let end = i + 1;
      while (end < lines.length && !new RegExp(`^ {0,3}${open[2][0]}{${open[2].length},}\\s*$`).test(lines[end])) end++;
      if (end < lines.length) {
        flush(); const body = lines.slice(i + 1, end), options = {};
        while (/^#\|\s*[\w-]+:/.test(body[0] ?? '')) {
          const [, key, value] = /^#\|\s*([\w-]+):\s*(.*)$/.exec(body.shift());
          Object.defineProperty(options, key, {value: scalar(value), enumerable: true, writable: true, configurable: true});
        }
        cells.push(cell(open[3], body.join('\n'), options)); i = end; continue;
      }
    }
    // Ordinary display fences may contain apparent executable fences / cell breaks.
    const display = /^ {0,3}(`{3,}|~{3,})/.exec(lines[i]);
    if (display && !open) {
      markdown.push(lines[i]); let j = i + 1;
      for (; j < lines.length; j++) {
        markdown.push(lines[j]);
        if (new RegExp(`^ {0,3}${display[1][0]}{${display[1].length},}\\s*$`).test(lines[j])) { j++; break; }
      }
      i = j - 1; continue;
    }
    if (lines[i] === '<!-- cell -->') flush(true); else markdown.push(lines[i]);
  }
  flush();
  const used = new Set();
  cells.forEach((next, index) => {
    const old = previous.find(item => !used.has(item) && item.id === next.options.id) ?? (!next.options.id && previous[index]?.kind === next.kind && !used.has(previous[index]) ? previous[index] : null);
    if (old) { used.add(old); next.id = old.id; Object.assign(next,{metadata:old.metadata,attachments:old.attachments,originalSource:old.originalSource}); if (old.source === next.source && old.kind === next.kind) Object.assign(next, {outputs: old.outputs, status: old.status, executionCount: old.executionCount, metadata: old.metadata, attachments: old.attachments}); }
    if (cells.slice(0, index).some(item => item.id === next.id)) { next.id = newId(); next.options.id = next.id; }
  });
  return {frontMatter, cells};
}
export function serialize({frontMatter = '', cells}) {
  const parts = frontMatter ? [frontMatter] : [];
  for (let i = 0; i < cells.length; i++) {
    const item = cells[i];
    if (item.kind === 'markdown') {
      const group = [item.source];
      while (cells[i+1]?.kind === 'markdown') group.push(cells[++i].source);
      let text = group.join('\n\n<!-- cell -->\n\n');
      if (!group.at(-1).trim()) text += '\n<!-- cell -->';
      parts.push(text);
    } else {
      const longest = Math.max(2, ...(item.source.match(/`+/g) ?? []).map(run => run.length));
      const fence = '`'.repeat(longest + 1);
      const options = Object.entries(item.options ?? {}).map(([key, value]) => `#| ${key}: ${JSON.stringify(value)}`).join('\n');
      parts.push(`${fence}{${item.kind}}\n${options ? options + '\n' : ''}${item.source}\n${fence}`);
    }
  }
  return parts.join('\n\n') + (parts.length ? '\n' : '');
}
