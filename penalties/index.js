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

  // Render initial data
  // TODO

  function updatePeriodInfo() {
    var inPeriod = WS.state['ScoreBoard.CurrentGame.InPeriod'] === 'true';
    var currentPeriod = WS.state['ScoreBoard.CurrentGame.CurrentPeriodNumber'] || '0';
    var inOvertime = WS.state['ScoreBoard.CurrentGame.InOvertime'] === 'true';
    var officialScore = WS.state['ScoreBoard.CurrentGame.OfficialScore'] === 'true';
    var state = WS.state['ScoreBoard.CurrentGame.State'];
    
    // Get the current intermission label if available
    var intermissionLabel = '';
    var labelKeys = Object.keys(WS.state);
    for (var i = 0; i < labelKeys.length; i++) {
      if (labelKeys[i].indexOf('ScoreBoard.CurrentGame.Label(') === 0) {
        var labelType = labelKeys[i].match(/Label\(([^)]+)\)/);
        if (labelType && labelType[1] !== 'Replaced' && labelType[1] !== 'Undo') {
          var labelValue = WS.state[labelKeys[i]];
          if (labelValue && labelValue !== '---') {
            // Check if this label matches current state
            if (state === 'Prepared' && labelType[1] === 'Start') {
              intermissionLabel = 'Time To Derby';
              break;
            }
          }
        }
      }
    }
    
    var text = '';
    
    if (officialScore) {
      text = 'Final Score';
    } else if (inOvertime) {
      text = 'Overtime';
    } else if (inPeriod && parseInt(currentPeriod) > 0) {
      text = 'Period ' + currentPeriod;
    } else if (state === 'Prepared') {
      text = intermissionLabel || 'Time To Derby';
    } else {
      text = 'Intermission';
    }
    
    $('#clock-label').text(text);
  }

  function updateTournamentName() {
    var name = WS.state['ScoreBoard.CurrentGame.EventInfo(Tournament)'];
    if (name) {
      $('#tournament-name').text(name).show();
    } else {
      $('#tournament-name').hide();
    }
  }

  // Start init function when WS is ready
  waitForWS();
});