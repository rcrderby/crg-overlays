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
