// Build a local, self-contained index of the captured QA evidence. No network.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('../../SuperAdminBackend/node_modules/sharp');
const root = path.resolve(__dirname, '../docs/phase8');
const evidence = path.join(root, 'evidence');
const records = JSON.parse(fs.readFileSync(path.join(evidence, 'capture-manifest-final.json'), 'utf8'));
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
async function sheets() {
  const out = path.join(evidence, 'contact-sheets'); fs.mkdirSync(out, { recursive: true });
  for (const [viewport, batch, width] of [['phone', 6, 260], ['desktop', 12, 380], ['tablet', 12, 280]]) {
    const routes = [...new Set(records.filter(c => c.viewport === viewport).map(c => c.route))];
    for (let start = 0; start < routes.length; start += batch) {
      const images = [];
      for (const route of routes.slice(start, start + batch)) {
        for (const theme of ['light', 'dark']) {
          const record = records.find(c => c.viewport === viewport && c.route === route && c.theme === theme);
          const file = path.join(evidence, 'screenshots', record.file);
          const meta = await sharp(file).metadata(), height = Math.round(meta.height * width / meta.width);
          const caption = Buffer.from(`<svg width="${width}" height="32"><rect width="100%" height="100%" fill="white"/><text x="5" y="18" fill="black" font-family="Arial" font-size="12">${escape(route)} ${theme}</text></svg>`);
          const buffer = await sharp(file).resize(width, height).extend({ top: 32, bottom: 0, left: 0, right: 0, background: 'white' }).composite([{ input: caption, left: 0, top: 0 }]).png().toBuffer();
          images.push({ buffer, height: height + 32 });
        }
      }
      const height = images[0].height;
      await sharp({ create: { width: width * 4, height: height * Math.ceil(images.length / 4), channels: 3, background: '#DDDDDD' } })
        .composite(images.map((img, i) => ({ input: img.buffer, left: i % 4 * width, top: Math.floor(i / 4) * height })))
        .jpeg({ quality: 85 }).toFile(path.join(out, `${viewport}-${String(start / batch + 1).padStart(2, '0')}.jpg`));
    }
  }
}
const reviews = JSON.parse(fs.readFileSync(path.join(evidence, 'visual-review.json'), 'utf8'));
const rows = records.map(c => ({ ...c, critique: reviews[c.route], dom: undefined }));
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Phase 8 screenshot evidence</title><style>
:root{font-family:system-ui,sans-serif;color:#182740;background:#F3F5FA}body{margin:0;padding:28px;max-width:1600px}h1{font-size:28px;margin:0 0 12px}p{line-height:1.6;max-width:1000px}nav{display:flex;flex-wrap:wrap;gap:14px;margin:24px 0;position:sticky;top:0;padding:12px;background:#F3F5FA;border-bottom:1px solid #CAD3E1}label{display:flex;gap:8px;align-items:center}select,input{font:inherit;padding:10px;border:1px solid #CAD3E1;border-radius:6px}#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px}figure{margin:0;background:white;padding:12px;border:1px solid #CAD3E1}img{display:block;width:100%;height:340px;object-fit:contain;object-position:top;background:#F3F5FA}figcaption{font-size:14px;line-height:1.6;overflow-wrap:anywhere}.warning{color:#9B5215}a{color:#3155C6}a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #3155C6;outline-offset:3px}@media(prefers-color-scheme:dark){:root{color:#F1F5FC;background:#0D1525}nav{background:#0D1525}figure{background:#17243A}a{color:#A8BAFF}.warning{color:#F4C184}}
</style><h1>Phase 8 screenshot evidence</h1><p><strong>438 route captures · 73 routes · two themes · three web viewports.</strong> Desktop 1440×1000, tablet 768×1024, phone 390×844. All records are synthetic. Reduced motion and reduced transparency were enabled for these stable captures. These are browser screenshots, not native Android or iOS evidence.</p><p>Captures include populated fixtures, empty states and API-error states. Unsupported fixture contracts are visible as errors. A screenshot is not proof that the live API or every workflow passed. Only the visible viewport was captured; full modal, tab, role and scrolled-state coverage is incomplete.</p><p><a href="FINAL_REPORT.md">Final report</a> · <a href="VISUAL_REVIEW.md">Route critiques</a> · <a href="evidence/capture-manifest-final.json">Raw capture manifest</a> · <a href="evidence/static-route-audit.json">Static route audit</a></p><nav><label>Viewport<select id="viewport"><option value="">All</option><option>desktop</option><option>tablet</option><option>phone</option></select></label><label>Theme<select id="theme"><option value="">Both</option><option>light</option><option>dark</option></select></label><label>Route<input id="search" placeholder="Search route"></label><span id="count" aria-live="polite"></span></nav><div id="grid"></div><script>
const records=${JSON.stringify(rows).replaceAll('<', '\\u003c')};
const grid=document.getElementById('grid'),viewport=document.getElementById('viewport'),theme=document.getElementById('theme'),search=document.getElementById('search');
function render(){const list=records.filter(c=>(!viewport.value||c.viewport===viewport.value)&&(!theme.value||c.theme===theme.value)&&c.route.includes(search.value.toLowerCase()));grid.replaceChildren();document.getElementById('count').textContent=list.length+' captures';for(const c of list){const figure=document.createElement('figure'),link=document.createElement('a'),img=document.createElement('img'),caption=document.createElement('figcaption');link.href='evidence/screenshots/'+c.file;img.src=link.href;img.loading='lazy';img.alt=c.route+' '+c.viewport+' '+c.theme+' web QA screenshot';link.append(img);caption.textContent=c.route+' · '+c.viewport+' · '+c.theme+(c.route!==c.layout.renderedRoute?' → '+c.layout.renderedRoute:'');const gaps=c.layout.alerts.filter(t=>/fixture|could not|unable to|unavailable/i.test(t));if(gaps.length){const note=document.createElement('p');note.className='warning';note.textContent=gaps.join(' ');caption.append(note);}const review=document.createElement('p');review.textContent=c.critique;caption.append(review);figure.append(link,caption);grid.append(figure);}}
viewport.onchange=theme.onchange=search.oninput=render;render();</script></html>`;
fs.writeFileSync(path.join(root, 'SCREENSHOTS.html'), html);
const summary = {
  captures: records.length, routes: new Set(records.map(c => c.route)).size,
  viewportCounts: Object.fromEntries(['desktop', 'tablet', 'phone'].map(v => [v, records.filter(c => c.viewport === v).length])),
  renderFailures: records.filter(c => c.dom.includes('QA render failed')).map(c => c.file),
  pageOverflow: records.filter(c => c.layout.pageWidth > c.layout.width + 1).map(c => c.file),
  unnamedVisibleButtons: records.filter(c => c.layout.buttons.some(b => !b.name)).map(c => c.file),
  fixtureContractGaps: [...new Set(records.filter(c => c.dom.includes('QA fixture has no response contract')).map(c => c.route))],
};
fs.writeFileSync(path.join(evidence, 'capture-summary.json'), JSON.stringify(summary, null, 2) + '\n');
sheets().then(() => console.log(JSON.stringify(summary, null, 2))).catch(error => { console.error(error); process.exitCode = 1; });
