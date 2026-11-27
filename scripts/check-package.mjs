// Verify the packed artifact against the actual published v2 package, not a
// second copy of this source tree. Temporary installs have lifecycle scripts off.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dir = mkdtempSync(join(tmpdir(), 'colorbox-core-package-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (args, cwd) => execFileSync(npm, args, {
  cwd, encoding: 'utf8', timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe'],
});

try {
  const [pack] = JSON.parse(run(['pack', '--json', '--ignore-scripts', '--pack-destination', dir], root));
  for (const file of ['dist/bundle.js', 'dist/bundle.cjs', 'dist/bundle.d.ts',
    'dist/bundle.d.cts', 'LICENSE.md', 'NOTICE', 'THIRD_PARTY_NOTICES.md', 'MIGRATION.md']) {
    assert(pack.files.some(entry => entry.path === file), `Packed artifact missing ${file}`);
  }
  writeFileSync(join(dir, 'package.json'), JSON.stringify({name: 'core-consumer-check', private: true, type: 'module'}));
  run(['install', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org/',
    join(dir, pack.filename), 'legacy-core@npm:@k-vyn/coloralgorithm@2.0.0'], dir);
  const consumerRequire = createRequire(join(dir, 'consumer.cjs'));
  const candidate = await import(pathToFileURL(join(dir, 'node_modules/@usecolorbox/core/dist/bundle.js')));
  const legacy = await import(pathToFileURL(join(dir, 'node_modules/legacy-core/dist/bundle.js')));
  const commonjs = consumerRequire('@usecolorbox/core');
  const manifest = JSON.parse(readFileSync(join(dir, 'node_modules/@usecolorbox/core/package.json'), 'utf8'));
  assert.equal(manifest.license, 'Apache-2.0');
  assert.deepEqual(Object.keys(candidate).sort(), Object.keys(legacy).sort());
  assert.deepEqual(candidate.ErrorCodes, legacy.ErrorCodes);
  // Also exercise package-name ESM resolution through exports, not just a file URL.
  writeFileSync(join(dir, 'consumer.mjs'), "import {generate} from '@usecolorbox/core'; export default generate;\n");
  assert.equal((await import(pathToFileURL(join(dir, 'consumer.mjs')))).default, candidate.generate);

  let cases = 0;
  for (const steps of [2, 5, 11, 16]) {
    for (const hue of [0, 60, 120, 220, 350]) {
      const props = {
        steps,
        hue: {start: hue, end: (hue + 80) % 360, curve: 'easeOutQuad'},
        saturation: {start: 0.08, end: 1, rate: 1, curve: 'easeOutQuad'},
        brightness: {start: 1, end: 0.2, curve: 'easeInQuart'},
      };
      for (const options of [undefined, {name: 'Brand', provideInverted: true},
        {minorSteps: [0], rotation: 'counterclockwise'},
        {lockHex: '#3366cc', provideInverted: true, lockHexInverted: '#88aaff'}]) {
        const expected = legacy.generate(structuredClone(props), structuredClone(options));
        for (const impl of [candidate, commonjs]) {
          assert.deepEqual(impl.generate(structuredClone(props), structuredClone(options)), expected);
        }
        cases++;
      }
      props.hue.curve = [0.25, 0.1, 0.25, 1];
      assert.deepEqual(candidate.generate(structuredClone(props)), legacy.generate(structuredClone(props)));
      cases++;
    }
  }
  const valid = {steps: 5, hue: {start: 0, end: 360, curve: 'linear'},
    saturation: {start: 0, end: 1, rate: 1, curve: 'linear'},
    brightness: {start: 1, end: 0, curve: 'linear'}};
  const errorResult = (impl, props, options) => {
    try { impl.generate(props, options); assert.fail('Expected validation error'); }
    catch (error) {
      assert(error instanceof impl.ColorAlgorithmError);
      return {name: error.name, code: error.code, message: error.message};
    }
  };
  for (const [props, options] of [[undefined, undefined], [null, undefined],
    [{...valid, steps: 1}, undefined], [{...valid, hue: {...valid.hue, start: 361}}, undefined],
    [valid, {lockHex: 'invalid'}], [valid, {minorSteps: 'invalid'}]]) {
    const expected = errorResult(legacy, props, options);
    assert.deepEqual(errorResult(candidate, props, options), expected);
    assert.deepEqual(errorResult(commonjs, props, options), expected);
  }
  console.log(`Packed ESM/CommonJS package verified: ${cases} generation cases, 6 validation cases, exports and license files.`);
} finally {
  rmSync(dir, {recursive: true, force: true});
}
