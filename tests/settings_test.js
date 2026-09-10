// The display settings validate their values against the validation section in config.js

import assert from 'node:assert/strict';
import { loadOverlay, readSource } from './support/overlay.js';
import { overlaySetting } from './support/channels.js';

const overlay = await loadOverlay();
const allowed = overlay.VALIDATION;

// One stored setting, as the scoreboard holds it
const stored = (name, value) => ({ [overlaySetting(name)]: String(value) });

// Each numeric setting, with the CSS property it writes and how it converts
const NUMERIC_SETTINGS = [
  { name: 'scale', method: 'setOverlayScale', setting: 'Scale', property: '--overlay-scale', toCss: (v) => v / 100 },
  {
    name: 'width',
    method: 'setOverlayWidth',
    setting: 'Width',
    property: '--overlay-width-ratio',
    toCss: (v) => v / 100
  },
  {
    name: 'opacity',
    method: 'setOverlayOpacity',
    setting: 'Opacity',
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
      } = await loadOverlay({ state: stored(setting.setting, value) });
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
      } = await loadOverlay({ state: stored(setting.setting, value) });
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
    } = await loadOverlay({ state: stored(setting.setting, 'wide') });
    apply();
    assert.equal(properties[setting.property], String(setting.toCss(fallback)));
    assert.match(warnings.join(' '), /must be numeric/);
  });
}

Deno.test('an invalid config.js value names config.js as the source', async () => {
  const configSource = (await readSource('penalties/config.js')).replace('overlayWidth: 85', 'overlayWidth: 999');
  const { setOverlayWidth, warnings } = await loadOverlay({ configSource });
  setOverlayWidth();
  assert.match(warnings.join(' '), /in config\.js/);
});

Deno.test('the anchor and font settings fall back to their defaults', async () => {
  const { setOverlayAnchor, setOverlayFont, properties, warnings } = await loadOverlay({
    state: { ...stored('Anchor', 'sideways'), ...stored('Font', 'comic') }
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

  const accepted = await loadOverlay({ configSource, state: stored('Width', 65) });
  accepted.setOverlayWidth();
  assert.equal(accepted.properties['--overlay-width-ratio'], '0.65');

  const rejected = await loadOverlay({ configSource, state: stored('Width', 59) });
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
  const { DEBUG } = await loadOverlay({ configSource, search: '?debug=false' });

  assert.equal(DEBUG, false);
});

Deno.test('an invalid debug parameter names the URL as the source', async () => {
  const { DEBUG, warnings } = await loadOverlay({ search: '?debug=verbose' });

  assert.equal(DEBUG, false);
  assert.match(warnings.join(' '), /in URL parameter \(must be true or false\)/);
});

Deno.test('config.js turns debug logging on', async () => {
  const configSource = (await readSource('penalties/config.js')).replace('enabled: false', 'enabled: true');
  const { DEBUG, warnings } = await loadOverlay({ configSource });

  assert.equal(DEBUG, true);
  assert.deepEqual(warnings, []);
});

Deno.test('an invalid debug value falls back to the configured default', async () => {
  const configSource = (await readSource('penalties/config.js')).replace('enabled: false', "enabled: 'verbose'");
  const { DEBUG, warnings } = await loadOverlay({ configSource });

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
    channel: 'BackgroundAnimation',
    classes: { trace: 'background-trace', organic: 'background-organic', shine: 'background-shine', off: '' }
  },
  {
    name: 'timeout',
    setting: 'timeoutAnimation',
    method: 'setTimeoutAnimation',
    channel: 'TimeoutAnimation',
    classes: { glow: 'timeout-glow', pulse: 'timeout-pulse', shine: 'timeout-shine', off: '' }
  }
];

for (const animation of ANIMATIONS) {
  Deno.test(`each ${animation.name} animation applies its own class`, async () => {
    for (const [option, className] of Object.entries(animation.classes)) {
      const overlay = await loadOverlay({ state: stored(animation.channel, option) });
      overlay[animation.method]();

      const applied = [...overlay.overlayClasses];
      assert.deepEqual(applied, className ? [className] : [], `${option} should apply "${className}"`);
      assert.deepEqual(overlay.warnings, []);
    }
  });

  Deno.test(`an invalid ${animation.name} animation falls back to the default`, async () => {
    const overlay = await loadOverlay({ state: stored(animation.channel, 'sparkle') });
    overlay[animation.method]();

    const fallback = animation.classes[allowed[animation.setting].default];
    assert.deepEqual([...overlay.overlayClasses], [fallback]);
    assert.match(overlay.warnings.join(' '), /must be one of/);
  });
}

Deno.test('the background and timeout animations do not disturb each other', async () => {
  const overlay = await loadOverlay({
    state: { ...stored('BackgroundAnimation', 'organic'), ...stored('TimeoutAnimation', 'pulse') }
  });
  overlay.setBackgroundAnimation();
  overlay.setTimeoutAnimation();

  assert.deepEqual([...overlay.overlayClasses].sort(), ['background-organic', 'timeout-pulse']);
});

Deno.test('the penalty code key accepts true and false, and rejects anything else', async () => {
  for (const value of ['true', 'false', '']) {
    const overlay = await loadOverlay({ state: stored('PenaltyCodeKey', value) });
    overlay.setPenaltyCodeKey();
    assert.deepEqual(overlay.warnings, [], `"${value}" should be accepted`);
  }

  const invalid = await loadOverlay({ state: stored('PenaltyCodeKey', 'sometimes') });
  invalid.setPenaltyCodeKey();
  assert.match(invalid.warnings.join(' '), /must be true or false/);
});

Deno.test('the overlay stamps its version on the page', async () => {
  const { setOverlayVersion } = await loadOverlay();
  assert.doesNotThrow(() => setOverlayVersion());
});

// The admin page writes to the scoreboard, which the overlay reads
Deno.test('a stored setting outranks config.js', async () => {
  const { setOverlayWidth, properties, warnings } = await loadOverlay({ state: stored('Width', 92) });
  setOverlayWidth();

  assert.equal(properties['--overlay-width-ratio'], '0.92');
  assert.deepEqual(warnings, []);
});

Deno.test('the overlay takes no settings from the URL', async () => {
  const { setOverlayWidth, properties } = await loadOverlay({
    search: '?width=75',
    state: stored('Width', 92)
  });
  setOverlayWidth();

  assert.equal(properties['--overlay-width-ratio'], '0.92');
});

Deno.test('a browser source is told which URL parameters the overlay ignores', async () => {
  const carried = await loadOverlay({ search: '?scale=90&anchor=bottom' });
  carried.warnAboutUrlParameters();
  assert.match(carried.warnings.join(' '), /Ignoring URL parameters \(scale, anchor\)/);

  const clean = await loadOverlay();
  clean.warnAboutUrlParameters();
  assert.deepEqual(clean.warnings, []);
});

Deno.test('the debug parameter is not reported as ignored', async () => {
  const overlay = await loadOverlay({ search: '?debug=true' });
  overlay.warnAboutUrlParameters();

  assert.deepEqual(overlay.warnings, []);
});

Deno.test('an unset setting falls back to config.js', async () => {
  for (const value of ['', '   ']) {
    const { setOverlayWidth, properties } = await loadOverlay({ state: stored('Width', value) });
    setOverlayWidth();
    assert.equal(properties['--overlay-width-ratio'], '0.85', `"${value}" should read as unset`);
  }
});

Deno.test('an invalid stored setting names the admin page in the warning', async () => {
  const { setOverlayWidth, properties, warnings } = await loadOverlay({ state: stored('Width', 140) });
  setOverlayWidth();

  assert.equal(properties['--overlay-width-ratio'], '0.85');
  assert.match(warnings.join(' '), /in the admin page \(must be in range 70-100\)/);
});

Deno.test('every kind of setting reads from the scoreboard', async () => {
  const overlay = await loadOverlay({
    state: {
      ...stored('Scale', 90),
      ...stored('Opacity', 60),
      ...stored('Anchor', 'bottom'),
      ...stored('Font', 'anton'),
      ...stored('BackgroundAnimation', 'organic'),
      ...stored('TimeoutAnimation', 'pulse'),
      ...stored('TitleText', 'PENALTY BOX')
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

Deno.test('the title comes from the admin page, then config.js', async () => {
  const titleSelector = (await loadOverlay()).CLASSES.penaltiesTitleH1Selector;

  const set = await loadOverlay({ state: stored('TitleText', 'PENALTY BOX') });
  set.setTitleBannerText();
  assert.equal(set.text[titleSelector], 'PENALTY BOX');

  const unset = await loadOverlay();
  unset.setTitleBannerText();
  assert.equal(unset.text[titleSelector], 'PENALTIES');
});

Deno.test('the title is visible unless a setting hides it', async () => {
  const { CLASSES } = overlay;
  const shown = await loadOverlay();
  shown.setTitleBannerVisible();
  assert.equal(shown.hasClass(CLASSES.penaltiesTitleSelector, 'visible'), true);

  const hidden = await loadOverlay({ state: stored('TitleVisible', 'false') });
  hidden.setTitleBannerVisible();
  assert.equal(hidden.hasClass(CLASSES.penaltiesTitleSelector, 'visible'), false);
  assert.deepEqual(hidden.warnings, []);
});

Deno.test('hiding the title leaves its text alone', async () => {
  const { CLASSES } = overlay;
  const hidden = await loadOverlay({
    state: { ...stored('TitleVisible', 'false'), ...stored('TitleText', 'PENALTY BOX') }
  });
  hidden.setTitleBannerText();
  hidden.setTitleBannerVisible();

  assert.equal(hidden.text[CLASSES.penaltiesTitleH1Selector], 'PENALTY BOX');
  assert.equal(hidden.hasClass(CLASSES.penaltiesTitleSelector, 'visible'), false);
});

Deno.test('an invalid title visibility falls back to showing the title', async () => {
  const { CLASSES } = overlay;
  const invalid = await loadOverlay({ state: stored('TitleVisible', 'maybe') });
  invalid.setTitleBannerVisible();

  assert.equal(invalid.hasClass(CLASSES.penaltiesTitleSelector, 'visible'), true);
  assert.match(invalid.warnings.join(' '), /must be true or false/);
});

Deno.test('the team logos are visible unless a setting hides them', async () => {
  const { CLASSES } = overlay;
  const shown = await loadOverlay();
  shown.setTeamLogos();
  assert.equal(shown.hasClass(CLASSES.teamsContainerSelector, 'logos-hidden'), false);

  const hidden = await loadOverlay({ state: stored('TeamLogos', 'false') });
  hidden.setTeamLogos();
  assert.equal(hidden.hasClass(CLASSES.teamsContainerSelector, 'logos-hidden'), true);
  assert.deepEqual(hidden.warnings, []);
});

Deno.test('config.js hides the team logos when the scoreboard holds nothing', async () => {
  const { CLASSES } = overlay;
  const configSource = (await readSource('penalties/config.js')).replace('teamLogos: true,', 'teamLogos: false,');
  const hidden = await loadOverlay({ configSource });
  hidden.setTeamLogos();

  assert.equal(hidden.hasClass(CLASSES.teamsContainerSelector, 'logos-hidden'), true);
  assert.deepEqual(hidden.warnings, []);
});

Deno.test('a stored team logo setting outranks config.js', async () => {
  const { CLASSES } = overlay;
  const configSource = (await readSource('penalties/config.js')).replace('teamLogos: true,', 'teamLogos: false,');
  const shown = await loadOverlay({ configSource, state: stored('TeamLogos', 'true') });
  shown.setTeamLogos();

  assert.equal(shown.hasClass(CLASSES.teamsContainerSelector, 'logos-hidden'), false);
});

Deno.test('an invalid team logo setting falls back to showing the logos', async () => {
  const { CLASSES } = overlay;
  const invalid = await loadOverlay({ state: stored('TeamLogos', 'sometimes') });
  invalid.setTeamLogos();

  assert.equal(invalid.hasClass(CLASSES.teamsContainerSelector, 'logos-hidden'), false);
  assert.match(invalid.warnings.join(' '), /must be true or false/);
});

Deno.test('the overlay follows every setting the page can write', async () => {
  const overlay = await loadOverlay();
  overlay.registerOverlaySettings();

  const registered = overlay.WS.registrations.at(-1).paths;
  const expected = Object.values(overlay.SETTINGS)
    .filter((setting) => setting.setting)
    .map((setting) => overlay.settingChannel(setting.setting));

  assert.deepEqual(registered, expected);
  assert.equal(registered.length, 11, 'eleven settings belong to the admin page');
});
