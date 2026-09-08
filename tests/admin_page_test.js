// The admin page names each setting as a string, in its markup and in its script
// These checks identify when the overlay and the page disagree

import assert from 'node:assert/strict';
import { loadOverlay, loadAdminPage, readSource } from './support/overlay.js';
import { overlaySetting } from './support/channels.js';

const html = await readSource('penalties/admin/index.html');
const js = await readSource('penalties/admin/index.js');

// The settings the page knows, and where each one reads its default
const [, table] = js.match(/const SETTINGS = \{([\s\S]*?)\n\};/);
const known = [...table.matchAll(/([A-Za-z]+): \{ config: '([A-Za-z]+)', validation: '([A-Za-z]+)' \}/g)];

// The settings the page's controls write
const written = [...new Set([...html.matchAll(/data-setting="([A-Za-z]+)"/g)].map((match) => match[1]))];

Deno.test('the admin page writes every setting the overlay reads', async () => {
  const { SETTINGS } = await loadOverlay();
  const read = Object.values(SETTINGS)
    .filter((setting) => setting.setting)
    .map((setting) => setting.setting);

  assert.deepEqual(known.map(([, name]) => name).sort(), read.sort());
  assert.deepEqual(written.sort(), read.sort(), 'every setting has a control');
});

Deno.test('the admin page reads its defaults and ranges from the configuration file', async () => {
  const { window } = await loadOverlay();
  const { config, validation } = window.AppConfig.PenaltiesOverlayConfig;

  for (const [, name, configKey, validationKey] of known) {
    assert.notEqual(config[configKey], undefined, `config.js sets ${configKey} for ${name}`);
    assert.notEqual(validation[validationKey], undefined, `config.js validates ${validationKey} for ${name}`);
  }

  // A range in the markup would be a second place to change these values
  assert.equal(/<input[^>]*type="(?:range|number)"[^>]*\b(?:min|max)=/.test(html), false);
});

Deno.test('the admin page loads what CRG needs before CRG loads itself', () => {
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((match) => match[1]);

  // core.js loads the file upload plugin and jQuery UI together, and the plugin calls jQuery UI
  assert.ok(scripts.indexOf('/external/jquery-ui/jquery-ui.js') < scripts.indexOf('/json/core.js'));

  // index.js reads the overlay's configuration file
  assert.ok(scripts.indexOf('../config.js') < scripts.indexOf('/json/core.js'));
});

Deno.test('a control shows the setting the scoreboard holds', async () => {
  const page = await loadAdminPage({ state: { 'ScoreBoard.Settings.Setting(Penalties.Overlay.Width)': '92' } });

  assert.equal(page.settingValue('Width'), '92');
});

Deno.test('a control shows the configured value when the scoreboard holds nothing', async () => {
  const page = await loadAdminPage({ state: { 'ScoreBoard.Settings.Setting(Penalties.Overlay.Width)': '  ' } });

  assert.equal(page.settingValue('Width'), String(page.CONFIG.overlayWidth));
  assert.equal(page.settingValue('TitleText'), page.CONFIG.titleBannerText);
  assert.equal(page.settingValue('Scale'), String(page.CONFIG.overlayScale));
});

Deno.test('a control falls back to the default when the configured value is blank', async () => {
  const source = await readSource('penalties/config.js');
  const configSource = source.replace("titleBannerText: 'PENALTIES'", "titleBannerText: ''");
  const page = await loadAdminPage({ configSource });

  assert.equal(page.settingValue('TitleText'), page.VALIDATION.title.default);
});

Deno.test('the admin page and the overlay name the same channels', async () => {
  const page = await loadAdminPage();
  const overlay = await loadOverlay();

  for (const name of Object.keys(page.SETTINGS)) {
    assert.equal(page.settingChannel(name), overlay.settingChannel(name));
  }
});

Deno.test('the admin page registers a channel the scoreboard always holds', async () => {
  const page = await loadAdminPage();

  // CRG hides the page until a registered channel reports a value, and an unset setting reports none
  assert.match(page.READY_CHANNEL, /^ScoreBoard\./);
  assert.equal(page.READY_CHANNEL.startsWith('ScoreBoard.Settings.Setting('), false);
  assert.match(js, /WS\.Register\(\[READY_CHANNEL\]\)/);
});

Deno.test('every preview backdrop the page offers is styled', async () => {
  const css = await readSource('penalties/admin/index.css');
  const offered = [...html.matchAll(/<button[^>]*class="preview-backdrop[^>]*>/g)].map(
    (match) => match[0].match(/data-backdrop="([a-z]+)"/)[1]
  );
  const [, start] = html.match(/<div id="preview-stage"[^>]*data-backdrop="([a-z]+)"/);

  assert.notEqual(offered.length, 0, 'the preview offers a backdrop to choose');
  assert.ok(offered.includes(start), 'the preview starts on a backdrop the page offers');

  for (const backdrop of offered) {
    assert.match(css, new RegExp(`#preview-stage\\[data-backdrop='${backdrop}'\\]`));
  }
});

Deno.test('the title has a tick box that hides it', async () => {
  const page = await loadAdminPage();

  // The box is ticked to hide the title, so it stores the opposite
  assert.match(html, /<input type="checkbox" data-setting="TitleVisible" data-invert="true">/);
  assert.equal(page.SETTINGS.TitleVisible.config, 'titleBannerVisible');

  // The text and the box are independent, so neither one writes the other
  assert.equal(page.settingValue('TitleVisible'), 'true');
  assert.equal(page.settingValue('TitleText'), 'PENALTIES');
});

Deno.test('an empty title reads as the configured title', async () => {
  const page = await loadAdminPage({ state: { [overlaySetting('TitleText')]: '' } });

  assert.equal(page.settingValue('TitleText'), page.CONFIG.titleBannerText);
});

Deno.test('a setting with nothing behind it reads as blank', async () => {
  const source = await readSource('penalties/config.js');
  const configSource = source
    .replace("titleBannerText: 'PENALTIES'", "titleBannerText: ''")
    .replace("title: { default: 'PENALTIES' }", "title: { default: '' }");
  const page = await loadAdminPage({ configSource });

  assert.equal(page.settingValue('TitleText'), '');
});

// A field stands in for the jQuery object the page binds
const field = ({ type = 'number', value = '', ticked = false, invert = false }) => ({
  attr: () => type,
  val: () => value,
  prop: () => ticked,
  data: () => invert
});

Deno.test('a number box holds its value to the configured range', async () => {
  const page = await loadAdminPage();
  const { min, max } = page.VALIDATION.width;

  assert.equal(page.committedValue(field({ value: String(max + 40) }), 'Width'), String(max));
  assert.equal(page.committedValue(field({ value: String(min - 40) }), 'Width'), String(min));
  assert.equal(page.committedValue(field({ value: '92' }), 'Width'), '92');
});

Deno.test('an empty number box clears the setting', async () => {
  const page = await loadAdminPage();

  assert.equal(page.committedValue(field({ value: '' }), 'Width'), '');
  assert.equal(page.committedValue(field({ value: 'wide' }), 'Width'), '');
});

Deno.test('a setting with no range keeps what the field holds', async () => {
  const page = await loadAdminPage();

  assert.equal(page.committedValue(field({ type: 'text', value: 'PENALTY BOX' }), 'TitleText'), 'PENALTY BOX');
});

Deno.test('a tick box stores the opposite of what it shows', async () => {
  const page = await loadAdminPage();
  const box = (ticked) => field({ type: 'checkbox', ticked, invert: true });

  assert.equal(page.committedValue(box(true), 'TitleVisible'), 'false');
  assert.equal(page.committedValue(box(false), 'TitleVisible'), 'true');
});

// The page bound to a stand-in for its own markup, so a control can be driven
// the way an operator drives it
async function boundPage(options = {}) {
  const page = await loadAdminPage(options);

  page.registerChoices();
  page.registerFields();
  page.registerBackdrops();
  page.registerActions();
  page.paintControls();

  return page;
}

Deno.test('every control starts on the value the overlay is showing', async () => {
  const page = await boundPage();

  assert.equal(page.dom.field('Width', 'number').value, String(page.CONFIG.overlayWidth));
  assert.equal(page.dom.field('TitleText', 'text').value, page.CONFIG.titleBannerText);
  assert.equal(page.dom.choice('Anchor', page.CONFIG.overlayAnchor).classes.has('selected'), true);
  assert.equal(page.dom.field('TitleVisible', 'checkbox').checked, false);
});

Deno.test('a slider and its number box carry the range from the configuration file', async () => {
  const page = await boundPage();
  const { min, max } = page.VALIDATION.width;

  for (const type of ['range', 'number']) {
    assert.equal(page.dom.field('Width', type).attrs.min, min);
    assert.equal(page.dom.field('Width', type).attrs.max, max);
  }
});

Deno.test('a choice writes the value it names', async () => {
  const page = await boundPage();
  const anton = page.dom.choice('Font', 'anton');

  page.dom.fire(anton, 'click');

  assert.deepEqual(page.WS.sets.at(-1), { path: page.settingChannel('Font'), value: 'anton' });
  assert.equal(anton.classes.has('selected'), true);
  assert.equal(page.dom.choice('Font', 'saira').classes.has('selected'), false);
});

Deno.test('the switch turns the penalties key off, then on again', async () => {
  const page = await boundPage();
  const key = page.dom.choice('PenaltyCodeKey', 'true');

  page.dom.fire(key, 'click');
  assert.equal(page.WS.sets.at(-1).value, 'false');
  assert.equal(key.classes.has('selected'), false);

  page.dom.fire(key, 'click');
  assert.equal(page.WS.sets.at(-1).value, 'true');
  assert.equal(key.classes.has('selected'), true);
});

Deno.test('a number box commits the value it holds, within the range', async () => {
  const page = await boundPage();
  const width = page.dom.field('Width', 'number');

  width.value = String(page.VALIDATION.width.max + 40);
  page.dom.fire(width, 'change');

  assert.equal(page.WS.sets.at(-1).value, String(page.VALIDATION.width.max));
  assert.equal(width.value, String(page.VALIDATION.width.max));
});

Deno.test('clearing a number box falls back to the configured value', async () => {
  const page = await boundPage();
  const width = page.dom.field('Width', 'number');

  width.value = '';
  page.dom.fire(width, 'change');

  assert.equal(page.WS.sets.at(-1).value, '');
  assert.equal(width.value, String(page.CONFIG.overlayWidth));
});

Deno.test('the title commits as it is typed, and the tick box leaves it alone', async () => {
  const page = await boundPage();
  const title = page.dom.field('TitleText', 'text');
  const hide = page.dom.field('TitleVisible', 'checkbox');

  title.value = 'PENALTY BOX';
  page.dom.fire(title, 'input');
  assert.deepEqual(page.WS.sets.at(-1), { path: page.settingChannel('TitleText'), value: 'PENALTY BOX' });

  hide.checked = true;
  page.dom.fire(hide, 'change');
  assert.deepEqual(page.WS.sets.at(-1), { path: page.settingChannel('TitleVisible'), value: 'false' });
  assert.equal(title.value, 'PENALTY BOX');
});

Deno.test('a field the operator is in is not repainted', async () => {
  const page = await boundPage();
  const title = page.dom.field('TitleText', 'text');

  title.focused = true;
  title.value = 'HALF TYPED';
  page.WS.Set(page.settingChannel('TitleText'), 'FROM ANOTHER TAB');

  assert.equal(title.value, 'HALF TYPED');
});

Deno.test('resetting clears every setting the page writes', async () => {
  const page = await boundPage({ state: { [overlaySetting('Width')]: '92' } });

  page.dom.fire(page.dom.button('reset-settings'), 'click');

  const cleared = page.WS.sets.filter((write) => write.value === '').map((write) => write.path);
  assert.deepEqual(
    cleared.sort(),
    Object.keys(page.SETTINGS)
      .map((name) => page.settingChannel(name))
      .sort()
  );
});

Deno.test('the backdrop buttons paint the preview stage', async () => {
  const page = await boundPage();

  page.dom.fire(page.dom.backdrop('light'), 'click');

  assert.equal(page.dom.stage().attrs['data-backdrop'], 'light');
  assert.equal(page.dom.backdrop('light').classes.has('selected'), true);
  assert.equal(page.dom.backdrop('checker').classes.has('selected'), false);
});

Deno.test('the preview scales the overlay into the panel', async () => {
  const page = await loadAdminPage({ stageWidth: 960 });

  page.scalePreview();

  assert.equal(page.frame.style.transform, 'scale(0.5)');
});

Deno.test('the overlay URL drops the admin page from the address', async () => {
  const page = await loadAdminPage();

  assert.equal(page.overlayUrl(), 'http://scoreboard:8000/custom/overlay/penalties');
});

Deno.test('the copy button reports back, then restores its label', async () => {
  const page = await boundPage();
  const button = page.dom.button('copy-url');

  button.label = 'Copy Overlay URL';
  page.dom.fire(button, 'click');
  await Promise.resolve();

  assert.equal(button.label, page.overlayUrl(), 'no clipboard, so the address is shown to copy by hand');
  assert.equal(button.attrs.title, page.overlayUrl());

  page.runTimers();
  assert.equal(button.label, 'Copy Overlay URL');
});

Deno.test('the channel prefix comes from the configuration file', async () => {
  const page = await loadAdminPage();
  const overlay = await loadOverlay();
  const { settingChannelPrefix } = page.window.AppConfig.PenaltiesOverlayConfig.storage;

  // Both pages build their channels from the one prefix config.js holds
  assert.ok(page.settingChannel('Width').startsWith(settingChannelPrefix));
  assert.equal(page.settingChannel('Width'), overlay.settingChannel('Width'));
  assert.equal(js.includes("'ScoreBoard.Settings.Setting("), false, 'the page names the prefix itself');
});
