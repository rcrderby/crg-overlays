// Load the overlay scripts outside a browser to test their logic.
//
// index.js reads its configuration from 'window.AppConfig', registers its display
// helpers on 'window', and defers everything else to jQuery's 'ready' callback.
// Stubbing 'window', 'document', 'console', 'jQuery', and 'WS' is sufficient for testing.

const REPO = new URL('../../', import.meta.url);

// Names index.js keeps in module scope, exposed so tests can reach them
const INTERNALS = [
  'DEBUG',
  'LIMITS',
  'SETTING_SOURCES',
  'CONFIG',
  'LABELS',
  'PENALTIES',
  'RULES',
  'TIMING',
  'setOverlayScale',
  'setOverlayWidth',
  'setOverlayOpacity',
  'setOverlayAnchor',
  'setOverlayFont',
  'setPenaltyCodeKey'
];

// Read a file from the repository, whatever the working directory
export function readSource(path) {
  return Deno.readTextFile(new URL(path, REPO));
}

// Build a WebSocket stub holding the given ScoreBoard state
export function scoreboard(state = {}) {
  return { state, Register: () => {}, Connect: () => {}, AutoRegister: () => {} };
}

// Run config.js and index.js, and return their functions plus what they wrote
export async function loadOverlay({ configSource, indexSource, search = '', state = {} } = {}) {
  const config = configSource ?? (await readSource('penalties/config.js'));
  const index = indexSource ?? (await readSource('penalties/index.js'));

  const window = { location: { search } };
  new Function('window', config)(window);

  // CSS custom properties the setters write, keyed by property name
  const properties = {};
  const warnings = [];

  const document = {
    documentElement: { style: { setProperty: (name, value) => (properties[name] = String(value)) } },
    addEventListener: () => {},
    getElementById: () => null
  };
  const consoleStub = {
    log: () => {},
    warn: (message) => warnings.push(message),
    error: (message) => warnings.push(message)
  };

  // jQuery is called with the 'ready' callback, which must not run here
  const jQueryStub = () => ({
    text: () => {},
    empty: () => ({ removeClass: () => {} }),
    addClass: () => {},
    removeClass: () => {},
    attr: () => {}
  });

  const WS = scoreboard(state);
  const api = new Function(
    'window',
    'document',
    'console',
    '$',
    'setTimeout',
    'WS',
    `${index}\nreturn { ${INTERNALS.join(', ')} };`
  )(window, document, consoleStub, jQueryStub, () => 0, WS);

  return { ...api, window, WS, properties, warnings };
}
