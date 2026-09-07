// The display settings validate their values against the validation section in config.js

import assert from 'node:assert/strict';
import { loadOverlay, readSource } from './support/overlay.js';

const overlay = await loadOverlay();
const allowed = overlay.VALIDATION;

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
  const { min, max, default: fallback } = allowed[setting.name];

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

Deno.test('debug logging is off unless something turns it on', async () => {
  const { DEBUG, warnings } = await loadOverlay();
  assert.equal(DEBUG, false);
  assert.deepEqual(warnings, []);
});

Deno.test('the debug URL parameter turns logging on and off', async () => {
  for (const [search, expected] of [
    ['?debug=true', true],
    ['?debug=TRUE', true],
    ['?debug=false', false]
  ]) {
    const { DEBUG, warnings } = await loadOverlay({ search });
    assert.equal(DEBUG, expected, `${search} should set debug to ${expected}`);
    assert.deepEqual(warnings, []);
  }
});

Deno.test('the debug URL parameter overrides config.js', async () => {
  const configSource = (await readSource('penalties/config.js')).replace('enabled: false', 'enabled: true');
  const off = await loadOverlay({ configSource, search: '?debug=false' });
  assert.equal(off.DEBUG, false);

  const on = await loadOverlay({ configSource });
  assert.equal(on.DEBUG, true);
});

Deno.test('an invalid debug value falls back to the configured default', async () => {
  const { DEBUG, warnings } = await loadOverlay({ search: '?debug=verbose' });
  assert.equal(DEBUG, false);
  assert.match(warnings.join(' '), /must be true or false/);
});

Deno.test('a missing debug setting falls back to the configured default', async () => {
  const configSource = (await readSource('penalties/config.js')).replace('enabled: false', 'notEnabled: false');
  const { DEBUG, warnings } = await loadOverlay({ configSource });
  assert.equal(DEBUG, false);
  assert.match(warnings.join(' '), /Debug logging not defined in config\.js/);
});

// Each animation option and the class it applies to the overlay
const ANIMATIONS = [
  {
    name: 'background',
    setting: 'backgroundAnimation',
    method: 'setBackgroundAnimation',
    parameter: 'background',
    classes: { trace: 'background-trace', organic: 'background-organic', shine: 'background-shine', off: '' }
  },
  {
    name: 'timeout',
    setting: 'timeoutAnimation',
    method: 'setTimeoutAnimation',
    parameter: 'timeout',
    classes: { glow: 'timeout-glow', pulse: 'timeout-pulse', shine: 'timeout-shine', off: '' }
  }
];

for (const animation of ANIMATIONS) {
  Deno.test(`each ${animation.name} animation applies its own class`, async () => {
    for (const [option, className] of Object.entries(animation.classes)) {
      const overlay = await loadOverlay({ search: `?${animation.parameter}=${option}` });
      overlay[animation.method]();

      const applied = [...overlay.overlayClasses];
      assert.deepEqual(applied, className ? [className] : [], `${option} should apply "${className}"`);
      assert.deepEqual(overlay.warnings, []);
    }
  });

  Deno.test(`an invalid ${animation.name} animation falls back to the default`, async () => {
    const overlay = await loadOverlay({ search: `?${animation.parameter}=sparkle` });
    overlay[animation.method]();

    const fallback = animation.classes[allowed[animation.setting].default];
    assert.deepEqual([...overlay.overlayClasses], [fallback]);
    assert.match(overlay.warnings.join(' '), /must be one of/);
  });
}

Deno.test('the background and timeout animations do not disturb each other', async () => {
  const overlay = await loadOverlay({ search: '?background=organic&timeout=pulse' });
  overlay.setBackgroundAnimation();
  overlay.setTimeoutAnimation();

  assert.deepEqual([...overlay.overlayClasses].sort(), ['background-organic', 'timeout-pulse']);
});

Deno.test('the penalty code key accepts true and false, and rejects anything else', async () => {
  for (const search of ['?key=true', '?key=false', '']) {
    const overlay = await loadOverlay({ search });
    overlay.setPenaltyCodeKey();
    assert.deepEqual(overlay.warnings, [], `${search || '(default)'} should be accepted`);
  }

  const invalid = await loadOverlay({ search: '?key=sometimes' });
  invalid.setPenaltyCodeKey();
  assert.match(invalid.warnings.join(' '), /must be true or false/);
});

Deno.test('the overlay stamps its version on the page', async () => {
  const { setOverlayVersion } = await loadOverlay();
  assert.doesNotThrow(() => setOverlayVersion());
});

// The admin page writes to the scoreboard, which the overlay reads.  A URL
// parameter pins one browser source, so it has to outrank what the page stores
const SETTING = (name) => `ScoreBoard.Settings.Setting(Penalties.Overlay.${name})`;

Deno.test('a stored setting is used when no URL parameter pins the source', async () => {
  const { setOverlayWidth, properties, warnings } = await loadOverlay({
    state: { [SETTING('Width')]: '92' }
  });
  setOverlayWidth();

  assert.equal(properties['--overlay-width-ratio'], '0.92');
  assert.deepEqual(warnings, []);
});

Deno.test('a URL parameter outranks the settings page', async () => {
  const { setOverlayWidth, properties } = await loadOverlay({
    search: '?width=75',
    state: { [SETTING('Width')]: '92' }
  });
  setOverlayWidth();

  assert.equal(properties['--overlay-width-ratio'], '0.75');
});

Deno.test('an unset setting falls back to config.js', async () => {
  for (const stored of ['', '   ']) {
    const { setOverlayWidth, properties } = await loadOverlay({ state: { [SETTING('Width')]: stored } });
    setOverlayWidth();
    assert.equal(properties['--overlay-width-ratio'], '0.85', `"${stored}" should read as unset`);
  }
});

Deno.test('an invalid stored setting names the settings page in the warning', async () => {
  const { setOverlayWidth, properties, warnings } = await loadOverlay({
    state: { [SETTING('Width')]: '140' }
  });
  setOverlayWidth();

  assert.equal(properties['--overlay-width-ratio'], '0.85');
  assert.match(warnings.join(' '), /in the settings page \(must be in range 70-100\)/);
});

Deno.test('every kind of setting reads from the scoreboard', async () => {
  const overlay = await loadOverlay({
    state: {
      [SETTING('Scale')]: '90',
      [SETTING('Opacity')]: '60',
      [SETTING('Anchor')]: 'bottom',
      [SETTING('Font')]: 'anton',
      [SETTING('BackgroundAnimation')]: 'organic',
      [SETTING('TimeoutAnimation')]: 'pulse',
      [SETTING('TitleText')]: 'PENALTY BOX'
    }
  });
  overlay.applyOverlaySettings();

  assert.equal(overlay.properties['--overlay-scale'], '0.9');
  assert.equal(overlay.properties['--overlay-opacity'], '60%');
  assert.equal(overlay.properties['--overlay-origin'], 'bottom center');
  assert.match(overlay.properties['--font-family'], /Chivo/);
  assert.deepEqual([...overlay.overlayClasses].sort(), ['background-organic', 'timeout-pulse']);
  assert.deepEqual(overlay.warnings, []);
});

Deno.test('the title comes from the settings page, then config.js', async () => {
  const titleSelector = (await loadOverlay()).CLASSES.penaltiesTitleH1Selector;

  const stored = await loadOverlay({ state: { [SETTING('TitleText')]: 'PENALTY BOX' } });
  stored.setTitleBannerText();
  assert.equal(stored.text[titleSelector], 'PENALTY BOX');

  const unset = await loadOverlay();
  unset.setTitleBannerText();
  assert.equal(unset.text[titleSelector], 'PENALTIES');
});

Deno.test('the overlay follows every setting the page can write', async () => {
  const overlay = await loadOverlay();
  overlay.registerOverlaySettings();

  const registered = overlay.WS.registrations.at(-1).paths;
  const expected = Object.values(overlay.SETTINGS)
    .filter((setting) => setting.setting)
    .map((setting) => overlay.settingChannel(setting.setting));

  assert.deepEqual(registered, expected);
  assert.equal(registered.length, 9, 'nine settings belong to the settings page');
});
