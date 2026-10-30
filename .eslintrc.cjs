module.exports = {
  root: true,
  env: { es2022: true, browser: true, node: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  extends: ['eslint:recommended'],
  globals: { __DEV__: 'readonly', globalThis: 'readonly' },
  ignorePatterns: ['node_modules/', 'dist/', '.expo/', 'android/', 'ios/'],
  // Legacy unused imports are not a release failure. Syntax, undefined JS
  // names, duplicate keys, invalid control flow and debugger statements are.
  rules: { 'no-unused-vars': 'off', 'no-empty': ['error', { allowEmptyCatch: true }] },
  overrides: [{ files: ['*.ts', '*.tsx'], parser: '@typescript-eslint/parser',
    rules: { 'no-undef': 'off', 'no-redeclare': 'off' } }],
};
