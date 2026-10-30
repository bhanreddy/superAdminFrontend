const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
const normalize = route => ('/' + route.split(/[?#]/)[0].replace(/\([^/]+\)\/?/g, '').replace(/^\/+/, '')).replace(/\/$/, '') || '/';
function inventory() {
  const routes = files(path.join(root, 'app')).filter(p => /\.tsx$/.test(p) && !/[/\\][_+]/.test(p)).map(p => {
    const source = path.relative(root, p).split(path.sep).join('/');
    const route = normalize(source.replace(/^app/, '').replace(/(?:\/)?index\.tsx$/, '').replace(/\.tsx$/, ''));
    return { source, route, pattern: new RegExp('^' + route.replace(/\[([^\]]+)\]/g, '[^/]+') + '$') };
  });
  const references = [];
  for (const filename of [...files(path.join(root, 'app')), ...files(path.join(root, 'src'))].filter(p => /\.tsx?$/.test(p))) {
    const text = fs.readFileSync(filename, 'utf8');
    const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = node => {
      if (ts.isStringLiteral(node) && /^\/\((app|auth)\)(\/|$)/.test(node.text)) {
        const route = normalize(node.text);
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        references.push({ source: path.relative(root, filename), line: line + 1, target: node.text, route, resolves: routes.some(r => r.pattern.test(route)) });
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return { routes, references };
}
module.exports = { inventory, normalize };
if (require.main === module) {
  const result = inventory();
  console.log(JSON.stringify({ routes: result.routes.map(({ pattern, ...r }) => r), unresolved: result.references.filter(r => !r.resolves), staticReferences: result.references.length }, null, 2));
}
