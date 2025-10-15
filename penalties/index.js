//  JavaScript for custom penalties overlay - index.html

$(function() {
  'use strict';

  // Constants
  const BANNER_LOGO_PATH = 'logos/banner-logo.png';
  const FILTERED_PENALTY_CODES = ['FO']; // Only FO - EXP doesn't exist as a penalty code
  
  // Cached regex patterns
  const REGEX_PATTERNS = {
    teamNumber: /Team\((\d+)\)/,
    teamScore: /\.Score$/,
    teamLogo: /\.Logo$/,
    teamColor: /\.Color\(whiteboard\./,
    teamPenalties: /\.TotalPenalties/,
    teamName: /\.Name$/,
    skaterNumber: /\.RosterNumber/,
    skaterName: /\.Name/,
    skaterNameExclude: /Pronoun/,
    skaterPattern: /Team\((\d+)\)\.Skater\(([^)]+)\)/
  };

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
    customLogoSpace: $('#custom-logo-space'),
    teamScoreBlocks: $('.team-score-block'),
    vsClockContainer: $('#vs-clock-container'),
    gameInfoWrapper: $('.game-info-wrapper')
  };

  // Store skater data for each team
  var teams = {
    1: { skaters: {}, logo: '', colors: { fg: null, bg: null } },
    2: { skaters: {}, logo: '', colors: { fg: null, bg: null } }
  };
  var bothTeamsHaveLogos = false;
  var root = document.documentElement;
  var startTimePastCache = null;
  var startTimeCacheExpiry = 0;
  var initialLoadComplete = false;

  // Helper function to check boolean values from WebSocket
  function isTrue(value) {
    return value === true || value === 'true';
  }

  // Helper function to get expulsion penalty IDs
  function getExpulsionPenaltyIds() {
    var state = WS.state;
    var expulsionIds = [];
    
    for (var key in state) {
      if (key.indexOf('ScoreBoard.CurrentGame.Expulsion(') === 0 && key.indexOf(').Id') > 0) {
        var expulsionId = state[key];
        if (expulsionId) {
          expulsionIds.push(expulsionId);
        }
      }
    }
    
    return expulsionIds;
  }

  // Helper function to check if a skater is expelled
  function isSkaterExpelled(teamNum, skaterId) {
    var skater = teams[teamNum].skaters[skaterId];
    
    if (!skater || !skater.penaltyIds) return false;
    
    var expulsionIds = getExpulsionPenaltyIds();
    
    // Check if any of this skater's penalty IDs match an expulsion entry
    for (var i = 0; i < expulsionIds.length; i++) {
      if (skater.penaltyIds.indexOf(expulsionIds[i]) !== -1) {
        return true;
      }
    }
    
    return false;
  }

  // Helper function to check if game start time is in the past (with caching)
  function isStartTimeInPast() {
    var now = Date.now();
    
    // Return cached value if still valid (cache for 30 seconds)
    if (startTimePastCache !== null && now < startTimeCacheExpiry) {
      return startTimePastCache;
    }
    
    var startDate = WS.state['ScoreBoard.CurrentGame.EventInfo(Date)'];
    var startTime = WS.state['ScoreBoard.CurrentGame.EventInfo(StartTime)'];
    
    if (!startDate || !startTime) {
      startTimePastCache = false;
      startTimeCacheExpiry = now + 30000;
      return false;
    }
    
    try {
      var startDateTime = new Date(startDate + 'T' + startTime);
      startTimePastCache = startDateTime < new Date();
      startTimeCacheExpiry = now + 30000;
      return startTimePastCache;
    } catch(e) {
      startTimePastCache = false;
      startTimeCacheExpiry = now + 30000;
      return false;
    }
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

  // Batch update helper for reducing reflows
  var updateQueue = {
    pending: false,
    callbacks: [],
    schedule: function(callback) {
      this.callbacks.push(callback);
      if (!this.pending) {
        this.pending = true;
        requestAnimationFrame(this.flush.bind(this));
      }
    },
    flush: function() {
      var callbacks = this.callbacks;
      this.callbacks = [];
      this.pending = false;
      callbacks.forEach(function(cb) { cb(); });
    }
  };

  // Helper function to determine penalty count CSS class
  function getPenaltyCountClass(teamNum, skaterId, displayCount) {
    // Check for expelled status
    if (isSkaterExpelled(teamNum, skaterId)) {
      return 'penalty-count-expelled';
    }
    
    var skater = teams[teamNum].skaters[skaterId];
    if (!skater) return '';
    
    // Normalize penalties for checking (uppercase and trim)
    var normalizedPenalties = skater.penalties.map(function(p) { 
      return String(p || '').trim().toUpperCase(); 
    });
    
    // Check for fouled out (FO code or 7+ total penalties)
    if (normalizedPenalties.indexOf('FO') !== -1 || skater.penalties.length >= 7) {
      return 'penalty-count-foulout';
    }
    
    // Color code based on display count (excluding FO)
    if (displayCount === 6) {
      return 'penalty-count-6';
    }
    
    if (displayCount === 5) {
      return 'penalty-count-5';
    }
    
    return '';
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
      
      // Register for expulsion updates
      WS.Register(['ScoreBoard.CurrentGame.Expulsion(*)'], handleExpulsionUpdate);
      
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
      
      // Event info for start time checking
      WS.Register(['ScoreBoard.CurrentGame.EventInfo(Date)'], updateGameState);
      WS.Register(['ScoreBoard.CurrentGame.EventInfo(StartTime)'], updateGameState);
      
      loadCustomLogo();
      setTimeout(initializeDisplay, 200);
      
    } catch(error) {
      console.error('Failed to initialize overlay:', error);
    }
  }

  // Debounced clock update
  var debouncedClockUpdate = debounce(updateClock, 50);
  
  // Debounced penalty update - longer delay during initial load
  var debouncedPenaltyUpdate = {
    timers: {},
    update: function(teamNum) {
      var delay = initialLoadComplete ? 50 : 300; // Longer delay during initialization
      clearTimeout(this.timers[teamNum]);
      this.timers[teamNum] = setTimeout(function() {
        updatePenalties(teamNum);
      }, delay);
    }
  };

  // Unified team update handler
  function handleTeamUpdate(key, value) {
    var match = key.match(REGEX_PATTERNS.teamNumber);
    if (!match) return;
    
    var teamNum = parseInt(match[1]);
    var team = $elements['team' + teamNum];
    
    if (key.includes('.AlternateName(whiteboard)') || (REGEX_PATTERNS.teamName.test(key) && !key.includes('AlternateName') && !key.includes('.Skater('))) {
      var altName = WS.state['ScoreBoard.CurrentGame.Team(' + teamNum + ').AlternateName(whiteboard)'];
      var name = altName || value;
      
      // Only update if we have a name, or if current display is empty/default
      var currentText = team.name.text();
      if (name || !currentText || currentText === 'Team ' + teamNum) {
        team.name.text(name || '');
        updateQueue.schedule(equalizeTeamBoxWidths);
      }
    } else if (REGEX_PATTERNS.teamScore.test(key) && !key.includes('Skater')) {
      team.score.text(value || '0');
    } else if (REGEX_PATTERNS.teamLogo.test(key)) {
      teams[teamNum].logo = value || '';
      checkAndDisplayLogos();
    } else if (REGEX_PATTERNS.teamColor.test(key)) {
      updateQueue.schedule(function() { updateTeamColors(teamNum); });
    } else if (REGEX_PATTERNS.teamPenalties.test(key)) {
      team.total.text(value || '0');
    }
  }

  // Unified skater update handler
  function handleSkaterUpdate(key, value) {
    var match = key.match(REGEX_PATTERNS.skaterPattern);
    if (!match) return;
    
    var teamNum = parseInt(match[1]);
    var skaterId = match[2];
    var skaters = teams[teamNum].skaters;
    
    if (!skaters[skaterId]) {
      skaters[skaterId] = { 
        id: skaterId, 
        number: '', 
        name: '', 
        penalties: [],  // Just codes for backward compatibility
        penaltyIds: [], // Just IDs
        penaltyDetails: [] // Objects with {code, id} for filtering
      };
    }
    
    if (REGEX_PATTERNS.skaterNumber.test(key)) {
      skaters[skaterId].number = value || '';
      updateRosterAndPenalties(teamNum);
    } else if (REGEX_PATTERNS.skaterName.test(key) && !REGEX_PATTERNS.skaterNameExclude.test(key)) {
      skaters[skaterId].name = value || '';
      updateRosterAndPenalties(teamNum);
    }
  }

  // Handle penalty updates
  function handlePenaltyUpdate(key, value) {
    var match = key.match(REGEX_PATTERNS.teamNumber);
    if (match) {
      debouncedPenaltyUpdate.update(parseInt(match[1]));
    }
  }

  // Handle expulsion updates
  function handleExpulsionUpdate(key, value) {
    // When an expulsion is added or changed, update both teams' displays
    updateRosterAndPenalties(1);
    updateRosterAndPenalties(2);
  }

  // Update team colors
  function updateTeamColors(teamNum) {
    var state = WS.state;
    var fgColor = state['ScoreBoard.CurrentGame.Team(' + teamNum + ').Color(whiteboard.fg)'];
    var bgColor = state['ScoreBoard.CurrentGame.Team(' + teamNum + ').Color(whiteboard.bg)'];
    var colors = teams[teamNum].colors;
    
    // Skip if colors haven't changed
    if (colors.fg === fgColor && colors.bg === bgColor) {
      return;
    }
    
    colors.fg = fgColor;
    colors.bg = bgColor;
    
    // Use default colors if not set
    var finalFg = fgColor || 'white';
    var finalBg = bgColor || 'black';
    
    root.style.setProperty('--team' + teamNum + '-fg', finalFg);
    root.style.setProperty('--team' + teamNum + '-bg', finalBg);
    root.style.setProperty('--team' + teamNum + '-border', finalFg);
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
    $elements.teamScoreBlocks.css('width', 'auto');
    
    // Use requestAnimationFrame for next frame calculation
    requestAnimationFrame(function() {
      var team1Width = $elements.team1.name.parent().outerWidth();
      var team2Width = $elements.team2.name.parent().outerWidth();
      var maxWidth = Math.max(team1Width, team2Width);
      
      // Set both boxes to the same width
      $elements.teamScoreBlocks.css('width', maxWidth + 'px');
      
      // Calculate total width needed
      var vsClockWidth = $elements.vsClockContainer.outerWidth();
      var hasLogo = $elements.gameInfoWrapper.hasClass('has-logo');
      var padding = hasLogo ? 280 : 40;
      
      var totalWidth = (maxWidth * 2) + vsClockWidth + padding;
      
      $elements.gameInfoWrapper.css('width', totalWidth + 'px');
    });
  }

  // Sort skaters alphabetically by number (as text)
  function sortSkaters(skaters) {
    return Object.values(skaters).sort(function(a, b) {
      var numA = String(a.number || '');
      var numB = String(b.number || '');
      
      // Empty strings sort last
      if (numA === '' && numB === '') return 0;
      if (numA === '') return 1;
      if (numB === '') return -1;
      
      // Alphabetical string comparison
      return numA.localeCompare(numB);
    });
  }

  // Combined roster and penalties update (optimized)
  function updateRosterAndPenalties(teamNum) {
    var skaters = teams[teamNum].skaters;
    var sortedSkaters = sortSkaters(skaters);
    var team = $elements['team' + teamNum];
    
    // Get expulsion penalty IDs to filter them out
    var expulsionIds = getExpulsionPenaltyIds();
    
    // Use arrays for efficient string building
    var rosterParts = [];
    var penaltyParts = [];
    
    for (var i = 0; i < sortedSkaters.length; i++) {
      var skater = sortedSkaters[i];
      
      // Skip skaters that don't have both number and name
      // This prevents ghost entries from appearing
      if (!skater.number || !skater.name) continue;
      
      // Build roster HTML
      rosterParts.push(
        '<div class="roster-line">',
        '<div class="roster-number">', skater.number, '</div>',
        '<div class="roster-name">', skater.name, '</div>',
        '</div>'
      );
      
      // Filter out FO codes AND penalties that caused expulsions
      var displayCodes = [];
      for (var j = 0; j < skater.penaltyDetails.length; j++) {
        var penalty = skater.penaltyDetails[j];
        var codeUpper = String(penalty.code || '').trim().toUpperCase();
        
        // Skip if this is a FO code
        if (FILTERED_PENALTY_CODES.indexOf(codeUpper) !== -1) {
          continue;
        }
        
        // Skip if this penalty ID matches an expulsion
        if (expulsionIds.indexOf(penalty.id) !== -1) {
          continue;
        }
        
        displayCodes.push(penalty.code);
      }
      
      var codes = displayCodes.join(' ');
      var displayCount = displayCodes.length;
      
      // Check if player is expelled or fouled out
      var isExpelled = isSkaterExpelled(teamNum, skater.id);
      var isFouledOut = false;
      
      // Check for fouled out status (FO code or 7+ total penalties)
      if (!isExpelled) {
        var normalizedPenalties = skater.penalties.map(function(p) { 
          return String(p || '').trim().toUpperCase(); 
        });
        isFouledOut = normalizedPenalties.indexOf('FO') !== -1 || skater.penalties.length >= 7;
      }
      
      // Determine what to display: EXP, FO, or count
      var displayValue;
      if (isExpelled) {
        displayValue = 'EXP';
      } else if (isFouledOut) {
        displayValue = 'FO';
      } else {
        displayValue = displayCount;
      }
      
      // Get the appropriate CSS class for the penalty count
      var countClass = getPenaltyCountClass(teamNum, skater.id, displayCount);
      
      penaltyParts.push(
        '<div class="penalty-line">',
        '<div class="penalty-codes">', codes, '</div>',
        '<div class="penalty-count ', countClass, '">', displayValue, '</div>',
        '</div>'
      );
    }
    
    // Single DOM update per team
    team.roster.html(rosterParts.join(''));
    team.penalties.html(penaltyParts.join(''));
  }

  // Update penalties only (optimized)
  function updatePenalties(teamNum) {
    var skaters = teams[teamNum].skaters;
    var state = WS.state;
    
    // Clear penalty lists
    for (var skaterId in skaters) {
      if (skaters.hasOwnProperty(skaterId)) {
        skaters[skaterId].penalties = [];
        skaters[skaterId].penaltyIds = [];
        skaters[skaterId].penaltyDetails = [];
      }
    }
    
    // First pass: collect penalty IDs and codes by penalty number
    var penaltyData = {}; // skaterId -> penaltyNumber -> {code, id}
    
    for (var key in state) {
      if (!state.hasOwnProperty(key)) continue;
      
      var match = key.match(/ScoreBoard\.CurrentGame\.Team\((\d+)\)\.Skater\(([^)]+)\)\.Penalty\(([^)]+)\)\.(Code|Id)/);
      if (match && match[1] == teamNum) {
        var skaterId = match[2];
        var penaltyNum = match[3];
        var field = match[4]; // "Code" or "Id"
        
        if (!penaltyData[skaterId]) {
          penaltyData[skaterId] = {};
        }
        if (!penaltyData[skaterId][penaltyNum]) {
          penaltyData[skaterId][penaltyNum] = { code: null, id: null };
        }
        
        if (field === 'Code') {
          penaltyData[skaterId][penaltyNum].code = state[key];
        } else if (field === 'Id') {
          penaltyData[skaterId][penaltyNum].id = state[key];
        }
      }
    }
    
    // Second pass: populate skater penalty arrays
    for (var skaterId in penaltyData) {
      if (skaters[skaterId]) {
        for (var penaltyNum in penaltyData[skaterId]) {
          var penalty = penaltyData[skaterId][penaltyNum];
          if (penalty.code && penalty.id) {
            skaters[skaterId].penalties.push(penalty.code);
            skaters[skaterId].penaltyIds.push(penalty.id);
            skaters[skaterId].penaltyDetails.push({ code: penalty.code, id: penalty.id });
          }
        }
      }
    }
    
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
        // If start time is in the past OR no time left, don't show countdown
        if (intermissionTime <= 0 || isStartTimeInPast()) {
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

  // Update game state (period info) - optimized
  function updateGameState() {
    try {
      var state = WS.state;
      var currentPeriod = parseInt(state['ScoreBoard.CurrentGame.CurrentPeriodNumber']) || 0;
      var inOvertime = isTrue(state['ScoreBoard.CurrentGame.InOvertime']);
      var officialScore = isTrue(state['ScoreBoard.CurrentGame.OfficialScore']);
      var intermissionTime = parseInt(state['ScoreBoard.CurrentGame.Clock(Intermission).Time']) || 0;
      var numPeriods = parseInt(state['ScoreBoard.CurrentGame.Rule(Period.Number)']) || 2;
      var intermissionRunning = isTrue(state['ScoreBoard.CurrentGame.Clock(Intermission).Running']);
      
      // Read intermission labels once
      var labels = {
        preGame: state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.PreGame)'] || 'Time to Derby',
        intermission: state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Intermission)'] || 'Intermission',
        unofficial: state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Unofficial)'] || 'Unofficial Score',
        official: state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Official)'] || 'Final Score'
      };
      
      // Game is over when past all periods OR at final period with post-game intermission
      var gameOver = currentPeriod > numPeriods || 
                    (currentPeriod >= numPeriods && (intermissionRunning || intermissionTime > 0));
      
      var text;
      
      // Determine label with early returns for efficiency
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
      } else if (currentPeriod === 0 && intermissionTime > 0 && !isStartTimeInPast()) {
        text = labels.preGame;
      } else if (currentPeriod === 0) {
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

  // Initialize display (optimized)
  function initializeDisplay() {
    try {
      var state = WS.state;
      
      // Initialize both teams in one loop
      for (var teamNum = 1; teamNum <= 2; teamNum++) {
        var altName = state['ScoreBoard.CurrentGame.Team(' + teamNum + ').AlternateName(whiteboard)'];
        var name = state['ScoreBoard.CurrentGame.Team(' + teamNum + ').Name'];
        var total = state['ScoreBoard.CurrentGame.Team(' + teamNum + ').TotalPenalties'];
        
        $elements['team' + teamNum].name.text(altName || name || '');
        $elements['team' + teamNum].total.text(total || '0');
        
        updateTeamColors(teamNum);
      }
      
      // Batch these operations
      updateTournamentName();
      updateClock();
      updateGameState();
      checkAndDisplayLogos();
      equalizeTeamBoxWidths();
      
      // Mark initial load as complete after a delay
      setTimeout(function() {
        initialLoadComplete = true;
      }, 800);
      
      // After a delay, set default names if still empty AND no name data exists in state
      setTimeout(function() {
        for (var teamNum = 1; teamNum <= 2; teamNum++) {
          var currentText = $elements['team' + teamNum].name.text();
          var altName = WS.state['ScoreBoard.CurrentGame.Team(' + teamNum + ').AlternateName(whiteboard)'];
          var name = WS.state['ScoreBoard.CurrentGame.Team(' + teamNum + ').Name'];
          
          // Only set default if BOTH DOM is empty AND WebSocket state has no name
          if ((!currentText || currentText.trim() === '') && !altName && !name) {
            $elements['team' + teamNum].name.text('Team ' + teamNum);
            updateQueue.schedule(equalizeTeamBoxWidths);
          }
        }
      }, 500);
      
    } catch(error) {
      console.error('Error during initialization:', error);
    }
  }

  waitForWS();
});