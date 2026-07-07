const fs = require('fs');
const file = 'app/(app)/students/import.tsx';
let content = fs.readFileSync(file, 'utf8');

// The file currently uses:
// const { isDark } = useTheme();
// And manual hex colors or rgb.
// Since the prompt asks to "make it adaptable with light and dark mode",
// It already has some light/dark mode logic:
// const bg = isDark ? '#0D0F1A' : '#ECEEF6';
// const cardBg = isDark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.9)';
// const heading = isDark ? '#FFFFFF' : '#12142A';
// It's mostly adaptable, but we can refine it to use useTheme().colors
// Actually, let's see what the file has. We'll extract `colors` from useTheme() and map to the standard theme tokens.

content = content.replace(/const { isDark } = useTheme\(\);/, 'const { isDark, colors } = useTheme();');

// Let's replace the manual `bg`, `cardBg` with `colors.background`, `colors.surface`
content = content.replace(/const bg = isDark \? '[^']+' : '[^']+';/, 'const bg = colors.background;');
content = content.replace(/const cardBg = isDark \? '[^']+' : '[^']+';/, 'const cardBg = colors.surface;');
content = content.replace(/const cardBorder = isDark \? '[^']+' : '[^']+';/, 'const cardBorder = colors.border;');
content = content.replace(/const heading = isDark \? '[^']+' : '[^']+';/, 'const heading = colors.textPrimary;');
content = content.replace(/const sub = isDark \? '[^']+' : '[^']+';/, 'const sub = colors.textSecondary;');

fs.writeFileSync(file, content);
console.log('Done import');
