//  JavaScript for custom penalties overlay - index.html

$(function() {
  'use strict';

  /********************************
  ** Verify that config.js loads **
  ********************************/

  // Halt if config.js does not load correctly
  if (typeof PenaltiesOverlayConfig === 'undefined') {
    console.error('ERROR: config.js did not load.');
    console.error('Make sure config.js is in the same directory as index.js');
    console.error('and that index.html includes: <script src="config.js"></script>');
    console.error('before <script> tags that import index.js and core.js.');
    alert('Configuration Error: config.js is missing or did not load properly. Check browser console for details.');
    return;
  }

  /********************************************
  ** Verify imported configuration variables **
  ********************************************/

  // Half if PenaltiesOverlayConfig appears invalid
  if (
      !PenaltiesOverlayConfig.timing ||
      !PenaltiesOverlayConfig.display ||
      !PenaltiesOverlayConfig.labels ||
      !PenaltiesOverlayConfig.rules
  ) {
    console.error('ERROR: data imported from config.js is invalid.');
    console.error('Required structures: timing, display, labels, rules, and penalties');
    alert('Configuration Error: config.js is invalid. Check browser console for details.');
    return;
  }

  /**************
  ** Constants **
  **************/

  // Data from config.js
  const CONFIG = PenaltiesOverlayConfig.display;
  const TIMING = PenaltiesOverlayConfig.timing;
  const DISPLAY_TEXT = PenaltiesOverlayConfig.labels;
  const RULES = PenaltiesOverlayConfig.rules;
  const PENALTY_CONFIG = PenaltiesOverlayConfig.penalties;

  // CSS classes
  const CSS_CLASSES = {
    PENALTY_5: 'penalty-count-5',
    PENALTY_6: 'penalty-count-6',
    PENALTY_FOULOUT: 'penalty-count-foulout',
    PENALTY_EXPELLED: 'penalty-count-expelled',
    HAS_LOGO: 'has-logo'
  };
  
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

  /**************************************
  ** Application data state management **
  **************************************/

  // Application state for roster and penalty data
  const appState = {
    teams: {
      1: { skaters: {}, logo: '', colors: { fg: null, bg: null } },
      2: { skaters: {}, logo: '', colors: { fg: null, bg: null } }
    },
    cache: {
      expulsionIds: [],
      expulsionIdsValid: false,
      startTimePast: null,
      startTimeCacheExpiry: 0
    },
    flags: {
      bothTeamsHaveLogos: false,
      initialLoadComplete: false
    },
    dom: {
      root: document.documentElement
    }
  };

  // Cache DOM selectors
  const $elements = {
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
    tournamentName: $('#tournament-info'),
    gameClock: $('#game-clock'),
    periodInfo: $('#clock-label'),
    customLogoSpace: $('#custom-logo-space'),
    teamScoreBlocks: $('.team-score-block'),
    vsClockContainer: $('#vs-clock-container'),
    gameInfoWrapper: $('.game-info-wrapper')
  };

  /*********************
  ** Helper functions **
  *********************/

  // Check boolean values from the WebSocket
  function isTrue(value) {
    return value === true || value === 'true';
  }

  // Trim blank space values from the WebSocket
  function trimValue(value) {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).trim();
  }

  // Format time from milliseconds to (M)M:SS
  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  // Get intermission label with fallback to default
  function getIntermissionLabel(stateKey, defaultValue) {
    const value = trimValue(WS.state[stateKey]);
    return value || defaultValue;
  }

  // Debouncing function
  function debounce(func, wait) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  /*********************************
  ** Batch update queue functions **
  *********************************/

  // Batch update helper for reducing reflows
  const updateQueue = {
    pending: false,
    callbacks: [],
    
    schedule(callback) {
      this.callbacks.push(callback);
      if (!this.pending) {
        this.pending = true;
        requestAnimationFrame(this.flush.bind(this));
      }
    },
    
    flush() {
      const callbacks = this.callbacks;
      this.callbacks = [];
      this.pending = false;
      callbacks.forEach(cb => cb());
    }
  };

  /*******************************
  ** Cache management functions **
  *******************************/

  // Get cached expulsion penalty IDs
  function getExpulsionPenaltyIds() {
    if (appState.cache.expulsionIdsValid) {
      return appState.cache.expulsionIds;
    }
    
    const ids = [];
    const state = WS.state;
    
    for (const key in state) {
      if (!Object.prototype.hasOwnProperty.call(state, key)) continue;
      
      const match = key.match(REGEX_PATTERNS.expulsionId);
      if (match) {
        const expulsionId = state[key];
        if (expulsionId) {
          ids.push(expulsionId);
        }
      }
    }
    
    appState.cache.expulsionIds = ids;
    appState.cache.expulsionIdsValid = true;
    return ids;
  }
  
  // Invalidate expulsion cache
  function invalidateExpulsionCache() {
    appState.cache.expulsionIdsValid = false;
  }

  // Check if game start time is missing or in the past (with caching)
  function isStartTimeMissingOrPast() {
    const now = Date.now();
    
    // Return cached value if still valid
    if (appState.cache.startTimePast !== null && now < appState.cache.startTimeCacheExpiry) {
      return appState.cache.startTimePast;
    }
    
    const state = WS.state;
    const startDate = state['ScoreBoard.CurrentGame.EventInfo(Date)'];
    const startTime = state['ScoreBoard.CurrentGame.EventInfo(StartTime)'];
    
    // If no date or time is set, treat as if start time is missing/past
    if (!startDate || !startTime) {
      appState.cache.startTimePast = true;
      appState.cache.startTimeCacheExpiry = now + TIMING.cacheExpiryMs;
      return true;
    }
    
    try {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      appState.cache.startTimePast = startDateTime < new Date();
      appState.cache.startTimeCacheExpiry = now + TIMING.cacheExpiryMs;
      return appState.cache.startTimePast;
    } catch (error) {
      // If date parsing fails, treat as missing
      console.warn('Failed to parse start date/time:', error);
      appState.cache.startTimePast = true;
      appState.cache.startTimeCacheExpiry = now + TIMING.cacheExpiryMs;
      return true;
    }
  }

  /********************************
  ** Player management functions **
  ********************************/

  // Check if a skater is expelled
  function isSkaterExpelled(teamNum, skaterId) {
    const skater = appState.teams[teamNum].skaters[skaterId];
    if (!skater || !skater.penaltyIds || skater.penaltyIds.length === 0) {
      return false;
    }
    
    const expulsionIds = getExpulsionPenaltyIds();
    if (expulsionIds.length === 0) {
      return false;
    }
    
    // Check if any of the skater's penalties match expulsion IDs
    return skater.penaltyIds.some(penaltyId => expulsionIds.includes(penaltyId));
  }

  // Check if a skater is fouled out
  function isSkaterFouledOut(skater) {
    if (!skater || !skater.penalties) return false;
    
    const totalPenalties = skater.penalties.length;
    
    // Fouled out if 7+ penalties
    if (totalPenalties >= RULES.fouloutPenaltyCount) {
      return true;
    }
    
    // Fouled out if FO code present
    return skater.penalties.some(penalty => 
      String(penalty || '').trim().toUpperCase() === DISPLAY_TEXT.fouloutDisplay
    );
  }

  // Sort skaters alphabetically by number (as text)
  function sortSkaters(skaters) {
    return Object.values(skaters).sort((a, b) => {
      const numA = String(a.number || '');
      const numB = String(b.number || '');
      
      if (numA === '' && numB === '') return 0;
      if (numA === '') return 1;
      if (numB === '') return -1;
      
      return numA.localeCompare(numB);
    });
  }

  // Get or create skater object
  function getOrCreateSkater(teamNum, skaterId) {
    const skaters = appState.teams[teamNum].skaters;
    
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
    
    return skaters[skaterId];
  }

  /**********************
  ** Penalty functions **
  **********************/

  // Determine penalty count CSS class based on penalty count
  function getPenaltyCountClass(teamNum, skaterId, displayCount) {
    // First, check for expelled status
    if (isSkaterExpelled(teamNum, skaterId)) {
      return CSS_CLASSES.PENALTY_EXPELLED;
    }
    
    const skater = appState.teams[teamNum].skaters[skaterId];
    if (!skater || !skater.penalties) return '';
  
    // Next, check for fouled out status
    if (isSkaterFouledOut(skater)) {
      return CSS_CLASSES.PENALTY_FOULOUT;
    }

    // Color code penalties based on display count (excluding FO)
    if (displayCount === RULES.warningPenaltyCount6) {
      return CSS_CLASSES.PENALTY_6;
    }
    if (displayCount === RULES.warningPenaltyCount5) {
      return CSS_CLASSES.PENALTY_5;
    }
    
    return '';
  }

  // Filter penalties for display (exclude FO codes and expulsions)
  function getDisplayPenalties(penaltyDetails, expulsionIds) {
    const hasExpulsions = expulsionIds.length > 0;
    
    return penaltyDetails.filter(penalty => {
      const codeUpper = String(penalty.code || '').trim().toUpperCase();
      
      // Filter out FO codes
      if (PENALTY_CONFIG.filteredCodes.includes(codeUpper)) {
        return false;
      }
      
      // Filter out expulsion codes
      if (hasExpulsions && expulsionIds.includes(penalty.id)) {
        return false;
      }
      
      return true;
    });
  }

  // Update team penalties (collect all penalty data)
  function updatePenalties(teamNum) {
    const skaters = appState.teams[teamNum].skaters;
    const state = WS.state;
    
    // Clear penalty lists
    for (const skaterId in skaters) {
      if (Object.prototype.hasOwnProperty.call(skaters, skaterId)) {
        const skater = skaters[skaterId];
        skater.penalties = [];
        skater.penaltyIds = [];
        skater.penaltyDetails = [];
      }
    }
    
    // Single-pass penalty collection
    const penaltyData = {};
    
    for (const key in state) {
      if (!Object.prototype.hasOwnProperty.call(state, key)) continue;
      
      const match = key.match(REGEX_PATTERNS.penaltyPattern);
      if (match && match[1] == teamNum) {
        const skaterIdMatch = match[2];
        const penaltyNumMatch = match[3];
        const field = match[4];
        
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
    for (const skaterKey in penaltyData) {
      if (skaters[skaterKey]) {
        const skaterObj = skaters[skaterKey];
        const penalties = penaltyData[skaterKey];
        
        for (const penaltyKey in penalties) {
          const penalty = penalties[penaltyKey];
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

  /*****************************************
  ** Roster and penalty display functions **
  *****************************************/

  // Build roster HTML for a player
  function buildRosterHTML(skater) {
    const isCaptain = skater.flags === DISPLAY_TEXT.captainFlag || 
                      skater.flags.split(',').includes(DISPLAY_TEXT.captainFlag);
    
    const captainIndicator = isCaptain ? ' <span class="captain-indicator">C</span>' : '';
    
    return `
      <div class="roster-line">
        <div class="roster-number">${skater.number}</div>
        <div class="roster-name">${skater.name}${captainIndicator}</div>
      </div>
    `;
  }


  // Build penalty HTML for a player
  function buildPenaltyHTML(teamNum, skater, expulsionIds) {
    const displayPenalties = getDisplayPenalties(skater.penaltyDetails, expulsionIds);
    const codes = displayPenalties.map(p => p.code).join(' ');
    const displayCount = displayPenalties.length;
    
    // Determine the display value for the player's total penalties (EXP, FO, or count)
    let displayValue;
    if (isSkaterExpelled(teamNum, skater.id)) {
      displayValue = DISPLAY_TEXT.expelledDisplay;
    } else if (isSkaterFouledOut(skater)) {
      displayValue = DISPLAY_TEXT.fouloutDisplay;
    } else {
      displayValue = displayCount;
    }

    // Set the CSS class (bg color) for the total count
    const countClass = getPenaltyCountClass(teamNum, skater.id, displayCount);
    
    return [
      '<div class="penalty-line">',
      `<div class="penalty-codes">${codes}</div>`,
      `<div class="penalty-count ${countClass}">${displayValue}</div>`,
      '</div>'
    ].join('');
  }

  // Update rosters and penalties
  function updateRosterAndPenalties(teamNum) {
    const skaters = appState.teams[teamNum].skaters;
    const sortedSkaters = sortSkaters(skaters);
    const team = $elements[`team${teamNum}`];
    const expulsionIds = getExpulsionPenaltyIds();
    
    const rosterParts = [];
    const penaltyParts = [];
    
    for (const skater of sortedSkaters) {
      // Skip skaters without number or name
      if (!skater.number || !skater.name) continue;
      
      rosterParts.push(buildRosterHTML(skater));
      penaltyParts.push(buildPenaltyHTML(teamNum, skater, expulsionIds));
    }
    
    team.roster.html(rosterParts.join(''));
    team.penalties.html(penaltyParts.join(''));
  }

  /**************************
  ** Team update functions **
  **************************/

  // Update team colors
  function updateTeamColors(teamNum) {
    const state = WS.state;
    const fgColor = state[`ScoreBoard.CurrentGame.Team(${teamNum}).Color(whiteboard.fg)`];
    const bgColor = state[`ScoreBoard.CurrentGame.Team(${teamNum}).Color(whiteboard.bg)`];
    const colors = teams[teamNum].colors;
    
    // Skip update if colors haven't changed
    if (colors.fg === fgColor && colors.bg === bgColor) {
      return;
    }
    
    // Set team colors
    colors.fg = fgColor;
    colors.bg = bgColor;
    
    // Use default colors if none are set
    const finalFg = fgColor || 'white';
    const finalBg = bgColor || 'black';
    
    appState.dom.root.style.setProperty(`--team${teamNum}-fg`, finalFg);
    appState.dom.root.style.setProperty(`--team${teamNum}-bg`, finalBg);
    appState.dom.root.style.setProperty(`--team${teamNum}-border`, finalFg);
  }

  // Check for and display logos if present
  function checkAndDisplayLogos() {
    const shouldShow = appState.teams[1].logo && appState.teams[2].logo;
    
    if (shouldShow !== appState.flags.bothTeamsHaveLogos) {
      appState.flags.bothTeamsHaveLogos = shouldShow;
      
      if (shouldShow) {
        $elements.team1.logo.attr('src', appState.teams[1].logo).show();
        $elements.team2.logo.attr('src', appState.teams[2].logo).show();
        $elements.logoContainers.show();
      } else {
        $elements.team1.logo.hide();
        $elements.team2.logo.hide();
        $elements.logoContainers.hide();
      }
    }
  }

  // Equalize team name and score block widths and set wrapper width
  function equalizeTeamBoxWidths() {
    requestAnimationFrame(() => {
      // Force a reflow to get natural widths if needed
      const team1Width = $elements.team1.name.parent().get(0).scrollWidth;
      const team2Width = $elements.team2.name.parent().get(0).scrollWidth;

      // Add a buffer to the maximum width to prevent overflow/truncation
      const maxWidth = Math.max(team1Width, team2Width) + CONFIG.teamNameOverflowBufferPixels;
      
      // Single write operation
      $elements.teamScoreBlocks.css('width', `${maxWidth}px`);
      
      const vsClockWidth = $elements.vsClockContainer.outerWidth();
      const hasLogo = $elements.gameInfoWrapper.hasClass(CSS_CLASSES.HAS_LOGO);
      const padding = hasLogo ? 280 : 40;
      
      const totalWidth = (maxWidth * 2) + vsClockWidth + padding;
      $elements.gameInfoWrapper.css('width', `${totalWidth}px`);
    });
  }

  /******************************************
  ** Clock and game state update functions **
  ******************************************/

// Update the game clock
  function updateClock() {
    try {
      const state = WS.state;

      // Get the clock label
      const officialScore = isTrue(state['ScoreBoard.CurrentGame.OfficialScore']);
      const inOvertime = isTrue(state['ScoreBoard.CurrentGame.InOvertime']);
      const currentPeriod = parseInt(state['ScoreBoard.CurrentGame.CurrentPeriodNumber']) || 0;
      const intermissionTime = parseInt(state['ScoreBoard.CurrentGame.Clock(Intermission).Time']) || 0;
      const periodTime = parseInt(state['ScoreBoard.CurrentGame.Clock(Period).Time']) || 0;
      const numPeriods = parseInt(state['ScoreBoard.CurrentGame.Rule(Period.Number)']) || 2;
      const intermissionRunning = isTrue(state['ScoreBoard.CurrentGame.Clock(Intermission).Running']);

      // Determine if the game is over
      const gameOver = currentPeriod > numPeriods || 
                      (currentPeriod >= numPeriods && (intermissionRunning || intermissionTime > 0));
      
      // Hide the period clock for for unofficial/official score or overtime
      if (officialScore || gameOver || inOvertime) {
        $elements.gameClock.html('&nbsp;');
        return;
      }

      // Before period 1, if the IGRF start time is missing or in the past, show the upcoming period clock
      if (currentPeriod === 0) {
        if (isStartTimeMissingOrPast()) {
          $elements.gameClock.text(formatTime(periodTime));
        } else if (intermissionTime <= 0) {
          $elements.gameClock.html('&nbsp;');
        } else {
          $elements.gameClock.text(formatTime(intermissionTime));
        }
        return;
      }
  
      // Between periods, show the intermission clock
      if (currentPeriod > 0 && currentPeriod < numPeriods && intermissionTime > 0) {
        $elements.gameClock.text(formatTime(intermissionTime));
        return;
      }

      // During periods, show the period clock
      $elements.gameClock.text(formatTime(periodTime));
      
    } catch(error) {
      console.error('Error updating clock:', error);
    }
  }

  // Update game state (period info)
  function updateGameState() {
    try {
      const state = WS.state;
      const currentPeriod = parseInt(state['ScoreBoard.CurrentGame.CurrentPeriodNumber']) || 0;
      const inOvertime = isTrue(state['ScoreBoard.CurrentGame.InOvertime']);
      const officialScore = isTrue(state['ScoreBoard.CurrentGame.OfficialScore']);
      const intermissionTime = parseInt(state['ScoreBoard.CurrentGame.Clock(Intermission).Time']) || 0;
      const numPeriods = parseInt(state['ScoreBoard.CurrentGame.Rule(Period.Number)']) || 2;
      const intermissionRunning = isTrue(state['ScoreBoard.CurrentGame.Clock(Intermission).Running']);
      
      // Get intermission labels from settings with fallback to defaults
      const labels = {
        preGame: getIntermissionLabel(
          'ScoreBoard.Settings.Setting(ScoreBoard.Intermission.PreGame)', 
          DISPLAY_TEXT.intermission.preGame
        ),
        intermission: getIntermissionLabel(
          'ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Intermission)', 
          DISPLAY_TEXT.intermission.intermission
        ),
        unofficial: getIntermissionLabel(
          'ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Unofficial)', 
          DISPLAY_TEXT.intermission.unofficial
        ),
        official: getIntermissionLabel(
          'ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Official)', 
          DISPLAY_TEXT.intermission.official
        )
      };

      // Determine if the game is over
      const gameOver = currentPeriod > numPeriods || 
                      (currentPeriod >= numPeriods && (intermissionRunning || intermissionTime > 0));
      
      let text;

      // Determine the correct clock label
      if (officialScore) {
        text = labels.official;
      } else if (gameOver) {
        text = labels.unofficial;
      } else if (inOvertime) {
        text = DISPLAY_TEXT.intermission.overtime;
      } else if (currentPeriod > 0 && currentPeriod < numPeriods && intermissionTime > 0) {
        text = labels.intermission;
      } else if (currentPeriod > 0 && currentPeriod <= numPeriods) {
        text = `Period ${currentPeriod}`;
      } else if (currentPeriod === 0 && isStartTimeMissingOrPast()) {
        // If start time is missing or in past, show DISPLAY_TEXT.preFirstPeriodLabel for the upcoming period
        text = DISPLAY_TEXT.preFirstPeriodLabel;
      } else if (currentPeriod === 0 && intermissionTime > 0) {
        text = labels.preGame;
      } else {
        text = DISPLAY_TEXT.intermission.comingUp;
      }
      
      $elements.periodInfo.text(text);
      updateClock();
      
    } catch(error) {
      console.error('Error updating game state:', error);
    }
  }

  // Update tournament name and game number if available
  function updateTournamentName() {
    const tournament = trimValue(WS.state['ScoreBoard.CurrentGame.EventInfo(Tournament)']);
    const gameNo = trimValue(WS.state['ScoreBoard.CurrentGame.EventInfo(GameNo)']);
    
    if (tournament) {
      const displayText = gameNo ? `${tournament} - Game ${gameNo}` : tournament;
      $elements.tournamentName.text(displayText).show();
    } else {
      $elements.tournamentName.hide();
    }
  }

  // Load custom logo if available
  function loadCustomLogo() {
    const logoImg = new Image();

    // Attempt to load custom logo and add symmetrical padding
    logoImg.onload = () => {
      $elements.customLogoSpace.html(`<img src="${CONFIG.bannerLogoPath}" class="custom-logo" />`);
      $elements.gameInfoWrapper.addClass(CSS_CLASSES.HAS_LOGO);
    };

    // Do not add symmetrical padding if logo fails to load
    logoImg.onerror = () => {
      $elements.customLogoSpace.empty();
      $elements.gameInfoWrapper.removeClass(CSS_CLASSES.HAS_LOGO);
    };

    logoImg.src = CONFIG.bannerLogoPath;
  }

  // Wait for WS to be loaded
  function waitForWS() {
    if (typeof WS === 'undefined') {
      setTimeout(waitForWS, TIMING.wsWaitMs);
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
      setTimeout(initializeDisplay, TIMING.initDelayMs);
      
    } catch(error) {
      console.error('Failed to initialize overlay:', error);
    }
  }

  // Debounced clock update
  var debouncedClockUpdate = debounce(updateClock, TIMING.debounceClockMs);
  
  // Debounced penalty update - longer delay during initial load
  var debouncedPenaltyUpdate = {
    timers: {},
    update: function(teamNum) {
      var delay = appState.flags.initialLoadComplete ? TIMING.debouncePenaltyNormalMs : TIMING.debouncePenaltyInitMs;
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
      var altName = trimValue(WS.state['ScoreBoard.CurrentGame.Team(' + teamNum + ').AlternateName(whiteboard)']);
      var name = altName || trimValue(value);
      
      // Only update if we have a name, or if current display is empty/default
      var currentText = team.name.text();
      if (name || !currentText || currentText === DISPLAY_TEXT.defaultTeamNamePrefix + teamNum) {
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
      skaters[skaterId].number = trimValue(value);
      updateRosterAndPenalties(teamNum);
    } else if (REGEX_PATTERNS.skaterName.test(key) && !REGEX_PATTERNS.skaterNameExclude.test(key)) {
      skaters[skaterId].name = trimValue(value);
      updateRosterAndPenalties(teamNum);
    } else if (REGEX_PATTERNS.skaterFlags.test(key)) {
      skaters[skaterId].flags = trimValue(value);
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
        
        for (var teamNum = 1; teamNum <= NUM_TEAMS && !foundTeam; teamNum++) {
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

  // Initialize display
  function initializeDisplay() {
    try {
      var state = WS.state;
      
      for (var teamNum = 1; teamNum <= RULES.numTeams; teamNum++) {
        var altName = trimValue(state['ScoreBoard.CurrentGame.Team(' + teamNum + ').AlternateName(whiteboard)']);
        var name = trimValue(state['ScoreBoard.CurrentGame.Team(' + teamNum + ').Name']);
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
        appState.flags.initialLoadComplete = true;
      }, TIMING.initCompleteMs);
      
      setTimeout(function() {
        for (var teamNum = 1; teamNum <= RULES.numTeams; teamNum++) {
          var currentText = $elements['team' + teamNum].name.text();
          var altName = trimValue(WS.state['ScoreBoard.CurrentGame.Team(' + teamNum + ').AlternateName(whiteboard)']);
          var name = trimValue(WS.state['ScoreBoard.CurrentGame.Team(' + teamNum + ').Name']);
          
          if ((!currentText || currentText.trim() === '') && !altName && !name) {
            $elements['team' + teamNum].name.text(DISPLAY_TEXT.defaultTeamNamePrefix + teamNum);
            updateQueue.schedule(equalizeTeamBoxWidths);
          }
        }
      }, TIMING.defaultNameDelayMs);
      
    } catch(error) {
      console.error('Error during initialization:', error);
    }
  }

  waitForWS();
});