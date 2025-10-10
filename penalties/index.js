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

    // Listen for clocks of different types
    WS.Register(['ScoreBoard.CurrentGame.Clock(Intermission)'], updateClock);
    WS.Register(['ScoreBoard.CurrentGame.Clock(Period)'], updateClock);
    WS.Register(['ScoreBoard.CurrentGame.Clock(Jam)'], updateClock);
    WS.Register(['ScoreBoard.CurrentGame.Clock(Lineup)'], updateClock);
    WS.Register(['ScoreBoard.CurrentGame.Clock(Timeout)'], updateClock);

    // Listen for period/intermission state
    WS.Register(['ScoreBoard.CurrentGame'], updatePeriodInfo);

    // Listen for event/tournament name
    WS.Register(['ScoreBoard.CurrentGame.EventInfo(Tournament)'], updateTournamentName);
    
    // Listen for players in the current game
    WS.Register(['ScoreBoard.CurrentGame.Team(1).Skater(*)'], function(k, v) { updateSkater(1, k, v); });
    WS.Register(['ScoreBoard.CurrentGame.Team(2).Skater(*)'], function(k, v) { updateSkater(2, k, v); });
  }

  // Start initialization when WS is ready
  waitForWS();
});