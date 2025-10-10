// CSS for custom penalties overlay - index.html
$(function() {
  'use strict';

  // Wait for WebSocket listeners to be loaded by core.js
  function waitForWS() {
    if (typeof WS === 'undefined') {
      setTimeout(waitForWS, 100);
      return;
    }
    init();
  }

  // Initialize WebSocket listeners
  function init() {
    // WebSocket connection using CRG ScoreBoard API
    WS.Connect();
    WS.AutoRegister();
  }

  // Start initialization when WS is ready
  waitForWS();
});