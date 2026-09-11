//  JavaScript for custom penalties overlay - index.html

'use strict';

/******************************************
 ** Configuration Import and Validation **
 *****************************************/

console.log('Loading Penalties Overlay configuration (config.js)...');

// Import configuration data from config.js
const PenaltiesOverlayConfig = window.AppConfig?.PenaltiesOverlayConfig;

// Show a configuration error when the overlay fails to load
function showConfigError(message) {
  const render = function () {
    // Literal selector in case CLASSES did not load
    const overlay = document.getElementById('loading-overlay');

    if (!overlay) {
      return;
    }

    overlay.classList.add('error');
    // Literal selector in case CLASSES did not load
    const loadingText = overlay.querySelector('.loading-text');

    if (loadingText) {
      loadingText.textContent = message;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
}

// Validate that config.js loaded correctly
if (typeof PenaltiesOverlayConfig === 'undefined') {
  console.error('ERROR: config.js did not load.');
  console.error('Make sure config.js is in the same directory as index.js');
  console.error('and that index.html includes: <script src="config.js"></script>');
  console.error('before <script> tags that import index.js and core.js.');
  showConfigError('Configuration error: config.js is missing or did not load. Check the browser console for details.');
  throw new Error('Configuration file (config.js) failed to load');
}

// Validate required configuration structure
const REQUIRED_SECTIONS = [
  'debug',
  'config',
  'storage',
  'validation',
  'classes',
  'toggles',
  'labels',
  'rules',
  'penalties',
  'timing'
];

const missingSections = REQUIRED_SECTIONS.filter((section) => !PenaltiesOverlayConfig[section]);

if (missingSections.length > 0) {
  const errorMsg = `Configuration file (config.js) is missing required sections: ${missingSections.join(', ')}`;
  console.error('ERROR:', errorMsg);
  showConfigError(`Configuration error: ${errorMsg}. Check the browser console for details.`);
  throw new Error(errorMsg);
}

// A toggle names the container it marks and the class it adds
const incompleteToggles = Object.entries(PenaltiesOverlayConfig.toggles)
  .filter(([, toggle]) => !toggle || !toggle.selector || !toggle.class)
  .map(([name]) => name);

if (incompleteToggles.length > 0) {
  const errorMsg = `Configuration file (config.js) has toggles missing a selector or class: ${incompleteToggles.join(', ')}`;
  console.error('ERROR:', errorMsg);
  showConfigError(`Configuration error: ${errorMsg}. Check the browser console for details.`);
  throw new Error(errorMsg);
}

console.log('config.js loaded successfully.');

/***********************
 ** Global Constants  **
 **********************/

// Configuration sections - available globally for all functions
const CONFIG = PenaltiesOverlayConfig.config;
const STORAGE = PenaltiesOverlayConfig.storage;
const VALIDATION = PenaltiesOverlayConfig.validation;
const CLASSES = PenaltiesOverlayConfig.classes;
const TOGGLES = PenaltiesOverlayConfig.toggles;
const LABELS = PenaltiesOverlayConfig.labels;
const RULES = PenaltiesOverlayConfig.rules;
const PENALTIES = PenaltiesOverlayConfig.penalties;
const TIMING = PenaltiesOverlayConfig.timing;

// Every setting, its scoreboard channel, and the term its messages use
// `debug` has no channel; config.js and a URL parameter set it
const SETTINGS = {
  anchor: { setting: 'Anchor', label: 'Overlay anchor' },
  background: { setting: 'BackgroundAnimation', label: 'Background animation' },
  debug: { label: 'Debug logging' },
  font: { setting: 'Font', label: 'Overlay font' },
  height: { setting: 'Height', label: 'Overlay height' },
  key: { setting: 'PenaltyCodeKey', label: 'Penalty code key' },
  opacity: { setting: 'Opacity', label: 'Overlay opacity' },
  rosterTextScaling: { setting: 'RosterTextScaling', label: 'Roster text scaling' },
  scale: { setting: 'Scale', label: 'Overlay scale' },
  team1BackgroundColor: { setting: 'Team1BackgroundColor', label: 'Team 1 background color' },
  team1ColorOverride: { setting: 'Team1ColorOverride', label: 'Team 1 color override' },
  team1GlowColor: { setting: 'Team1GlowColor', label: 'Team 1 glow color' },
  team1Name: { setting: 'Team1Name', label: 'Team 1 name' },
  team1NameOverride: { setting: 'Team1NameOverride', label: 'Team 1 name override' },
  team1TextColor: { setting: 'Team1TextColor', label: 'Team 1 text color' },
  team2BackgroundColor: { setting: 'Team2BackgroundColor', label: 'Team 2 background color' },
  team2ColorOverride: { setting: 'Team2ColorOverride', label: 'Team 2 color override' },
  team2GlowColor: { setting: 'Team2GlowColor', label: 'Team 2 glow color' },
  team2Name: { setting: 'Team2Name', label: 'Team 2 name' },
  team2NameOverride: { setting: 'Team2NameOverride', label: 'Team 2 name override' },
  team2TextColor: { setting: 'Team2TextColor', label: 'Team 2 text color' },
  teamLogos: { setting: 'TeamLogos', label: 'Team logos' },
  timeout: { setting: 'TimeoutAnimation', label: 'Timeout animation' },
  title: { setting: 'TitleText', label: 'Title text' },
  titleVisible: { setting: 'TitleVisible', label: 'Title visibility' },
  width: { setting: 'Width', label: 'Overlay width' }
};

// Each team's overrides: the setting the admin page writes and the value config.js holds
// `panel` is the element the colors are written to, which the team's rules read them from
const TEAM_SETTINGS = {
  1: {
    panel: CLASSES.team1PanelSelector,
    background: { ...SETTINGS.team1BackgroundColor, configValue: CONFIG.team1BackgroundColor },
    colorOverride: { ...SETTINGS.team1ColorOverride, configValue: CONFIG.team1ColorOverride },
    glow: { ...SETTINGS.team1GlowColor, configValue: CONFIG.team1GlowColor },
    name: { ...SETTINGS.team1Name, configValue: CONFIG.team1Name },
    nameOverride: { ...SETTINGS.team1NameOverride, configValue: CONFIG.team1NameOverride },
    text: { ...SETTINGS.team1TextColor, configValue: CONFIG.team1TextColor }
  },
  2: {
    panel: CLASSES.team2PanelSelector,
    background: { ...SETTINGS.team2BackgroundColor, configValue: CONFIG.team2BackgroundColor },
    colorOverride: { ...SETTINGS.team2ColorOverride, configValue: CONFIG.team2ColorOverride },
    glow: { ...SETTINGS.team2GlowColor, configValue: CONFIG.team2GlowColor },
    name: { ...SETTINGS.team2Name, configValue: CONFIG.team2Name },
    nameOverride: { ...SETTINGS.team2NameOverride, configValue: CONFIG.team2NameOverride },
    text: { ...SETTINGS.team2TextColor, configValue: CONFIG.team2TextColor }
  }
};

// The colors a team can override, each named for the CRG field it replaces
const TEAM_COLORS = ['background', 'glow', 'text'];

// Channel prefix for the settings the admin page writes
// Each setting holds a string, and an empty string reads as unset
const SETTING_CHANNEL_PREFIX = STORAGE.settingChannelPrefix;

// Scoreboard channel for settings storage
function settingChannel(name) {
  return `${SETTING_CHANNEL_PREFIX}${name})`;
}

// Scoreboard channel holding one of a team's fields
function teamChannel(teamNumber, field) {
  return `${STORAGE.teamChannelPrefix}${teamNumber}).${field}`;
}

// A setting's stored value, or 'undefined' when not set by the admin page
function storedSetting(name) {
  if (!name || typeof WS === 'undefined') {
    return undefined;
  }

  const stored = WS.state[settingChannel(name)];

  return typeof stored === 'string' && stored.trim() !== '' ? stored : undefined;
}

// Settings sources for validation messages
const SETTING_SOURCES = {
  config: 'config.js',
  default: 'default',
  settings: 'the admin page',
  url: 'URL parameter'
};

// The only setting the URL carries, for troubleshooting one browser source
const DEBUG_URL_PARAM = 'debug';

// The debug parameter's value, or 'null' when the URL does not carry it
function getDebugParameter() {
  return new URLSearchParams(window.location.search).get(DEBUG_URL_PARAM);
}

// Debugging setting, read before the settings that log through it
const DEBUG = getDebugSetting();
console.log('Debug mode:', DEBUG);

// Most looks the height floor takes, so an unsettled layout cannot hold it up
// It settles by gaining nothing on a pass, and two are enough in practice
const HEIGHT_HOLD_PASSES = 3;

// Overlay version to display as a watermark and log to the console
const OVERLAY_VERSION = '4.2.0';

// CRG WebSocket channels the overlay reads
const CHANNELS = {
  currentPeriod: 'ScoreBoard.CurrentGame.CurrentPeriodNumber',
  inOvertime: 'ScoreBoard.CurrentGame.InOvertime',
  intermissionLabel: 'ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Intermission)',
  intermissionRunning: 'ScoreBoard.CurrentGame.Clock(Intermission).Running',
  officialReview: 'ScoreBoard.CurrentGame.OfficialReview',
  officialScore: 'ScoreBoard.CurrentGame.OfficialScore',
  penaltyCode: 'ScoreBoard.CurrentGame.PenaltyCode',
  preGameLabel: 'ScoreBoard.Settings.Setting(ScoreBoard.Intermission.PreGame)',
  ruleFouloutCount: 'ScoreBoard.CurrentGame.Rule(Penalties.NumberToFoulout)',
  rulePeriodCount: 'ScoreBoard.CurrentGame.Rule(Period.Number)',
  team1Skaters: 'ScoreBoard.CurrentGame.Team(1).Skater',
  team2Skaters: 'ScoreBoard.CurrentGame.Team(2).Skater',
  timeoutRunning: 'ScoreBoard.CurrentGame.Clock(Timeout).Running'
};

/**************************
 ** Setting Resolution   **
 *************************/

// Report a percentage the way the settings describe themselves
function asPercent(value) {
  return `${value}%`;
}

// Settings arrive as text, and some of them match without regard to case
function lowercase(raw) {
  return raw.toLowerCase();
}

// Accept a number inside the allowed range, rounded to two decimal points
function inRange(allowed) {
  return (value) => {
    if (typeof value !== 'number' || isNaN(value)) {
      return { reason: 'must be numeric', display: `"${value}"` };
    }

    if (value < allowed.min || value > allowed.max) {
      return { reason: `must be in range ${allowed.min}-${allowed.max}`, display: `${value}` };
    }

    return { value: Math.round(value * 100) / 100 };
  };
}

// Accept one of the allowed names
function oneOf(choices) {
  return (value) => {
    if (typeof value !== 'string') {
      return { reason: 'must be a string', display: `"${value}"` };
    }

    if (!choices.includes(value.toLowerCase())) {
      return { reason: `must be one of ${choices.join(', ')}`, display: `"${value}"` };
    }

    return { value: value.toLowerCase() };
  };
}

// Accept text, which a blank string is not
function isText(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return { reason: 'must be text', display: `"${value}"` };
  }

  return { value: value.trim() };
}

// Accept a boolean, or the text a stored setting supplies for one
function isBoolean(value) {
  if (typeof value === 'boolean') {
    return { value };
  }

  if (value === 'true' || value === 'false') {
    return { value: value === 'true' };
  }

  return { reason: 'must be true or false', display: `"${value}"` };
}

// The hex color a color picker holds and hands back unchanged
// A picker writes six digits, and drops a shorthand or an alpha channel without saying so
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function isColor(value) {
  if (typeof value !== 'string' || !HEX_COLOR.test(value.trim())) {
    return { reason: 'must be a six digit hex color, as in #b3122e', display: `"${value}"` };
  }

  return { value: value.trim().toLowerCase() };
}

// Read a setting from the admin page, then config.js, then the validated default
// A URL parameter, which only `debug` carries, outranks both
// A validator returns the accepted value, or the reason it cannot be used
function resolveSetting({
  label,
  setting,
  urlValue = null,
  configValue,
  fallback,
  validate,
  parse,
  describe = String
}) {
  const storedValue = urlValue === null ? storedSetting(setting) : undefined;
  const raw = urlValue !== null ? urlValue : storedValue;
  const source =
    urlValue !== null
      ? SETTING_SOURCES.url
      : storedValue !== undefined
        ? SETTING_SOURCES.settings
        : SETTING_SOURCES.config;
  const value = raw !== null && raw !== undefined ? (parse ? parse(raw) : raw) : configValue;

  if (typeof value === 'undefined' || value === null) {
    console.warn(`${label} not defined in ${source} - using default (${describe(fallback)}).`);

    return { value: fallback, source: SETTING_SOURCES.default };
  }

  const result = validate(value);

  if ('value' in result) {
    return { value: result.value, source };
  }

  // The label opens the sentence above, and names the setting in this one
  const described = label.charAt(0).toLowerCase() + label.slice(1);
  console.warn(
    `Invalid ${described} value ${result.display} in ${source} (${result.reason}) - using default (${describe(fallback)}).`
  );

  return { value: fallback, source: SETTING_SOURCES.default };
}

// Validate the debug logging setting
function getDebugSetting() {
  const { value } = resolveSetting({
    ...SETTINGS.debug,
    urlValue: getDebugParameter(),
    configValue: PenaltiesOverlayConfig.debug?.enabled,
    fallback: VALIDATION.debug.default,
    parse: lowercase,
    validate: isBoolean
  });

  return value;
}

// Warn that the overlay ignores every URL parameter except `debug`
function warnAboutUrlParameters() {
  const ignored = [...new URLSearchParams(window.location.search).keys()].filter((name) => name !== DEBUG_URL_PARAM);

  if (ignored.length > 0) {
    console.warn(
      `Ignoring URL parameters (${ignored.join(', ')}) - the overlay reads its settings from the admin page and config.js.`
    );
  }
}

/**************************************
 ** Overlay Display Format Functions **
 *************************************/

// Validate and set the overlay scale value
function setOverlayScale() {
  const allowed = VALIDATION.scale;
  const { value, source } = resolveSetting({
    ...SETTINGS.scale,
    configValue: CONFIG.overlayScale,
    fallback: allowed.default,
    parse: parseFloat,
    describe: asPercent,
    validate: inRange(allowed)
  });

  // Convert percentage to decimal for CSS transform
  document.documentElement.style.setProperty('--overlay-scale', value / 100);

  if (DEBUG) {
    console.log(`Overlay scaled to ${value}% (from ${source}).`);
  }
}

// Validate and set the overlay width
function setOverlayWidth() {
  const allowed = VALIDATION.width;
  const { value, source } = resolveSetting({
    ...SETTINGS.width,
    configValue: CONFIG.overlayWidth,
    fallback: allowed.default,
    parse: parseFloat,
    describe: asPercent,
    validate: inRange(allowed)
  });

  // Convert percentage to a decimal ratio of the video frame width
  document.documentElement.style.setProperty('--overlay-width-ratio', value / 100);

  if (DEBUG) {
    console.log(`Overlay width set to ${value}% of the video frame (from ${source}).`);
  }
}

// Validate and set the overlay height
function setOverlayHeight() {
  const allowed = VALIDATION.height;
  const { value, source } = resolveSetting({
    ...SETTINGS.height,
    configValue: CONFIG.overlayHeight,
    fallback: allowed.default,
    parse: parseFloat,
    describe: asPercent,
    validate: inRange(allowed)
  });

  // Convert percentage to a decimal ratio of the video frame height
  document.documentElement.style.setProperty('--overlay-height-ratio', value / 100);

  if (DEBUG) {
    console.log(`Overlay height set to ${value}% of the video frame (from ${source}).`);
  }
}

// Animation option names mapped to the classes that drive them
const BACKGROUND_ANIMATIONS = {
  trace: 'background-trace',
  organic: 'background-organic',
  shine: 'background-shine',
  off: ''
};

const TIMEOUT_ANIMATIONS = {
  glow: 'timeout-glow',
  pulse: 'timeout-pulse',
  shine: 'timeout-shine',
  off: ''
};

// Validate an animation setting and apply its class to the overlay
function setAnimation(setting, configValue, animations, defaultName) {
  const { value, source } = resolveSetting({
    ...setting,
    configValue,
    fallback: defaultName,
    validate: oneOf(Object.keys(animations))
  });

  // Remove any previously applied class before applying the chosen one
  const overlay = document.getElementById('overlay');
  if (overlay) {
    for (const className of Object.values(animations)) {
      if (className !== '') {
        overlay.classList.remove(className);
      }
    }
    if (animations[value] !== '') {
      overlay.classList.add(animations[value]);
    }
  }

  if (DEBUG) {
    console.log(`${setting.label} set to ${value} (from ${source}).`);
  }
}

// Validate and set the background animation
function setBackgroundAnimation() {
  setAnimation(
    SETTINGS.background,
    CONFIG.backgroundAnimation,
    BACKGROUND_ANIMATIONS,
    VALIDATION.backgroundAnimation.default
  );
}

// Validate and set the timeout banner animation
function setTimeoutAnimation() {
  setAnimation(SETTINGS.timeout, CONFIG.timeoutAnimation, TIMEOUT_ANIMATIONS, VALIDATION.timeoutAnimation.default);
}

// Penalty code key state
let penaltyCodeKeyVisible = true;
let penaltyCodeKeyPending = false;

// Whether short rosters grow their text, and the rebuild that follows a change
let rosterTextScaling = true;
let rosterTextFitPending = false;

// The last count reported, so a full roster does not warn on every update
let rosterRowsHidden = 0;

// What the teams row currently holds, which decides whether it keeps its space
let teamLogosVisible = true;
let titleBannerVisible = true;

// Validate and set the overlay title text
function setTitleBannerText() {
  const { value, source } = resolveSetting({
    ...SETTINGS.title,
    configValue: CONFIG.titleBannerText,
    fallback: VALIDATION.title.default,
    validate: isText
  });

  $(CLASSES.penaltiesTitleH1Selector).text(value);

  if (DEBUG) {
    console.log(`Overlay title set to "${value}" (from ${source}).`);
  }
}

// Validate and set the overlay title visibility
function setTitleBannerVisible() {
  const { value, source } = resolveSetting({
    ...SETTINGS.titleVisible,
    configValue: CONFIG.titleBannerVisible,
    fallback: VALIDATION.titleVisible.default,
    parse: lowercase,
    describe: (visible) => (visible ? 'visible' : 'hidden'),
    validate: isBoolean
  });

  titleBannerVisible = value;
  $(TOGGLES.titleBanner.selector).toggleClass(TOGGLES.titleBanner.class, value);

  if (DEBUG) {
    console.log(`Overlay title ${value ? 'shown' : 'hidden'} (from ${source}).`);
  }
}

// Validate and set the team logo visibility
function setTeamLogos() {
  const { value, source } = resolveSetting({
    ...SETTINGS.teamLogos,
    configValue: CONFIG.teamLogos,
    fallback: VALIDATION.teamLogos.default,
    parse: lowercase,
    describe: (visible) => (visible ? 'visible' : 'hidden'),
    validate: isBoolean
  });

  teamLogosVisible = value;
  $(TOGGLES.teamLogos.selector).toggleClass(TOGGLES.teamLogos.class, !value);

  if (DEBUG) {
    console.log(`Team logos ${value ? 'shown' : 'hidden'} (from ${source}).`);
  }
}

// Give the teams row its space back once it has nothing left to show
// Both settings decide this, so the stylesheet reads one class rather than deriving it
function setTeamsRowHeight() {
  const empty = !teamLogosVisible && !titleBannerVisible;

  $(TOGGLES.teamsRow.selector).toggleClass(TOGGLES.teamsRow.class, empty);

  if (DEBUG) {
    console.log(`Teams row ${empty ? 'collapsed' : 'holding its space'}.`);
  }
}

// Validate and set the roster text scaling
function setRosterTextScaling() {
  const { value, source } = resolveSetting({
    ...SETTINGS.rosterTextScaling,
    configValue: CONFIG.rosterTextScaling,
    fallback: VALIDATION.rosterTextScaling.default,
    parse: lowercase,
    describe: (scaling) => (scaling ? 'on' : 'off'),
    validate: isBoolean
  });

  rosterTextScaling = value;

  if (DEBUG) {
    console.log(`Roster text scaling ${value ? 'on' : 'off'} (from ${source}).`);
  }
}

// Validate and set the penalty code key visibility
function setPenaltyCodeKey() {
  const { value, source } = resolveSetting({
    ...SETTINGS.key,
    configValue: CONFIG.penaltyCodeKey,
    fallback: VALIDATION.penaltyCodeKey.default,
    parse: lowercase,
    describe: (visible) => (visible ? 'visible' : 'hidden'),
    validate: isBoolean
  });

  penaltyCodeKeyVisible = value;

  if (DEBUG) {
    console.log(`Penalty code key ${value ? 'enabled' : 'disabled'} (from ${source}).`);
  }
}

// Validate and set the overlay background opacity
function setOverlayOpacity() {
  const allowed = VALIDATION.opacity;
  const { value, source } = resolveSetting({
    ...SETTINGS.opacity,
    configValue: CONFIG.overlayOpacity,
    fallback: allowed.default,
    parse: parseFloat,
    describe: asPercent,
    validate: inRange(allowed)
  });

  // The value sets the alpha channel of the overlay background color
  document.documentElement.style.setProperty('--overlay-opacity', `${value}%`);

  if (DEBUG) {
    console.log(`Overlay background opacity set to ${value}% (from ${source}).`);
  }
}

// Overlay anchor values mapped to where the overlay sits in the video frame
const OVERLAY_ANCHORS = {
  top: { justify: 'flex-start', origin: 'top center' },
  center: { justify: 'center', origin: 'center center' },
  bottom: { justify: 'flex-end', origin: 'bottom center' }
};

// Validate and set the overlay anchor value
function setOverlayAnchor() {
  const { value, source } = resolveSetting({
    ...SETTINGS.anchor,
    configValue: CONFIG.overlayAnchor,
    fallback: VALIDATION.anchor.default,
    validate: oneOf(Object.keys(OVERLAY_ANCHORS))
  });

  // The anchored edge is stationary as the overlay's height and scale change
  const anchor = OVERLAY_ANCHORS[value];

  document.documentElement.style.setProperty('--overlay-justify', anchor.justify);
  document.documentElement.style.setProperty('--overlay-origin', anchor.origin);

  if (DEBUG) {
    console.log(`Overlay anchored to ${value} (from ${source}).`);
  }
}

// Font pairings, keyed by their display face
const OVERLAY_FONTS = {
  saira: {
    display: "'Saira Condensed', 'Arial Narrow', arial, sans-serif",
    body: "'Saira', arial, sans-serif"
  },
  'league-gothic': {
    display: "'League Gothic', 'Arial Narrow', arial, sans-serif",
    body: "'Barlow', arial, sans-serif"
  },
  anton: {
    display: "'Anton', 'Arial Narrow', arial, sans-serif",
    body: "'Chivo', arial, sans-serif"
  },
  bricolage: {
    display: "'Bricolage Grotesque', arial, sans-serif",
    body: "'Barlow Condensed', 'Arial Narrow', arial, sans-serif"
  }
};

// Validate and set the overlay font pairing
function setOverlayFont() {
  const { value, source } = resolveSetting({
    ...SETTINGS.font,
    configValue: CONFIG.overlayFont,
    fallback: VALIDATION.font.default,
    validate: oneOf(Object.keys(OVERLAY_FONTS))
  });

  // Apply the font to the display and body font variables
  const pairing = OVERLAY_FONTS[value];
  document.documentElement.style.setProperty('--font-family-display', pairing.display);
  document.documentElement.style.setProperty('--font-family', pairing.body);

  if (DEBUG) {
    console.log(`Overlay font set to ${value} (from ${source}).`);
  }
}

/*******************************
 ** General Utility Functions **
 ******************************/

// Check if a value exists for cases when a value isn't truthy
window.hasValue = function (_k, v) {
  return Boolean(v);
};

/******************************
 ** Roster Utility Functions **
 *****************************/

// Filter players based on flags
window.shouldHideSkater = function (_k, flags) {
  // Handle null or undefined flags
  if (!flags) {
    return false;
  }

  const filteredFlags = CONFIG.filteredSkaterFlags;
  const flagArray = flags.split(',').map((f) => f.trim());

  // Hide players if any flag matches the filtered list
  return filteredFlags.some((filtered) => flagArray.includes(filtered));
};

// Show captain or alt captain indicators
window.showCaptainIndicator = function (_k, captainFlags) {
  // Handle null or undefined flags
  if (!captainFlags) {
    return '';
  }

  const { captainFlag, altCaptainFlag } = LABELS;
  const flags = captainFlags.split(',');

  return flags.includes(captainFlag) ? captainFlag : flags.includes(altCaptainFlag) ? altCaptainFlag : '';
};

/***********************************
 ** Team Color and Name Functions **
 **********************************/

// The team number inside a setting name, as in Penalties.Overlay.Team1BackgroundColor
const TEAM_SETTING_NUMBER = /Team(\d+)/;

// A binding repaints on every scoreboard update, so a bad override is reported when it changes
const warnedOverrides = new Map();

function warnOnce(setting, value, message) {
  if (warnedOverrides.get(setting) === value) {
    return;
  }

  warnedOverrides.set(setting, value);
  console.warn(message);
}

// The team a binding fired for, read from the key CRG hands the helper
// CRG passes whichever registered path holds a value, so a team path and a setting both arrive
function teamNumberFromKey(k) {
  if (!k) {
    return undefined;
  }

  if (k.Team) {
    return k.Team;
  }

  const [, teamNumber] = String(k.Setting ?? '').match(TEAM_SETTING_NUMBER) ?? [];

  return teamNumber;
}

// A team override, from the admin page then config.js, and blank when neither sets one
// Blank is how an override reads as unset, so only a value that is there is validated
function overrideValue(setting, validate) {
  const stored = storedSetting(setting.setting);
  const raw = stored === undefined ? setting.configValue : stored;

  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return '';
  }

  const result = validate(String(raw).trim());

  if ('value' in result) {
    return result.value;
  }

  // The label names the setting mid-sentence, so it starts lowercase here
  const described = setting.label.charAt(0).toLowerCase() + setting.label.slice(1);

  warnOnce(
    setting.setting,
    raw,
    `Invalid ${described} value ${result.display} (${result.reason}) - using the value CRG supplies.`
  );

  return '';
}

// Whether a team shows admin-defined colors rather than the ones CRG supplies
function teamColorOverridden(teamNumber) {
  const team = TEAM_SETTINGS[teamNumber];

  return Boolean(team) && overrideValue(team.colorOverride, isBoolean) === true;
}

// Whether a team shows an admin-defined name rather than the one CRG supplies
function teamNameOverridden(teamNumber) {
  const team = TEAM_SETTINGS[teamNumber];

  return Boolean(team) && overrideValue(team.nameOverride, isBoolean) === true;
}

// A team color: the override when the team is set to override, and CRG's color otherwise
function teamColor(teamNumber, color) {
  const team = TEAM_SETTINGS[teamNumber];
  const crgColor = WS.state[teamChannel(teamNumber, STORAGE.teamChannels[color])] ?? '';

  if (!team || !teamColorOverridden(teamNumber)) {
    return crgColor;
  }

  return overrideValue(team[color], isColor) || crgColor;
}

// A blank color comes off the element, so the default in the stylesheet applies
function setTeamProperty(panel, property, value) {
  if (value) {
    panel.style.setProperty(property, value);
  } else {
    panel.style.removeProperty(property);
  }
}

// Paint each team's panel with the colors it shows, which its rules read from the panel
function applyTeamColors() {
  for (const [teamNumber, team] of Object.entries(TEAM_SETTINGS)) {
    const panel = document.querySelector(team.panel);

    if (!panel) {
      continue;
    }

    const glowColor = teamColor(teamNumber, 'glow');
    const glowShadow = glowColor ? `${CONFIG.defaultRosterShadowProperties} ${glowColor}` : '';

    setTeamProperty(panel, '--team-background-color', teamColor(teamNumber, 'background'));
    setTeamProperty(panel, '--team-text-color', teamColor(teamNumber, 'text'));
    setTeamProperty(panel, '--team-text-shadow', glowShadow);
  }
}

// Register the CRG colors the team panels follow, so a whiteboard change repaints them
function registerTeamColors() {
  const channels = Object.keys(TEAM_SETTINGS).flatMap((teamNumber) =>
    TEAM_COLORS.map((color) => teamChannel(teamNumber, STORAGE.teamChannels[color]))
  );

  WS.Register(channels, applyTeamColors);
}

// Display team names with fallback mechanisms to prevent a blank name
window.getTeamNameWithDefault = function (k) {
  const teamNumber = teamNumberFromKey(k) ?? '?';
  const team = TEAM_SETTINGS[teamNumber];

  // Try the name the admin page sets first, which waits on its own switch
  const override = teamNameOverridden(teamNumber) ? overrideValue(team.name, isText) : '';

  if (override) {
    return override;
  }

  // Try AlternateName(whiteboard) second
  const alternateName = WS.state[teamChannel(teamNumber, STORAGE.teamChannels.alternateName)];

  if (typeof alternateName === 'string' && alternateName.trim() !== '') {
    return alternateName;
  }

  // Try team name (Name) read from WS.state third
  const name = WS.state[teamChannel(teamNumber, STORAGE.teamChannels.name)];

  if (typeof name === 'string' && name.trim() !== '') {
    return name;
  }

  // Use "Team N" fourth
  return `${LABELS.defaultTeamNamePrefix} ${teamNumber}`;
};

/*************************
 ** Game Rule Functions **
 ************************/

// Patterns that read a player out of a state key
const SKATER_CONTEXT = /^ScoreBoard\.CurrentGame\.Team\(\d+\)\.Skater\([^)]+\)/;
const PENALTY_CODE_SUFFIX = /\.Penalty\(\d+\)\.Code$/;

// Penalty code definitions are in the penalty code channel
const PENALTY_CODE_PREFIX = `${CHANNELS.penaltyCode}(`;

// Portion of a state key that names a player, or null when the key names something else
function getSkaterContext(stateKey) {
  const match = stateKey == null ? null : SKATER_CONTEXT.exec(stateKey);

  return match === null ? null : match[0];
}

// Number of penalties that result in a foulout, or null when the ruleset supplies no usable count
function getFouloutCount() {
  const fouloutCount = parseInt(WS.state[CHANNELS.ruleFouloutCount]);

  return Number.isFinite(fouloutCount) && fouloutCount >= 1 ? fouloutCount : null;
}

// Number of periods in the game, or null when the ruleset supplies no usable count
function getPeriodCount() {
  const periodCount = parseInt(WS.state[CHANNELS.rulePeriodCount]);

  return Number.isFinite(periodCount) && periodCount >= 1 ? periodCount : null;
}

// Penalty count that triggers a warning color, counted back from a foulout
function getWarningCount(offset) {
  const fouloutCount = getFouloutCount();

  if (fouloutCount === null) {
    return null;
  }

  const warningCount = fouloutCount - offset;

  return warningCount >= 1 ? warningCount : null;
}

/************************************
 ** Penalty Count Helper Functions **
 ***********************************/

// Private helper to check if a player is expelled or removed
function checkPenaltyStatus(k) {
  const skaterContext = getSkaterContext(k);

  // A key that names no player carries no penalty status
  if (skaterContext === null) {
    return { isExpelled: false, isRemoved: false };
  }

  // Get Penalty(0).Code from WS.state
  const penalty0Code = WS.state[`${skaterContext}.Penalty(0).Code`];

  // Empty/undefined means a player is neither expelled nor removed
  if (!penalty0Code || penalty0Code === '') {
    return { isExpelled: false, isRemoved: false };
  }

  // Removed by the head official
  const isRemoved = penalty0Code === PENALTIES.removedCode;

  // Fouled out - has the "FO" code
  const isFouledOut = penalty0Code === PENALTIES.fouloutCode;

  // Expelled - has a penalty code other than RE or FO
  const isExpelled = !isRemoved && !isFouledOut;

  return { isExpelled, isRemoved };
}

// Determine if a player should have CSS formatting for the first penalty warning color
window.isPenaltyCountWarning1 = function (k, penaltyCount) {
  const count = parseInt(penaltyCount) || 0;
  const { isExpelled, isRemoved } = checkPenaltyStatus(k);
  const warningCount = getWarningCount(RULES.warningPenaltyOffsets.first);

  return count === warningCount && !isExpelled && !isRemoved;
};

// Determine if a player should have CSS formatting for the second penalty warning color
window.isPenaltyCountWarning2 = function (k, penaltyCount) {
  const count = parseInt(penaltyCount) || 0;
  const { isExpelled, isRemoved } = checkPenaltyStatus(k);
  const warningCount = getWarningCount(RULES.warningPenaltyOffsets.second);

  return count === warningCount && !isExpelled && !isRemoved;
};

// Determine if a player should have CSS formatting for expulsion, foulout, or removal
window.isPenaltyCountExpFoRe = function (k, penaltyCount) {
  const count = parseInt(penaltyCount) || 0;
  const { isExpelled, isRemoved } = checkPenaltyStatus(k);

  const fouloutCount = getFouloutCount();

  return isRemoved || isExpelled || (fouloutCount !== null && count >= fouloutCount);
};

// Determine the text to show for a player's penalty count
window.getPenaltyCountDisplay = function (k, penaltyCount) {
  const count = parseInt(penaltyCount) || 0;
  const { isExpelled, isRemoved } = checkPenaltyStatus(k);

  const fouloutCount = getFouloutCount();

  if (isRemoved) return LABELS.removedDisplay;
  if (isExpelled) return LABELS.expelledDisplay;
  if (fouloutCount !== null && count >= fouloutCount) return LABELS.fouloutDisplay;

  return count > 0 ? count : '';
};

// Hide filtered penalty codes from a player's penalty code list
window.shouldHidePenaltyCode = function (k, code, penaltyNumber) {
  const filteredCodes = [PENALTIES.fouloutCode, PENALTIES.removedCode];
  if (filteredCodes.includes(code)) {
    return true;
  }

  // Display no more than the max allowed penalty codes
  if (parseInt(penaltyNumber) > VALIDATION.penaltyCodes.max) {
    return true;
  }

  // Always hide Penalty(0) - it indicates a player is expelled, fouled out, or removed
  if (parseInt(penaltyNumber) === 0 || k.includes('.Penalty(0)')) {
    return true;
  }

  return false;
};

/****************************************
 ** Game Information Utility Functions **
 ***************************************/

// Prepend a dot divider and " Game " to the game number if present
window.prependGameNo = function (_k, gameNum) {
  if (!gameNum || gameNum === '' || gameNum === '0') {
    return '';
  }
  return ` \u00b7 Game ${gameNum}`;
};

// Determine if the period clock should be hidden
window.shouldHidePeriodClock = function (_k, intermissionRunning) {
  // Pre-game, when no intermission clock is running (Coming Up)
  const period = parseInt(WS.state[CHANNELS.currentPeriod]) || 0;

  // When the intermission clock is running
  const isIntermission = intermissionRunning === true;

  // When the score is unofficial or official
  const isOfficial = WS.state[CHANNELS.officialScore] === true;

  // During overtime
  const isOvertime = WS.state[CHANNELS.inOvertime] === true;

  return period === 0 || isIntermission || isOfficial || isOvertime;
};

// Determine if the intermission clock should be hidden
window.shouldHideIntermissionClock = function (_k, intermissionRunning) {
  // When the intermission clock is not running
  const isIntermission = intermissionRunning === true;

  // When the score is unofficial or official
  const isOfficial = WS.state[CHANNELS.officialScore] === true;

  // During overtime
  const isOvertime = WS.state[CHANNELS.inOvertime] === true;

  // After the last period, which an unknown period count cannot establish
  const period = parseInt(WS.state[CHANNELS.currentPeriod]) || 0;
  const periodCount = getPeriodCount();
  const afterLastPeriod = periodCount !== null && period >= periodCount;

  return !isIntermission || isOfficial || isOvertime || afterLastPeriod;
};

/*************************
 ** Clock Label Helpers **
 ************************/

// Simple helper to invert boolean for sbHide
window.invertBoolean = function (_k, value) {
  return !value;
};

// Get period label
window.getPeriodLabel = function (_k, periodNumber) {
  const period = parseInt(periodNumber);
  if (!period || period === 0) return '';
  return `${LABELS.defaultPeriodLabelPrefix} ${period}`;
};

// Get intermission label
window.getIntermissionLabel = function (_k, periodNumber) {
  const period = parseInt(periodNumber) || 0;
  const periodCount = getPeriodCount();

  // Read intermission labels from the WS.state
  const preGame = WS.state[CHANNELS.preGameLabel];
  const intermission = WS.state[CHANNELS.intermissionLabel];

  // Before the game starts
  if (period === 0) {
    return preGame || '';
  }

  // After the final period, where the "Unofficial" or "Official" labels show instead
  if (periodCount !== null && period >= periodCount) {
    return '';
  }

  // Between periods, and whenever the period count is unknown
  return intermission || '';
};

// Read the game state the score labels depend on
function getScoreLabelState() {
  return {
    period: parseInt(WS.state[CHANNELS.currentPeriod]) || 0,
    isIntermission: WS.state[CHANNELS.intermissionRunning] === true,
    isOfficial: WS.state[CHANNELS.officialScore] === true,
    isOvertime: WS.state[CHANNELS.inOvertime] === true
  };
}

// Hide the "Unofficial Score" label
window.shouldHideUnofficialScore = function (_k) {
  const { period, isIntermission, isOfficial, isOvertime } = getScoreLabelState();

  // The label names the score after the final period, which an unknown period count cannot establish
  const periodCount = getPeriodCount();
  const afterLastPeriod = periodCount !== null && period >= periodCount;

  return !afterLastPeriod || !isIntermission || isOfficial || isOvertime;
};

// Hide the "Coming Up" label
window.shouldHideComingUp = function (_k) {
  const { period, isIntermission, isOfficial, isOvertime } = getScoreLabelState();

  return period !== 0 || isIntermission || isOfficial || isOvertime;
};

/***************************************
 ** Penalty Code Key Helper Functions **
 **************************************/

// Collect active penalty code definitions
function getPenaltyCodesInPlay() {
  const codes = new Set();
  const hidden = {};

  for (const stateKey of Object.keys(WS.state)) {
    if (!PENALTY_CODE_SUFFIX.test(stateKey)) {
      continue;
    }

    const skaterContext = getSkaterContext(stateKey);
    if (skaterContext === null) {
      continue;
    }

    // Filter inactive players
    if (!(skaterContext in hidden)) {
      hidden[skaterContext] = window.shouldHideSkater(null, WS.state[`${skaterContext}.Flags`]);
    }
    if (hidden[skaterContext]) {
      continue;
    }

    const code = WS.state[stateKey];
    if (code) {
      codes.add(code);
    }
  }

  // Status markers and the unknown code have no description to show
  codes.delete(PENALTIES.fouloutCode);
  codes.delete(PENALTIES.removedCode);
  codes.delete(PENALTIES.unknownCode);

  return [...codes].sort();
}

// Read the CRG cues for a penalty code
function getPenaltyCodeCue(code) {
  const description = WS.state[PENALTY_CODE_PREFIX + code + ')'];
  if (typeof description !== 'string' || description.trim() === '') {
    return null;
  }

  // Retain only the first/primary cue
  return description.split(',')[0].trim();
}

// Construct the penalty code key from active penalties
function buildPenaltyCodeKey() {
  penaltyCodeKeyPending = false;

  const $key = $(TOGGLES.penaltyCodeKey.selector);
  const visibleClass = TOGGLES.penaltyCodeKey.class;

  if (!penaltyCodeKeyVisible) {
    $key.empty().removeClass(visibleClass);
    return;
  }

  const items = [];
  for (const code of getPenaltyCodesInPlay()) {
    const cue = getPenaltyCodeCue(code);

    // Ignore codes without a description
    if (cue === null) {
      continue;
    }

    items.push(
      $('<span>')
        .addClass('code-key-item')
        .append($('<span>').addClass('code-key-code').text(code), document.createTextNode(cue))
    );
  }

  $key.empty().toggleClass(visibleClass, items.length > 0);

  if (items.length > 0) {
    $key.append($('<span>').addClass('code-key-items').append(items));
    fitPenaltyCodeKey();
  }

  if (DEBUG) {
    console.log(`Penalty code key rebuilt with ${items.length} code(s).`);
  }
}

// Adjust the size of the penalty key codes to fit on one line
function fitPenaltyCodeKey() {
  const items = document.querySelector(CLASSES.penaltyCodeKeyItemsSelector);
  if (!items) {
    return;
  }

  // Measure at the configured size, so a rebuild never inherits an earlier fit
  items.style.removeProperty('--font-penalty-code-key-size');
  const available = items.clientWidth;

  // Sum the codes, because scrollWidth misses overflow left of a centered row
  // `offsetWidth` ignores the overlay scale transform, which would hide an overflow
  const natural = [...items.children].reduce((total, code) => total + code.offsetWidth, 0);
  if (available === 0 || natural <= available) {
    return;
  }

  // The key's dimensions are proportional to this size, so its width shrinks linearly
  const configuredSize = parseFloat(getComputedStyle(items.children[0]).fontSize);
  const fittedSize = Math.floor(configuredSize * (available / natural));
  items.style.setProperty('--font-penalty-code-key-size', `${fittedSize}px`);

  if (DEBUG) {
    console.log(`Penalty code key reduced from ${configuredSize}px to ${fittedSize}px to fit one line.`);
  }
}

/***********************************
 ** Roster Text Scaling Functions **
 **********************************/

// Grow the roster text so a short roster fills the panel it sits in
// Both rosters take one scale - the longer of the two decides the scale
function fitRosterText() {
  const root = document.documentElement;

  // Measure at the configured sizes, so a fit never inherits an earlier one
  root.style.setProperty('--roster-scale', 1);
  root.style.setProperty('--overlay-min-height', '0');
  rosterTextFitPending = false;

  // Trim the roster and give the overlay its height back before measuring the rows
  limitRosterRows();
  holdOverlayHeight();

  const rosters = [...document.querySelectorAll(CLASSES.rosterSelector)];

  if (rosters.length === 0) {
    return;
  }

  let rows = 0;
  let rowHeight = 0;
  let headingSpace = 0;
  let teamHeading = 0;

  // The shortest roster panel decides the space, so neither overflows
  let available = Infinity;

  for (const roster of rosters) {
    // A hidden line reports no height, so this counts the skaters on display
    const lines = [...roster.querySelectorAll(CLASSES.rosterLineSelector)].filter((line) => line.offsetHeight > 0);
    const headings = roster.querySelector(CLASSES.rosterHeadingsSelector);
    const team = roster.parentElement && roster.parentElement.querySelector(CLASSES.teamHeadingSelector);

    rows = Math.max(rows, lines.length);
    rowHeight = rowHeight || (lines.length > 0 ? lines[0].offsetHeight : 0);
    available = Math.min(available, roster.clientHeight);
    teamHeading = Math.max(teamHeading, team ? team.offsetHeight : 0);

    if (headings) {
      const gap = parseFloat(getComputedStyle(headings).marginBottom) || 0;

      headingSpace = Math.max(headingSpace, headings.offsetHeight + gap);
    }
  }

  if (rows === 0 || rowHeight === 0 || !Number.isFinite(available) || available <= 0) {
    return;
  }

  // The team name sits above the roster and scales with it
  const space = available + teamHeading;
  const needed = teamHeading + rows * rowHeight + headingSpace;

  if (!rosterTextScaling) {
    if (DEBUG) {
      console.log('Roster text scaling is off - the configured sizes apply.');
    }

    return;
  }

  const fit = space / needed;
  const scale = Math.min(fit, VALIDATION.rosterScale.max);

  // Rosters long enough to fill the panel already keep the configured sizes
  if (scale <= 1) {
    return;
  }

  const rounded = Math.round(scale * 1000) / 1000;

  root.style.setProperty('--roster-scale', rounded);

  if (DEBUG) {
    const capped = fit > VALIDATION.rosterScale.max ? ` (held at the ${VALIDATION.rosterScale.max} maximum)` : '';

    console.log(`Roster text scaled to ${rounded} for ${rows} row(s)${capped}.`);
  }
}

// Show only the skaters the panel can hold
function limitRosterRows() {
  const allowed = VALIDATION.rosterRows.max;
  const overLimit = CLASSES.rosterLineOverLimitSelector.slice(1);
  let hidden = 0;
  let most = 0;

  for (const roster of document.querySelectorAll(CLASSES.rosterSelector)) {
    let shown = 0;

    for (const line of roster.querySelectorAll(CLASSES.rosterLineSelector)) {
      const past = line.classList.contains(overLimit);

      // A line already past the limit reports no height
      if (!past && line.offsetHeight === 0) {
        continue;
      }

      shown += 1;
      line.classList.toggle(overLimit, shown > allowed);
      hidden += shown > allowed ? 1 : 0;
    }

    most = Math.max(most, shown);
  }

  // More than 20 players logs to the browser console, whether or not debug is enabled
  if (hidden !== rosterRowsHidden) {
    rosterRowsHidden = hidden;

    if (hidden > 0) {
      console.warn(`A roster holds ${most} skaters and the overlay displays ${allowed} - ${hidden} are hidden.`);
    }
  }
}

// Content that runs past the room the overlay has for it
// The overlay's own background is positioned and animated, and a transform on it
// counts toward `scrollHeight` without being content, so this measures the rows
function contentOverflow(overlay) {
  const box = getComputedStyle(overlay);
  const room = overlay.clientHeight - parseFloat(box.paddingTop) - parseFloat(box.paddingBottom);
  let used = 0;

  for (const child of overlay.children) {
    const style = getComputedStyle(child);

    if (style.position === 'absolute' || style.display === 'none') {
      continue;
    }

    used += child.offsetHeight + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
  }

  return Number.isFinite(room) ? Math.max(0, used - room) : 0;
}

// Keep the overlay tall enough for everything in it
function holdOverlayHeight() {
  const root = document.documentElement;
  const overlay = document.getElementById('overlay');

  if (!overlay) {
    return;
  }

  const style = getComputedStyle(root);
  const teams = document.querySelector(TOGGLES.teamLogos.selector);
  const natural = parseFloat(style.getPropertyValue('--height-logo-container'));
  const frame = parseFloat(style.getPropertyValue('--overlay-height'));
  const inset = parseFloat(style.getPropertyValue('--overlay-inset-vertical'));
  const limit = Number.isFinite(frame) && Number.isFinite(inset) ? frame - 2 * inset : Infinity;

  let held = 0;
  let lastDeficit = Infinity;

  // Handing the height back moves the layout, and most of it goes to the rosters
  for (let pass = 0; pass < HEIGHT_HOLD_PASSES; pass += 1) {
    // The room the logo row has given up, which it only gives up under pressure
    const squeezed = teams && Number.isFinite(natural) ? Math.max(0, natural - teams.offsetHeight) : 0;

    // Content that runs past the box it is drawn in, plus the room the logos lost
    // Room to spare is not a reason to leave the logos short, so it counts as none
    const overflow = contentOverflow(overlay);
    const deficit = overflow + squeezed;

    if (!Number.isFinite(deficit) || deficit <= 0) {
      break;
    }

    // A pass that gained nothing means another will gain nothing, too
    if (deficit >= lastDeficit) {
      break;
    }

    lastDeficit = deficit;
    held = Math.min(Math.ceil(overlay.offsetHeight + deficit), limit);
    root.style.setProperty('--overlay-min-height', `${held}px`);

    // A timeout banner keeps the logo row's space only where the frame has none to give
    if (held >= limit) {
      break;
    }
  }

  if (DEBUG && held > 0) {
    console.log(`Overlay held at ${held}px, so the background covers its content.`);
  }
}

// Fit once after a burst of WebSocket updates rather than on each one
function scheduleRosterTextFit() {
  if (rosterTextFitPending) {
    return;
  }

  rosterTextFitPending = true;
  setTimeout(fitRosterText, TIMING.rosterTextFit);
}

// Register the WebSocket paths the roster text scaling depends on
function registerRosterTextFit() {
  // A timeout takes the banner row from nothing to its full height, and the logo row gives way to it
  WS.Register([CHANNELS.team1Skaters, CHANNELS.team2Skaters, CHANNELS.timeoutRunning], scheduleRosterTextFit);
}

// The banner row grows and shrinks under a CSS transition, so the fit that measures
// what it takes has to wait for the transition to land
// A browser asked for reduced motion sends no transition, and the channel above covers it
function registerTimeoutBannerFit() {
  const row = document.querySelector(CLASSES.timeoutBannerRowSelector);

  if (!row) {
    return;
  }

  row.addEventListener('transitionend', function (event) {
    if (event.propertyName === 'height') {
      scheduleRosterTextFit();
    }
  });
}

// Apply all display settings
function applyOverlaySettings() {
  const keyWasVisible = penaltyCodeKeyVisible;

  setOverlayScale();
  setOverlayWidth();
  setOverlayHeight();
  setOverlayAnchor();
  setOverlayOpacity();
  setOverlayFont();
  setBackgroundAnimation();
  setTimeoutAnimation();
  setPenaltyCodeKey();
  setTitleBannerText();
  setTitleBannerVisible();
  setTeamLogos();
  setTeamsRowHeight();
  applyTeamColors();
  setRosterTextScaling();
  scheduleRosterTextFit();

  // Rebuild keys from WebSocket data
  if (penaltyCodeKeyVisible !== keyWasVisible) {
    schedulePenaltyCodeKeyRebuild();
  }
}

// Register admin page changes, so the overlay doesn't require a reload
function registerOverlaySettings() {
  const channels = Object.values(SETTINGS)
    .filter((setting) => setting.setting)
    .map((setting) => settingChannel(setting.setting));

  WS.Register(channels, applyOverlaySettings);
}

// Rebuild once after a burst of WebSocket updates rather than on each one
function schedulePenaltyCodeKeyRebuild() {
  if (penaltyCodeKeyPending) {
    return;
  }
  penaltyCodeKeyPending = true;
  setTimeout(buildPenaltyCodeKey, TIMING.penaltyCodeKeyRebuild);
}

// Register the WebSocket paths the penalty code key depends on
function registerPenaltyCodeKey() {
  WS.Register([CHANNELS.penaltyCode, CHANNELS.team1Skaters, CHANNELS.team2Skaters], schedulePenaltyCodeKeyRebuild);
}

/*********************************
 ** Custom Logo Helper Function **
 ********************************/

// Load a custom logo if one is configured
function loadCustomLogo() {
  // Check if the logo path is configured
  if (!CONFIG.bannerLogoPath || CONFIG.bannerLogoPath === '') {
    if (DEBUG) {
      console.log('No custom logo configured.');
    }
    return;
  }

  const logoImg = new Image();
  const $customLogo = $(CLASSES.customLogoSelector);
  const $customLogoSpace = $(TOGGLES.customLogo.selector);

  // Show the logo once it loads
  logoImg.onload = function () {
    $customLogo.attr('src', CONFIG.bannerLogoPath);
    $customLogoSpace.addClass(TOGGLES.customLogo.class);

    if (DEBUG) {
      console.log(`Custom logo loaded: ${CONFIG.bannerLogoPath}.`);
    }
  };

  // Keep the logo hidden if it fails to load
  logoImg.onerror = function () {
    $customLogoSpace.removeClass(TOGGLES.customLogo.class);

    if (DEBUG) {
      console.log(`Custom logo failed to load: ${CONFIG.bannerLogoPath}.`);
    }
  };

  // Attempt to load the logo
  logoImg.src = CONFIG.bannerLogoPath;
}

/*************************************
 ** Timeout Banner Helper Functions **
 ************************************/

// Determine the timeout banner text to display
window.getTimeoutText = function (_k, timeoutOwner, officialReview) {
  // Official review
  const isReview = officialReview === true || WS.state[CHANNELS.officialReview] === true;
  if (isReview) return LABELS.timeout.review;

  // Official timeout
  if (timeoutOwner === LABELS.timeoutOwner.official) return LABELS.timeout.official;

  // Team timeout
  if (
    timeoutOwner &&
    (timeoutOwner.endsWith(LABELS.timeoutOwner.team1) || timeoutOwner.endsWith(LABELS.timeoutOwner.team2))
  ) {
    return LABELS.timeout.team;
  }

  // Untyped timeout
  return LABELS.timeout.untyped;
};

// Position untyped and official timeouts in the center column
window.isPositionCenter = function (_k, timeoutOwner) {
  return !timeoutOwner || timeoutOwner === LABELS.timeoutOwner.official;
};

// Position team 1 timeouts in the left column
window.isPositionTeam1 = function (_k, timeoutOwner) {
  return !!(timeoutOwner && timeoutOwner.endsWith(LABELS.timeoutOwner.team1));
};

// Position team 2 timeouts in the right column
window.isPositionTeam2 = function (_k, timeoutOwner) {
  return !!(timeoutOwner && timeoutOwner.endsWith(LABELS.timeoutOwner.team2));
};

// Determine if the timeout banner should be visible
window.isTimeoutVisible = function (_k, timeoutRunning) {
  return timeoutRunning === true;
};

/********************************
 ** Version Watermark Function **
 *******************************/

// Show the version so a deployment can be identified from a screenshot
function setOverlayVersion() {
  const overlay = document.getElementById('overlay');
  const versionElement = document.getElementById('overlay-version');

  if (overlay) {
    overlay.dataset.version = OVERLAY_VERSION;
  }

  if (versionElement) {
    versionElement.textContent = `v${OVERLAY_VERSION}`;
  }

  console.log(`Penalties Overlay v${OVERLAY_VERSION}`);
}

/*******************************
 ** Loading Overlay Functions **
 ******************************/

// Display the loading overlay until the ruleset data arrives
function hideLoadingOverlayWhenReady() {
  const startTime = Date.now();

  const hideLoadingOverlay = function (reason) {
    $(TOGGLES.loadingOverlay.selector).addClass(TOGGLES.loadingOverlay.class);

    if (DEBUG) {
      console.log(`Loading overlay hidden (${reason}).`);
    }
  };

  const checkForRules = function () {
    const elapsed = Date.now() - startTime;
    const rulesArrived =
      typeof WS !== 'undefined' &&
      [CHANNELS.ruleFouloutCount, CHANNELS.rulePeriodCount].every(
        (channel) => typeof WS.state[channel] !== 'undefined'
      );

    // Always show the loading overlay for the minimum display time
    if (elapsed < TIMING.minLoadDisplayMs) {
      setTimeout(checkForRules, TIMING.loadCheckInterval);
    } else if (rulesArrived) {
      hideLoadingOverlay('game rules received');

      // Display the overlay rather than leave a loading screen active indefinitely
    } else if (elapsed >= TIMING.maxLoadWaitMs) {
      console.warn(
        `Game rules did not arrive within ${TIMING.maxLoadWaitMs}ms - ` + 'displaying the overlay without them.'
      );
      hideLoadingOverlay('timed out waiting for game rules');
    } else {
      setTimeout(checkForRules, TIMING.loadCheckInterval);
    }
  };

  checkForRules();
}

/*****************
 ** Amph Module **
 ****************/

// Attempt to load the amph module
function loadAmphModule() {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'amph/amph.js';
  script.async = true;

  // Silent failure
  script.onerror = function () {};

  document.head.appendChild(script);
}

/********************************
 ** Application Initialization **
 *******************************/

$(function () {
  if (DEBUG) {
    console.log('Initializing Penalties Overlay...');
  }

  // Report any URL parameter the overlay ignores
  warnAboutUrlParameters();

  // Apply the overlay display settings
  applyOverlaySettings();

  // Show the overlay version
  setOverlayVersion();

  // Load amph module
  loadAmphModule();

  // Set the loading overlay text
  $(CLASSES.loadingOverlayTextSelector).text(CONFIG.loadingOverlayText);

  // Refit once the banner row settles at its new height
  registerTimeoutBannerFit();

  // Attempt to load a custom logo
  loadCustomLogo();

  // Hide the loading overlay after the ruleset is available
  hideLoadingOverlayWhenReady();

  // Initialize the WebSocket connection
  function initWebSocket() {
    if (typeof WS !== 'undefined') {
      WS.Connect();
      WS.AutoRegister();
      registerPenaltyCodeKey();
      registerRosterTextFit();
      registerOverlaySettings();
      registerTeamColors();
      console.log('WebSocket connected.');

      // Attempt to retry the WebSocket connection if it is not yet available
    } else {
      if (DEBUG) {
        console.log('Waiting for WebSocket...');
      }
      setTimeout(initWebSocket, TIMING.initWebSocket);
    }
  }

  // Start the WebSocket initialization
  initWebSocket();

  console.log('Penalties Overlay successfully initialized.');
});
