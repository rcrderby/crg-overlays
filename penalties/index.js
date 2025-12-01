//  JavaScript for custom penalties overlay - index.html

'use strict';

/******************************************
** Configuration Import and Validation **
******************************************/

console.log('Loading Penalties Overlay configuration (config.js)...');

// Import configuration data from config.js
const PenaltiesOverlayConfig = window.AppConfig?.PenaltiesOverlayConfig;

// Validate that config.js loaded correctly
if (typeof PenaltiesOverlayConfig === 'undefined') {
  console.error('ERROR: config.js did not load.');
  console.error('Make sure config.js is in the same directory as index.js');
  console.error('and that index.html includes: <script src="config.js"></script>');
  console.error('before <script> tags that import index.js and core.js.');
  alert('Configuration Error: config.js is missing or did not load properly. Check browser console for details.');
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
  alert(`Configuration Error: ${errorMsg}. Check browser console for details.`);
  throw new Error(errorMsg);
}

console.log('...config.js loaded successfully.');

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

/******************************
** General Utility Functions **
******************************/

// Check if a value exists for cases when a value isn't truthy
window.hasValue = function(k, v) {
  return v && v !== '';
};

/***************************************
** Game Information Utility Functions **
***************************************/

// Prepend " - Game " to the game number if present
window.prependGameNo = function(k, gameNum) {
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
  return LABELS.defaultTeamNamePrefix + teamNum;
};

// Determine if the period clock should be hidden
window.shouldHidePeriodClock = function(k, intermissionRunning) {

  // Pre-game, when no intermission clock is running (Coming Up)
  const period = parseInt(WS.state['ScoreBoard.CurrentGame.CurrentPeriodNumber']) || 0;
  const numPeriods = RULES.numPeriods;

  // When the intermission clock is running
  const isIntermission = intermissionRunning === true || intermissionRunning === 'true';

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
window.shouldHideIntermissionClock = function(k, intermissionRunning) {

  // When the intermission clock is not running
  const isIntermission = intermissionRunning === true || intermissionRunning === 'true';

  // When the score is unofficial or official
  const isOfficial = WS.state['ScoreBoard.CurrentGame.OfficialScore'] === true;

  // During overtime
  const isOvertime = WS.state['ScoreBoard.CurrentGame.InOvertime'] === true;

  // After the last period
  const period = parseInt(WS.state['ScoreBoard.CurrentGame.CurrentPeriodNumber']) || 0;
  const numPeriods = RULES.numPeriods;

  return !isIntermission || isOfficial || isOvertime || (period >= numPeriods);
};

/************************
** Clock Label Helpers **
************************/

// Simple helper to invert boolean for sbHide
window.invertBoolean = function(k, value) {
  return !value;
};

// Get period label
window.getPeriodLabel = function(k, periodNumber) {
  const period = parseInt(periodNumber);
  if (!period || period === 0) return '';
  return `${LABELS.defaultPeriodLabelPrefix} ${period}`;
};

// Get intermission label
window.getIntermissionLabel = function(k, periodNumber) {
  const period = parseInt(periodNumber) || 0;
  
  // Read intermission labels from the WS.state
  const preGame = WS.state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.PreGame)'];
  const intermission = WS.state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Intermission)'];
  
  // Before the game starts
  if (period === 0) {
    return preGame || '';
  }
  // Between periods
  else if (period < RULES.numPeriods) {
    return intermission || '';
  }
  // After the final period, don't show the intermission label, "Unofficial" or "Official" labels will show instead
  else {
    return '';
  }
};

// Hide the "Unofficial Score" label
window.shouldHideUnofficialScore = function(k) {
  const period = parseInt(WS.state['ScoreBoard.CurrentGame.CurrentPeriodNumber']) || 0;
  const isIntermission = WS.state['ScoreBoard.CurrentGame.Clock(Intermission).Running'] === true;
  const isOfficial = WS.state['ScoreBoard.CurrentGame.OfficialScore'] === true;
  const isOvertime = WS.state['ScoreBoard.CurrentGame.InOvertime'] === true;
  
  return period < RULES.numPeriods || !isIntermission || isOfficial || isOvertime;
};

// Hide the "Coming Up" label
window.shouldHideComingUp = function(k) {
  const period = parseInt(WS.state['ScoreBoard.CurrentGame.CurrentPeriodNumber']) || 0;
  const isIntermission = WS.state['ScoreBoard.CurrentGame.Clock(Intermission).Running'] === true;
  const isOfficial = WS.state['ScoreBoard.CurrentGame.OfficialScore'] === true;
  const isOvertime = WS.state['ScoreBoard.CurrentGame.InOvertime'] === true;
  
  return period !== 0 || isIntermission || isOfficial || isOvertime;
};

/********************************
** Custom Logo Helper Function **
********************************/

// Load a custom logo if available
function loadCustomLogo() {

  // Check if the logo path is configured
  if (!CONFIG.bannerLogoPath || CONFIG.bannerLogoPath === '') {

    // Apply padding when no logo is present
    $('#teams-scores').css({
      'padding-left': CONFIG.gameInfoPaddingWithoutLogo + 'px',
      'padding-right': CONFIG.gameInfoPaddingWithoutLogo + 'px'
    });
    
    if (DEBUG) {
      console.log('No custom logo available, using default padding:', CONFIG.gameInfoPaddingWithoutLogo);
    }
    return;
  }

  const logoImg = new Image();
  const $customLogo = $('#custom-logo');

  // Show the logo and apply the appropriate padding when the logo loads successfully
  logoImg.onload = function() {
    $customLogo.attr('src', CONFIG.bannerLogoPath);
    $customLogo.addClass('visible');
    
    // Apply padding when the logo is present
    $('#teams-scores').css({
      'padding-left': CONFIG.gameInfoPaddingWithLogo + 'px',
      'padding-right': CONFIG.gameInfoPaddingWithLogo + 'px'
    });
    
    if (DEBUG) {
      console.log('Custom logo loaded:', CONFIG.bannerLogoPath);
      console.log('Adding padding:', CONFIG.gameInfoPaddingWithLogo);
    }
  };

  // Hide the logo and apply default padding when there is no logo or it fails to load
  logoImg.onerror = function() {
    $customLogo.removeClass('visible');
    
    // Apply padding for no logo
    $('#teams-scores').css({
      'padding-left': CONFIG.gameInfoPaddingWithoutLogo + 'px',
      'padding-right': CONFIG.gameInfoPaddingWithoutLogo + 'px'
    });
    
    if (DEBUG) {
      console.log('Custom logo failed to load:', CONFIG.bannerLogoPath);
      console.log('Using default padding:', CONFIG.gameInfoPaddingWithoutLogo);
    }
  };

  // Attempt to load the logo
  logoImg.src = CONFIG.bannerLogoPath;
}

/*****************************
** Roster Utility Functions **
*****************************/

// Filter players based on flags
window.shouldHideSkater = function(k, flags) {
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
window.showCaptainIndicator = function(k, captainFlags) {
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
window.glowColorToShadow = function(k, glowColor) {
  if (!glowColor || glowColor === '') {
    return CLASSES.textShadow;
  }
  return `${CONFIG.defaultRosterShadowProperties} ${glowColor}`;
};

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

// Determine if a player should have CSS formatting for 5 penalties 
window.isPenaltyCount5 = function(k, penaltyCount) {
  const count = parseInt(penaltyCount) || 0;
  const { isExpelled, isRemoved } = checkPenaltyStatus(k);
  
  return count === RULES.warningPenaltyCount5 && !isExpelled && !isRemoved;
};

// Determine if a player should have CSS formatting for 6 penalties
window.isPenaltyCount6 = function(k, penaltyCount) {
  const count = parseInt(penaltyCount) || 0;
  const { isExpelled, isRemoved } = checkPenaltyStatus(k);
  
  return count === RULES.warningPenaltyCount6 && !isExpelled && !isRemoved;
};

// Determine if a player should have CSS formatting for expulsion, foulout, or removal
window.isPenaltyCountExpFoRe = function(k, penaltyCount) {
  const count = parseInt(penaltyCount) || 0;
  const { isExpelled, isRemoved } = checkPenaltyStatus(k);
  
  return isRemoved || isExpelled || count >= RULES.fouloutPenaltyCount;
};

// Determine the text to show for a player's penalty count
window.getPenaltyCountDisplay = function(k, penaltyCount) {
  const count = parseInt(penaltyCount) || 0;
  const { isExpelled, isRemoved } = checkPenaltyStatus(k);
  
  if (isRemoved) return LABELS.removedDisplay;
  if (isExpelled) return LABELS.expelledDisplay;
  if (count >= RULES.fouloutPenaltyCount) return LABELS.fouloutDisplay;
  
  return count > 0 ? count : '';
};

// Hide filtered penalty codes from a player's penalty code list
window.shouldHidePenaltyCode = function(k, code, penaltyNumber) {
  const filteredCodes = [
    PENALTIES.fouloutCode,
    PENALTIES.removedCode
  ]
  if (filteredCodes.includes(code)) {
    return true;
  }
  
  // Always hide Penalty(0) - it indicates a player is expelled, fouled out, or removed
  if (parseInt(penaltyNumber) === 0 || k.includes('.Penalty(0)')) {
    return true;
  }
  
  return false;
};

/************************************
** Timeout Banner Helper Functions **
************************************/

// Determine the timeout banner text to display
window.getTimeoutText = function(k, timeoutOwner, officialReview) {

  // Official review
  const isReview = (officialReview === true || officialReview === 'true') || 
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
window.isPositionCenter = function(k, timeoutOwner) {
  return timeoutOwner === 'O' || !timeoutOwner || timeoutOwner === '';
};

// Position team 1 timeouts on the left side of the game information box
window.isPositionTeam1 = function(k, timeoutOwner) {
  return !!(timeoutOwner && timeoutOwner.endsWith('_1'));
};

// Position team 2 timeouts on the right side of the game information box
window.isPositionTeam2 = function(k, timeoutOwner) {
  return !!(timeoutOwner && timeoutOwner.endsWith('_2'));
};

// Determine if the timeout banner should be visible
window.isTimeoutVisible = function(k, timeoutRunning) {
  return timeoutRunning === true || timeoutRunning === 'true';
};

/*******************************
** Application Initialization **
*******************************/

$(function() {
  if (DEBUG) {
    console.log('Initializing Penalties Overlay...');
  }

  // Set the loading overlay text
  $('.loading-text').text(CONFIG.loadingOverlayText);

  // Set the penalties title
  $('#penalties-title h1').text(CONFIG.penaltiesTitleText);

  // Attempt to load a custom logo
  loadCustomLogo();

  // Hide the loading overlay after the minimum display time
  setTimeout(function() {
    $('#loading-overlay').addClass('fade-out');
  }, TIMING.minLoadDisplayMs);

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