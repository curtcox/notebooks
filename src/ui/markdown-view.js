const ALLOWED = new Set('p br hr h1 h2 h3 h4 h5 h6 blockquote pre code em strong s ul ol li a img table thead tbody tr th td span div sup sub'.split(' '));
const ATTRS = new Set(['href','src','alt','title','class','colspan','rowspan','start','aria-hidden','style']);
export function safeURL(value, image = false) {
  return image ? /^(https:\/\/|data:image\/(?:png|jpeg|gif|webp);base64,|blob:)/i.test(value) : /^(https?:\/\/|mailto:|#)/i.test(value);
}
export function sanitize(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const el of [...doc.body.querySelectorAll('*')]) {
    if (!ALLOWED.has(el.localName)) { el.replaceWith(doc.createTextNode(el.textContent)); continue; }
    for (const attr of [...el.attributes]) {
      if (!ATTRS.has(attr.name) || attr.name === 'style' || (attr.name === 'href' && !safeURL(attr.value)) || (attr.name === 'src' && !safeURL(attr.value, true))) el.removeAttribute(attr.name);
    }
    if (el.localName === 'a') el.setAttribute('rel', 'noopener noreferrer');
  }
  return doc.body;
}
let renderer;
function markdown() {
  if (renderer) return renderer;
  renderer = globalThis.markdownit({html:false, linkify:true, typographer:false});
  renderer.inline.ruler.after('escape','math_inline',(state,silent)=>{
    if (state.src[state.pos] !== '$' || state.src[state.pos+1] === '$') return false;
    let end = state.pos + 1; while ((end = state.src.indexOf('$', end)) >= 0 && state.src[end - 1] === '\\') end++;
    if (end < 0 || state.src.slice(state.pos+1,end).includes('\n')) return false;
    if (!silent) { const token=state.push('math_inline','',0); token.content=state.src.slice(state.pos+1,end); }
    state.pos=end+1; return true;
  });
  // Emit text markers first; KaTeX's trusted renderer runs after sanitizing Markdown.
  renderer.renderer.rules.math_inline=(tokens,i)=>`<span class="nb-math">${renderer.utils.escapeHtml(tokens[i].content)}</span>`;
  renderer.block.ruler.before('fence','math_block',(state,start,end,silent)=>{
    const begin=state.bMarks[start]+state.tShift[start], line=state.src.slice(begin,state.eMarks[start]);
    if (!line.startsWith('$$')) return false;
    let finish=start, content=line.slice(2);
    if(content.endsWith('$$')&&content.length>=2)content=content.slice(0,-2);
    else { const lines=[content]; for(finish=start+1;finish<end;finish++){const text=state.src.slice(state.bMarks[finish]+state.tShift[finish],state.eMarks[finish]); if(text.endsWith('$$')){lines.push(text.slice(0,-2));break;}lines.push(text);} if(finish>=end)return false; content=lines.join('\n'); }
    if(silent)return true;const token=state.push('math_block','',0);token.content=content;state.line=finish+1;return true;
  });
  renderer.renderer.rules.math_block=(tokens,i)=>`<div class="nb-math-block">${renderer.utils.escapeHtml(tokens[i].content)}</div>`;
  return renderer;
}
export function renderMarkdown(container, source) {
  const safe = sanitize(markdown().render(source));
  container.replaceChildren(...safe.childNodes);
  for(const el of container.querySelectorAll('.nb-math,.nb-math-block')) {
    try { globalThis.katex.render(el.textContent,el,{trust:false,throwOnError:false,displayMode:el.classList.contains('nb-math-block')}); } catch { /* Text remains visible. */ }
  }
}
