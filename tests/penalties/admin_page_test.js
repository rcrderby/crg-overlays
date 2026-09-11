// The admin page names each setting as a string, in its markup and in its script
// These checks identify when the overlay and the page disagree

import assert from 'node:assert/strict';
import { loadOverlay, loadAdminPage, readSource } from './support/overlay.js';
import { overlaySetting, teamAlternateName, teamColorChannel } from './support/channels.js';

const html = await readSource('penalties/admin/index.html');
const js = await readSource('penalties/admin/index.js');

// The settings the page knows, and where each one reads its default
const [, table] = js.match(/const SETTINGS = \{([\s\S]*?)\n\};/);
const known = [...table.matchAll(/([A-Za-z0-9]+): \{ config: '([A-Za-z0-9]+)', validation: '([A-Za-z0-9]+)' \}/g)];

// The settings the page's controls write
const written = [...new Set([...html.matchAll(/data-setting="([A-Za-z0-9]+)"/g)].map((match) => match[1]))];

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

// Identify classes that style nothing
Deno.test('every class the admin page carries has a rule', async () => {
  const css = (await readSource('penalties/admin/index.css')).replace(/\/\*[\s\S]*?\*\//g, '');
  const carried = new Set();

  for (const attribute of html.matchAll(/class="([^"]*)"/g)) {
    for (const name of attribute[1].split(/\s+/)) {
      if (name) {
        carried.add(name);
      }
    }
  }

  const unstyled = [...carried].filter((name) => !new RegExp(`\\.${name}\\b`).test(css));

  assert.deepEqual(unstyled, [], `the markup carries classes nothing styles: ${unstyled.join(', ')}`);
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

Deno.test('the title has a switch that shows and hides it', async () => {
  const page = await loadAdminPage();

  // The switch reads the way the penalties key and team logos switches read
  assert.match(html, /data-setting="TitleVisible"[\s\S]*?class="setting-switch setting-choice"/);
  assert.equal(page.SETTINGS.TitleVisible.config, 'titleBannerVisible');

  // The text and the switch are independent, so neither one writes the other
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
const field = ({ type = 'number', value = '' }) => ({
  attr: () => type,
  val: () => value
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

// The page bound to a stand-in for its own markup, so a control can be driven
// the way an operator drives it
async function boundPage(options = {}) {
  const page = await loadAdminPage(options);

  page.registerChoices();
  page.registerFields();
  page.registerDefaults();
  page.registerSliderPreview();
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
  assert.equal(page.dom.choice('TitleVisible', 'true').classes.has('selected'), true);
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

Deno.test('the title commits as it is typed, and the switch leaves it alone', async () => {
  const page = await boundPage();
  const title = page.dom.field('TitleText', 'text');
  const shown = page.dom.choice('TitleVisible', 'true');

  title.value = 'PENALTY BOX';
  page.dom.fire(title, 'input');
  assert.deepEqual(page.WS.sets.at(-1), { path: page.settingChannel('TitleText'), value: 'PENALTY BOX' });

  // The switch reports the value it would set, so clicking it while it's on turns it off
  page.dom.fire(shown, 'click');
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

// The overlay decides its own height, so a drag has to run its fit rather than
// show a size the overlay would never settle on
Deno.test('dragging a slider asks the preview overlay to refit itself', async () => {
  const page = await boundPage();
  const height = page.dom.field('Height', 'range');

  height.value = '70';
  page.dom.fire(height, 'input');

  assert.equal(page.previewOverlay.properties['--overlay-height-ratio'], '0.7', 'the preview follows the drag');
  assert.equal(page.previewOverlay.refits, 1, 'and the overlay fits itself to it');
});

Deno.test('a preview that has not loaded is left alone', async () => {
  const page = await boundPage();
  const width = page.dom.field('Width', 'range');

  page.frame.contentWindow = null;
  width.value = '90';
  page.dom.fire(width, 'input');

  assert.equal(page.previewOverlay.refits, 0, 'nothing is called on a frame with no window');
});

// The overlay's script has to have run for its functions to be there, and the page
// loads before the frame does
Deno.test('a preview still loading its overlay is left alone', async () => {
  const page = await boundPage();
  const width = page.dom.field('Width', 'range');

  page.frame.contentWindow = {};
  width.value = '90';

  assert.doesNotThrow(() => page.dom.fire(width, 'input'), 'a window without the overlay is no error');
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

// The colors and the name CRG is sending, which the team controls fall back to
const CRG_TEAM_STATE = {
  [teamColorChannel(1, 'bg')]: '#78cbca',
  [teamColorChannel(1, 'fg')]: '#000000',
  [teamColorChannel(1, 'glow')]: '#ffffff',
  [teamAlternateName(1)]: 'Wheels of Justice'
};

const TEAM_1_COLORS = ['Team1BackgroundColor', 'Team1TextColor', 'Team1GlowColor'];

Deno.test('a color picker opens on the color CRG is sending, until an override replaces it', async () => {
  const page = await boundPage({ state: { ...CRG_TEAM_STATE, [overlaySetting('Team1ColorOverride')]: 'true' } });

  assert.equal(page.dom.field('Team1BackgroundColor', 'color').value, '#78cbca');

  page.WS.Set(page.settingChannel('Team1BackgroundColor'), '#123456');

  assert.equal(page.dom.field('Team1BackgroundColor', 'color').value, '#123456');

  // Turning the switch off puts the control back on what CRG is sending
  page.WS.Set(page.settingChannel('Team1ColorOverride'), 'false');

  assert.equal(page.dom.field('Team1BackgroundColor', 'color').value, '#78cbca');
  assert.equal(page.WS.state[page.settingChannel('Team1BackgroundColor')], '#123456', 'the override is kept');
});

Deno.test('a name switch enables the name field and the button beside it', async () => {
  const page = await boundPage({
    state: { ...CRG_TEAM_STATE, [overlaySetting('Team1Name')]: 'Bad Apples' }
  });
  const name = page.dom.field('Team1Name', 'text');

  assert.equal(name.props.disabled, true, 'the field waits for the switch');
  assert.equal(page.dom.reset('Team1Name').props.disabled, true);
  assert.equal(name.value, '', 'and shows nothing of its own while CRG supplies the name');

  page.dom.fire(page.dom.choice('Team1NameOverride', 'true'), 'click');

  assert.equal(name.props.disabled, false);
  assert.equal(page.dom.reset('Team1Name').props.disabled, false);
  assert.equal(name.value, 'Bad Apples', 'the override comes back');
});

Deno.test('a team switch enables the pickers and default buttons beneath it', async () => {
  const page = await boundPage({ state: CRG_TEAM_STATE });

  for (const setting of TEAM_1_COLORS) {
    assert.equal(page.dom.field(setting, 'color').props.disabled, true, `${setting} waits for the switch`);
    assert.equal(page.dom.reset(setting).props.disabled, true, `${setting} cannot be cleared yet`);
  }

  page.dom.fire(page.dom.choice('Team1ColorOverride', 'true'), 'click');

  for (const setting of TEAM_1_COLORS) {
    assert.equal(page.dom.field(setting, 'color').props.disabled, false, `${setting} is writable`);
    assert.equal(page.dom.reset(setting).props.disabled, false, `${setting} can be cleared`);
  }

  assert.equal(page.dom.field('Team2BackgroundColor', 'color').props.disabled, true, 'team 2 has its own switch');
});

Deno.test('a default button clears one setting and leaves the rest', async () => {
  const page = await boundPage({
    state: {
      ...CRG_TEAM_STATE,
      [overlaySetting('Team1ColorOverride')]: 'true',
      [overlaySetting('Team1BackgroundColor')]: '#123456',
      [overlaySetting('Team1TextColor')]: '#abcdef'
    }
  });

  page.dom.fire(page.dom.reset('Team1BackgroundColor'), 'click');

  assert.deepEqual(page.WS.sets.at(-1), { path: page.settingChannel('Team1BackgroundColor'), value: '' });
  assert.equal(page.dom.field('Team1BackgroundColor', 'color').value, '#78cbca', 'back to the CRG color');
  assert.equal(page.dom.field('Team1TextColor', 'color').value, '#abcdef', 'the other override stands');
});

Deno.test('a team name field stays empty, and shows the name CRG sends behind it', async () => {
  const page = await boundPage({ state: CRG_TEAM_STATE });
  const name = page.dom.field('Team1Name', 'text');

  assert.equal(name.value, '');
  assert.equal(name.attrs.placeholder, 'Wheels of Justice');

  name.value = 'Bad Apples';
  page.dom.fire(name, 'input');

  assert.deepEqual(page.WS.sets.at(-1), { path: page.settingChannel('Team1Name'), value: 'Bad Apples' });
});

Deno.test('a name placeholder follows the name CRG sends', async () => {
  const page = await boundPage({ state: CRG_TEAM_STATE });

  page.WS.Set(teamAlternateName(1), 'Bruise Crew');

  assert.equal(page.dom.field('Team1Name', 'text').attrs.placeholder, 'Bruise Crew');
});

// A control the page never binds, or a fetch it never makes, looks right and does nothing
Deno.test('the page binds every control group when it loads', () => {
  const [, ready] = js.match(/\$\(function \(\) \{([\s\S]*?)\n\}\);/);
  const defined = [...js.matchAll(/^function ((?:register|load)[A-Za-z]+)\(/gm)].map((match) => match[1]);

  assert.notEqual(defined.length, 0, 'the page defines no startup functions');

  for (const name of defined) {
    assert.ok(ready.includes(`${name}();`), `the page never calls ${name}`);
  }
});

// CRG reports the addresses it answers on at a path of its own, and a streaming
// computer reaches it over the network rather than at this page's own address
const CRG_URLS = 'http://192.168.1.50:8000/\n';

Deno.test('only an IPv4 address CRG reports is worth offering', async () => {
  const page = await loadAdminPage();

  assert.equal(page.ipv4Host('http://192.168.1.50:8000/'), '192.168.1.50:8000');
  assert.equal(page.ipv4Host('  http://10.0.0.8:8000/  '), '10.0.0.8:8000', 'a line arrives with its newline');
  assert.equal(page.ipv4Host('http://[fe80::1]:8000/'), '', 'IPv6 arrives bracketed');
  assert.equal(page.ipv4Host('http://scoreboard.local:8000/'), '', 'a name resolves differently elsewhere');
  assert.equal(page.ipv4Host(''), '');
  assert.equal(page.ipv4Host('not a url'), '');
});

Deno.test('the addresses on offer start with the one this page was opened from', async () => {
  const page = await loadAdminPage();

  assert.deepEqual(page.overlayUrlChoices(CRG_URLS), [
    'http://scoreboard:8000/custom/overlay/penalties',
    'http://192.168.1.50:8000/custom/overlay/penalties'
  ]);

  assert.deepEqual(page.overlayUrlChoices(''), ['http://scoreboard:8000/custom/overlay/penalties']);
});

Deno.test('an address CRG reports twice, or one already on offer, is listed once', async () => {
  const page = await loadAdminPage();
  const repeated = 'http://192.168.1.50:8000/\nhttp://192.168.1.50:8000/\nhttp://[fe80::1]:8000/\n';

  assert.equal(page.overlayUrlChoices(repeated).length, 2);

  // The page itself opened on an address CRG also reports
  const sameHost = await loadAdminPage();
  sameHost.window.location.href = 'http://192.168.1.50:8000/custom/overlay/penalties/admin/';

  assert.deepEqual(sameHost.overlayUrlChoices(CRG_URLS), ['http://192.168.1.50:8000/custom/overlay/penalties']);
});

Deno.test('the button copies straight away when there is nothing to choose between', async () => {
  const page = await boundPage();
  const button = page.dom.button('copy-url');

  await page.loadNetworkUrls();

  assert.equal(page.dom.options('copy-url-option').length, 0, 'no list is built');

  button.label = 'Copy Overlay URL';
  page.dom.fire(button, 'click');
  await Promise.resolve();

  assert.equal(button.label, page.overlayUrl(), 'no clipboard here, so the address is shown to copy by hand');
});

Deno.test('the button opens a list once CRG reports an address of its own', async () => {
  const page = await boundPage({ urls: CRG_URLS });
  const button = page.dom.button('copy-url');

  await page.loadNetworkUrls();

  const options = page.dom.options('copy-url-option');

  assert.deepEqual(
    options.map((option) => option.label),
    ['http://scoreboard:8000/custom/overlay/penalties', 'http://192.168.1.50:8000/custom/overlay/penalties']
  );

  assert.equal(page.dom.element('copy-url-list').classes.has('open'), false, 'the list starts closed');

  page.dom.fire(button, 'click');
  assert.equal(page.dom.element('copy-url-list').classes.has('open'), true);
  assert.equal(button.attrs['aria-expanded'], 'true');

  page.dom.fire(button, 'click');
  assert.equal(page.dom.element('copy-url-list').classes.has('open'), false, 'a second click closes it');
});

Deno.test('choosing an address copies it and closes the list', async () => {
  const page = await boundPage({ urls: CRG_URLS });

  await page.loadNetworkUrls();
  page.dom.fire(page.dom.button('copy-url'), 'click');

  const crgAddress = page.dom.options('copy-url-option')[1];

  page.dom.button('copy-url').label = 'Copy Overlay URL';
  page.dom.fire(crgAddress, 'click');
  await Promise.resolve();

  assert.equal(page.dom.button('copy-url').label, 'http://192.168.1.50:8000/custom/overlay/penalties');
  assert.equal(page.dom.element('copy-url-list').classes.has('open'), false);

  page.runTimers();
  assert.equal(page.dom.button('copy-url').label, 'Copy Overlay URL', 'the label comes back');
});

Deno.test('a page CRG cannot answer keeps the button it already had', async () => {
  const page = await boundPage({ urls: null });

  await page.loadNetworkUrls();

  assert.deepEqual(page.fetched, [page.window.AppConfig.PenaltiesOverlayConfig.storage.networkUrlsPath]);
  assert.equal(page.dom.options('copy-url-option').length, 0);

  const button = page.dom.button('copy-url');

  button.label = 'Copy Overlay URL';
  page.dom.fire(button, 'click');
  await Promise.resolve();

  assert.equal(button.label, page.overlayUrl(), 'the page address still copies');
});

// CRG serves over HTTP, so a page opened any other way still hands out a usable address
Deno.test('every address on offer carries the HTTP scheme', async () => {
  const page = await loadAdminPage();

  page.window.location.href = 'https://scoreboard:8000/custom/overlay/penalties/admin/';

  for (const url of page.overlayUrlChoices(CRG_URLS)) {
    assert.match(url, /^http:\/\//);
  }
});

// The list is built as the page runs, so its classes are not in the markup to check
Deno.test('every class the admin page builds has a rule', async () => {
  const css = await readSource('penalties/admin/index.css');
  const built = [...js.matchAll(/addClass\('([a-z-]+)'\)/g)].map((match) => match[1]);

  assert.notEqual(built.length, 0, 'the page builds no classes');

  for (const name of built) {
    assert.match(css, new RegExp(`\\.${name}\\b`), `index.css has no .${name} rule`);
  }
});

Deno.test('the page asks CRG at the path the configuration file names', async () => {
  const source = await readSource('penalties/config.js');
  const configSource = source.replace("networkUrlsPath: '/urls'", "networkUrlsPath: '/addresses'");
  const page = await loadAdminPage({ configSource, urls: CRG_URLS });

  await page.loadNetworkUrls();

  assert.deepEqual(page.fetched, ['/addresses']);
});

// An overlay served from the root has no path to carry, and the addresses still match
Deno.test('every address on offer is written the same way', async () => {
  const page = await loadAdminPage();

  page.window.location.href = 'http://127.0.0.1:8000/admin/';

  assert.deepEqual(page.overlayUrlChoices(CRG_URLS), ['http://127.0.0.1:8000', 'http://192.168.1.50:8000']);
});
