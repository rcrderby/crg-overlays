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

// Allowed URL parameters.  `debug` belongs here, because the overlay reads the
// debug setting through getUrlParameter() before DEBUG exists, and an
// unapproved parameter logs through DEBUG
const ALLOWED_URL_PARAMS = ['anchor', 'background', 'debug', 'font', 'key', 'opacity', 'scale', 'timeout', 'width'];

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

// Validate the debug logging setting
function getDebugSetting() {
  const urlDebug = getUrlParameter('debug');
  const debugSource = urlDebug !== null ? SETTING_SOURCES.url : SETTING_SOURCES.config;
  const debugToValidate = urlDebug !== null ? urlDebug.toLowerCase() : PenaltiesOverlayConfig.debug?.enabled;
  const defaultDebug = VALIDATION.debug.default;

  // Validate the debug value
  if (typeof debugToValidate === 'undefined' || debugToValidate === null) {
    console.warn(`Debug logging not defined in ${debugSource} - using default (${defaultDebug}).`);
    return defaultDebug;
  }

  if (typeof debugToValidate === 'boolean') {
    return debugToValidate;
  }

  if (debugToValidate === 'true' || debugToValidate === 'false') {
    return debugToValidate === 'true';
  }

  console.warn(
    `Invalid debug logging value "${debugToValidate}" in ${debugSource} (must be true or false) - using default (${defaultDebug}).`
  );

  return defaultDebug;
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
  let overlayScalePercent = allowed.default;
  let scaleSource = SETTING_SOURCES.default;
  let validationPassed = false;

  // Check for URL parameter first to take precedence over the config.js setting
  const urlScale = getUrlParameter('scale');
  const configScale = CONFIG.overlayScale;

  // Determine which scale value to use
  let scaleToValidate;
  if (urlScale !== null) {
    scaleToValidate = parseFloat(urlScale);
    scaleSource = SETTING_SOURCES.url;
  } else {
    scaleToValidate = configScale;
    scaleSource = SETTING_SOURCES.config;
  }

  // Validate the scale value
  if (typeof scaleToValidate === 'undefined' || scaleToValidate === null) {
    console.warn(`Overlay scale not defined in ${scaleSource} - using default (${allowed.default}%).`);
  } else if (typeof scaleToValidate !== 'number' || isNaN(scaleToValidate)) {
    console.warn(
      `Invalid overlay scale value "${scaleToValidate}" in ${scaleSource} (must be numeric) - using default (${allowed.default}%).`
    );
  } else if (scaleToValidate < allowed.min || scaleToValidate > allowed.max) {
    console.warn(
      `Invalid overlay scale value ${scaleToValidate} in ${scaleSource} (must be in range ${allowed.min}-${allowed.max}) - using default (${allowed.default}%).`
    );
  } else {
    // Round scale to two decimal points
    overlayScalePercent = Math.round(scaleToValidate * 100) / 100;
    validationPassed = true;
  }

  // Reset scale source if validation failed
  if (!validationPassed) {
    scaleSource = SETTING_SOURCES.default;
  }

  // Convert percentage to decimal for CSS transform
  const overlayScale = overlayScalePercent / 100;
  document.documentElement.style.setProperty('--overlay-scale', overlayScale);

  if (DEBUG) {
    console.log(`Overlay scaled to ${overlayScalePercent}% (from ${scaleSource}).`);
  }
}

// Validate and set the overlay width
function setOverlayWidth() {
  const allowed = VALIDATION.width;
  let overlayWidthPercent = allowed.default;
  let widthSource = SETTING_SOURCES.default;
  let validationPassed = false;

  // Check for URL parameter first to take precedence over the config.js setting
  const urlWidth = getUrlParameter('width');
  const configWidth = CONFIG.overlayWidth;

  // Determine which width value to use
  let widthToValidate;
  if (urlWidth !== null) {
    widthToValidate = parseFloat(urlWidth);
    widthSource = SETTING_SOURCES.url;
  } else {
    widthToValidate = configWidth;
    widthSource = SETTING_SOURCES.config;
  }

  // Validate the width value
  if (typeof widthToValidate === 'undefined' || widthToValidate === null) {
    console.warn(`Overlay width not defined in ${widthSource} - using default (${allowed.default}%).`);
  } else if (typeof widthToValidate !== 'number' || isNaN(widthToValidate)) {
    console.warn(
      `Invalid overlay width value "${widthToValidate}" in ${widthSource} (must be numeric) - using default (${allowed.default}%).`
    );
  } else if (widthToValidate < allowed.min || widthToValidate > allowed.max) {
    console.warn(
      `Invalid overlay width value ${widthToValidate} in ${widthSource} (must be in range ${allowed.min}-${allowed.max}) - using default (${allowed.default}%).`
    );
  } else {
    // Round width to two decimal points
    overlayWidthPercent = Math.round(widthToValidate * 100) / 100;
    validationPassed = true;
  }

  // Reset width source if validation failed
  if (!validationPassed) {
    widthSource = SETTING_SOURCES.default;
  }

  // Convert percentage to a decimal ratio of the video frame width
  document.documentElement.style.setProperty('--overlay-width-ratio', overlayWidthPercent / 100);

  if (DEBUG) {
    console.log(`Overlay width set to ${overlayWidthPercent}% of the video frame (from ${widthSource}).`);
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
function setAnimation(settingName, urlParam, configValue, animations, defaultName) {
  let animation = defaultName;
  let animationSource = SETTING_SOURCES.default;
  let validationPassed = false;

  // Check for URL parameter first to take precedence over the config.js setting
  const urlAnimation = getUrlParameter(urlParam);

  // Determine which animation value to use
  let animationToValidate;
  if (urlAnimation !== null) {
    animationToValidate = urlAnimation;
    animationSource = SETTING_SOURCES.url;
  } else {
    animationToValidate = configValue;
    animationSource = SETTING_SOURCES.config;
  }

  // Validate the animation value
  const allowedAnimations = Object.keys(animations);
  if (typeof animationToValidate === 'undefined' || animationToValidate === null) {
    console.warn(`${settingName} not defined in ${animationSource} - using default (${defaultName}).`);
  } else if (typeof animationToValidate !== 'string') {
    console.warn(
      `Invalid ${settingName} value "${animationToValidate}" in ${animationSource} (must be a string) - using default (${defaultName}).`
    );
  } else if (!allowedAnimations.includes(animationToValidate.toLowerCase())) {
    console.warn(
      `Invalid ${settingName} value "${animationToValidate}" in ${animationSource} (must be one of ${allowedAnimations.join(', ')}) - using default (${defaultName}).`
    );
  } else {
    animation = animationToValidate.toLowerCase();
    validationPassed = true;
  }

  // Reset the source if validation failed
  if (!validationPassed) {
    animationSource = SETTING_SOURCES.default;
  }

  // Remove any previously applied class before applying the chosen one
  const overlay = document.getElementById('overlay');
  if (overlay) {
    for (const className of Object.values(animations)) {
      if (className !== '') {
        overlay.classList.remove(className);
      }
    }
    if (animations[animation] !== '') {
      overlay.classList.add(animations[animation]);
    }
  }

  if (DEBUG) {
    console.log(`${settingName} set to ${animation} (from ${animationSource}).`);
  }
}

// Validate and set the background animation
function setBackgroundAnimation() {
  setAnimation(
    'Background animation',
    'background',
    CONFIG.backgroundAnimation,
    BACKGROUND_ANIMATIONS,
    VALIDATION.backgroundAnimation.default
  );
}

// Validate and set the timeout banner animation
function setTimeoutAnimation() {
  setAnimation(
    'Timeout animation',
    'timeout',
    CONFIG.timeoutAnimation,
    TIMEOUT_ANIMATIONS,
    VALIDATION.timeoutAnimation.default
  );
}

// Penalty code key state
let penaltyCodeKeyVisible = true;
let penaltyCodeKeyPending = false;

// Validate and set the penalty code key visibility
function setPenaltyCodeKey() {
  const defaultKey = VALIDATION.penaltyCodeKey.default;
  let showKey = defaultKey;
  let keySource = SETTING_SOURCES.default;
  let validationPassed = false;

  // Check for URL parameter first to take precedence over the config.js setting
  const urlKey = getUrlParameter('key');
  const configKey = CONFIG.penaltyCodeKey;

  // Determine which value to use
  let keyToValidate;
  if (urlKey !== null) {
    keyToValidate = urlKey.toLowerCase();
    keySource = SETTING_SOURCES.url;
  } else {
    keyToValidate = configKey;
    keySource = SETTING_SOURCES.config;
  }

  // Validate the value
  if (typeof keyToValidate === 'undefined' || keyToValidate === null) {
    console.warn(
      `Penalty code key not defined in ${keySource} - using default (${defaultKey ? 'visible' : 'hidden'}).`
    );
  } else if (typeof keyToValidate === 'boolean') {
    showKey = keyToValidate;
    validationPassed = true;
  } else if (keyToValidate === 'true' || keyToValidate === 'false') {
    showKey = keyToValidate === 'true';
    validationPassed = true;
  } else {
    console.warn(
      `Invalid penalty code key value "${keyToValidate}" in ${keySource} (must be true or false) - using default (${defaultKey ? 'visible' : 'hidden'}).`
    );
  }

  // Reset the source if validation failed
  if (!validationPassed) {
    keySource = SETTING_SOURCES.default;
  }

  penaltyCodeKeyVisible = showKey;

  if (DEBUG) {
    console.log(`Penalty code key ${showKey ? 'enabled' : 'disabled'} (from ${keySource}).`);
  }
}

// Validate and set the overlay background opacity
function setOverlayOpacity() {
  const allowed = VALIDATION.opacity;
  let overlayOpacityPercent = allowed.default;
  let opacitySource = SETTING_SOURCES.default;
  let validationPassed = false;

  // Check for URL parameter first to take precedence over the config.js setting
  const urlOpacity = getUrlParameter('opacity');
  const configOpacity = CONFIG.overlayOpacity;

  // Determine which opacity value to use
  let opacityToValidate;
  if (urlOpacity !== null) {
    opacityToValidate = parseFloat(urlOpacity);
    opacitySource = SETTING_SOURCES.url;
  } else {
    opacityToValidate = configOpacity;
    opacitySource = SETTING_SOURCES.config;
  }

  // Validate the opacity value
  if (typeof opacityToValidate === 'undefined' || opacityToValidate === null) {
    console.warn(`Overlay opacity not defined in ${opacitySource} - using default (${allowed.default}%).`);
  } else if (typeof opacityToValidate !== 'number' || isNaN(opacityToValidate)) {
    console.warn(
      `Invalid overlay opacity value "${opacityToValidate}" in ${opacitySource} (must be numeric) - using default (${allowed.default}%).`
    );
  } else if (opacityToValidate < allowed.min || opacityToValidate > allowed.max) {
    console.warn(
      `Invalid overlay opacity value ${opacityToValidate} in ${opacitySource} (must be in range ${allowed.min}-${allowed.max}) - using default (${allowed.default}%).`
    );
  } else {
    // Round opacity to two decimal points
    overlayOpacityPercent = Math.round(opacityToValidate * 100) / 100;
    validationPassed = true;
  }

  // Reset opacity source if validation failed
  if (!validationPassed) {
    opacitySource = SETTING_SOURCES.default;
  }

  // The value sets the alpha channel of the overlay background color
  document.documentElement.style.setProperty('--overlay-opacity', `${overlayOpacityPercent}%`);

  if (DEBUG) {
    console.log(`Overlay background opacity set to ${overlayOpacityPercent}% (from ${opacitySource}).`);
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
  const defaultAnchor = VALIDATION.anchor.default;
  let overlayAnchor = defaultAnchor;
  let anchorSource = SETTING_SOURCES.default;
  let validationPassed = false;

  // Check for URL parameter first to take precedence over the config.js setting
  const urlAnchor = getUrlParameter('anchor');
  const configAnchor = CONFIG.overlayAnchor;

  // Determine which anchor value to use
  let anchorToValidate;
  if (urlAnchor !== null) {
    anchorToValidate = urlAnchor;
    anchorSource = SETTING_SOURCES.url;
  } else {
    anchorToValidate = configAnchor;
    anchorSource = SETTING_SOURCES.config;
  }

  // Validate the anchor value
  const allowedAnchors = Object.keys(OVERLAY_ANCHORS);
  if (typeof anchorToValidate === 'undefined' || anchorToValidate === null) {
    console.warn(`Overlay anchor not defined in ${anchorSource} - using default (${defaultAnchor}).`);
  } else if (typeof anchorToValidate !== 'string') {
    console.warn(
      `Invalid overlay anchor value "${anchorToValidate}" in ${anchorSource} (must be a string) - using default (${defaultAnchor}).`
    );
  } else if (!allowedAnchors.includes(anchorToValidate.toLowerCase())) {
    console.warn(
      `Invalid overlay anchor value "${anchorToValidate}" in ${anchorSource} (must be one of ${allowedAnchors.join(', ')}) - using default (${defaultAnchor}).`
    );
  } else {
    overlayAnchor = anchorToValidate.toLowerCase();
    validationPassed = true;
  }

  // Reset anchor source if validation failed
  if (!validationPassed) {
    anchorSource = SETTING_SOURCES.default;
  }

  // Convert the anchor name to a CSS transform origin
  document.documentElement.style.setProperty('--overlay-origin', OVERLAY_ANCHORS[overlayAnchor]);

  if (DEBUG) {
    console.log(`Overlay anchored to ${overlayAnchor} (from ${anchorSource}).`);
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
  const defaultFont = VALIDATION.font.default;
  let overlayFont = defaultFont;
  let fontSource = SETTING_SOURCES.default;
  let validationPassed = false;

  // Check for URL parameter first to take precedence over the config.js setting
  const urlFont = getUrlParameter('font');
  const configFont = CONFIG.overlayFont;

  // Determine which font value to use
  let fontToValidate;
  if (urlFont !== null) {
    fontToValidate = urlFont;
    fontSource = SETTING_SOURCES.url;
  } else {
    fontToValidate = configFont;
    fontSource = SETTING_SOURCES.config;
  }

  // Validate the font value
  const allowedFonts = Object.keys(OVERLAY_FONTS);
  if (typeof fontToValidate === 'undefined' || fontToValidate === null) {
    console.warn(`Overlay font not defined in ${fontSource} - using default (${defaultFont}).`);
  } else if (typeof fontToValidate !== 'string') {
    console.warn(
      `Invalid overlay font value "${fontToValidate}" in ${fontSource} (must be a string) - using default (${defaultFont}).`
    );
  } else if (!allowedFonts.includes(fontToValidate.toLowerCase())) {
    console.warn(
      `Invalid overlay font value "${fontToValidate}" in ${fontSource} (must be one of ${allowedFonts.join(', ')}) - using default (${defaultFont}).`
    );
  } else {
    overlayFont = fontToValidate.toLowerCase();
    validationPassed = true;
  }

  // Reset font source if validation failed
  if (!validationPassed) {
    fontSource = SETTING_SOURCES.default;
  }

  // Apply the font to the display and body font variables
  const pairing = OVERLAY_FONTS[overlayFont];
  document.documentElement.style.setProperty('--font-family-display', pairing.display);
  document.documentElement.style.setProperty('--font-family', pairing.body);

  if (DEBUG) {
    console.log(`Overlay font set to ${overlayFont} (from ${fontSource}).`);
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
const SKATER_PENALTY_CODE = /^ScoreBoard\.CurrentGame\.Team\(\d+\)\.Skater\(([^)]+)\)\.Penalty\(\d+\)\.Code$/;
const RULE_FOULOUT_COUNT = 'ScoreBoard.CurrentGame.Rule(Penalties.NumberToFoulout)';
const RULE_PERIOD_COUNT = 'ScoreBoard.CurrentGame.Rule(Period.Number)';

// Number of penalties that result in a foulout
function getFouloutCount() {
  return parseInt(WS.state[RULE_FOULOUT_COUNT]);
}

// Number of periods in the game
function getPeriodCount() {
  return parseInt(WS.state[RULE_PERIOD_COUNT]);
}

// Penalty count that triggers a warning color, counted back from a foulout
function getWarningCount(offset) {
  const warningCount = getFouloutCount() - offset;

  return warningCount >= 1 ? warningCount : null;
}

/************************************
 ** Penalty Count Helper Functions **
 ***********************************/

// Private helper to check if a player is expelled or removed
function checkPenaltyStatus(k) {
  // Extract the player context from the key
  const skaterContext = k.substring(
    0,
    k.lastIndexOf('.Skater(') + k.substring(k.lastIndexOf('.Skater(')).indexOf(')') + 1
  );

  // Get Penalty(0).Code from WS.state
  const penalty0Code = WS.state[skaterContext + '.Penalty(0).Code'];

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

  return isRemoved || isExpelled || (fouloutCount >= 1 && count >= fouloutCount);
};

// Determine the text to show for a player's penalty count
window.getPenaltyCountDisplay = function (k, penaltyCount) {
  const count = parseInt(penaltyCount) || 0;
  const { isExpelled, isRemoved } = checkPenaltyStatus(k);

  const fouloutCount = getFouloutCount();

  if (isRemoved) return LABELS.removedDisplay;
  if (isExpelled) return LABELS.expelledDisplay;
  if (fouloutCount >= 1 && count >= fouloutCount) return LABELS.fouloutDisplay;

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

  // After the last period
  const period = parseInt(WS.state['ScoreBoard.CurrentGame.CurrentPeriodNumber']) || 0;

  return !isIntermission || isOfficial || isOvertime || period >= getPeriodCount();
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

  // Read intermission labels from the WS.state
  const preGame = WS.state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.PreGame)'];
  const intermission = WS.state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Intermission)'];

  // Before the game starts
  if (period === 0) {
    return preGame || '';
  }
  // Between periods
  else if (period < getPeriodCount()) {
    return intermission || '';
  }
  // After the final period, don't show the intermission label, "Unofficial" or "Official" labels will show instead
  else {
    return '';
  }
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

  return period < getPeriodCount() || !isIntermission || isOfficial || isOvertime;
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
    const match = SKATER_PENALTY_CODE.exec(stateKey);
    if (!match) {
      continue;
    }

    // Filter inactive players
    const skaterContext = stateKey.slice(0, stateKey.indexOf(').Penalty(') + 1);
    if (!(skaterContext in hidden)) {
      hidden[skaterContext] = window.shouldHideSkater(null, WS.state[skaterContext + '.Flags']);
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
