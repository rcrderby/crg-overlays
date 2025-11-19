//  JavaScript for custom penalties overlay - index.html

$(function() {
  'use strict';
  
  console.log('Loading Penalties Overlay configuration (config.js)...');
  
  // Import configuration data from global namespace
  const PenaltiesOverlayConfig = window.AppConfig.PenaltiesOverlayConfig;
  
  /********************************
  ** Verify that config.js loads **
  ********************************/

  // Halt if config.js does not load correctly
  if (typeof PenaltiesOverlayConfig === 'undefined') {
    console.error('ERROR: config.js did not load.');
    console.error('Make sure config.js is in the same directory as index.js');
    console.error('and that index.html includes: <script src="config.js"></script>');
    console.error('before <script> tags that import index.js and core.js.');
    alert('Configuration Error: config.js is missing or did not load properly. Check browser console for details.');
    return;
  }

  /********************************************
  ** Verify imported configuration variables **
  ********************************************/

  // Halt if PenaltiesOverlayConfig appears invalid
  if (
      !PenaltiesOverlayConfig.debug || 
      !PenaltiesOverlayConfig.config || 
      !PenaltiesOverlayConfig.labels || 
      !PenaltiesOverlayConfig.rules || 
      !PenaltiesOverlayConfig.penalties || 
      !PenaltiesOverlayConfig.timing
  ) {
    console.error('ERROR: data imported from config.js is invalid.');
    console.error('Required structures: timing, display, labels, rules, and penalties');
    alert('Configuration Error: config.js is invalid. Check browser console for details.');
    return;
  }

  // Read the debug setting from config.js
  const DEBUG = PenaltiesOverlayConfig.debug?.enabled || false;

  // Log that configuration file loaded successfully
  console.log('...config.js loaded successfully.');

  // Log the debug mode
  console.log('Debug mode:', DEBUG);

  /**************
  ** Constants **
  **************/

  // Data from config.js
  const CONFIG = PenaltiesOverlayConfig.config;
  const LABELS = PenaltiesOverlayConfig.labels;
  const RULES = PenaltiesOverlayConfig.rules;
  const PENALTIES = PenaltiesOverlayConfig.penalties;
  const TIMING = PenaltiesOverlayConfig.timing;
  
  // Initialize WebSocket connection
  function initWebSocket() {
    if (typeof WS !== 'undefined') {
      WS.Connect();
      WS.AutoRegister();
      console.log('WebSocket connected.');
    } else {
      console.log('Waiting for WebSocket...');
      setTimeout(initWebSocket, TIMING.initWebSocket);
    }
  }
  
  // Start initialization
  initWebSocket();
  
  console.log('Penalties Overlay successfully initialized.');
});