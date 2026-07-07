const fs = require('fs');
const file = 'src/components/ui/DataTable.tsx';
let content = fs.readFileSync(file, 'utf8');

// Header
content = content.replace(
  /col\.flex \? \{ flex: col\.flex \} : col\.width \? \{ width: col\.width as any \} : \{ flex: 1 \}/,
  `col.flex ? { flex: col.flex, minWidth: 0 } : col.width ? { width: col.width as any, minWidth: col.width as any, flexShrink: 0 } : { flex: 1, minWidth: 0 }`
);

// Row
content = content.replace(
  /col\.flex \? \{ flex: col\.flex \} : col\.width \? \{ width: col\.width as any \} : \{ flex: 1 \}/,
  `col.flex ? { flex: col.flex, minWidth: 0 } : col.width ? { width: col.width as any, minWidth: col.width as any, flexShrink: 0 } : { flex: 1, minWidth: 0 }`
);

fs.writeFileSync(file, content);
console.log('Done flex');
