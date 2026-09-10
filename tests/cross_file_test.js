// Names one file writes and another has to match, which no linter connects
// A rename on either side leaves the overlay running and silently wrong
// Each check proves a name still resolves, not that every rule using it survived

import assert from 'node:assert/strict';
import { loadOverlay, readSource } from './support/overlay.js';

const html = await readSource('penalties/index.html');
const css = await readSource('penalties/index.css');
const js = await readSource('penalties/index.js');
const adminHtml = await readSource('penalties/admin/index.html');

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
  const built = ['penaltyCodeKeyItemsSelector'];

  for (const [name, selector] of Object.entries(CLASSES)) {
    if (!selector.startsWith('#') && !selector.startsWith('.')) {
      continue;
    }

    if (built.includes(name)) {
      assert.ok(js.includes(`'${selector.slice(1)}'`), `index.js never builds ${selector} for ${name}`);
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

Deno.test('every custom property the overlay writes is read by its stylesheet', () => {
  const written = [...js.matchAll(/setProperty\('(--[a-z-]+)'/g)].map((match) => match[1]);

  assert.notEqual(written.length, 0, 'index.js writes no custom properties');

  for (const property of [...new Set(written)]) {
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

Deno.test('the text shadow the configuration file names is defined', () => {
  const [, property] = CLASSES.textShadow.match(/var\((--[a-z-]+)\)/);

  assert.match(css, new RegExp(`\\n\\s+${property}:`), `index.css never defines ${property}`);
});
