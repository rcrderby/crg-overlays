// index.html names functions and index.js names configuration keys as strings.
// These checks identify when one or the other is renamed.

import assert from 'node:assert/strict';
import { loadOverlay, readSource } from './support/overlay.js';

const html = await readSource('penalties/index.html');
const js = await readSource('penalties/index.js');

// CRG supplies its own sb helpers  at runtime (e.g., sbToLongTime, etc.)
const isCrgHelper = (name) => name.startsWith('sb');

// Functions index.js publishes for the bindings to call
const defined = new Set([...js.matchAll(/window\.([A-Za-z0-9_]+)\s*=\s*function/g)].map((match) => match[1]));

// Functions index.html asks CRG to call.
// A binding clause ends with the function name.
// This overlay names its functions in camelCase.
// CRG paths are capitalized.
const referenced = new Set();
for (const attribute of html.matchAll(/sb(?:display|class|attr|css)="([\s\S]*?)"/gi)) {
  for (const clause of attribute[1].split('|')) {
    const tail = clause.split(':').pop().trim();
    if (/^[a-z][A-Za-z0-9]*$/.test(tail) && !isCrgHelper(tail)) {
      referenced.add(tail);
    }
  }
}

Deno.test('every function index.html binds is defined in index.js', () => {
  const missing = [...referenced].filter((name) => !defined.has(name));
  assert.deepEqual(missing, [], `index.html binds functions index.js does not define: ${missing.join(', ')}`);
});

Deno.test('every function index.js publishes is bound in index.html', () => {
  const orphaned = [...defined].filter((name) => !referenced.has(name));
  assert.deepEqual(orphaned, [], `index.js publishes functions nothing binds: ${orphaned.join(', ')}`);
});

Deno.test('every configuration key index.js reads exists in config.js', async () => {
  const { window } = await loadOverlay();
  const configuration = window.AppConfig.PenaltiesOverlayConfig;

  // The constant index.js assigns each configuration section to.  `debug` has
  // no constant, and index.js reads it straight from the configuration object
  const { REQUIRED_SECTIONS } = await loadOverlay();
  const sections = Object.fromEntries(
    REQUIRED_SECTIONS.filter((section) => section !== 'debug').map((section) => [section.toUpperCase(), section])
  );

  const missing = [];
  for (const [constant, section] of Object.entries(sections)) {
    const reads = [...js.matchAll(new RegExp(`\\b${constant}\\.([A-Za-z0-9_.]+)`, 'g'))].map((match) => match[1]);

    // Sections are also read by destructuring, as in { captainFlag } = LABELS
    for (const destructured of js.matchAll(new RegExp(`\\{([^}]*)\\}\\s*=\\s*${constant};`, 'g'))) {
      reads.push(...destructured[1].split(',').map((name) => name.trim()));
    }

    for (const path of reads) {
      let node = configuration[section];
      for (const key of path.split('.')) {
        if (node === undefined || !(key in node)) {
          missing.push(`${section}.${path}`);
          break;
        }
        node = node[key];
      }
    }
  }

  assert.deepEqual([...new Set(missing)], [], 'index.js reads configuration keys config.js does not define');
});

Deno.test('config.js provides every section index.js requires', async () => {
  const { window } = await loadOverlay();
  const configuration = window.AppConfig.PenaltiesOverlayConfig;
  const required = js
    .match(/const REQUIRED_SECTIONS = \[(.*?)\]/)[1]
    .match(/'([^']+)'/g)
    .map((name) => name.slice(1, -1));

  const absent = required.filter((section) => !configuration[section]);
  assert.deepEqual(absent, []);
});

Deno.test('a missing configuration section stops the overlay', async () => {
  const configSource = (await readSource('penalties/config.js')).replace('  validation: {', '  notValidation: {');
  await assert.rejects(async () => await loadOverlay({ configSource }), /missing required sections: validation/);
});

Deno.test('the README documents every configuration key', async () => {
  const readme = await readSource('penalties/README.md');
  const { window } = await loadOverlay();
  const configuration = window.AppConfig.PenaltiesOverlayConfig;

  const flatten = (section, prefix = '') =>
    Object.entries(section).flatMap(([key, value]) =>
      value && typeof value === 'object' && !Array.isArray(value) ? flatten(value, `${prefix}${key}.`) : [prefix + key]
    );

  const undocumented = [];
  const stale = [];

  for (const [name, section] of Object.entries(configuration)) {
    // Each section has its own table, running until the next section heading
    // or the end of the reference block, whichever comes first
    const start = readme.indexOf(`***${name}*** **Section**`);
    assert.notEqual(start, -1, `the README has no table for the ${name} section`);
    const ends = [readme.indexOf('*** **Section**', start + 20), readme.indexOf('</details>', start)].filter(
      (index) => index !== -1
    );
    const table = readme.slice(start, ends.length ? Math.min(...ends) : readme.length);

    const documented = [...table.matchAll(/^\s*\|\s*`([^`]+)`/gm)].map((match) => match[1]);
    const keys = flatten(section);

    // A table may document a parent key rather than each key beneath it
    undocumented.push(
      ...keys
        .filter((key) => !documented.includes(key) && !documented.some((entry) => key.startsWith(`${entry}.`)))
        .map((key) => `${name}.${key}`)
    );
    stale.push(
      ...documented
        .filter((entry) => !keys.includes(entry) && !keys.some((key) => key.startsWith(`${entry}.`)))
        .map((entry) => `${name}.${entry}`)
    );
  }

  assert.deepEqual(undocumented, [], `config.js keys the README does not document: ${undocumented.join(', ')}`);
  assert.deepEqual(stale, [], `README rows for keys config.js no longer has: ${stale.join(', ')}`);
});

// The settings table names each URL parameter once.  These checks identify any
// parameter that no setting reads, or that the README no longer documents.
Deno.test('every URL parameter the overlay accepts reaches a setting', async () => {
  const { SETTINGS, ALLOWED_URL_PARAMS } = await loadOverlay();

  // The allowlist is derived, so it cannot disagree with the table
  assert.deepEqual(
    ALLOWED_URL_PARAMS,
    Object.values(SETTINGS).map((setting) => setting.urlParam)
  );

  // Each entry is spread into a resolveSetting call, or passed to setAnimation
  const unused = Object.keys(SETTINGS).filter((name) => !js.includes(`SETTINGS.${name}`));
  assert.deepEqual(unused, [], `the settings table names parameters nothing reads: ${unused.join(', ')}`);
});

Deno.test('the README documents every URL parameter', async () => {
  const readme = await readSource('penalties/README.md');
  const { ALLOWED_URL_PARAMS } = await loadOverlay();

  // Renaming a parameter invalidates the example URLs a streaming team copies
  const undocumented = ALLOWED_URL_PARAMS.filter((name) => !new RegExp(`[?&]${name}=`).test(readme));
  assert.deepEqual(undocumented, [], `URL parameters the README does not show: ${undocumented.join(', ')}`);
});
