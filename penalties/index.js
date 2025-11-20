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
const LABELS = PenaltiesOverlayConfig.labels;
const RULES = PenaltiesOverlayConfig.rules;
const PENALTIES = PenaltiesOverlayConfig.penalties;
const TIMING = PenaltiesOverlayConfig.timing;

/**********************
** Utility Functions **
**********************/

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

/*******************************
** Application Initialization **
*******************************/

$(function() {
  if (DEBUG) {
    console.log('Initializing Penalties Overlay...');
  }

  // Initialize the WebSocket connection
  function initWebSocket() {
    if (typeof WS !== 'undefined') {
      WS.Connect();
      WS.AutoRegister();
      console.log('WebSocket connected.');

    // Attempt to retry WebSocket connection if it is not yet available
    } else {
      if (DEBUG) {
        console.log('Waiting for WebSocket...');
      }
      setTimeout(initWebSocket, TIMING.initWebSocket);
    }
  }

  // Start WebSocket initialization
  initWebSocket();

  console.log('Penalties Overlay successfully initialized.');
});