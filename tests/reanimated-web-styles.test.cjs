const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { StyleSheet } = require('react-native-web');

// Exercise the installed dependency's real transform parser. Loading only this
// function avoids replacing its behavior with the UI tests' animation mock.
for (const file of [
  'src/reanimated2/layoutReanimation/web/componentUtils.ts',
  'lib/module/reanimated2/layoutReanimation/web/componentUtils.js',
]) {
  const filename = path.join(path.dirname(require.resolve('react-native-reanimated/package.json')), file);
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
  const parser = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'extractTransformFromStyle');
  const output = ts.transpileModule(parser.getText(source), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const scope = { exports: {}, StyleSheet };
  vm.runInNewContext(output, scope);
  const extract = scope.exports.extractTransformFromStyle;

  test(`${file}: optional and nested styles do not crash web entrance animations`, () => {
    const transform = [{ translateY: 12 }, { scale: 0.98 }];
    assert.equal(extract(undefined), undefined);
    assert.equal(extract(null), undefined);
    assert.equal(extract([{ opacity: 1 }, undefined]), undefined);
    assert.equal(extract([undefined, { opacity: 1 }]), undefined);
    assert.equal(extract([null, false, undefined, [{ transform }, undefined]]), transform);
    const sparse = [];
    sparse[2] = { transform };
    assert.equal(extract(sparse), transform);
  });

  test(`${file}: the final transform follows React Native style precedence`, () => {
    const first = [{ translateX: 4 }];
    const last = [{ scale: 1.1 }];
    const styles = StyleSheet.create({ initial: { transform: first }, final: { transform: last } });
    assert.equal(extract([styles.initial, [false, undefined, styles.final]]), last);
    assert.equal(extract([styles.initial, { transform: undefined }]), undefined);
    assert.throws(() => extract([{ transform: 'scale(1)' }]), /String transform is currently unsupported/);
  });
}
