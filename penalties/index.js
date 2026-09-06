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
const requiredSections = ['debug', 'config', 'validation', 'classes', 'labels', 'rules', 'penalties', 'timing'];

const missingSections = requiredSections.filter((section) => !PenaltiesOverlayConfig[section]);

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

// Every setting a URL parameter overrides, with the term its messages use.
// Unapproved URL parameter log via DEBUG
const SETTINGS = {
  anchor: { urlParam: 'anchor', label: 'Overlay anchor' },
  background: { urlParam: 'background', label: 'Background animation' },
  debug: { urlParam: 'debug', label: 'Debug logging' },
  font: { urlParam: 'font', label: 'Overlay font' },
  key: { urlParam: 'key', label: 'Penalty code key' },
  opacity: { urlParam: 'opacity', label: 'Overlay opacity' },
  scale: { urlParam: 'scale', label: 'Overlay scale' },
  timeout: { urlParam: 'timeout', label: 'Timeout animation' },
  width: { urlParam: 'width', label: 'Overlay width' }
};

// The allowlist follows the settings, so a renamed parameter cannot drift out of it
const ALLOWED_URL_PARAMS = Object.values(SETTINGS).map((setting) => setting.urlParam);

// Settings sources for validation messages
const SETTING_SOURCES = {
  config: 'config.js',
  default: 'default',
  url: 'URL parameter'
};

// Debugging setting, read before the settings that log through it
const DEBUG = getDebugSetting();
console.log('Debug mode:', DEBUG);

// Overlay version to display as a watermark and log to the console
const OVERLAY_VERSION = '4.0.0';

/*****************************
 ** URL Parameter Functions **
 ****************************/

// Parse and validate URL parameters
function getUrlParameter(name) {
  if (!ALLOWED_URL_PARAMS.includes(name)) {
    if (DEBUG) {
      console.warn(`Debug warning: attempted to retrieve unapproved URL parameter "${name}".`);
    }
    return null;
  }

  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

/**************************
 ** Setting Resolution   **
 *************************/

// Report a percentage the way the settings describe themselves
function asPercent(value) {
  return `${value}%`;
}

// URL parameters arrive as text, and some settings match without regard to case
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

// Accept a boolean, or the text a URL parameter supplies for one
function isBoolean(value) {
  if (typeof value === 'boolean') {
    return { value };
  }

  if (value === 'true' || value === 'false') {
    return { value: value === 'true' };
  }

  return { reason: 'must be true or false', display: `"${value}"` };
}

// Read a setting from its URL parameter, then config.js, then the validated default.
// A validator returns the accepted value, or the reason the value cannot be used.
function resolveSetting({ label, urlParam, configValue, fallback, validate, parse, describe = String }) {
  const urlValue = getUrlParameter(urlParam);
  const fromUrl = urlValue !== null;
  const source = fromUrl ? SETTING_SOURCES.url : SETTING_SOURCES.config;
  const value = fromUrl && parse ? parse(urlValue) : fromUrl ? urlValue : configValue;

  if (typeof value === 'undefined' || value === null) {
    console.warn(`${label} not defined in ${source} - using default (${describe(fallback)}).`);

    return { value: fallback, source: SETTING_SOURCES.default };
  }

  const result = validate(value);

  if ('value' in result) {
    return { value: result.value, source };
  }

  // The label opens the sentence above, and names the setting inside this one
  const setting = label.charAt(0).toLowerCase() + label.slice(1);
  console.warn(
    `Invalid ${setting} value ${result.display} in ${source} (${result.reason}) - using default (${describe(fallback)}).`
  );

  return { value: fallback, source: SETTING_SOURCES.default };
}

// Validate the debug logging setting
function getDebugSetting() {
  const { value } = resolveSetting({
    ...SETTINGS.debug,
    configValue: PenaltiesOverlayConfig.debug?.enabled,
    fallback: VALIDATION.debug.default,
    parse: lowercase,
    validate: isBoolean
  });

  return value;
}

// Log URL parameters
function logUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const params = {};

  for (const [k, v] of urlParams.entries()) {
    params[k] = v;
  }

  if (Object.keys(params).length > 0) {
    if (DEBUG) {
      console.log(`URL parameters detected: ${JSON.stringify(params)}`);
    }

    // Warn about unrecognized parameters
    for (const key of Object.keys(params)) {
      if (!ALLOWED_URL_PARAMS.includes(key)) {
        console.warn(`Ignoring unrecognized URL parameter "${key}".`);
      }
    }
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
  return v && v !== '';
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

// WebSocket Channels to read the active ruleset
const PENALTY_CODE_PREFIX = 'ScoreBoard.CurrentGame.PenaltyCode(';
const SKATER_CONTEXT = /^ScoreBoard\.CurrentGame\.Team\(\d+\)\.Skater\([^)]+\)/;
const PENALTY_CODE_SUFFIX = /\.Penalty\(\d+\)\.Code$/;
const RULE_FOULOUT_COUNT = 'ScoreBoard.CurrentGame.Rule(Penalties.NumberToFoulout)';
const RULE_PERIOD_COUNT = 'ScoreBoard.CurrentGame.Rule(Period.Number)';

// Portion of a state key that names a player, or null when the key names something else
function getSkaterContext(stateKey) {
  const match = stateKey == null ? null : SKATER_CONTEXT.exec(stateKey);

  return match === null ? null : match[0];
}

// Number of penalties that result in a foulout, or null when the ruleset supplies no usable count
function getFouloutCount() {
  const fouloutCount = parseInt(WS.state[RULE_FOULOUT_COUNT]);

  return Number.isFinite(fouloutCount) && fouloutCount >= 1 ? fouloutCount : null;
}

// Number of periods in the game, or null when the ruleset supplies no usable count
function getPeriodCount() {
  const periodCount = parseInt(WS.state[RULE_PERIOD_COUNT]);

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
  const period = parseInt(WS.state['ScoreBoard.CurrentGame.CurrentPeriodNumber']) || 0;

  // When the intermission clock is running
  const isIntermission = intermissionRunning === true;

  // When the score is unofficial or official
  const isOfficial = WS.state['ScoreBoard.CurrentGame.OfficialScore'] === true;

  // During overtime
  const isOvertime = WS.state['ScoreBoard.CurrentGame.InOvertime'] === true;

  return period === 0 || isIntermission || isOfficial || isOvertime;
};

// Determine if the intermission clock should be hidden
window.shouldHideIntermissionClock = function (_k, intermissionRunning) {
  // When the intermission clock is not running
  const isIntermission = intermissionRunning === true;

  // When the score is unofficial or official
  const isOfficial = WS.state['ScoreBoard.CurrentGame.OfficialScore'] === true;

  // During overtime
  const isOvertime = WS.state['ScoreBoard.CurrentGame.InOvertime'] === true;

  // After the last period, which an unknown period count cannot establish
  const period = parseInt(WS.state['ScoreBoard.CurrentGame.CurrentPeriodNumber']) || 0;
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
  const preGame = WS.state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.PreGame)'];
  const intermission = WS.state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Intermission)'];

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
    period: parseInt(WS.state['ScoreBoard.CurrentGame.CurrentPeriodNumber']) || 0,
    isIntermission: WS.state['ScoreBoard.CurrentGame.Clock(Intermission).Running'] === true,
    isOfficial: WS.state['ScoreBoard.CurrentGame.OfficialScore'] === true,
    isOvertime: WS.state['ScoreBoard.CurrentGame.InOvertime'] === true
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

  // Foul-outs and removals are status markers, not penalties with a description,
  // and the unknown code says only that the penalty has not been identified
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

  // Sum the codes rather than read scrollWidth, which misses content that
  // overflows to the left of a centered row.  Use offsetWidth so the overlay's
  // scale transform does not shrink the measurement and hide an overflow
  const natural = [...items.children].reduce((total, code) => total + code.offsetWidth, 0);
  if (available === 0 || natural <= available) {
    return;
  }

  // Every dimension in the key is proportional to this size, so the width
  // shrinks linearly with it and a single measurement captures the size
  const configuredSize = parseFloat(getComputedStyle(items.children[0]).fontSize);
  const fittedSize = Math.floor(configuredSize * (available / natural));
  items.style.setProperty('--font-penalty-code-key-size', `${fittedSize}px`);

  if (DEBUG) {
    console.log(`Penalty code key reduced from ${configuredSize}px to ${fittedSize}px to fit one line.`);
  }
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
  if (!penaltyCodeKeyVisible) {
    return;
  }

  WS.Register(
    [
      'ScoreBoard.CurrentGame.PenaltyCode',
      'ScoreBoard.CurrentGame.Team(1).Skater',
      'ScoreBoard.CurrentGame.Team(2).Skater'
    ],
    schedulePenaltyCodeKeyRebuild
  );
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
  const isReview = officialReview === true || WS.state['ScoreBoard.CurrentGame.OfficialReview'] === true;
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
      [RULE_FOULOUT_COUNT, RULE_PERIOD_COUNT].every((channel) => typeof WS.state[channel] !== 'undefined');

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

  // Log URL parameters
  logUrlParameters();

  // Set the overlay scale percentage
  setOverlayScale();

  // Set the overlay width
  setOverlayWidth();

  // Set the point the overlay scales from
  setOverlayAnchor();

  // Set the overlay background opacity
  setOverlayOpacity();

  // Set the font pairing
  setOverlayFont();

  // Set the background animation
  setBackgroundAnimation();

  // Set the timeout banner animation
  setTimeoutAnimation();
  // Set the penalty code key visibility
  setPenaltyCodeKey();

  // Show the overlay version
  setOverlayVersion();

  // Load amph module
  loadAmphModule();

  // Set the loading overlay text
  $(CLASSES.loadingOverlayTextSelector).text(CONFIG.loadingOverlayText);

  // Set the overlay title text
  $(CLASSES.penaltiesTitleH1Selector).text(CONFIG.titleBannerText);

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
