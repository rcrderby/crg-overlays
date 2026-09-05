// The display settings validate their values against the limits in config.js

import assert from 'node:assert/strict';
import { loadOverlay, readSource } from './support/overlay.js';

const overlay = await loadOverlay();
const limits = overlay.LIMITS;

// Each numeric setting, with the CSS property it writes and how it converts
const NUMERIC_SETTINGS = [
  { name: 'scale', method: 'setOverlayScale', parameter: 'scale', property: '--overlay-scale', toCss: (v) => v / 100 },
  {
    name: 'width',
    method: 'setOverlayWidth',
    parameter: 'width',
    property: '--overlay-width-ratio',
    toCss: (v) => v / 100
  },
  {
    name: 'opacity',
    method: 'setOverlayOpacity',
    parameter: 'opacity',
    property: '--overlay-opacity',
    toCss: (v) => `${v}%`
  }
];

for (const setting of NUMERIC_SETTINGS) {
  const { min, max, default: fallback } = limits[setting.name];

  Deno.test(`${setting.name} uses its configured default`, async () => {
    const { [setting.method]: apply, properties } = await loadOverlay();
    apply();
    assert.equal(properties[setting.property], String(setting.toCss(fallback)));
  });

  Deno.test(`${setting.name} accepts the ends of its range`, async () => {
    for (const value of [min, max]) {
      const {
        [setting.method]: apply,
        properties,
        warnings
      } = await loadOverlay({
        search: `?${setting.parameter}=${value}`
      });
      apply();
      assert.equal(properties[setting.property], String(setting.toCss(value)));
      assert.deepEqual(warnings, []);
    }
  });

  Deno.test(`${setting.name} rejects values outside its range`, async () => {
    for (const value of [min - 1, max + 1]) {
      const {
        [setting.method]: apply,
        properties,
        warnings
      } = await loadOverlay({
        search: `?${setting.parameter}=${value}`
      });
      apply();
      assert.equal(properties[setting.property], String(setting.toCss(fallback)));
      assert.match(warnings.join(' '), new RegExp(`range ${min}-${max}`));
    }
  });

  Deno.test(`${setting.name} rejects values that are not numbers`, async () => {
    const {
      [setting.method]: apply,
      properties,
      warnings
    } = await loadOverlay({
      search: `?${setting.parameter}=wide`
    });
    apply();
    assert.equal(properties[setting.property], String(setting.toCss(fallback)));
    assert.match(warnings.join(' '), /must be numeric/);
  });
}

Deno.test('a URL parameter overrides config.js', async () => {
  const { setOverlayWidth, properties, warnings } = await loadOverlay({ search: '?width=90' });
  setOverlayWidth();
  assert.equal(properties['--overlay-width-ratio'], '0.9');
  assert.deepEqual(warnings, []);
});

Deno.test('an invalid config.js value names config.js as the source', async () => {
  const configSource = (await readSource('penalties/config.js')).replace('overlayWidth: 85', 'overlayWidth: 999');
  const { setOverlayWidth, warnings } = await loadOverlay({ configSource });
  setOverlayWidth();
  assert.match(warnings.join(' '), /in config\.js/);
});

Deno.test('an invalid URL parameter names the URL as the source', async () => {
  const { setOverlayWidth, warnings } = await loadOverlay({ search: '?width=999' });
  setOverlayWidth();
  assert.match(warnings.join(' '), /in URL parameter/);
});

Deno.test('the anchor and font settings fall back to their defaults', async () => {
  const { setOverlayAnchor, setOverlayFont, properties, warnings } = await loadOverlay({
    search: '?anchor=sideways&font=comic'
  });
  setOverlayAnchor();
  setOverlayFont();
  assert.equal(properties['--overlay-origin'], 'top center');
  assert.match(properties['--font-family'], /Saira/);
  assert.equal(warnings.length, 2);
});

Deno.test('editing a limit in config.js moves the range and the default together', async () => {
  const configSource = (await readSource('penalties/config.js')).replace(
    'width: { min: 70, max: 100, default: 85 }',
    'width: { min: 60, max: 100, default: 80 }'
  );

  const accepted = await loadOverlay({ configSource, search: '?width=65' });
  accepted.setOverlayWidth();
  assert.equal(accepted.properties['--overlay-width-ratio'], '0.65');

  const rejected = await loadOverlay({ configSource, search: '?width=59' });
  rejected.setOverlayWidth();
  assert.equal(rejected.properties['--overlay-width-ratio'], '0.8');
  assert.match(rejected.warnings.join(' '), /range 60-100/);
  assert.match(rejected.warnings.join(' '), /default \(80%\)/);
});
