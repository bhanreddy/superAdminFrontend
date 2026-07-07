const fs = require('fs');

const file = 'src/components/ui/DataTable.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the ScrollView usage
const replaceTarget = `      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.scrollH}>
          <View style={{ minWidth: tableMinWidth, width: '100%' } as any}>`;

const replaceWith = `      ) : (
        <View style={[s.scrollH, { overflow: 'hidden' } as any]}>
          <ScrollView horizontal={isPhone} showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: '100%' }}>
            <View style={{ minWidth: tableMinWidth, width: '100%' } as any}>`;

content = content.replace(replaceTarget, replaceWith);

const replaceTargetEnd = `          </View>
        </ScrollView>
      )}`;

const replaceWithEnd = `          </View>
          </ScrollView>
        </View>
      )}`;

content = content.replace(replaceTargetEnd, replaceWithEnd);

fs.writeFileSync(file, content);
console.log('Done fixing scroll');
