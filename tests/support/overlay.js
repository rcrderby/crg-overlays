// Load the overlay scripts outside a browser to test their logic.
//
// index.js reads its configuration from 'window.AppConfig', registers its display
// helpers on 'window', and defers everything else to jQuery's 'ready' callback.
// Stubbing 'window', 'document', 'console', 'jQuery', and 'WS' is sufficient for testing.

const REPO = new URL('../../', import.meta.url);

// Names index.js keeps in module scope, exposed so tests can reach them.
// Grouped by what each name is, then alphabetical within a group.
const INTERNALS = [
  // Constants, including the configuration sections config.js supplies
  'ALLOWED_URL_PARAMS',
  'CLASSES',
  'CONFIG',
  'DEBUG',
  'LABELS',
  'PENALTIES',
  'REQUIRED_SECTIONS',
  'RULES',
  'SETTINGS',
  'SETTING_SOURCES',
  'TIMING',
  'VALIDATION',

  // Functions that apply a setting
  'setBackgroundAnimation',
  'setOverlayAnchor',
  'setOverlayFont',
  'setOverlayOpacity',
  'setOverlayScale',
  'setOverlayVersion',
  'setOverlayWidth',
  'setPenaltyCodeKey',
  'setTimeoutAnimation',

  // Functions that build and size the penalty code key
  'buildPenaltyCodeKey',
  'fitPenaltyCodeKey',
  'registerPenaltyCodeKey',
  'schedulePenaltyCodeKeyRebuild',

  // Functions that read game data
  'getPenaltyCodeCue',
  'getPenaltyCodesInPlay',
  'getSkaterContext'
];

// Read a file from the repository, whatever the working directory
export function readSource(path) {
  return Deno.readTextFile(new URL(path, REPO));
}

// Build a WebSocket stub holding the given ScoreBoard state
export function scoreboard(state = {}) {
  const registrations = [];

  return {
    state,
    registrations,
    Register: (paths, callback) => registrations.push({ paths, callback }),
    Connect: () => {},
    AutoRegister: () => {}
  };
}

// A jQuery and DOM stand-in, enough for the penalty code key to build itself and
// to report the widths it measures.  Nothing here lays anything out, so the test
// supplies the widths that decide whether the key has to shrink.
function penaltyCodeKeyDom({ available = 0, codeWidth = 0, fontSize = 15 } = {}) {
  const node = (tag) => {
    const self = {
      tag,
      classes: new Set(),
      children: [],
      textContent: '',
      offsetWidth: codeWidth,
      styles: {},
      style: {
        setProperty: (name, value) => (self.styles[name] = value),
        removeProperty: (name) => delete self.styles[name]
      },
      // Only the row the key measures reports a width to fit within
      get clientWidth() {
        return self.classes.has('code-key-items') ? available : 0;
      },
      addClass: (name) => (self.classes.add(name), self),
      removeClass: (name) => (self.classes.delete(name), self),
      toggleClass: (name, on) => (on ? self.classes.add(name) : self.classes.delete(name), self),
      text: (value) => ((self.textContent = String(value)), self),
      empty: () => ((self.children = []), self),
      append: (...args) => (self.children.push(...args.flat()), self)
    };

    return self;
  };

  const key = node('#penalty-code-key');

  // Every node beneath the key, so a selector can find the row
  const descendants = (root) =>
    root.children.flatMap((child) => (child.children ? [child, ...descendants(child)] : [child]));

  const row = () => descendants(key).find((child) => child.classes?.has('code-key-items'));

  return {
    key,
    jQuery: (selector) => (typeof selector === 'string' && selector.startsWith('#') ? key : node(selector)),
    querySelector: (selector) =>
      descendants(key).find((child) => child.classes?.has(selector.replace('.', ''))) ?? null,
    createTextNode: (text) => ({ textContent: String(text) }),
    getComputedStyle: () => ({ fontSize: row()?.styles['--font-penalty-code-key-size'] ?? `${fontSize}px` }),

    // What the key currently shows, in the order it shows it
    rendered: () => {
      const items = row();

      return {
        visible: key.classes.has('visible'),
        fittedSize: items?.styles['--font-penalty-code-key-size'] ?? null,
        items: (items?.children ?? []).map((item) => ({
          code: item.children[0]?.textContent ?? '',
          cue: item.children[1]?.textContent ?? ''
        }))
      };
    }
  };
}

// Run config.js and index.js, and return their functions plus what they wrote
export async function loadOverlay({ configSource, indexSource, search = '', state = {}, dom = {} } = {}) {
  const config = configSource ?? (await readSource('penalties/config.js'));
  const index = indexSource ?? (await readSource('penalties/index.js'));

  const window = { location: { search } };
  new Function('window', config)(window);

  // CSS custom properties the setters write, keyed by property name
  const properties = {};
  const warnings = [];

  // Classes the animation settings apply to the overlay element
  const overlayClasses = new Set();
  const overlayElement = {
    dataset: {},
    classList: {
      add: (name) => overlayClasses.add(name),
      remove: (name) => overlayClasses.delete(name),
      contains: (name) => overlayClasses.has(name)
    }
  };

  const keyDom = penaltyCodeKeyDom(dom);

  const document = {
    documentElement: { style: { setProperty: (name, value) => (properties[name] = String(value)) } },
    addEventListener: () => {},
    getElementById: (id) => (id === 'overlay' ? overlayElement : null),
    querySelector: keyDom.querySelector,
    createTextNode: keyDom.createTextNode
  };
  const consoleStub = {
    log: () => {},
    warn: (message) => warnings.push(message),
    error: (message) => warnings.push(message)
  };

  // jQuery is called with the 'ready' callback, which must not run here
  const jQueryStub = (selector) =>
    typeof selector === 'function' ? { text: () => {}, attr: () => {} } : keyDom.jQuery(selector);

  // Timers the overlay sets, run only when a test asks for them
  const timers = [];
  const setTimeoutStub = (callback, delay) => timers.push({ callback, delay });

  const WS = scoreboard(state);
  const api = new Function(
    'window',
    'document',
    'console',
    '$',
    'setTimeout',
    'getComputedStyle',
    'WS',
    `${index}\nreturn { ${INTERNALS.join(', ')} };`
  )(window, document, consoleStub, jQueryStub, setTimeoutStub, keyDom.getComputedStyle, WS);

  // Run every pending timer, and report what was waiting
  const runTimers = () => timers.splice(0).map((timer) => (timer.callback(), timer));

  return { ...api, window, WS, properties, warnings, overlayClasses, key: keyDom.rendered, timers, runTimers };
}
