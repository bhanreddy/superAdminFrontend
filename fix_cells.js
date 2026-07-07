const fs = require('fs');

const files = [
  'app/(app)/schools/index.tsx',
  'app/(app)/students/index.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // We want to add flex: 1 to the Pressable in the name column
  // In both files, the st.nameCell is used in the style array.
  content = content.replace(
    /st\.nameCell,/g,
    `st.nameCell,\n            { flex: 1, minWidth: 0 },`
  );
  
  fs.writeFileSync(file, content);
}
console.log('Done fixing cells');
