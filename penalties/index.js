//  JavaScript for custom penalties overlay - index.html

$(function() {
  'use strict';

  // Constants
  const BANNER_LOGO_PATH = 'logos/banner-logo.png';
  const FILTERED_PENALTY_CODES = ['FO'];
  const CACHE_EXPIRY_MS = 30000;
  const DEBOUNCE_CLOCK_MS = 50;
  const DEBOUNCE_PENALTY_INIT_MS = 300;
  const DEBOUNCE_PENALTY_NORMAL_MS = 50;
  const INIT_COMPLETE_MS = 800;
  const DEFAULT_NAME_DELAY_MS = 500;
  
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
    skaterFlags: /\.Flags$/,
    skaterPattern: /Team\((\d+)\)\.Skater\(([^)]+)\)/,
    penaltyPattern: /ScoreBoard\.CurrentGame\.Team\((\d+)\)\.Skater\(([^)]+)\)\.Penalty\(([^)]+)\)\.(Code|Id)/,
    expulsionId: /ScoreBoard\.CurrentGame\.Expulsion\(([^)]+)\)\.Id/
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
  
  // Cache for expulsion penalty IDs
  var expulsionIdsCache = [];
  var expulsionIdsCacheValid = false;

  // Helper function to check boolean values from WebSocket
  function isTrue(value) {
    return value === true || value === 'true';
  }

  // Helper function to get expulsion penalty IDs (cached)
  function getExpulsionPenaltyIds() {
    if (expulsionIdsCacheValid) {
      return expulsionIdsCache;
    }
    
    var state = WS.state;
    var ids = [];
    
    for (var key in state) {
      if (Object.prototype.hasOwnProperty.call(state, key)) {
        var match = key.match(REGEX_PATTERNS.expulsionId);
        if (match) {
          var expulsionId = state[key];
          if (expulsionId) {
            ids.push(expulsionId);
          }
        }
      }
    }
    
    expulsionIdsCache = ids;
    expulsionIdsCacheValid = true;
    return ids;
  }
  
  // Invalidate expulsion cache
  function invalidateExpulsionCache() {
    expulsionIdsCacheValid = false;
  }

  // Helper function to check if a skater is expelled
  function isSkaterExpelled(teamNum, skaterId) {
    var skater = teams[teamNum].skaters[skaterId];
    if (!skater || !skater.penaltyIds || skater.penaltyIds.length === 0) {
      return false;
    }
    
    var expulsionIds = getExpulsionPenaltyIds();
    if (expulsionIds.length === 0) {
      return false;
    }
    
    // Quick check - if skater has fewer penalties than expulsions exist, check each
    for (var i = 0; i < skater.penaltyIds.length; i++) {
      if (expulsionIds.indexOf(skater.penaltyIds[i]) !== -1) {
        return true;
      }
    }
    
    return false;
  }

  // Helper function to check if game start time is in the past (with caching)
  function isStartTimeInPast() {
    var now = Date.now();
    
    if (startTimePastCache !== null && now < startTimeCacheExpiry) {
      return startTimePastCache;
    }
    
    var state = WS.state;
    var startDate = state['ScoreBoard.CurrentGame.EventInfo(Date)'];
    var startTime = state['ScoreBoard.CurrentGame.EventInfo(StartTime)'];
    
    if (!startDate || !startTime) {
      startTimePastCache = false;
      startTimeCacheExpiry = now + CACHE_EXPIRY_MS;
      return false;
    }
    
    try {
      var startDateTime = new Date(startDate + 'T' + startTime);
      startTimePastCache = startDateTime < new Date();
      startTimeCacheExpiry = now + CACHE_EXPIRY_MS;
      return startTimePastCache;
    } catch {
      startTimePastCache = false;
      startTimeCacheExpiry = now + CACHE_EXPIRY_MS;
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
    if (isSkaterExpelled(teamNum, skaterId)) {
      return 'penalty-count-expelled';
    }
    
    var skater = teams[teamNum].skaters[skaterId];
    if (!skater || !skater.penalties) return '';
    
    var totalPenalties = skater.penalties.length;
    
    // Check for fouled out (FO code or 7+ total penalties)
    if (totalPenalties >= 7) {
      return 'penalty-count-foulout';
    }
    
    // Check for FO code
    for (var i = 0; i < skater.penalties.length; i++) {
      if (String(skater.penalties[i] || '').trim().toUpperCase() === 'FO') {
        return 'penalty-count-foulout';
      }
    }
    
    // Color code based on display count (excluding FO)
    if (displayCount === 6) return 'penalty-count-6';
    if (displayCount === 5) return 'penalty-count-5';
    
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
      WS.Register(['ScoreBoard.CurrentGame.EventInfo(GameNo)'], updateTournamentName);
      
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
  var debouncedClockUpdate = debounce(updateClock, DEBOUNCE_CLOCK_MS);
  
  // Debounced penalty update - longer delay during initial load
  var debouncedPenaltyUpdate = {
    timers: {},
    update: function(teamNum) {
      var delay = initialLoadComplete ? DEBOUNCE_PENALTY_NORMAL_MS : DEBOUNCE_PENALTY_INIT_MS;
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
        penalties: [],
        penaltyIds: [],
        penaltyDetails: [],
        flags: ''
      };
    }
    
    if (REGEX_PATTERNS.skaterNumber.test(key)) {
      skaters[skaterId].number = value || '';
      updateRosterAndPenalties(teamNum);
    } else if (REGEX_PATTERNS.skaterName.test(key) && !REGEX_PATTERNS.skaterNameExclude.test(key)) {
      skaters[skaterId].name = value || '';
      updateRosterAndPenalties(teamNum);
    } else if (REGEX_PATTERNS.skaterFlags.test(key)) {
      skaters[skaterId].flags = value || '';
      updateRosterAndPenalties(teamNum);
    }
  }

  // Handle penalty updates
  function handlePenaltyUpdate(key, _value) {
    var match = key.match(REGEX_PATTERNS.teamNumber);
    if (match) {
      debouncedPenaltyUpdate.update(parseInt(match[1]));
    }
  }

  // Handle expulsion updates
  function handleExpulsionUpdate(key, _value) {
    invalidateExpulsionCache();
    
    // Try to determine which team this affects by parsing the expulsion info
    var state = WS.state;
    var expulsionId = key.match(REGEX_PATTERNS.expulsionId);
    
    if (expulsionId && expulsionId[1]) {
      var id = expulsionId[1];
      var info = state['ScoreBoard.CurrentGame.Expulsion(' + id + ').Info'];
      
      if (info) {
        // Info format: "Team Name #Number Period X Jam Y for Code."
        // Try to determine team by checking if penalty ID belongs to team 1 or 2
        var foundTeam = null;
        
        for (var teamNum = 1; teamNum <= 2 && !foundTeam; teamNum++) {
          var skaters = teams[teamNum].skaters;
          for (var skaterId in skaters) {
            if (Object.prototype.hasOwnProperty.call(skaters, skaterId)) {
              var skater = skaters[skaterId];
              if (skater.penaltyIds && skater.penaltyIds.indexOf(id) !== -1) {
                foundTeam = teamNum;
                break;
              }
            }
          }
        }
        
        if (foundTeam) {
          updateRosterAndPenalties(foundTeam);
          return;
        }
      }
    }
    
    // Fallback: update both teams if we can't determine which one
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
    $elements.teamScoreBlocks.css('width', 'auto');
    
    requestAnimationFrame(function() {
      var team1Width = $elements.team1.name.parent().outerWidth();
      var team2Width = $elements.team2.name.parent().outerWidth();
      var maxWidth = Math.max(team1Width, team2Width);
      
      $elements.teamScoreBlocks.css('width', maxWidth + 'px');
      
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
      
      if (numA === '' && numB === '') return 0;
      if (numA === '') return 1;
      if (numB === '') return -1;
      
      return numA.localeCompare(numB);
    });
  }

  // Combined roster and penalties update
  function updateRosterAndPenalties(teamNum) {
    var skaters = teams[teamNum].skaters;
    var sortedSkaters = sortSkaters(skaters);
    var team = $elements['team' + teamNum];
    
    var expulsionIds = getExpulsionPenaltyIds();
    var hasExpulsions = expulsionIds.length > 0;
    
    var rosterParts = [];
    var penaltyParts = [];
    
    for (var i = 0; i < sortedSkaters.length; i++) {
      var skater = sortedSkaters[i];
      
      if (!skater.number || !skater.name) continue;
      
      // Check if skater is a captain
      var isCaptain = skater.flags && skater.flags.indexOf('C') !== -1;
      
      rosterParts.push(
        '<div class="roster-line">',
        '<div class="roster-number">', skater.number, '</div>',
        '<div class="roster-name">', 
          skater.name,
          isCaptain ? ' <span class="captain-indicator">C</span>' : '',
        '</div>',
        '</div>'
      );
      
      var displayCodes = [];
      var penaltyDetails = skater.penaltyDetails;
      
      // Filter penalties
      for (var j = 0; j < penaltyDetails.length; j++) {
        var penalty = penaltyDetails[j];
        var codeUpper = String(penalty.code || '').trim().toUpperCase();
        
        if (FILTERED_PENALTY_CODES.indexOf(codeUpper) !== -1) continue;
        if (hasExpulsions && expulsionIds.indexOf(penalty.id) !== -1) continue;
        
        displayCodes.push(penalty.code);
      }
      
      var codes = displayCodes.join(' ');
      var displayCount = displayCodes.length;
      
      var isExpelled = isSkaterExpelled(teamNum, skater.id);
      var isFouledOut = false;
      var displayValue;
      
      if (isExpelled) {
        displayValue = 'EXP';
      } else {
        // Check for fouled out
        var totalPenalties = skater.penalties.length;
        if (totalPenalties >= 7) {
          isFouledOut = true;
        } else {
          for (var k = 0; k < skater.penalties.length; k++) {
            if (String(skater.penalties[k] || '').trim().toUpperCase() === 'FO') {
              isFouledOut = true;
              break;
            }
          }
        }
        displayValue = isFouledOut ? 'FO' : displayCount;
      }
      
      var countClass = getPenaltyCountClass(teamNum, skater.id, displayCount);
      
      penaltyParts.push(
        '<div class="penalty-line">',
        '<div class="penalty-codes">', codes, '</div>',
        '<div class="penalty-count ', countClass, '">', displayValue, '</div>',
        '</div>'
      );
    }
    
    team.roster.html(rosterParts.join(''));
    team.penalties.html(penaltyParts.join(''));
  }

  // Update penalties only
  function updatePenalties(teamNum) {
    var skaters = teams[teamNum].skaters;
    var state = WS.state;
    
    // Clear penalty lists
    for (var skaterId in skaters) {
      if (Object.prototype.hasOwnProperty.call(skaters, skaterId)) {
        var skater = skaters[skaterId];
        skater.penalties = [];
        skater.penaltyIds = [];
        skater.penaltyDetails = [];
      }
    }
    
    // Single-pass penalty collection
    var penaltyData = {};
    
    for (var key in state) {
      if (!Object.prototype.hasOwnProperty.call(state, key)) continue;
        var match = key.match(REGEX_PATTERNS.penaltyPattern);
      if (match && match[1] == teamNum) {
        var skaterIdMatch = match[2];
        var penaltyNumMatch = match[3];
        var field = match[4];
        
        if (!penaltyData[skaterIdMatch]) {
          penaltyData[skaterIdMatch] = {};
        }
        if (!penaltyData[skaterIdMatch][penaltyNumMatch]) {
          penaltyData[skaterIdMatch][penaltyNumMatch] = { code: null, id: null };
        }
        
        penaltyData[skaterIdMatch][penaltyNumMatch][field === 'Code' ? 'code' : 'id'] = state[key];
      }
    }
    
    // Populate skater penalty arrays
    for (var skaterKey in penaltyData) {
      if (skaters[skaterKey]) {
        var skaterObj = skaters[skaterKey];
        var penalties = penaltyData[skaterKey];
        
        for (var penaltyKey in penalties) {
          var penalty = penalties[penaltyKey];
          if (penalty.code && penalty.id) {
            skaterObj.penalties.push(penalty.code);
            skaterObj.penaltyIds.push(penalty.id);
            skaterObj.penaltyDetails.push({ code: penalty.code, id: penalty.id });
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
      
      var gameOver = currentPeriod > numPeriods || 
                    (currentPeriod >= numPeriods && (intermissionRunning || intermissionTime > 0));
      
      if (officialScore || gameOver) {
        $elements.gameClock.html('&nbsp;');
        return;
      }
      
      if (currentPeriod === 0) {
        if (intermissionTime <= 0 || isStartTimeInPast()) {
          $elements.gameClock.html('&nbsp;');
        } else {
          $elements.gameClock.text(formatTime(intermissionTime));
        }
        return;
      }
      
      if (currentPeriod > 0 && currentPeriod < numPeriods && intermissionTime > 0) {
        $elements.gameClock.text(formatTime(intermissionTime));
        return;
      }
      
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
      
      var labels = {
        preGame: state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.PreGame)'] || 'Time to Derby',
        intermission: state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Intermission)'] || 'Intermission',
        unofficial: state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Unofficial)'] || 'Unofficial Score',
        official: state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Official)'] || 'Final Score'
      };
      
      var gameOver = currentPeriod > numPeriods || 
                    (currentPeriod >= numPeriods && (intermissionRunning || intermissionTime > 0));
      
      var text;
      
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

  // Update tournament name and game number if available
  function updateTournamentName() {
    var tournament = WS.state['ScoreBoard.CurrentGame.EventInfo(Tournament)'];
    var gameNo = WS.state['ScoreBoard.CurrentGame.EventInfo(GameNo)'];
    
    if (tournament) {
      var displayText = tournament;
      if (gameNo) {
        displayText = tournament + ' - Game ' + gameNo;
      }
      $elements.tournamentName.text(displayText).show();
    } else {
      $elements.tournamentName.hide();
    }
  }

  // Load custom logo if available
  function loadCustomLogo() {
    var logoImg = new Image();
    var $wrapper = $('.game-info-wrapper');
    
    logoImg.onload = function() {
      $elements.customLogoSpace.html('<img src="' + BANNER_LOGO_PATH + '" class="custom-logo" />');
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
      
      for (var teamNum = 1; teamNum <= 2; teamNum++) {
        var altName = state['ScoreBoard.CurrentGame.Team(' + teamNum + ').AlternateName(whiteboard)'];
        var name = state['ScoreBoard.CurrentGame.Team(' + teamNum + ').Name'];
        var total = state['ScoreBoard.CurrentGame.Team(' + teamNum + ').TotalPenalties'];
        
        $elements['team' + teamNum].name.text(altName || name || '');
        $elements['team' + teamNum].total.text(total || '0');
        
        updateTeamColors(teamNum);
      }
      
      updateTournamentName();
      updateClock();
      updateGameState();
      checkAndDisplayLogos();
      equalizeTeamBoxWidths();
      
      setTimeout(function() {
        initialLoadComplete = true;
      }, INIT_COMPLETE_MS);
      
      setTimeout(function() {
        for (var teamNum = 1; teamNum <= 2; teamNum++) {
          var currentText = $elements['team' + teamNum].name.text();
          var altName = WS.state['ScoreBoard.CurrentGame.Team(' + teamNum + ').AlternateName(whiteboard)'];
          var name = WS.state['ScoreBoard.CurrentGame.Team(' + teamNum + ').Name'];
          
          if ((!currentText || currentText.trim() === '') && !altName && !name) {
            $elements['team' + teamNum].name.text('Team ' + teamNum);
            updateQueue.schedule(equalizeTeamBoxWidths);
          }
        }
      }, DEFAULT_NAME_DELAY_MS);
      
    } catch(error) {
      console.error('Error during initialization:', error);
    }
  }

  waitForWS();
});