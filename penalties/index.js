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
if (
  !PenaltiesOverlayConfig.debug ||
  !PenaltiesOverlayConfig.config ||
  !PenaltiesOverlayConfig.classes ||
  !PenaltiesOverlayConfig.labels ||
  !PenaltiesOverlayConfig.rules ||
  !PenaltiesOverlayConfig.penalties ||
  !PenaltiesOverlayConfig.timing
) {
  console.error('ERROR: data imported from config.js is invalid.');
  console.error('Required structures: debug, config, labels, rules, penalties, and timing');
  alert('Configuration Error: config.js is invalid. Check browser console for details.');
  throw new Error('Configuration file (config.js) has invalid structure');
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

// Set the appropriate clock label based on game state
window.setClockLabel = function(
  k, 
  periodNum, 
  officialScore, 
  inOvertime, 
  intermissionRunning
) {
  // Convert parameters to the proper types
  const period = parseInt(periodNum) || 0;
  const isOfficial = officialScore === true || officialScore === 'true';
  const isOvertime = inOvertime === true || inOvertime === 'true';
  const isIntermission = intermissionRunning === true || intermissionRunning === 'true';
  
  // Get the number of periods from the game rules
  const numPeriods = parseInt(
    WS.state['ScoreBoard.CurrentGame.Rule(Period.Number)']
  ) || 2;
  
  // Determine the appropriate clock label
  if (isOfficial) {
    return LABELS.intermission.official;
  } else if (isOvertime) {
    return LABELS.intermission.overtime;
  } else if (period >= numPeriods && isIntermission) {
    return LABELS.intermission.unofficial;
  } else if (period > 0 && period < numPeriods && isIntermission) {
    return LABELS.intermission.intermission;
  } else if (period > 0) {
    return `${LABELS.defaultPeriodLabelPrefix} ${period}`;
  } else {
    return LABELS.intermission.preGame;
  }
};

// Prepend " - Game " to the game number if present
window.prependGameNo = function(k, gameNum) {
  if (!gameNum || gameNum === '' || gameNum === '0') {
    return '';
  }
  return ` - Game ${gameNum}`;
};

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