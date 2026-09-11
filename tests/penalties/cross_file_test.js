// Names one file writes and another has to match, which no linter connects
// A rename on either side leaves the overlay running and silently wrong
// Each check proves a name still resolves, not that every rule using it survived

import assert from 'node:assert/strict';
import { loadAdminPage, loadOverlay, readSource } from './support/overlay.js';
import { overlaySetting, teamAlternateName, teamColorChannel, teamNameChannel } from './support/channels.js';

const html = await readSource('penalties/index.html');
const css = await readSource('penalties/index.css');
const js = await readSource('penalties/index.js');
const adminHtml = await readSource('penalties/admin/index.html');
const adminCss = await readSource('penalties/admin/index.css');

const { CLASSES, TOGGLES } = await loadOverlay();

// Every id, class and tag a selector names, and how the markup writes each one
function inMarkup(selector) {
  return selector.split(' ').every((part) => {
    if (part.startsWith('#')) {
      return new RegExp(`id="${part.slice(1)}"`).test(html);
    }

    if (part.startsWith('.')) {
      return new RegExp(`class="[^"]*\\b${part.slice(1)}\\b`).test(html);
    }

    return new RegExp(`<${part}[\\s>]`).test(html);
  });
}

// Class names a JavaScript object maps its options to
function classesInMap(name) {
  const [, body] = js.match(new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n\\};`));

  return [...body.matchAll(/: '([a-z-]+)'/g)].map((match) => match[1]);
}

// A selector named inside `:has()` or `:not()` is a condition, not a rule of its own,
// so those arguments come out before anything looks for a rule
const rules = (() => {
  let stripped = css;

  // Each pass drops the innermost arguments, so nesting unwinds from the inside out
  while (stripped.includes('(')) {
    const shorter = stripped.replace(/\([^()]*\)/g, '');

    if (shorter === stripped) {
      break;
    }

    stripped = shorter;
  }

  return stripped;
})();

// A rule naming the selector, whether it stands alone or leads a longer one
// The lookahead stops `.trace` from matching a rule for `.traces`
function hasRule(selector) {
  return new RegExp(`${selector.replace(/[.#]/g, '\\$&')}(?![\\w-])`).test(rules);
}

Deno.test('every state class the overlay toggles has a rule on its container', () => {
  for (const [name, toggle] of Object.entries(TOGGLES)) {
    const rule = `${toggle.selector}.${toggle.class}`;

    assert.ok(hasRule(rule), `index.css has no ${rule} rule for the ${name} toggle`);
  }
});

Deno.test('every container the overlay toggles a class on exists in the markup', () => {
  for (const [name, toggle] of Object.entries(TOGGLES)) {
    assert.ok(inMarkup(toggle.selector), `index.html has no ${toggle.selector} for the ${name} toggle`);
  }
});

// The key builds its own markup, so its items live in index.js rather than index.html
Deno.test('every selector in the classes section resolves to markup or a rule', () => {
  const built = ['penaltyCodeKeyItemsSelector', 'rosterLineOverLimitSelector'];

  for (const [name, selector] of Object.entries(CLASSES)) {
    assert.ok(selector.startsWith('#') || selector.startsWith('.'), `${name} is not a selector`);

    if (built.includes(name)) {
      assert.ok(js.includes(`CLASSES.${name}`), `index.js never uses ${name}`);
      assert.ok(hasRule(selector), `index.css has no ${selector} rule for ${name}`);
      continue;
    }

    assert.ok(inMarkup(selector), `index.html has no ${selector} for ${name}`);
  }
});

Deno.test('every animation the overlay offers has a rule', () => {
  for (const name of ['BACKGROUND_ANIMATIONS', 'TIMEOUT_ANIMATIONS']) {
    const classes = classesInMap(name);

    assert.notEqual(classes.length, 0, `index.js defines no animation classes in ${name}`);

    for (const className of classes) {
      assert.ok(hasRule(`.${className}`), `index.css has no .${className} rule from ${name}`);
    }
  }
});

Deno.test('every class the penalty code key builds has a rule', () => {
  const built = [...js.matchAll(/addClass\('([a-z-]+)'\)/g)].map((match) => match[1]);

  assert.notEqual(built.length, 0, 'index.js builds no classes');

  for (const className of built) {
    assert.ok(hasRule(`.${className}`), `index.css has no .${className} rule`);
  }
});

// index.js writes some properties through a helper, so every name it holds is checked
Deno.test('every custom property index.js names is read by its stylesheet', () => {
  const named = [...js.matchAll(/'(--[a-z-]+)'/g)].map((match) => match[1]);

  assert.notEqual(named.length, 0, 'index.js names no custom properties');

  for (const property of [...new Set(named)]) {
    assert.ok(css.includes(`var(${property}`), `index.css never reads ${property}`);
  }
});

Deno.test('every property the admin page previews is one the overlay writes', () => {
  const previewed = [...adminHtml.matchAll(/data-preview="(--[a-z-]+)"/g)].map((match) => match[1]);

  assert.notEqual(previewed.length, 0, 'the admin page previews no custom properties');

  for (const property of [...new Set(previewed)]) {
    assert.ok(js.includes(`setProperty('${property}'`), `index.js never writes ${property}`);
    assert.ok(css.includes(`var(${property}`), `index.css never reads ${property}`);
  }
});

// `justify-content` places the overlay down the frame only while the column is vertical,
// and would otherwise move it sideways with nothing to say so
Deno.test('the rule that anchors the overlay lays its children out in a column', () => {
  const [, rule] = css.match(/\nbody \{([\s\S]*?)\n\}/);

  assert.match(rule, /justify-content: var\(--overlay-justify/, 'body places the overlay');
  assert.match(rule, /display: flex/, 'body is a flex container');
  assert.match(rule, /flex-direction: column/, 'and stacks down the frame');
});

// The colors reach the panel as custom properties, so nothing in the markup names them
Deno.test('the team heading and its panel read the colors index.js writes', () => {
  const [, heading] = css.match(/\n\.team-heading \{([\s\S]*?)\n\}/);
  const [, panel] = css.match(/\n\.roster-penalties-container \{([\s\S]*?)\n\}/);

  assert.match(heading, /background-color: var\(--team-background-color,/, 'the heading takes the team background');
  assert.match(heading, /\n {2}color: var\(--team-text-color,/, 'and the team text color');
  assert.match(heading, /text-shadow: var\(--team-text-shadow,/, 'and the team glow');
  assert.match(panel, /var\(--team-background-color,/, 'the panel border takes the team background');
});

// The name binding lists the setting alongside the CRG paths, so either can fire it
Deno.test('every team name binding follows the name setting the admin page writes', async () => {
  const { SETTINGS, settingChannel } = await loadOverlay();
  const bindings = [...html.matchAll(/sbDisplay="([\s\S]*?getTeamNameWithDefault)"/g)].map((match) => match[1]);

  assert.equal(bindings.length, 4, 'both teams show their name twice');

  for (const team of [1, 2]) {
    for (const setting of [`team${team}Name`, `team${team}NameOverride`]) {
      const path = `/${settingChannel(SETTINGS[setting].setting)}`;
      const following = bindings.filter((binding) => binding.includes(`${path},`) || binding.includes(`${path}:`));

      assert.equal(following.length, 2, `team ${team} follows ${path} in both places`);
    }
  }
});

// index.js removes a blank color from a panel, so the stylesheet's own default applies
Deno.test('every team color a panel can leave unset names a default that exists', () => {
  const defaults = [...css.matchAll(/var\(--team-[a-z-]+, var\((--[a-z-]+)\)\)/g)].map(([, name]) => name);

  assert.equal(defaults.length, 4, 'the border, background, text and shadow each name a default');

  for (const property of new Set(defaults)) {
    assert.match(css, new RegExp(`\\n\\s+${property}:`), `index.css never defines ${property}`);
  }
});

// The admin page divides the panel width by the frame's own width to scale the preview
// A frame that disagrees with the overlay scales the preview to the wrong size
Deno.test('the preview frame renders at the size the overlay is drawn at', () => {
  const frame = adminCss.match(/#preview-overlay \{[^}]*\}/)[0];

  for (const [property, variable] of [
    ['width', '--overlay-width'],
    ['height', '--overlay-height']
  ]) {
    const [, framed] = frame.match(new RegExp(`\\n\\s+${property}: (\\d+px);`));
    const [, drawn] = css.match(new RegExp(`\\n\\s+${variable}: (\\d+px);`));

    assert.equal(framed, drawn, `#preview-overlay ${property} disagrees with ${variable}`);
  }
});

// Each page carries its own copy of these, because a CRG custom screen stands alone
// A page that drifts reads or writes a channel the other one never sees
Deno.test('the overlay and the admin page name the same channels', async () => {
  const overlay = await loadOverlay();
  const admin = await loadAdminPage();

  // The right side is written out in full, so neither page's copy stands as its own proof
  for (const name of ['TitleVisible', 'Team1Name', 'Team2ColorOverride', 'Width']) {
    assert.equal(overlay.settingChannel(name), overlaySetting(name), `the overlay stores ${name} elsewhere`);
    assert.equal(admin.settingChannel(name), overlaySetting(name), `the admin page stores ${name} elsewhere`);
  }

  for (const team of [1, 2]) {
    const fields = [
      ['Name', teamNameChannel(team)],
      ['AlternateName(whiteboard)', teamAlternateName(team)],
      ['Color(whiteboard.bg)', teamColorChannel(team, 'bg')],
      ['Color(whiteboard.fg)', teamColorChannel(team, 'fg')],
      ['Color(whiteboard.glow)', teamColorChannel(team, 'glow')]
    ];

    for (const [field, channel] of fields) {
      assert.equal(overlay.teamChannel(team, field), channel, `the overlay reads team ${team} ${field} elsewhere`);
      assert.equal(admin.teamChannel(team, field), channel, `the admin page reads team ${team} ${field} elsewhere`);
    }
  }
});
