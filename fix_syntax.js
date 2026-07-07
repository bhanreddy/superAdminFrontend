const fs = require('fs');
const file = 'src/components/ui/DataTable.tsx';
let content = fs.readFileSync(file, 'utf8');

// The broken code block is:
/*
      ) : (
        {isPhone ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.scrollH} contentContainerStyle={{ minWidth: '100%' }}>
            <View style={{ minWidth: tableMinWidth, flex: 1 } as any}>
        ) : (
          <View style={{ width: '100%', flex: 1 }}>
        )}
*/

content = content.replace(
  /\{isPhone \? \(\n\s*<ScrollView horizontal showsHorizontalScrollIndicator=\{false\} style=\{s\.scrollH\} contentContainerStyle=\{\{ minWidth: '100%' \}\}>\n\s*<View style=\{\{ minWidth: tableMinWidth, flex: 1 \} as any\}>\n\s*\) : \(\n\s*<View style=\{\{ width: '100%', flex: 1 \}\}>\n\s*\)\}/,
  `{isPhone ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.scrollH} contentContainerStyle={{ minWidth: '100%' }}>
            <View style={{ minWidth: tableMinWidth, flex: 1 } as any}>
              {/* INNER */}
        ) : (
          <View style={{ width: '100%', flex: 1 }}>
            {/* INNER */}
        )}`
); // WAIT, JSX doesn't allow splitting tags across ternary operators like this!
