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
const REQUIRED_SECTIONS = ['debug', 'config', 'validation', 'classes', 'labels', 'rules', 'penalties', 'timing'];

const missingSections = REQUIRED_SECTIONS.filter((section) => !PenaltiesOverlayConfig[section]);

if (missingSections.length > 0) {
  const errorMsg = `Configuration file (config.js) is missing required sections: ${missingSections.join(', ')}`;
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
const VALIDATION = PenaltiesOverlayConfig.validation;
const CLASSES = PenaltiesOverlayConfig.classes;
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
  key: { setting: 'PenaltyCodeKey', label: 'Penalty code key' },
  opacity: { setting: 'Opacity', label: 'Overlay opacity' },
  scale: { setting: 'Scale', label: 'Overlay scale' },
  timeout: { setting: 'TimeoutAnimation', label: 'Timeout animation' },
  title: { setting: 'TitleText', label: 'Title text' },
  titleVisible: { setting: 'TitleVisible', label: 'Title visibility' },
  width: { setting: 'Width', label: 'Overlay width' }
};

// Channel prefix for the settings the admin page writes
// Each setting holds a string, and an empty string reads as unset
const SETTING_CHANNEL_PREFIX = 'ScoreBoard.Settings.Setting(Penalties.Overlay.';

// Scoreboard channel for settings storage
function settingChannel(name) {
  return `${SETTING_CHANNEL_PREFIX}${name})`;
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

// Overlay version to display as a watermark and log to the console
const OVERLAY_VERSION = '4.1.0';

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
  team2Skaters: 'ScoreBoard.CurrentGame.Team(2).Skater'
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

// Accept a boolean, or the text a stored setting supplies for one
function isText(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return { reason: 'must be text', display: `"${value}"` };
  }

  return { value: value.trim() };
}

function isBoolean(value) {
  if (typeof value === 'boolean') {
    return { value };
  }

  if (value === 'true' || value === 'false') {
    return { value: value === 'true' };
  }

  return { reason: 'must be true or false', display: `"${value}"` };
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

  $(CLASSES.penaltiesTitleSelector).toggleClass(CLASSES.penaltiesTitleVisibleSelectorSuffix, value);

  if (DEBUG) {
    console.log(`Overlay title ${value ? 'shown' : 'hidden'} (from ${source}).`);
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

// Overlay anchor values mapped to CSS transform origins
const OVERLAY_ANCHORS = {
  top: 'top center',
  center: 'center center',
  bottom: 'bottom center'
};

// Validate and set the overlay anchor value
function setOverlayAnchor() {
  const { value, source } = resolveSetting({
    ...SETTINGS.anchor,
    configValue: CONFIG.overlayAnchor,
    fallback: VALIDATION.anchor.default,
    validate: oneOf(Object.keys(OVERLAY_ANCHORS))
  });

  // Convert the anchor name to a CSS transform origin
  document.documentElement.style.setProperty('--overlay-origin', OVERLAY_ANCHORS[value]);

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

// Convert the text glow color to the text-shadow color
window.glowColorToShadow = function (_k, glowColor) {
  if (!glowColor || glowColor === '') {
    return CLASSES.textShadow;
  }
  return `${CONFIG.defaultRosterShadowProperties} ${glowColor}`;
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

// Display team names with fallback mechanisms to prevent a blank name
window.getTeamNameWithDefault = function (k, alternateName) {
  // Try AlternateName(whiteboard) first
  if (typeof alternateName === 'string' && alternateName.trim() !== '') {
    return alternateName;
  }

  // Try team name (Name) read from WS.state second
  const teamNum = k.Team || '?';
  const nameKey = `ScoreBoard.CurrentGame.Team(${teamNum}).Name`;
  const name = WS.state[nameKey];

  if (typeof name === 'string' && name.trim() !== '') {
    return name;
  }

  // Use "Team N" third
  return `${LABELS.defaultTeamNamePrefix} ${teamNum}`;
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

  const $key = $(CLASSES.penaltyCodeKeySelector);
  const visibleSuffix = CLASSES.penaltyCodeKeyVisibleSelectorSuffix;

  if (!penaltyCodeKeyVisible) {
    $key.empty().removeClass(visibleSuffix);
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

  $key.empty().toggleClass(visibleSuffix, items.length > 0);

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

// Apply all display settings
function applyOverlaySettings() {
  const keyWasVisible = penaltyCodeKeyVisible;

  setOverlayScale();
  setOverlayWidth();
  setOverlayAnchor();
  setOverlayOpacity();
  setOverlayFont();
  setBackgroundAnimation();
  setTimeoutAnimation();
  setPenaltyCodeKey();
  setTitleBannerText();
  setTitleBannerVisible();

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
  const $customLogoSpace = $(CLASSES.customLogoSpaceSelector);

  // Show the logo once it loads
  logoImg.onload = function () {
    $customLogo.attr('src', CONFIG.bannerLogoPath);
    $customLogoSpace.addClass(CLASSES.customLogoSpaceVisibleSelectorSuffix);

    if (DEBUG) {
      console.log(`Custom logo loaded: ${CONFIG.bannerLogoPath}.`);
    }
  };

  // Keep the logo hidden if it fails to load
  logoImg.onerror = function () {
    $customLogoSpace.removeClass(CLASSES.customLogoSpaceVisibleSelectorSuffix);

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
    $(CLASSES.loadingOverlaySelector).addClass(CLASSES.loadingOverlayFadeOutSuffixSelector);

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
      registerOverlaySettings();
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
