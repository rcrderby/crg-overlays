//  JavaScript for custom penalties overlay - index.html

'use strict';

/******************************************
** Configuration Import and Validation **
******************************************/

console.log('Loading Penalties Overlay configuration (config.js)...');

// Import configuration data from config.js
const PenaltiesOverlayConfig = window.AppConfig?.PenaltiesOverlayConfig;

// Show a configuration error when the overlay fails to load
function showConfigError(message) {
  const render = function() {
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
const requiredSections = [
  'debug',
  'config',
  'classes',
  'labels',
  'rules',
  'penalties',
  'timing'
];

const missingSections = requiredSections.filter(
  section => !PenaltiesOverlayConfig[section]
);

if (missingSections.length > 0) {
  const errorMsg = `Configuration file (config.js) is missing required sections: ${missingSections.join(', ')}`;
  console.error('ERROR:', errorMsg);
  showConfigError(`Configuration error: ${errorMsg}. Check the browser console for details.`);
  throw new Error(errorMsg);
}

console.log('config.js loaded successfully.');

/**********************
** Global Constants  **
**********************/

// Debugging setting
const DEBUG = PenaltiesOverlayConfig.debug?.enabled || false;
console.log('Debug mode:', DEBUG);

// Configuration sections - available globally for all functions
const CONFIG = PenaltiesOverlayConfig.config;
const CLASSES = PenaltiesOverlayConfig.classes;
const LABELS = PenaltiesOverlayConfig.labels;
const RULES = PenaltiesOverlayConfig.rules;
const PENALTIES = PenaltiesOverlayConfig.penalties;
const TIMING = PenaltiesOverlayConfig.timing;

// Overlay version to display as a watermark and log to the console
const OVERLAY_VERSION = '4.0.0';

/****************************
** URL Parameter Functions **
****************************/

// Allowed URL parameters
const ALLOWED_URL_PARAMS = [
  'anchor',
  'font',
  'scale'
];

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

/*************************************
** Overlay Display Format Functions **
*************************************/

// Validate and set the overlay scale value
function setOverlayScale() {
  let overlayScalePercent = 100; // Default to 100%
  let scaleSource = 'default';
  let validationPassed = false;
  
  // Check for URL parameter first to take precedence over the config.js setting
  const urlScale = getUrlParameter('scale');
  const configScale = CONFIG.overlayScale;
  
  // Determine which scale value to use
  let scaleToValidate;
  if (urlScale !== null) {
    scaleToValidate = parseFloat(urlScale);
    scaleSource = 'URL parameter';
  } else {
    scaleToValidate = configScale;
    scaleSource = 'config.js';
  }
  
  // Validate the scale value
  if (typeof scaleToValidate === 'undefined' || scaleToValidate === null) {
    console.warn(`Overlay scale not defined in ${scaleSource} - using default (100%).`);
  } else if (typeof scaleToValidate !== 'number' || isNaN(scaleToValidate)) {
    console.warn(`Invalid overlay scale value "${scaleToValidate}" in ${scaleSource} (must be numeric) - using default (100%).`);
  } else if (scaleToValidate < 1 || scaleToValidate > 100) {
    console.warn(`Invalid overlay scale value ${scaleToValidate} in ${scaleSource} (must be in range 1-100) - using default (100%).`);
  } else {
    // Round scale to two decimal points
    overlayScalePercent = Math.round(scaleToValidate * 100) / 100;
    validationPassed = true;
  }
  
  // Reset scale source if validation failed
  if (!validationPassed) {
    scaleSource = 'default';
  }
  
  // Convert percentage to decimal for CSS transform
  const overlayScale = overlayScalePercent / 100;
  document.documentElement.style.setProperty('--overlay-scale', overlayScale);

  if (DEBUG) {
    console.log(`Overlay scaled to ${overlayScalePercent}% (from ${scaleSource}).`);
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
  let overlayAnchor = 'top'; // Default to the top of the frame
  let anchorSource = 'default';
  let validationPassed = false;

  // Check for URL parameter first to take precedence over the config.js setting
  const urlAnchor = getUrlParameter('anchor');
  const configAnchor = CONFIG.overlayAnchor;

  // Determine which anchor value to use
  let anchorToValidate;
  if (urlAnchor !== null) {
    anchorToValidate = urlAnchor;
    anchorSource = 'URL parameter';
  } else {
    anchorToValidate = configAnchor;
    anchorSource = 'config.js';
  }

  // Validate the anchor value
  const allowedAnchors = Object.keys(OVERLAY_ANCHORS);
  if (typeof anchorToValidate === 'undefined' || anchorToValidate === null) {
    console.warn(`Overlay anchor not defined in ${anchorSource} - using default (top).`);
  } else if (typeof anchorToValidate !== 'string') {
    console.warn(`Invalid overlay anchor value "${anchorToValidate}" in ${anchorSource} (must be a string) - using default (top).`);
  } else if (!allowedAnchors.includes(anchorToValidate.toLowerCase())) {
    console.warn(`Invalid overlay anchor value "${anchorToValidate}" in ${anchorSource} (must be one of ${allowedAnchors.join(', ')}) - using default (top).`);
  } else {
    overlayAnchor = anchorToValidate.toLowerCase();
    validationPassed = true;
  }

  // Reset anchor source if validation failed
  if (!validationPassed) {
    anchorSource = 'default';
  }

  // Convert the anchor name to a CSS transform origin
  document.documentElement.style.setProperty('--overlay-origin', OVERLAY_ANCHORS[overlayAnchor]);

  if (DEBUG) {
    console.log(`Overlay anchored to ${overlayAnchor} (from ${anchorSource}).`);
  }
}

// Font pairings, keyed by their display face
const OVERLAY_FONTS = {
  'saira': {
    display: "'Saira Condensed', 'Arial Narrow', arial, sans-serif",
    body: "'Saira', arial, sans-serif"
  },
  'league-gothic': {
    display: "'League Gothic', 'Arial Narrow', arial, sans-serif",
    body: "'Barlow', arial, sans-serif"
  },
  'anton': {
    display: "'Anton', 'Arial Narrow', arial, sans-serif",
    body: "'Chivo', arial, sans-serif"
  },
  'bricolage': {
    display: "'Bricolage Grotesque', arial, sans-serif",
    body: "'Barlow Condensed', 'Arial Narrow', arial, sans-serif"
  }
};

// Validate and set the overlay font pairing
function setOverlayFont() {
  let overlayFont = 'saira'; // Default to Saira
  let fontSource = 'default';
  let validationPassed = false;

  // Check for URL parameter first to take precedence over the config.js setting
  const urlFont = getUrlParameter('font');
  const configFont = CONFIG.overlayFont;

  // Determine which font value to use
  let fontToValidate;
  if (urlFont !== null) {
    fontToValidate = urlFont;
    fontSource = 'URL parameter';
  } else {
    fontToValidate = configFont;
    fontSource = 'config.js';
  }

  // Validate the font value
  const allowedFonts = Object.keys(OVERLAY_FONTS);
  if (typeof fontToValidate === 'undefined' || fontToValidate === null) {
    console.warn(`Overlay font not defined in ${fontSource} - using default (saira).`);
  } else if (typeof fontToValidate !== 'string') {
    console.warn(`Invalid overlay font value "${fontToValidate}" in ${fontSource} (must be a string) - using default (saira).`);
  } else if (!allowedFonts.includes(fontToValidate.toLowerCase())) {
    console.warn(`Invalid overlay font value "${fontToValidate}" in ${fontSource} (must be one of ${allowedFonts.join(', ')}) - using default (saira).`);
  } else {
    overlayFont = fontToValidate.toLowerCase();
    validationPassed = true;
  }

  // Reset font source if validation failed
  if (!validationPassed) {
    fontSource = 'default';
  }

  // Apply the font to the display and body font variables
  const pairing = OVERLAY_FONTS[overlayFont];
  document.documentElement.style.setProperty('--font-family-display', pairing.display);
  document.documentElement.style.setProperty('--font-family', pairing.body);

  if (DEBUG) {
    console.log(`Overlay font set to ${overlayFont} (from ${fontSource}).`);
  }
}


/******************************
** General Utility Functions **
******************************/

// Check if a value exists for cases when a value isn't truthy
window.hasValue = function(_k, v) {
  return v && v !== '';
};

/*****************************
** Roster Utility Functions **
*****************************/

// Filter players based on flags
window.shouldHideSkater = function(_k, flags) {
  // Handle null or undefined flags
  if (!flags) {
    return false;
  }

  const filteredFlags = CONFIG.filteredSkaterFlags;
  const flagArray = flags.split(',').map(f => f.trim());
  
  // Hide players if any flag matches the filtered list
  return filteredFlags.some(filtered => flagArray.includes(filtered));
};

// Show captain or alt captain indicators
window.showCaptainIndicator = function(_k, captainFlags) {
  // Handle null or undefined flags
  if (!captainFlags) {
    return '';
  }

  const { captainFlag, altCaptainFlag } = LABELS;
  const flags = captainFlags.split(',');

  return flags.includes(captainFlag) ? captainFlag :
         flags.includes(altCaptainFlag) ? altCaptainFlag : '';
};

// Convert the text glow color to the text-shadow color
window.glowColorToShadow = function(_k, glowColor) {
  if (!glowColor || glowColor === '') {
    return CLASSES.textShadow;
  }
  return `${CONFIG.defaultRosterShadowProperties} ${glowColor}`;
};

/**************************
** Game Rule Functions **
**************************/

// WebSocket Channels to read the active ruleset
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
************************************/

// Private helper to check if a player is expelled or removed
function checkPenaltyStatus(k) {
  // Extract the player context from the key
  const skaterContext = k.substring(
    0, k.lastIndexOf('.Skater(') + k.substring(k.lastIndexOf('.Skater(')).indexOf(')') + 1
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
window.isPenaltyCountWarning1 = function(k, penaltyCount) {
  const count = parseInt(penaltyCount) || 0;
  const { isExpelled, isRemoved } = checkPenaltyStatus(k);
  const warningCount = getWarningCount(RULES.warningPenaltyOffsets.first);

  return count === warningCount && !isExpelled && !isRemoved;
};

// Determine if a player should have CSS formatting for the second penalty warning color
window.isPenaltyCountWarning2 = function(k, penaltyCount) {
  const count = parseInt(penaltyCount) || 0;
  const { isExpelled, isRemoved } = checkPenaltyStatus(k);
  const warningCount = getWarningCount(RULES.warningPenaltyOffsets.second);

  return count === warningCount && !isExpelled && !isRemoved;
};

// Determine if a player should have CSS formatting for expulsion, foulout, or removal
window.isPenaltyCountExpFoRe = function(k, penaltyCount) {
  const count = parseInt(penaltyCount) || 0;
  const { isExpelled, isRemoved } = checkPenaltyStatus(k);
  
  const fouloutCount = getFouloutCount();

  return isRemoved || isExpelled || (fouloutCount >= 1 && count >= fouloutCount);
};

// Determine the text to show for a player's penalty count
window.getPenaltyCountDisplay = function(k, penaltyCount) {
  const count = parseInt(penaltyCount) || 0;
  const { isExpelled, isRemoved } = checkPenaltyStatus(k);
  
  const fouloutCount = getFouloutCount();

  if (isRemoved) return LABELS.removedDisplay;
  if (isExpelled) return LABELS.expelledDisplay;
  if (fouloutCount >= 1 && count >= fouloutCount) return LABELS.fouloutDisplay;
  
  return count > 0 ? count : '';
};

// Hide filtered penalty codes from a player's penalty code list
window.shouldHidePenaltyCode = function(k, code, penaltyNumber) {
  const filteredCodes = [
    PENALTIES.fouloutCode,
    PENALTIES.removedCode
  ];
  if (filteredCodes.includes(code)) {
    return true;
  }
  
  // Always hide Penalty(0) - it indicates a player is expelled, fouled out, or removed
  if (parseInt(penaltyNumber) === 0 || k.includes('.Penalty(0)')) {
    return true;
  }
  
  return false;
};

/***************************************
** Game Information Utility Functions **
***************************************/

// Prepend " - Game " to the game number if present
window.prependGameNo = function(_k, gameNum) {
  if (!gameNum || gameNum === '' || gameNum === '0') {
    return '';
  }
  return ` - Game ${gameNum}`;
};

// Display team names with fallback mechanisms to prevent a blank name
window.getTeamNameWithDefault = function(k, alternateName) {
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
window.shouldHidePeriodClock = function(_k, intermissionRunning) {

  // Pre-game, when no intermission clock is running (Coming Up)
  const period = parseInt(WS.state['ScoreBoard.CurrentGame.CurrentPeriodNumber']) || 0;

  // When the intermission clock is running
  const isIntermission = intermissionRunning === true;

  // When the score is unofficial or official
  const isOfficial = WS.state['ScoreBoard.CurrentGame.OfficialScore'] === true;

  // During overtime
  const isOvertime = WS.state['ScoreBoard.CurrentGame.InOvertime'] === true;

  return period === 0 ||
         isIntermission ||
         isOfficial ||
         isOvertime;
};

// Determine if the intermission clock should be hidden
window.shouldHideIntermissionClock = function(_k, intermissionRunning) {

  // When the intermission clock is not running
  const isIntermission = intermissionRunning === true;

  // When the score is unofficial or official
  const isOfficial = WS.state['ScoreBoard.CurrentGame.OfficialScore'] === true;

  // During overtime
  const isOvertime = WS.state['ScoreBoard.CurrentGame.InOvertime'] === true;

  // After the last period
  const period = parseInt(WS.state['ScoreBoard.CurrentGame.CurrentPeriodNumber']) || 0;

  return !isIntermission || isOfficial || isOvertime || (period >= getPeriodCount());
};

/************************
** Clock Label Helpers **
************************/

// Simple helper to invert boolean for sbHide
window.invertBoolean = function(_k, value) {
  return !value;
};

// Get period label
window.getPeriodLabel = function(_k, periodNumber) {
  const period = parseInt(periodNumber);
  if (!period || period === 0) return '';
  return `${LABELS.defaultPeriodLabelPrefix} ${period}`;
};

// Get intermission label
window.getIntermissionLabel = function(_k, periodNumber) {
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

// Hide the "Unofficial Score" label
window.shouldHideUnofficialScore = function(_k) {
  const period = parseInt(WS.state['ScoreBoard.CurrentGame.CurrentPeriodNumber']) || 0;
  const isIntermission = WS.state['ScoreBoard.CurrentGame.Clock(Intermission).Running'] === true;
  const isOfficial = WS.state['ScoreBoard.CurrentGame.OfficialScore'] === true;
  const isOvertime = WS.state['ScoreBoard.CurrentGame.InOvertime'] === true;
  
  return period < getPeriodCount() || !isIntermission || isOfficial || isOvertime;
};

// Hide the "Coming Up" label
window.shouldHideComingUp = function(_k) {
  const period = parseInt(WS.state['ScoreBoard.CurrentGame.CurrentPeriodNumber']) || 0;
  const isIntermission = WS.state['ScoreBoard.CurrentGame.Clock(Intermission).Running'] === true;
  const isOfficial = WS.state['ScoreBoard.CurrentGame.OfficialScore'] === true;
  const isOvertime = WS.state['ScoreBoard.CurrentGame.InOvertime'] === true;
  
  return period !== 0 || isIntermission || isOfficial || isOvertime;
};

/********************************
** Custom Logo Helper Function **
********************************/

// Load a custom logo if available - also adds has-logo class for grid layout
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
  const $teamsScores = $(CLASSES.teamsScoresSelector);

  // Show the logo and expand the grid columns when the logo successfully loads
  logoImg.onload = function() {
    $customLogo.attr('src', CONFIG.bannerLogoPath);
    $customLogoSpace.addClass(CLASSES.customLogoSpaceVisibleSelectorSuffix);
    $teamsScores.addClass(CLASSES.teamsScoresHasLogoSelectorSuffix);
    
    if (DEBUG) {
      console.log(`Custom logo loaded: ${CONFIG.bannerLogoPath}.`);
      console.log('Grid column 5 expanded for balanced layout.');
    }
  };

  // Keep logo hidden and grid collapsed if it fails to load
  logoImg.onerror = function() {
    $customLogoSpace.removeClass(CLASSES.customLogoSpaceVisibleSelectorSuffix);
    $teamsScores.removeClass(CLASSES.teamsScoresHasLogoSelectorSuffix);
    
    if (DEBUG) {
      console.log(`Custom logo failed to load: ${CONFIG.bannerLogoPath}.`);
      console.log('Grid column 5 remains collapsed.');
    }
  };

  // Attempt to load the logo
  logoImg.src = CONFIG.bannerLogoPath;
}

/************************************
** Timeout Banner Helper Functions **
************************************/

// Determine the timeout banner text to display
window.getTimeoutText = function(_k, timeoutOwner, officialReview) {

  // Official review
  const isReview = officialReview === true || 
                 WS.state['ScoreBoard.CurrentGame.OfficialReview'] === true;
  if (isReview) return LABELS.timeout.review;

  // Official timeout
  if (
    timeoutOwner === LABELS.timeoutOwner.official
  ) return LABELS.timeout.official;

  // Team timeout
  if (
    timeoutOwner && (
      timeoutOwner.endsWith(
        LABELS.timeoutOwner.team1
      ) ||
      timeoutOwner.endsWith(
        LABELS.timeoutOwner.team2
      )
    )
  ) {
    return LABELS.timeout.team;
  }

  // Untyped timeout
  return LABELS.timeout.untyped;
};

// Position untyped and official timeouts in the center of the game information box
window.isPositionCenter = function(_k, timeoutOwner) {
  return !timeoutOwner || timeoutOwner === LABELS.timeoutOwner.official;
};

// Position team 1 timeouts on the left side of the game information box
window.isPositionTeam1 = function(_k, timeoutOwner) {
  return !!(timeoutOwner && timeoutOwner.endsWith(LABELS.timeoutOwner.team1));
};

// Position team 2 timeouts on the right side of the game information box
window.isPositionTeam2 = function(_k, timeoutOwner) {
  return !!(timeoutOwner && timeoutOwner.endsWith(LABELS.timeoutOwner.team2));
};

// Determine if the timeout banner should be visible
window.isTimeoutVisible = function(_k, timeoutRunning) {
  return timeoutRunning === true;
};

/*******************************
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
*******************************/

// Display the loading overlay until the ruleset data arrives
function hideLoadingOverlayWhenReady() {
  const startTime = Date.now();

  const hideLoadingOverlay = function(reason) {
    $(CLASSES.loadingOverlaySelector).addClass(CLASSES.loadingOverlayFadeOutSuffixSelector);

    if (DEBUG) {
      console.log(`Loading overlay hidden (${reason}).`);
    }
  };

  const checkForRules = function() {
    const elapsed = Date.now() - startTime;
    const rulesArrived = typeof WS !== 'undefined' &&
      [RULE_FOULOUT_COUNT, RULE_PERIOD_COUNT].every(
        channel => typeof WS.state[channel] !== 'undefined'
      );

    // Always show the loading overlay for the minimum display time
    if (elapsed < TIMING.minLoadDisplayMs) {
      setTimeout(checkForRules, TIMING.loadCheckInterval);
    } else if (rulesArrived) {
      hideLoadingOverlay('game rules received');

    // Display the overlay rather than leave a loading screen active indefinitely
    } else if (elapsed >= TIMING.maxLoadWaitMs) {
      console.warn(
        `Game rules did not arrive within ${TIMING.maxLoadWaitMs}ms - ` +
        'displaying the overlay without them.'
      );
      hideLoadingOverlay('timed out waiting for game rules');
    } else {
      setTimeout(checkForRules, TIMING.loadCheckInterval);
    }
  };

  checkForRules();
}

/****************
** Amph Module **
*****************/

// Attempt to load the amph module
function loadAmphModule() {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'amph/amph.js';
  script.async = true;
  
  // Silent failure
  script.onerror = function() {
  };
  
  document.head.appendChild(script);
}

/*******************************
** Application Initialization **
*******************************/

$(function() {
  if (DEBUG) {
    console.log('Initializing Penalties Overlay...');
  }

  // Log URL parameters
  logUrlParameters();

  // Set the overlay scale percentage
  setOverlayScale();

  // Set the point the overlay scales from
  setOverlayAnchor();

  // Set the font pairing
  setOverlayFont();

  // Show the overlay version
  setOverlayVersion();

  // Load amph module
  loadAmphModule();

  // Set the loading overlay text
  $(CLASSES.loadingOverlayTextSelector).text(CONFIG.loadingOverlayText);

  // Set the title banner text
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