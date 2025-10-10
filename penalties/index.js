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

    // Listen for team data
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
    
    // Listen for players
    WS.Register(['ScoreBoard.CurrentGame.Team(1).Skater(*)'], function(k, v) { updateSkater(1, k, v); });
    WS.Register(['ScoreBoard.CurrentGame.Team(2).Skater(*)'], function(k, v) { updateSkater(2, k, v); });

    // Listen for player penalties
    WS.Register(['ScoreBoard.CurrentGame.Team(1).Skater(*).Penalty(*)'], function(k, v) { updatePenalties(1); });
    WS.Register(['ScoreBoard.CurrentGame.Team(2).Skater(*).Penalty(*)'], function(k, v) { updatePenalties(2); });

    // Listen for team penalty totals
    WS.Register(['ScoreBoard.CurrentGame.Team(1).TotalPenalties'], function(k, v) { updatePenaltyTotal(1, v); });
    WS.Register(['ScoreBoard.CurrentGame.Team(2).TotalPenalties'], function(k, v) { updatePenaltyTotal(2, v); });
  }

  // Start initialization when WS is ready
  waitForWS();
});