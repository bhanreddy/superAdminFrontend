const fs = require('fs');
const file = 'src/components/ui/DataTable.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<View style=\{s\.scrollH\}>\n          <View style=\{\{ minWidth: tableMinWidth, width: '100%' \} as any\}>/,
  `<ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.scrollH} contentContainerStyle={{ minWidth: '100%' }}>\n          <View style={{ minWidth: tableMinWidth, flex: 1 } as any}>`
);
content = content.replace(
  /<\/View>\n        <\/View>\n      \)}/,
  `</View>\n        </ScrollView>\n      )}`
);

fs.writeFileSync(file, content);
console.log('Done2');
