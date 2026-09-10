// Load the overlay scripts outside a browser to test their logic
// Stubs for 'window', 'document', 'console', 'jQuery' and 'WS' are enough to run index.js

const REPO = new URL('../../', import.meta.url);

// Names index.js keeps in module scope, exposed so tests can reach them
// Grouped by what each name is, then alphabetical within a group
const INTERNALS = [
  // Constants, including the configuration sections config.js supplies
  'CLASSES',
  'HEIGHT_HOLD_PASSES',
  'CONFIG',
  'DEBUG',
  'LABELS',
  'PENALTIES',
  'REQUIRED_SECTIONS',
  'RULES',
  'SETTINGS',
  'SETTING_SOURCES',
  'TIMING',
  'TOGGLES',
  'VALIDATION',

  // Functions that apply a setting
  'setBackgroundAnimation',
  'setOverlayAnchor',
  'setOverlayFont',
  'setOverlayOpacity',
  'setOverlayHeight',
  'setOverlayScale',
  'setOverlayVersion',
  'setOverlayWidth',
  'setPenaltyCodeKey',
  'setRosterTextScaling',
  'setTeamLogos',
  'setTeamsRowHeight',
  'setTimeoutAnimation',
  'setTitleBannerText',
  'setTitleBannerVisible',

  // Functions that apply and follow the admin page
  'applyOverlaySettings',
  'registerOverlaySettings',
  'settingChannel',
  'storedSetting',

  // Functions that build and size the penalty code key
  'buildPenaltyCodeKey',
  'fitPenaltyCodeKey',
  'fitRosterText',
  'holdOverlayHeight',
  'limitRosterRows',
  'registerPenaltyCodeKey',
  'registerRosterTextFit',
  'schedulePenaltyCodeKeyRebuild',
  'scheduleRosterTextFit',

  // Functions that read game data
  'getPenaltyCodeCue',
  'getPenaltyCodesInPlay',
  'getSkaterContext',

  // Functions that report on how the overlay was opened
  'warnAboutUrlParameters'
];

// Read a file from the repository, whatever the working directory
export function readSource(path) {
  return Deno.readTextFile(new URL(path, REPO));
}

// Build a WebSocket stub holding the given ScoreBoard state
export function scoreboard(state = {}) {
  const registrations = [];
  const sets = [];

  // A write reaches the state and the callbacks registered for that channel,
  // the way the scoreboard echoes one back
  const Set = (path, value) => {
    state[path] = String(value);
    sets.push({ path, value: String(value) });
    registrations.filter((entry) => entry.paths.includes(path)).forEach((entry) => entry.callback?.());
  };

  return {
    state,
    registrations,
    sets,
    Set,
    Register: (paths, callback) => registrations.push({ paths, callback }),
    Connect: () => {},
    AutoRegister: () => {}
  };
}

// A jQuery and DOM stand-in for the penalty code key
// Nothing lays anything out, so the test supplies the widths that decide the fit
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

// A DOM stand-in for the rosters, which report only the sizes the fit measures
// Nothing lays anything out, so the test supplies them
function rosterDom(rosters = []) {
  const panel = (spec) => {
    const { rows = 0, hiddenRows = 0, height = 0 } = spec;
    const { rowHeight = 29, headings = 24, gap = 4, teamHeading = 46 } = spec;
    const line = (visible) => {
      const classes = new Set();

      return {
        classList: {
          contains: (name) => classes.has(name),
          toggle: (name, on) => (on ? classes.add(name) : classes.delete(name))
        },
        get offsetHeight() {
          return visible && !classes.has('over-limit') ? rowHeight : 0;
        }
      };
    };
    // The skaters CRG hides sit among the rest, so they come first here
    const lines = [
      ...Array.from({ length: hiddenRows }, () => line(false)),
      ...Array.from({ length: rows }, () => line(true))
    ];

    return {
      clientHeight: height,
      headings: { offsetHeight: headings, marginBottom: `${gap}px` },
      teamHeading: { offsetHeight: teamHeading },
      lines
    };
  };

  const panels = rosters.map(panel);

  return {
    panels,
    querySelectorAll: (selector) => (selector === '.roster' ? panels : []),
    forPanel: (panel, selector) => (selector === '.roster-line' ? panel.lines : []),
    getComputedStyle: (element) => ({ marginBottom: element.marginBottom ?? '0px' })
  };
}

// Names admin/index.js keeps in module scope, exposed so tests can reach them
const ADMIN_PAGE_INTERNALS = [
  // Constants, including the configuration sections config.js supplies
  'CONFIG',
  'READY_CHANNEL',
  'SETTINGS',
  'VALIDATION',

  // Functions that read a setting
  'committedValue',
  'settingChannel',
  'settingValue',

  // Functions that bind and paint the controls
  'paintControls',
  'registerActions',
  'registerBackdrops',
  'registerChoices',
  'registerFields',
  'registerSliderPreview',

  // Functions that serve the preview and the page's own buttons
  'copyText',
  'overlayUrl',
  'previewDocument',
  'previewWindow',
  'refitPreview',
  'scalePreview'
];

// A jQuery and DOM stand-in for the admin page, built from the page's own
// markup, so the tests drive the controls the page ships
function adminPageDom(html) {
  const nodes = [];

  const node = (attrs = {}, classes = []) => {
    const element = {
      attrs,
      classes: new Set(classes),
      children: [],
      handlers: {},
      parent: null,
      value: '',
      checked: false,
      focused: false,
      label: ''
    };

    nodes.push(element);

    return element;
  };

  // Each setting's controls share a row, which the slider preview reads
  const rows = {};
  for (const tag of html.match(/<input[^>]*data-setting="[^"]*"[^>]*>/g) ?? []) {
    const attr = (name) => (tag.match(new RegExp(`${name}="([^"]*)"`)) ?? [])[1];
    const setting = attr('data-setting');
    const row = (rows[setting] = rows[setting] ?? node({}, ['setting-row']));
    const field = node({
      type: attr('type'),
      id: attr('id'),
      'data-setting': setting,
      'data-preview': attr('data-preview'),
      'data-preview-ratio': attr('data-preview-ratio'),
      'data-preview-unit': attr('data-preview-unit')
    });

    field.parent = row;
    row.children.push(field);
  }

  // Choice groups, and the buttons that follow each one until the next group
  let group = null;
  for (const tag of html.match(
    /<div[^>]*class="[^"]*setting-choices[^"]*"[^>]*>|<button[^>]*data-value="[^"]*"[^>]*>/g
  ) ?? []) {
    if (tag.startsWith('<div')) {
      group = node({ 'data-setting': (tag.match(/data-setting="([^"]*)"/) ?? [])[1] }, ['setting-choices']);
      continue;
    }

    const classes = ((tag.match(/class="([^"]*)"/) ?? [])[1] ?? '').split(' ');
    const choice = node({ 'data-value': (tag.match(/data-value="([^"]*)"/) ?? [])[1] }, classes);

    choice.parent = group;
    group.children.push(choice);
  }

  // The preview backdrops, the stage they paint, and the page's own buttons
  const stageBackdrop = (html.match(/id="preview-stage"[^>]*data-backdrop="([a-z]+)"/) ?? [])[1];
  node({ id: 'preview-stage', 'data-backdrop': stageBackdrop });
  for (const tag of html.match(/<button[^>]*class="preview-backdrop[^>]*>/g) ?? []) {
    node({ 'data-backdrop': (tag.match(/data-backdrop="([a-z]+)"/) ?? [])[1] }, ['preview-backdrop']);
  }
  for (const id of ['copy-url', 'reset-settings']) {
    node({ id });
  }

  // Selectors the page uses, in the shapes it writes them
  const matches = (element, selector) =>
    selector.split(/(?=[.#[])/).every((part) => {
      if (part.startsWith('#')) {
        return element.attrs.id === part.slice(1);
      }

      if (part.startsWith('.')) {
        return element.classes.has(part.slice(1));
      }

      if (part.startsWith('[')) {
        const [name, value] = part.slice(1, -1).split('=');

        return value === undefined ? element.attrs[name] !== undefined : element.attrs[name] === value;
      }

      return element.attrs.type !== undefined || part === '*';
    });

  const wrap = (elements) => {
    const list = [].concat(elements);
    const first = list[0];
    const api = {
      length: list.length,
      each(callback) {
        list.forEach((element, index) => callback.call(element, index, element));

        return api;
      },
      on(event, handler) {
        list.forEach((element) => (element.handlers[event] = element.handlers[event] ?? []).push(handler));

        return api;
      },
      attr(name, value) {
        if (typeof name === 'object') {
          list.forEach((element) => Object.assign(element.attrs, name));

          return api;
        }

        if (value === undefined) {
          return first?.attrs[name];
        }

        list.forEach((element) => (element.attrs[name] = String(value)));

        return api;
      },
      val(value) {
        if (value === undefined) {
          return first?.value;
        }

        list.forEach((element) => (element.value = String(value)));

        return api;
      },
      prop(name, value) {
        if (value === undefined) {
          return name === 'checked' ? Boolean(first?.checked) : first?.attrs[name];
        }

        list.forEach((element) => (element.checked = Boolean(value)));

        return api;
      },
      // A data attribute of 'true' reads back as a boolean, as jQuery returns it
      data(key) {
        const value = first?.attrs[`data-${key}`];

        return value === 'true' ? true : value === 'false' ? false : value;
      },
      text(value) {
        if (value === undefined) {
          return first?.label;
        }

        list.forEach((element) => (element.label = String(value)));

        return api;
      },
      is: (selector) => (selector === ':focus' ? Boolean(first?.focused) : matches(first, selector)),
      hasClass: (name) => Boolean(first?.classes.has(name)),
      toggleClass(name, on) {
        list.forEach((element) => (on ? element.classes.add(name) : element.classes.delete(name)));

        return api;
      },
      find: (selector) => wrap(list.flatMap((element) => element.children.filter((child) => matches(child, selector)))),
      closest(selector) {
        let element = first;

        while (element && !matches(element, selector)) {
          element = element.parent;
        }

        return wrap(element ? [element] : []);
      },
      css: () => api,
      appendTo: () => api,
      remove: () => api,
      trigger: () => api
    };

    return api;
  };

  const jQuery = (selector) => {
    if (typeof selector === 'function' || selector === undefined) {
      return wrap([]);
    }

    if (typeof selector === 'object') {
      return wrap([selector]);
    }

    if (selector.startsWith('<')) {
      return wrap([node({})]);
    }

    return wrap(nodes.filter((element) => matches(element, selector)));
  };

  const find = (predicate) => nodes.find(predicate);

  return {
    jQuery,
    nodes,

    // The controls a test drives, named the way the markup names them
    field: (setting, type) => find((n) => n.attrs['data-setting'] === setting && n.attrs.type === type),
    group: (setting) => find((n) => n.classes.has('setting-choices') && n.attrs['data-setting'] === setting),
    choice: (setting, value) =>
      find((n) => n.classes.has('setting-choices') && n.attrs['data-setting'] === setting).children.find(
        (child) => child.attrs['data-value'] === value
      ),
    backdrop: (name) => find((n) => n.classes.has('preview-backdrop') && n.attrs['data-backdrop'] === name),
    stage: () => find((n) => n.attrs.id === 'preview-stage'),
    button: (id) => find((n) => n.attrs.id === id),

    // Run the handlers a control carries for one event
    fire: (element, event) => (element.handlers[event] ?? []).forEach((handler) => handler.call(element, {}))
  };
}

// Run config.js and the admin page's index.js
// The page reaches the DOM from its 'ready' callback, which does not run here
export async function loadAdminPage({ configSource, state = {}, stageWidth = 960 } = {}) {
  const config = configSource ?? (await readSource('penalties/config.js'));
  const index = await readSource('penalties/admin/index.js');

  const window = { location: { href: 'http://scoreboard:8000/custom/overlay/penalties/admin/' } };
  new Function('window', config)(window);

  const WS = scoreboard(state);
  const consoleStub = { log: () => {}, error: () => {} };
  const dom = adminPageDom(await readSource('penalties/admin/index.html'));

  // The preview panel, which the page measures and scales the overlay into
  // Its window carries the overlay's own functions, which the page calls into
  const stage = { clientWidth: stageWidth };
  const previewOverlay = { refits: 0, properties: {} };

  previewOverlay.fitRosterText = () => (previewOverlay.refits += 1);

  const frame = {
    style: {},
    contentWindow: previewOverlay,
    contentDocument: {
      documentElement: { style: { setProperty: (name, value) => (previewOverlay.properties[name] = String(value)) } }
    }
  };
  const document = {
    getElementById: (id) => (id === 'preview-stage' ? stage : id === 'preview-overlay' ? frame : null)
  };

  // Timers the page sets, run only when a test asks for them
  const timers = [];
  const setTimeoutStub = (callback, delay) => timers.push({ callback, delay });

  const api = new Function(
    'window',
    'document',
    'console',
    '$',
    'WS',
    'setTimeout',
    'navigator',
    `${index}\nreturn { ${ADMIN_PAGE_INTERNALS.join(', ')} };`
  )(window, document, consoleStub, dom.jQuery, WS, setTimeoutStub, {});

  return {
    ...api,
    window,
    WS,
    dom,
    frame,
    previewOverlay,
    timers,
    runTimers: () => timers.splice(0).map((timer) => (timer.callback(), timer))
  };
}

// Run config.js and index.js, and return their functions plus what they wrote
export async function loadOverlay({
  configSource,
  indexSource,
  search = '',
  state = {},
  dom = {},
  rosters,
  overlayFrame = {}
} = {}) {
  // A test names only the sizes it cares about
  const frame = {
    height: 1080,
    inset: 32,
    offsetHeight: 1016,
    clientHeight: 990,
    scrollHeight: 990,
    logoRow: 100,
    logoRowNatural: 100,
    timeoutRow: 0,
    ...overlayFrame
  };
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

    // Setting the floor grows the box, the way it does in a real layout,
    // and the room inside it grows with it
    get offsetHeight() {
      const held = parseFloat(properties['--overlay-min-height']);

      return Number.isFinite(held) ? Math.max(frame.offsetHeight, held) : frame.offsetHeight;
    },
    get clientHeight() {
      const chrome = frame.offsetHeight - frame.clientHeight;

      return this.offsetHeight - chrome;
    },
    scrollHeight: frame.scrollHeight,
    classList: {
      add: (name) => overlayClasses.add(name),
      remove: (name) => overlayClasses.delete(name),
      contains: (name) => overlayClasses.has(name)
    }
  };

  const keyDom = penaltyCodeKeyDom(dom);
  const rosterElements = rosterDom(rosters);

  // A roster panel answers for the lines and headings inside it
  for (const panel of rosterElements.panels) {
    panel.querySelectorAll = (selector) => rosterElements.forPanel(panel, selector);
    panel.querySelector = (selector) => (selector === '.roster-headings' ? panel.headings : null);
    panel.parentElement = {
      querySelector: (selector) => (selector === '.team-heading' ? panel.teamHeading : null)
    };
  }

  const document = {
    documentElement: { style: { setProperty: (name, value) => (properties[name] = String(value)) } },
    addEventListener: () => {},
    getElementById: (id) => (id === 'overlay' ? overlayElement : null),
    querySelector: (selector) => {
      if (selector === '#teams-container') {
        return logoRow;
      }

      if (selector === '#timeout-banner-row') {
        return bannerRow;
      }

      return keyDom.querySelector(selector);
    },
    querySelectorAll: rosterElements.querySelectorAll,
    createTextNode: keyDom.createTextNode
  };
  const consoleStub = {
    log: () => {},
    warn: (message) => warnings.push(message),
    error: (message) => warnings.push(message)
  };

  // Text the overlay writes into the page, keyed by the selector it wrote to
  const text = {};

  // Classes the overlay toggles, keyed by the selector it toggled them on
  const classes = {};

  // jQuery is called with the 'ready' callback, which must not run here
  const jQueryStub = (selector) => {
    if (typeof selector === 'function') {
      return { text: () => {}, attr: () => {} };
    }

    const element = keyDom.jQuery(selector);
    const record = (value) => {
      text[selector] = value;
      return element;
    };

    // The key builds itself through the element, so its own classes follow too
    const toggle = (name, on) => {
      classes[selector] = classes[selector] ?? new Set();
      classes[selector][on ? 'add' : 'delete'](name);

      return element.toggleClass(name, on);
    };

    return {
      ...element,
      text: (value) => (value === undefined ? text[selector] : record(value)),
      toggleClass: toggle
    };
  };

  // Timers the overlay sets, run only when a test asks for them
  const timers = [];
  const setTimeoutStub = (callback, delay) => timers.push({ callback, delay });

  // The key's fit asks for a font size, and the roster fit for a heading margin
  const frameTokens = {
    '--overlay-height': `${frame.height}px`,
    '--overlay-inset-vertical': `${frame.inset}px`,
    '--height-logo-container': `${frame.logoRowNatural}px`
  };

  // The logo row the height floor measures
  // A test may give a height per pass, the way the row recovers as space is handed back
  const logoRowSteps = frame.logoRowSteps ?? [frame.logoRow];
  let logoRowReads = 0;
  const logoRow = {
    get offsetHeight() {
      const step = logoRowSteps[Math.min(logoRowReads, logoRowSteps.length - 1)];

      logoRowReads += 1;

      return step;
    }
  };
  const bannerRow = { offsetHeight: frame.timeoutRow };

  const computedStyle = (element) => {
    if (element === document.documentElement) {
      return { getPropertyValue: (name) => frameTokens[name] ?? '' };
    }

    return element && 'marginBottom' in element ? rosterElements.getComputedStyle(element) : keyDom.getComputedStyle();
  };

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
  )(window, document, consoleStub, jQueryStub, setTimeoutStub, computedStyle, WS);

  // Run every pending timer, and report what was waiting
  const runTimers = () => timers.splice(0).map((timer) => (timer.callback(), timer));

  // Whether a selector carries a class the overlay toggled on it
  const hasClass = (selector, name) => Boolean(classes[selector]?.has(name));

  return {
    ...api,
    window,
    WS,
    properties,
    warnings,
    overlayClasses,
    text,
    hasClass,
    key: keyDom.rendered,
    dom: { rosters: rosterElements.panels },
    timers,
    runTimers
  };
}
