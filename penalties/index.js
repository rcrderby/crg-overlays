$(function() {
  'use strict';

  // Cache DOM selectors
  var $team1Logo = $('#team1-logo');
  var $team2Logo = $('#team2-logo');
  var $team1Name = $('#team1-name');
  var $team2Name = $('#team2-name');
  var $team1Score = $('#team1-score');
  var $team2Score = $('#team2-score');
  var $team1Roster = $('#team1-roster');
  var $team2Roster = $('#team2-roster');
  var $team1Penalties = $('#team1-penalties');
  var $team2Penalties = $('#team2-penalties');
  var $team1Total = $('#team1-total .total-count');
  var $team2Total = $('#team2-total .total-count');
  var $tournamentName = $('#tournament-name');
  var $gameClock = $('#game-clock');
  var $periodInfo = $('#period-info');
  var $logoContainers = $('.team-logo-container');
  var $customLogoSpace = $('#custom-logo-space');

  // Store skater data for each team
  var teams = {
    1: { skaters: {}, name: '', logo: '', colors: { fg: null, bg: null } },
    2: { skaters: {}, name: '', logo: '', colors: { fg: null, bg: null } }
  };
  var bothTeamsHaveLogos = false;

  // Debounce helper
  function debounce(func, wait) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        func.apply(context, args);
      }, wait);
    };
  }

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
    try {
      WS.Connect();
      WS.AutoRegister();

      // Consolidated team data registrations
      WS.Register(['ScoreBoard.CurrentGame.Team(*)'], handleTeamUpdate);
      
      // Clock registrations
      WS.Register(['ScoreBoard.CurrentGame.Clock(*)'], debouncedClockUpdate);
      
      // Period/game state
      WS.Register(['ScoreBoard.CurrentGame'], updatePeriodInfo);
      
      // Tournament info
      WS.Register(['ScoreBoard.CurrentGame.EventInfo(Tournament)'], updateTournamentName);
      
      // Skater data
      WS.Register(['ScoreBoard.CurrentGame.Team(1).Skater(*)'], function(k, v) { updateSkater(1, k, v); });
      WS.Register(['ScoreBoard.CurrentGame.Team(2).Skater(*)'], function(k, v) { updateSkater(2, k, v); });
      
      // Penalties
      WS.Register(['ScoreBoard.CurrentGame.Team(1).Skater(*).Penalty(*)'], function() { updatePenalties(1); });
      WS.Register(['ScoreBoard.CurrentGame.Team(2).Skater(*).Penalty(*)'], function() { updatePenalties(2); });
      
      // Penalty totals
      WS.Register(['ScoreBoard.CurrentGame.Team(1).TotalPenalties'], function(k, v) { updatePenaltyTotal(1, v); });
      WS.Register(['ScoreBoard.CurrentGame.Team(2).TotalPenalties'], function(k, v) { updatePenaltyTotal(2, v); });
      
      // Load custom logo
      loadCustomLogo();
      
      // Initial render - triggered by first data arrival
      setTimeout(initializeDisplay, 200);
      
    } catch(error) {
      console.error('Failed to initialize overlay:', error);
    }
  }

  // Debounced clock update
  var debouncedClockUpdate = debounce(updateClock, 50);

  // Unified team update handler
  function handleTeamUpdate(key, value) {
    var teamMatch = key.match(/Team\((\d+)\)/);
    if (!teamMatch) return;
    
    var teamNum = parseInt(teamMatch[1]);
    
    try {
      if (key.includes('.AlternateName(operator)')) {
        updateTeamName(teamNum, value);
      } else if (key.match(/\.Name$/) && !key.includes('AlternateName')) {
        var altNameKey = 'ScoreBoard.CurrentGame.Team(' + teamNum + ').AlternateName(operator)';
        if (!WS.state[altNameKey]) {
          updateTeamName(teamNum, value);
        }
      } else if (key.match(/\.Score$/) && !key.includes('Skater')) {
        updateTeamScore(teamNum, value);
      } else if (key.match(/\.Logo$/)) {
        updateTeamLogo(teamNum, value);
      } else if (key.includes('.Color(whiteboard.fg)') || key.includes('.Color(whiteboard.bg)')) {
        setTimeout(function() { updatePenaltyColors(teamNum); }, 50);
      }
    } catch(error) {
      console.error('Error handling team update:', error);
    }
  }

  function updateTeamName(teamNum, value) {
    teams[teamNum].name = value || ('Team ' + teamNum);
    var $nameElement = teamNum === 1 ? $team1Name : $team2Name;
    $nameElement.text(teams[teamNum].name);
  }

  function updateTeamScore(teamNum, value) {
    var $scoreElement = teamNum === 1 ? $team1Score : $team2Score;
    $scoreElement.text(value || '0');
  }

  function updateTeamLogo(teamNum, value) {
    teams[teamNum].logo = value || '';
    checkAndDisplayLogos();
  }

  function checkAndDisplayLogos() {
    var shouldShow = teams[1].logo && teams[2].logo;
    
    if (shouldShow !== bothTeamsHaveLogos) {
      bothTeamsHaveLogos = shouldShow;
      
      if (shouldShow) {
        $team1Logo.attr('src', teams[1].logo).show();
        $team2Logo.attr('src', teams[2].logo).show();
        $logoContainers.show();
      } else {
        $team1Logo.hide();
        $team2Logo.hide();
        $logoContainers.hide();
      }
    }
  }

  function updatePenaltyColors(teamNum) {
    var fgKey = 'ScoreBoard.CurrentGame.Team(' + teamNum + ').Color(whiteboard.fg)';
    var bgKey = 'ScoreBoard.CurrentGame.Team(' + teamNum + ').Color(whiteboard.bg)';
    var fgColor = WS.state[fgKey];
    var bgColor = WS.state[bgKey];
    
    // Check if colors have actually changed
    if (teams[teamNum].colors.fg === fgColor && teams[teamNum].colors.bg === bgColor) {
      return;
    }
    
    teams[teamNum].colors.fg = fgColor;
    teams[teamNum].colors.bg = bgColor;
    
    // Use CSS variables for better performance
    var root = document.documentElement;
    
    if (fgColor && bgColor) {
      root.style.setProperty('--team' + teamNum + '-fg', fgColor);
      root.style.setProperty('--team' + teamNum + '-bg', bgColor);
      root.style.setProperty('--team' + teamNum + '-border', fgColor);
    } else {
      root.style.setProperty('--team' + teamNum + '-fg', 'white');
      root.style.setProperty('--team' + teamNum + '-bg', 'black');
      root.style.setProperty('--team' + teamNum + '-border', 'white');
    }
  }

  function updateSkater(teamNum, key, value) {
    var match = key.match(/Skater\(([^)]+)\)/);
    if (!match) return;
    
    var skaterId = match[1];
    var skaters = teams[teamNum].skaters;
    
    if (!skaters[skaterId]) {
      skaters[skaterId] = { id: skaterId, number: '', name: '', penalties: [] };
    }
    
    if (key.includes('.RosterNumber')) {
      skaters[skaterId].number = value || '';
    } else if (key.includes('.Name') && !key.includes('Pronoun')) {
      skaters[skaterId].name = value || '';
    }
    
    updateRoster(teamNum);
    updatePenalties(teamNum);
  }

  function sortSkaters(skaters) {
    return Object.values(skaters).sort(function(a, b) {
      var numA = a.number === '' ? Infinity : (isNaN(a.number) ? a.number : parseInt(a.number));
      var numB = b.number === '' ? Infinity : (isNaN(b.number) ? b.number : parseInt(b.number));
      if (typeof numA === 'number' && typeof numB === 'number') {
        return numA - numB;
      }
      return String(numA).localeCompare(String(numB));
    });
  }

  function updateRoster(teamNum) {
    var skaters = teams[teamNum].skaters;
    var $rosterDiv = teamNum === 1 ? $team1Roster : $team2Roster;
    var sortedSkaters = sortSkaters(skaters);
    
    // Batch DOM updates
    var html = '';
    sortedSkaters.forEach(function(skater) {
      if (skater.number || skater.name) {
        html += '<div class="roster-line">' +
                '<div class="roster-number">' + (skater.number || '') + '</div>' +
                '<div class="roster-name">' + (skater.name || '') + '</div>' +
                '</div>';
      }
    });
    
    $rosterDiv.html(html);
  }

  function updatePenalties(teamNum) {
    var skaters = teams[teamNum].skaters;
    
    // Clear penalty lists
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
    var skaters = teams[teamNum].skaters;
    var $penaltiesDiv = teamNum === 1 ? $team1Penalties : $team2Penalties;
    var sortedSkaters = sortSkaters(skaters);
    
    // Batch DOM updates
    var html = '';
    sortedSkaters.forEach(function(skater) {
      if (skater.number || skater.name) {
        var codes = skater.penalties.length > 0 ? skater.penalties.join(' ') : '';
        html += '<div class="penalty-line">' +
                '<div class="penalty-codes">' + codes + '</div>' +
                '<div class="penalty-count">' + (skater.penalties.length || '0') + '</div>' +
                '</div>';
      }
    });
    
    $penaltiesDiv.html(html);
  }

  function updatePenaltyTotal(teamNum, total) {
    var $totalElement = teamNum === 1 ? $team1Total : $team2Total;
    $totalElement.text(total || '0');
  }

  function updateClock() {
    try {
      var intermissionRunning = WS.state['ScoreBoard.CurrentGame.Clock(Intermission).Running'] === 'true';
      var periodRunning = WS.state['ScoreBoard.CurrentGame.Clock(Period).Running'] === 'true';
      var jamRunning = WS.state['ScoreBoard.CurrentGame.Clock(Jam).Running'] === 'true';
      var lineupRunning = WS.state['ScoreBoard.CurrentGame.Clock(Lineup).Running'] === 'true';
      var timeoutRunning = WS.state['ScoreBoard.CurrentGame.Clock(Timeout).Running'] === 'true';
      
      var time, clockName = '';
      
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
      } else {
        time = WS.state['ScoreBoard.CurrentGame.Clock(Intermission).Time'];
      }
      
      if (time !== undefined && time !== null) {
        var ms = parseInt(time);
        var totalSeconds = Math.floor(ms / 1000);
        var minutes = Math.floor(totalSeconds / 60);
        var seconds = totalSeconds % 60;
        var timeStr = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
        
        if (clockName && clockName !== 'Period' && clockName !== 'Jam') {
          $gameClock.html('<div style="font-size: 20px; margin-bottom: 5px;">' + clockName + '</div><div style="font-size: 42px; font-weight: bold;">' + timeStr + '</div>');
        } else {
          $gameClock.html('<div style="font-size: 42px; font-weight: bold;">' + timeStr + '</div>');
        }
      } else {
        $gameClock.html('<div style="font-size: 42px; font-weight: bold;">0:00</div>');
      }
    } catch(error) {
      console.error('Error updating clock:', error);
    }
  }

  function updatePeriodInfo() {
    try {
      var inPeriod = WS.state['ScoreBoard.CurrentGame.InPeriod'] === 'true';
      var currentPeriod = WS.state['ScoreBoard.CurrentGame.CurrentPeriodNumber'] || '0';
      var inOvertime = WS.state['ScoreBoard.CurrentGame.InOvertime'] === 'true';
      var officialScore = WS.state['ScoreBoard.CurrentGame.OfficialScore'] === 'true';
      var state = WS.state['ScoreBoard.CurrentGame.State'];
      
      var text = '';
      
      if (officialScore) {
        text = 'Final Score';
      } else if (inOvertime) {
        text = 'Overtime';
      } else if (inPeriod && parseInt(currentPeriod) > 0) {
        text = 'Period ' + currentPeriod;
      } else if (state === 'Prepared') {
        text = 'Time To Derby';
      } else {
        text = 'Intermission';
      }
      
      $periodInfo.text(text);
    } catch(error) {
      console.error('Error updating period info:', error);
    }
  }

  function updateTournamentName() {
    var name = WS.state['ScoreBoard.CurrentGame.EventInfo(Tournament)'];
    if (name) {
      $tournamentName.text(name).show();
    } else {
      $tournamentName.hide();
    }
  }

  function loadCustomLogo() {
    var logoImg = new Image();
    logoImg.onload = function() {
      $customLogoSpace.html('<img src="banner-logo.png" style="max-width: 100%; max-height: 100%; object-fit: contain;" />');
    };
    logoImg.onerror = function() {
      $customLogoSpace.empty();
    };
    logoImg.src = 'banner-logo.png';
  }

  function initializeDisplay() {
    try {
      updateTeamName(1, WS.state['ScoreBoard.CurrentGame.Team(1).AlternateName(operator)'] || WS.state['ScoreBoard.CurrentGame.Team(1).Name']);
      updateTeamName(2, WS.state['ScoreBoard.CurrentGame.Team(2).AlternateName(operator)'] || WS.state['ScoreBoard.CurrentGame.Team(2).Name']);
      updatePenaltyColors(1);
      updatePenaltyColors(2);
      updateTournamentName();
      updateClock();
      updatePeriodInfo();
      checkAndDisplayLogos();
      updatePenaltyTotal(1, WS.state['ScoreBoard.CurrentGame.Team(1).TotalPenalties']);
      updatePenaltyTotal(2, WS.state['ScoreBoard.CurrentGame.Team(2).TotalPenalties']);
    } catch(error) {
      console.error('Error during initialization:', error);
    }
  }

  // Start initialization when WS is ready
  waitForWS();
});