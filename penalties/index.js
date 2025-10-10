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

    // Listen for current game team data
    WS.Register(['ScoreBoard.CurrentGame.Team(1)'], function(k, v) { updateTeam(1, k, v); });
    WS.Register(['ScoreBoard.CurrentGame.Team(2)'], function(k, v) { updateTeam(2, k, v); });
  }

  // Start initialization when WS is ready
  waitForWS();
});