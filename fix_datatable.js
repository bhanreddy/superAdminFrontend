const fs = require('fs');
const file = 'src/components/ui/DataTable.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<ScrollView horizontal showsHorizontalScrollIndicator={false} style={s\.scrollH}>\n\s*<View style={{ minWidth: tableMinWidth, width: '100%' } as any}>/,
  `<View style={s.scrollH}>\n          <View style={{ minWidth: tableMinWidth, width: '100%' } as any}>`
);
content = content.replace(
  /<\/View>\n\s*<\/ScrollView>\n\s*\)}/,
  `</View>\n        </View>\n      )}`
);

fs.writeFileSync(file, content);
console.log('Done');
