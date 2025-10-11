//  JavaScript for custom penalties overlay - index.html

$(function() {
  'use strict';

  // Constants
  const BANNER_LOGO_PATH = 'logos/banner-logo.png';

  // Cache DOM selectors
  var $elements = {
    team1: {
      logo: $('#team1-logo'),
      name: $('#team1-name'),
      score: $('#team1-score'),
      roster: $('#team1-roster'),
      penalties: $('#team1-penalties'),
      total: $('#team1-total .total-count')
    },
    team2: {
      logo: $('#team2-logo'),
      name: $('#team2-name'),
      score: $('#team2-score'),
      roster: $('#team2-roster'),
      penalties: $('#team2-penalties'),
      total: $('#team2-total .total-count')
    },
    logoContainers: $('.team-logo-container'),
    tournamentName: $('#tournament-name'),
    gameClock: $('#game-clock'),
    periodInfo: $('#period-info'),
    customLogoSpace: $('#custom-logo-space')
  };

  // Store skater data for each team
  var teams = {
    1: { skaters: {}, logo: '', colors: { fg: null, bg: null } },
    2: { skaters: {}, logo: '', colors: { fg: null, bg: null } }
  };
  var bothTeamsHaveLogos = false;
  var root = document.documentElement;

  // Helper function to check boolean values from WebSocket
  function isTrue(value) {
    return value === true || value === 'true';
  }

  // Debounce helper
  function debounce(func, wait) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function() { func.apply(context, args); }, wait);
    };
  }

  // Wait for WS to be loaded
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

      // Register all team data with wildcards
      WS.Register(['ScoreBoard.CurrentGame.Team(*)'], handleTeamUpdate);
      WS.Register(['ScoreBoard.CurrentGame.Team(*).Skater(*)'], handleSkaterUpdate);
      WS.Register(['ScoreBoard.CurrentGame.Team(*).Skater(*).Penalty(*)'], handlePenaltyUpdate);
      
      // Clock and game state
      WS.Register(['ScoreBoard.CurrentGame.Clock(*)'], debouncedClockUpdate);
      WS.Register(['ScoreBoard.CurrentGame'], updateGameState);
      WS.Register(['ScoreBoard.CurrentGame.OfficialScore'], updateGameState);
      
      // Intermission label settings
      WS.Register(['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.PreGame)'], updateGameState);
      WS.Register(['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Intermission)'], updateGameState);
      WS.Register(['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Unofficial)'], updateGameState);
      WS.Register(['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Official)'], updateGameState);

      // Tournament info
      WS.Register(['ScoreBoard.CurrentGame.EventInfo(Tournament)'], updateTournamentName);
      
      loadCustomLogo();
      setTimeout(initializeDisplay, 200);
      
    } catch(error) {
      console.error('Failed to initialize overlay:', error);
    }
  }

  // Debounced clock update
  var debouncedClockUpdate = debounce(updateClock, 50);

  // Unified team update handler
  function handleTeamUpdate(key, value) {
    var match = key.match(/Team\((\d+)\)/);
    if (!match) return;
    
    var teamNum = parseInt(match[1]);
    var team = $elements['team' + teamNum];
    
    if (key.includes('.AlternateName(whiteboard)') || (key.match(/\.Name$/) && !key.includes('AlternateName'))) {
      var altName = WS.state['ScoreBoard.CurrentGame.Team(' + teamNum + ').AlternateName(whiteboard)'];
      team.name.text(altName || value || 'Team ' + teamNum);
      setTimeout(equalizeTeamBoxWidths, 10);
    } else if (key.match(/\.Score$/) && !key.includes('Skater')) {
      team.score.text(value || '0');
    } else if (key.match(/\.Logo$/)) {
      teams[teamNum].logo = value || '';
      checkAndDisplayLogos();
    } else if (key.includes('.Color(whiteboard.')) {
      setTimeout(function() { updateTeamColors(teamNum); }, 50);
    } else if (key.includes('.TotalPenalties')) {
      team.total.text(value || '0');
    }
  }

  // Unified skater update handler
  function handleSkaterUpdate(key, value) {
    var match = key.match(/Team\((\d+)\)\.Skater\(([^)]+)\)/);
    if (!match) return;
    
    var teamNum = parseInt(match[1]);
    var skaterId = match[2];
    var skaters = teams[teamNum].skaters;
    
    if (!skaters[skaterId]) {
      skaters[skaterId] = { id: skaterId, number: '', name: '', penalties: [] };
    }
    
    if (key.includes('.RosterNumber')) {
      skaters[skaterId].number = value || '';
      updateRosterAndPenalties(teamNum);
    } else if (key.includes('.Name') && !key.includes('Pronoun')) {
      skaters[skaterId].name = value || '';
      updateRosterAndPenalties(teamNum);
    }
  }

  // Handle penalty updates
  function handlePenaltyUpdate(key, value) {
    var match = key.match(/Team\((\d+)\)/);
    if (match) {
      updatePenalties(parseInt(match[1]));
    }
  }

  // Update team colors
  function updateTeamColors(teamNum) {
    var fgColor = WS.state['ScoreBoard.CurrentGame.Team(' + teamNum + ').Color(whiteboard.fg)'];
    var bgColor = WS.state['ScoreBoard.CurrentGame.Team(' + teamNum + ').Color(whiteboard.bg)'];
    
    if (teams[teamNum].colors.fg === fgColor && teams[teamNum].colors.bg === bgColor) {
      return;
    }
    
    teams[teamNum].colors.fg = fgColor;
    teams[teamNum].colors.bg = bgColor;
    
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

  // Check and display logos
  function checkAndDisplayLogos() {
    var shouldShow = teams[1].logo && teams[2].logo;
    
    if (shouldShow !== bothTeamsHaveLogos) {
      bothTeamsHaveLogos = shouldShow;
      
      if (shouldShow) {
        $elements.team1.logo.attr('src', teams[1].logo).show();
        $elements.team2.logo.attr('src', teams[2].logo).show();
        $elements.logoContainers.show();
      } else {
        $elements.team1.logo.hide();
        $elements.team2.logo.hide();
        $elements.logoContainers.hide();
      }
    }
  }

  // Equalize team score block widths and set wrapper width
  function equalizeTeamBoxWidths() {
    // Temporarily remove width constraints to measure natural width
    $('.team-score-block').css('width', 'auto');
    
    // Small delay to let the browser recalculate
    setTimeout(function() {
      var team1Width = $elements.team1.name.parent().outerWidth();
      var team2Width = $elements.team2.name.parent().outerWidth();
      var maxWidth = Math.max(team1Width, team2Width);
      
      // Set both boxes to the same width
      $('.team-score-block').css('width', maxWidth + 'px');
      
      // Calculate total width needed
      var vsClockWidth = $('#vs-clock-container').outerWidth();
      var hasLogo = $('.game-info-wrapper').hasClass('has-logo');
      var padding = hasLogo ? 280 : 40;
      
      var totalWidth = (maxWidth * 2) + vsClockWidth + padding;
      
      $('.game-info-wrapper').css('width', totalWidth + 'px');
    }, 0);
  }

  // Sort skaters by number
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

  // Combined roster and penalties update
  function updateRosterAndPenalties(teamNum) {
    var skaters = teams[teamNum].skaters;
    var sortedSkaters = sortSkaters(skaters);
    var team = $elements['team' + teamNum];
    
    // Build roster HTML
    var rosterHtml = '';
    var penaltiesHtml = '';
    
    sortedSkaters.forEach(function(skater) {
      if (skater.number || skater.name) {
        rosterHtml += '<div class="roster-line">' +
                    '<div class="roster-number">' + (skater.number || '') + '</div>' +
                    '<div class="roster-name">' + (skater.name || '') + '</div>' +
                    '</div>';
        
        // Filter out FO and EXP codes from display
        var displayCodes = skater.penalties.filter(function(code) {
          return code !== 'FO' && code !== 'EXP';
        });
        var codes = displayCodes.length > 0 ? displayCodes.join(' ') : '';
        
        penaltiesHtml += '<div class="penalty-line">' +
                        '<div class="penalty-codes">' + codes + '</div>' +
                        '<div class="penalty-count">' + (displayCodes.length || '0') + '</div>' +
                        '</div>';
      }
    });
    
    team.roster.html(rosterHtml);
    team.penalties.html(penaltiesHtml);
  }

  // Update penalties only
  function updatePenalties(teamNum) {
    var skaters = teams[teamNum].skaters;
    
    // Clear penalty lists
    Object.keys(skaters).forEach(function(skaterId) {
      skaters[skaterId].penalties = [];
    });
    
    // Get all penalties from WebSocket state
    var penaltyPattern = new RegExp('ScoreBoard\\.CurrentGame\\.Team\\(' + teamNum + '\\)\\.Skater\\(([^)]+)\\)\\.Penalty\\(([^)]+)\\)\\.Code');
    
    Object.keys(WS.state).forEach(function(key) {
      var match = key.match(penaltyPattern);
      if (match) {
        var skaterId = match[1];
        var code = WS.state[key];
        
        if (skaters[skaterId] && code) {
          skaters[skaterId].penalties.push(code);
        }
      }
    });
    
    updateRosterAndPenalties(teamNum);
  }

  // Update clock
  function updateClock() {
    try {
      var state = WS.state;
      var officialScore = isTrue(state['ScoreBoard.CurrentGame.OfficialScore']);
      var currentPeriod = parseInt(state['ScoreBoard.CurrentGame.CurrentPeriodNumber']) || 0;
      var intermissionTime = parseInt(state['ScoreBoard.CurrentGame.Clock(Intermission).Time']) || 0;
      var periodTime = parseInt(state['ScoreBoard.CurrentGame.Clock(Period).Time']) || 0;
      var numPeriods = parseInt(state['ScoreBoard.CurrentGame.Rule(Period.Number)']) || 2;
      var intermissionRunning = isTrue(state['ScoreBoard.CurrentGame.Clock(Intermission).Running']);
      
      // Game is over - hide clock
      // Only when we're past all periods, OR at final period with intermission running (post-game)
      var gameOver = currentPeriod > numPeriods || 
                    (currentPeriod >= numPeriods && (intermissionRunning || intermissionTime > 0));
      
      if (officialScore || gameOver) {
        $elements.gameClock.html('&nbsp;');
        return;
      }
      
      // Before game starts (Time to Derby)
      if (currentPeriod === 0) {
        if (intermissionTime <= 0) {
          $elements.gameClock.html('&nbsp;');
        } else {
          $elements.gameClock.text(formatTime(intermissionTime));
        }
        return;
      }
      
      // Between periods (intermission running with time)
      if (currentPeriod > 0 && currentPeriod < numPeriods && intermissionTime > 0) {
        $elements.gameClock.text(formatTime(intermissionTime));
        return;
      }
      
      // During a period or waiting to start a period - show period clock
      $elements.gameClock.text(formatTime(periodTime));
      
    } catch(error) {
      console.error('Error updating clock:', error);
    }
  }

  // Format time from milliseconds
  function formatTime(ms) {
    var totalSeconds = Math.floor(ms / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }

  // Update game state (period info)
  function updateGameState() {
    try {
      var state = WS.state;
      var currentPeriod = parseInt(state['ScoreBoard.CurrentGame.CurrentPeriodNumber']) || 0;
      var inOvertime = isTrue(state['ScoreBoard.CurrentGame.InOvertime']);
      var officialScore = isTrue(state['ScoreBoard.CurrentGame.OfficialScore']);
      var intermissionTime = parseInt(state['ScoreBoard.CurrentGame.Clock(Intermission).Time']) || 0;
      var numPeriods = parseInt(state['ScoreBoard.CurrentGame.Rule(Period.Number)']) || 2;
      var intermissionRunning = isTrue(state['ScoreBoard.CurrentGame.Clock(Intermission).Running']);
      
      // Read intermission labels
      var labels = {
        preGame: state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.PreGame)'] || 'Time to Derby',
        intermission: state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Intermission)'] || 'Intermission',
        unofficial: state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Unofficial)'] || 'Unofficial Score',
        official: state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Official)'] || 'Final Score'
      };
      
      // Game is over when past all periods OR at final period with post-game intermission
      var gameOver = currentPeriod > numPeriods || 
                    (currentPeriod >= numPeriods && (intermissionRunning || intermissionTime > 0));
      
      var text = '';
      
      // Determine label
      if (officialScore) {
        text = labels.official;
      } else if (gameOver) {
        text = labels.unofficial;
      } else if (inOvertime) {
        text = 'Overtime';
      } else if (currentPeriod > 0 && currentPeriod < numPeriods && intermissionTime > 0) {
        text = labels.intermission;
      } else if (currentPeriod > 0 && currentPeriod <= numPeriods) {
        text = 'Period ' + currentPeriod;
      } else if (currentPeriod === 0 && intermissionTime > 0) {
        text = labels.preGame;
      } else if (currentPeriod === 0 && intermissionTime <= 0) {
        text = 'Coming Up';
      } else {
        text = labels.intermission;
      }
      
      $elements.periodInfo.text(text);
      updateClock();
      
    } catch(error) {
      console.error('Error updating game state:', error);
    }
  }

  // Update tournament name
  function updateTournamentName() {
    var name = WS.state['ScoreBoard.CurrentGame.EventInfo(Tournament)'];
    if (name) {
      $elements.tournamentName.text(name).show();
    } else {
      $elements.tournamentName.hide();
    }
  }

  // Load custom logo
  function loadCustomLogo() {
    var logoImg = new Image();
    var $wrapper = $('.game-info-wrapper');
    
    logoImg.onload = function() {
      $elements.customLogoSpace.html('<img src="' + BANNER_LOGO_PATH + '" style="max-width: 100%; max-height: 100%; object-fit: contain;" />');
      $wrapper.addClass('has-logo');
    };
    logoImg.onerror = function() {
      $elements.customLogoSpace.empty();
      $wrapper.removeClass('has-logo');
    };
    logoImg.src = BANNER_LOGO_PATH;
  }

  // Initialize display
  function initializeDisplay() {
    try {
      var state = WS.state;
      
      // Initialize team names
      [1, 2].forEach(function(teamNum) {
        var altName = state['ScoreBoard.CurrentGame.Team(' + teamNum + ').AlternateName(whiteboard)'];
        var name = state['ScoreBoard.CurrentGame.Team(' + teamNum + ').Name'];
        $elements['team' + teamNum].name.text(altName || name || 'Team ' + teamNum);
        
        updateTeamColors(teamNum);
        
        var total = state['ScoreBoard.CurrentGame.Team(' + teamNum + ').TotalPenalties'];
        $elements['team' + teamNum].total.text(total || '0');
      });
      
      updateTournamentName();
      updateClock();
      updateGameState();
      checkAndDisplayLogos();
      equalizeTeamBoxWidths();
      
    } catch(error) {
      console.error('Error during initialization:', error);
    }
  }

  waitForWS();
});