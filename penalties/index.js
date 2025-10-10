$(function() {
  'use strict';

  // Wait for WS to be loaded by core.js
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
    
    // Initial render
    // TODO
  }

  function updatePenaltyColors(teamNum) {
    var fgKey = 'ScoreBoard.CurrentGame.Team(' + teamNum + ').Color(whiteboard.fg)';
    var bgKey = 'ScoreBoard.CurrentGame.Team(' + teamNum + ').Color(whiteboard.bg)';
    var fgColor = WS.state[fgKey];
    var bgColor = WS.state[bgKey];
    
    if (fgColor && bgColor) {
      $('#team' + teamNum + '-penalties').css({
        'color': fgColor,
        'background-color': bgColor
      });
      // Set border colors for penalty lines
      $('#team' + teamNum + '-penalties .penalty-line').css('border-bottom-color', fgColor);
      $('#team' + teamNum + '-total').css({
        'color': fgColor,
        'background-color': bgColor
      });
    } else {
      $('#team' + teamNum + '-penalties').css({
        'color': 'white',
        'background-color': 'black'
      });
      // Set default border colors to pure white
      $('#team' + teamNum + '-penalties .penalty-line').css('border-bottom-color', 'white');
      $('#team' + teamNum + '-total').css({
        'color': 'white',
        'background-color': 'black'
      });
    }
  }

  function updateSkater(teamNum, key, value) {
    var match = key.match(/Skater\(([^)]+)\)/);
    if (!match) return;
    
    var skaterId = match[1];
    var skaters = teamNum === 1 ? team1Skaters : team2Skaters;
    
    if (!skaters[skaterId]) {
      skaters[skaterId] = { id: skaterId, number: '', name: '', penalties: [] };
    }
    
    if (key.indexOf('.RosterNumber') > -1) {
      skaters[skaterId].number = value || '';
    }
    else if (key.indexOf('.Name') > -1 && key.indexOf('Pronoun') === -1) {
      skaters[skaterId].name = value || '';
    }
    
    updateRoster(teamNum);
    updatePenalties(teamNum);
  }

  function updateRoster(teamNum) {
    var skaters = teamNum === 1 ? team1Skaters : team2Skaters;
    var rosterDiv = $('#team' + teamNum + '-roster');
    
    // Sort skaters by number
    var sortedSkaters = Object.values(skaters).sort(function(a, b) {
      var numA = a.number === '' ? Infinity : (isNaN(a.number) ? a.number : parseInt(a.number));
      var numB = b.number === '' ? Infinity : (isNaN(b.number) ? b.number : parseInt(b.number));
      if (typeof numA === 'number' && typeof numB === 'number') {
        return numA - numB;
      }
      return String(numA).localeCompare(String(numB));
    });
    
    rosterDiv.empty();
    
    sortedSkaters.forEach(function(skater) {
      if (skater.number || skater.name) {
        var line = $('<div class="roster-line"></div>');
        line.append('<div class="roster-number">' + (skater.number || '') + '</div>');
        line.append('<div class="roster-name">' + (skater.name || '') + '</div>');
        rosterDiv.append(line);
      }
    });
  }

  function updatePenalties(teamNum) {
    var skaters = teamNum === 1 ? team1Skaters : team2Skaters;
    
    // Clear penalty lists for all skaters
    Object.keys(skaters).forEach(function(skaterId) {
      skaters[skaterId].penalties = [];
    });
    
    // Get all penalties from WebSocket state
    var stateKeys = Object.keys(WS.state);
    var penaltyPattern = new RegExp('ScoreBoard\\.CurrentGame\\.Team\\(' + teamNum + '\\)\\.Skater\\(([^)]+)\\)\\.Penalty\\(([^)]+)\\)\\.Code');
    
    stateKeys.forEach(function(key) {
      var match = key.match(penaltyPattern);
      if (match) {
        var skaterId = match[1];
        var code = WS.state[key];
        
        if (skaters[skaterId] && code) {
          skaters[skaterId].penalties.push(code);
        }
      }
    });
    
    renderPenalties(teamNum);
  }

  function renderPenalties(teamNum) {
    var skaters = teamNum === 1 ? team1Skaters : team2Skaters;
    var penaltiesDiv = $('#team' + teamNum + '-penalties');
    
    // Sort skaters by number for penalty display
    var sortedSkaters = Object.values(skaters).sort(function(a, b) {
      var numA = a.number === '' ? Infinity : (isNaN(a.number) ? a.number : parseInt(a.number));
      var numB = b.number === '' ? Infinity : (isNaN(b.number) ? b.number : parseInt(b.number));
      if (typeof numA === 'number' && typeof numB === 'number') {
        return numA - numB;
      }
      return String(numA).localeCompare(String(numB));
    });
    
    penaltiesDiv.empty();
    
    sortedSkaters.forEach(function(skater) {
      if (skater.number || skater.name) {
        var line = $('<div class="penalty-line"></div>');
        var codes = skater.penalties.length > 0 ? skater.penalties.join(' ') : '';
        var codesDiv = $('<div class="penalty-codes"></div>').text(codes);
        var countDiv = $('<div class="penalty-count"></div>').text(skater.penalties.length || '0');
        line.append(codesDiv);
        line.append(countDiv);
        penaltiesDiv.append(line);
      }
    });
    
    // Update border colors after rendering
    updatePenaltyColors(teamNum);
  }

  function updatePenaltyTotal(teamNum, total) {
    $('#team' + teamNum + '-total .total-count').text(total || '0');
  }

  function updateClock() {
    // Determine which clock is running based on state
    var intermissionRunning = WS.state['ScoreBoard.CurrentGame.Clock(Intermission).Running'] === 'true';
    var periodRunning = WS.state['ScoreBoard.CurrentGame.Clock(Period).Running'] === 'true';
    var jamRunning = WS.state['ScoreBoard.CurrentGame.Clock(Jam).Running'] === 'true';
    var lineupRunning = WS.state['ScoreBoard.CurrentGame.Clock(Lineup).Running'] === 'true';
    var timeoutRunning = WS.state['ScoreBoard.CurrentGame.Clock(Timeout).Running'] === 'true';
    
    var time, clockName;
    
    if (periodRunning) {
      time = WS.state['ScoreBoard.CurrentGame.Clock(Period).Time'];
      clockName = WS.state['ScoreBoard.CurrentGame.Clock(Period).Name'];
    } else if (jamRunning) {
      time = WS.state['ScoreBoard.CurrentGame.Clock(Jam).Time'];
      clockName = WS.state['ScoreBoard.CurrentGame.Clock(Jam).Name'];
    } else if (lineupRunning) {
      time = WS.state['ScoreBoard.CurrentGame.Clock(Lineup).Time'];
      clockName = WS.state['ScoreBoard.CurrentGame.Clock(Lineup).Name'];
    } else if (timeoutRunning) {
      time = WS.state['ScoreBoard.CurrentGame.Clock(Timeout).Time'];
      clockName = WS.state['ScoreBoard.CurrentGame.Clock(Timeout).Name'];
    } else if (intermissionRunning) {
      time = WS.state['ScoreBoard.CurrentGame.Clock(Intermission).Time'];
      clockName = '';  // Don't show "Intermission" text
    } else {
      // No clock running, show intermission clock by default
      time = WS.state['ScoreBoard.CurrentGame.Clock(Intermission).Time'];
      clockName = '';  // Don't show "Intermission" text
    }
    
    if (time !== undefined && time !== null) {
      var ms = parseInt(time);
      var totalSeconds = Math.floor(ms / 1000);
      var minutes = Math.floor(totalSeconds / 60);
      var seconds = totalSeconds % 60;
      var timeStr = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
      
      if (clockName && clockName !== 'Period' && clockName !== 'Jam') {
        $('#game-clock').html('<div style="font-size: 20px; margin-bottom: 5px;">' + clockName + '</div><div style="font-size: 42px; font-weight: bold;">' + timeStr + '</div>');
      } else {
        $('#game-clock').html('<div style="font-size: 42px; font-weight: bold;">' + timeStr + '</div>');
      }
    } else {
      $('#game-clock').html('<div style="font-size: 42px; font-weight: bold;">0:00</div>');
    }
  }

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