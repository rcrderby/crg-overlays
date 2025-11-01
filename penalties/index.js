//  JavaScript for custom penalties overlay - index.html

$(function() {
  'use strict';

  // Import configuration data from global namespace
  const PenaltiesOverlayConfig = window.AppConfig.PenaltiesOverlayConfig;

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

  // Halt if PenaltiesOverlayConfig appears invalid
  if (
      !PenaltiesOverlayConfig.config || 
      !PenaltiesOverlayConfig.timing || 
      !PenaltiesOverlayConfig.labels || 
      !PenaltiesOverlayConfig.rules || 
      !PenaltiesOverlayConfig.penalties
  ) {
    console.error('ERROR: data imported from config.js is invalid.');
    console.error('Required structures: timing, display, labels, rules, and penalties');
    alert('Configuration Error: config.js is invalid. Check browser console for details.');
    return;
  }

  // Logging utility - read debug setting from config.js
  const DEBUG = PenaltiesOverlayConfig.debug?.enabled || false;
  const logger = {
    debug: DEBUG ? console.log.bind(console) : () => {},
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  };

  /**************
  ** Constants **
  **************/

  // Data from config.js
  const CONFIG = PenaltiesOverlayConfig.config;
  const TIMING = PenaltiesOverlayConfig.timing;
  const LABELS = PenaltiesOverlayConfig.labels;
  const RULES = PenaltiesOverlayConfig.rules;
  const PENALTIES = PenaltiesOverlayConfig.penalties;

  // CSS classes
  const CSS_CLASSES = {
    PENALTY_5: 'penalty-count-5',
    PENALTY_6: 'penalty-count-6',
    PENALTY_FOULOUT: 'penalty-count-foulout',
    PENALTY_EXPELLED: 'penalty-count-expelled',
    HAS_LOGO: 'has-logo'
  };

  // Expected data counts for loading tracker
  const EXPECTED_DATA_COUNTS = {
    // Number of game info fields (clock, clockLabel, tournament, expulsions)
    GAME_INFO_FIELDS: 4
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
    expulsionId: /ScoreBoard\.CurrentGame\.Expulsion\(([^)]+)\)\.Id/,
    alternateName: /\.AlternateName\(whiteboard\)/,
    hasAlternateName: /AlternateName/,
    hasSkater: /\.Skater\(/
  };

  /**************************************
  ** Application data state management **
  **************************************/

  // Application state for roster and penalty data
  const appState = {
    teams: {
      1: { skaters: {}, logo: '', colors: { fg: null, bg: null, glow: null } },
      2: { skaters: {}, logo: '', colors: { fg: null, bg: null, glow: null } }
    },
    cache: {
      expulsionIds: [],
      expulsionIdsValid: false,
      expulsionIdsExpiry: 0,
      startTimePast: null,
      startTimeCacheExpiry: 0,
      penaltyIdToSkater: {}
    },
    flags: {
      displayedLogos: { 1: '', 2: '' },
      bothTeamsHaveLogos: false,
      initialLoadComplete: false,
      teamNameSet: { 1: false, 2: false }
    },
    dom: {
      root: document.documentElement
    }
  };

  // Loading tracker - monitors which data has been received during initialization
  const loadingTracker = {
    initialized: false,
    loadStartTime: null,
    safetyTimeoutId: null,
    dataReceived: {
      teamsBasicData: 0,  // Counts to RULES.numTeams (both teams' names, scores, totals, colors)
      teamLogos: false,
      teamRosters: 0,     // Counts to RULES.numTeams (both teams)
      teamPenalties: 0,   // Counts to RULES.numTeams (both teams)
      gameInfo: 0         // Counts to EXPECTED_DATA_COUNTS.GAME_INFO_FIELDS (clock, clockLabel, tournament, expulsions)
    },
    
    // Mark a data item as received
    markReceived(dataKey) {
      if (typeof this.dataReceived[dataKey] === 'number') {
        this.dataReceived[dataKey]++;
      } else if (Object.hasOwn(this.dataReceived, dataKey)) {
        this.dataReceived[dataKey] = true;
      }
      this.checkIfReady();
    },
    
    // Check if all data has been received
    isAllDataReceived() {
      return this.dataReceived.teamsBasicData >= RULES.numTeams &&
             this.dataReceived.teamLogos &&
             this.dataReceived.teamRosters >= RULES.numTeams &&
             this.dataReceived.teamPenalties >= RULES.numTeams &&
             this.dataReceived.gameInfo >= EXPECTED_DATA_COUNTS.GAME_INFO_FIELDS;
    },
    
    // Check if ready to display and show overlay
    checkIfReady() {
      if (this.initialized || !this.loadStartTime) {
        return;
      }
      
      if (this.isAllDataReceived()) {
        logger.debug('All data received, preparing to display overlay...');
        this.initialized = true;
        
        // Clear safety timeout after receiving all data
        if (this.safetyTimeoutId) {
          clearTimeout(this.safetyTimeoutId);
          this.safetyTimeoutId = null;
        }
        
        // Wait a moment to allow all renderings to complete
        setTimeout(() => {
          this.showOverlay();
        }, TIMING.dataCompleteDelayMs);
      }
    },
    
    // Show the main overlay and hide loading screen
    showOverlay() {
      const loadTime = Date.now() - this.loadStartTime;
      const minDisplayTime = TIMING.minLoadDisplayMs;
      
      // Ensure the loading screen shows for a minimum amount of time
      const delay = Math.max(0, minDisplayTime - loadTime);
      
      setTimeout(() => {
        logger.debug('Showing overlay (data load complete)');
        const $loadingOverlay = $('#loading-overlay');
        const $overlay = $('#overlay');
        
        // Fade out loading screen, fade in overlay content
        $loadingOverlay.addClass('fade-out');
        $overlay.removeClass('hidden');
        
        // Remove loading screen after fade completes
        setTimeout(() => {
          $loadingOverlay.remove();
        }, 500);
        
        // Mark initialization as complete
        appState.flags.initialLoadComplete = true;
        
        // Final adjustments
        equalizeTeamBoxWidths();
      }, delay);
    },
    
    // Force display of overlay after timeout
    forceShowOverlay() {
      if (this.initialized) {
        return;
      }
      
      logger.warn('Timeout reached - displaying overlay with available data');
      logger.warn('Missing data:', Object.keys(this.dataReceived).filter(k => !this.dataReceived[k]));
      
      this.initialized = true;
      this.showOverlay();
    },
    
    // Start loading data
    startLoading() {
      this.loadStartTime = Date.now();
      logger.debug('Started loading data...');
      
      // Set timeout to force displaying the overlay after the maximum wait time
      this.safetyTimeoutId = setTimeout(() => {
        this.forceShowOverlay();
      }, TIMING.maxLoadWaitMs);
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

  // Safely retrieve values from the WebSocket state, avoiding race conditions
  function safeGetState(key, defaultValue = null) {
    if (!WS || !WS.state || typeof WS.state[key] === 'undefined') {
      return defaultValue;
    }
    return WS.state[key];
  }

  // Determine if the WebSocket is available for use
  function isWSReady() {
    return typeof WS !== 'undefined' && 
           typeof WS.state !== 'undefined' && 
           Object.keys(WS.state).length > 0;
  }

  // Sanitize user input to prevent XSS via HTML injection in roster or team data
  function sanitizeHTML(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

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
    if (!isWSReady()) {
      return defaultValue;
    }
    const value = trimValue(safeGetState(stateKey));
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
    const now = Date.now();
    
    // Invalidate cache if expired
    if (now > appState.cache.expulsionIdsExpiry) {
      appState.cache.expulsionIdsValid = false;
    }
    
    if (appState.cache.expulsionIdsValid) {
      return appState.cache.expulsionIds;
    }

    if (!isWSReady()) {
      return [];
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
    appState.cache.expulsionIdsExpiry = now + TIMING.cacheExpiryMs;
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
    
    if (!isWSReady()) {
      appState.cache.startTimePast = true;
      appState.cache.startTimeCacheExpiry = now + TIMING.cacheExpiryMs;
      return true;
    }
    
    const startDate = safeGetState('ScoreBoard.CurrentGame.EventInfo(Date)');
    const startTime = safeGetState('ScoreBoard.CurrentGame.EventInfo(StartTime)');
    
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
      logger.warn('Failed to parse start date/time:', error);
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
      String(penalty || '').trim().toUpperCase() === LABELS.fouloutDisplay
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
      if (PENALTIES.filteredCodes.includes(codeUpper)) {
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
    if (!isWSReady()) {
      return;
    }

    // Prevent function from throwing an error if a team is undefined
    if (!appState.teams[teamNum]) {
      logger.warn(`Team ${teamNum} data not initialized`);
      return;
    }

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
    
    // Clear stale entries from penalty ID reverse lookup map
    for (const penaltyId in appState.cache.penaltyIdToSkater) {
      if (appState.cache.penaltyIdToSkater[penaltyId].teamNum === teamNum) {
        delete appState.cache.penaltyIdToSkater[penaltyId];
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
            
            // Build reverse lookup map for efficient expulsion handling
            appState.cache.penaltyIdToSkater[penalty.id] = { teamNum, skaterId: skaterKey };
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
    const flags = skater.flags.split(',');
    const isCaptain = skater.flags === LABELS.captainFlag || 
                      flags.includes(LABELS.captainFlag);
    const isAltCaptain = skater.flags === LABELS.altCaptainFlag || 
                         flags.includes(LABELS.altCaptainFlag);
    
    const captainIndicator = isCaptain ? ' <span class="captain-indicator">C</span>' : 
                             isAltCaptain ? ' <span class="captain-indicator">A</span>' : '';
    
    // Sanitize roster user input
    const safeNumber = sanitizeHTML(skater.number);
    const safeName = sanitizeHTML(skater.name);
    
    return `
      <div class="roster-line">
        <div class="roster-number">${safeNumber}</div>
        <div class="roster-name">${safeName}${captainIndicator}</div>
      </div>
    `;
  }


  // Build penalty HTML for a player
  function buildPenaltyHTML(teamNum, skater, expulsionIds) {
    const displayPenalties = getDisplayPenalties(skater.penaltyDetails, expulsionIds);
    
    // Sanitize penalty codes
    const codes = displayPenalties.map(p => sanitizeHTML(p.code)).join(' ');
    const displayCount = displayPenalties.length;
    
    // Determine the display value for the player's total penalties (EXP, FO, or count)
    let displayValue;
    if (isSkaterExpelled(teamNum, skater.id)) {
      displayValue = LABELS.expelledDisplay;
    } else if (isSkaterFouledOut(skater)) {
      displayValue = LABELS.fouloutDisplay;
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

  // Check if a player should be filtered from display based on their flags
  function shouldFilterSkater(skater) {
    if (!skater.flags) return false;
    
    const flags = skater.flags.split(',');
    return CONFIG.filteredSkaterFlags.some(filteredFlag => flags.includes(filteredFlag));
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
      // Skip skaters without number or name, or with filtered flags
      if (!skater.number || !skater.name || shouldFilterSkater(skater)) continue;
      
      rosterParts.push(buildRosterHTML(skater));
      penaltyParts.push(buildPenaltyHTML(teamNum, skater, expulsionIds));
    }
    
    team.roster.html(rosterParts.join(''));
    team.penalties.html(penaltyParts.join(''));
    
    if (!loadingTracker.initialized) {
      loadingTracker.markReceived('teamRosters');
      loadingTracker.markReceived('teamPenalties');
    }
  }

  /**************************
  ** Team update functions **
  **************************/

  // Team color-specific helper function to colors to CSS variables
  function applyTeamColors(teamNum, fgColor, bgColor, glowColor) {
    appState.dom.root.style.setProperty(`--team${teamNum}-fg`, fgColor);
    appState.dom.root.style.setProperty(`--team${teamNum}-bg`, bgColor);
    appState.dom.root.style.setProperty(`--team${teamNum}-border`, fgColor);
    appState.dom.root.style.setProperty(`--team${teamNum}-text-shadow`, glowColor);
  }

  // Update team colors
  function updateTeamColors(teamNum) {
    if (!isWSReady()) return;
    
    const fgColor = safeGetState(`ScoreBoard.CurrentGame.Team(${teamNum}).Color(whiteboard.fg)`);
    const bgColor = safeGetState(`ScoreBoard.CurrentGame.Team(${teamNum}).Color(whiteboard.bg)`);
    const glowColor = safeGetState(`ScoreBoard.CurrentGame.Team(${teamNum}).Color(whiteboard.glow)`);
    const colors = appState.teams[teamNum].colors;
    
    // Skip update if colors haven't changed
    if (colors.fg === fgColor && colors.bg === bgColor && colors.glow === glowColor) {
      if (!loadingTracker.initialized) loadingTracker.markReceived('teamsBasicData');
      return;
    }

    // Set team colors
    colors.fg = fgColor;
    colors.bg = bgColor;
    colors.glow = glowColor;

    // Use default colors if none are set
    const finalFg = fgColor || 'var(--team-penalties-default-fg-color)';
    const finalBg = bgColor || 'var(--team-penalties-default-bg-color)';
    const finalGlow = glowColor ? `${CONFIG.defaultRosterShadowProperties} ${glowColor}` : 'var(--team-penalties-default-text-shadow)';
    
    applyTeamColors(teamNum, finalFg, finalBg, finalGlow);
    
    if (!loadingTracker.initialized) loadingTracker.markReceived('teamsBasicData');
  }

  // Check for and display logos if present
  function checkAndDisplayLogos() {
    const team1Logo = appState.teams[1].logo;
    const team2Logo = appState.teams[2].logo;
    const shouldShow = team1Logo && team2Logo;
    
    // Check for logo changes
    const visibilityChanged = shouldShow !== appState.flags.bothTeamsHaveLogos;
    const team1LogoChanged = team1Logo !== appState.flags.displayedLogos[1];
    const team2LogoChanged = team2Logo !== appState.flags.displayedLogos[2];
    
    // Return immediately if nothing changed
    if (!visibilityChanged && !team1LogoChanged && !team2LogoChanged) {
      if (!loadingTracker.initialized) loadingTracker.markReceived('teamLogos');
      return;
    }
    
    // Update visibility flag
    appState.flags.bothTeamsHaveLogos = shouldShow;
    
    if (shouldShow) {
      // Update each team's logo if changed
      if (team1LogoChanged) {
        $elements.team1.logo.attr('src', team1Logo);
        appState.flags.displayedLogos[1] = team1Logo;
      }
      
      if (team2LogoChanged) {
        $elements.team2.logo.attr('src', team2Logo);
        appState.flags.displayedLogos[2] = team2Logo;
      }
      
      // Show logos if they weren't already visible
      if (visibilityChanged) {
        $elements.team1.logo.show();
        $elements.team2.logo.show();
        $elements.logoContainers.show();
      }
    } else {
      // Hide logos and clear tracked URLs
      $elements.team1.logo.hide();
      $elements.team2.logo.hide();
      $elements.logoContainers.hide();
      appState.flags.displayedLogos[1] = '';
      appState.flags.displayedLogos[2] = '';
    }
    
    if (!loadingTracker.initialized) loadingTracker.markReceived('teamLogos');
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
    if (!isWSReady()) return;
    
    try {
      // Get the clock label
      const officialScore = isTrue(safeGetState('ScoreBoard.CurrentGame.OfficialScore'));
      const inOvertime = isTrue(safeGetState('ScoreBoard.CurrentGame.InOvertime'));
      const currentPeriod = parseInt(safeGetState('ScoreBoard.CurrentGame.CurrentPeriodNumber')) || 0;
      const intermissionTime = parseInt(safeGetState('ScoreBoard.CurrentGame.Clock(Intermission).Time')) || 0;
      const periodTime = parseInt(safeGetState('ScoreBoard.CurrentGame.Clock(Period).Time')) || 0;
      const periodRunning = isTrue(safeGetState('ScoreBoard.CurrentGame.Clock(Period).Running'));
      const numPeriods = parseInt(safeGetState('ScoreBoard.CurrentGame.Rule(Period.Number)')) || 2;
      const intermissionRunning = isTrue(safeGetState('ScoreBoard.CurrentGame.Clock(Intermission).Running'));

      // Determine if the game is over
      const gameOver = currentPeriod > numPeriods || 
                      (currentPeriod >= numPeriods && (intermissionRunning || intermissionTime > 0));
      
      // Hide the period clock for for unofficial/official score or overtime
      if (officialScore || gameOver || inOvertime) {
        $elements.gameClock.html('&nbsp;');
      // Before period 1, if the IGRF start time is missing or in the past, show the upcoming period clock
      } else if (currentPeriod === 0) {
        if (isStartTimeMissingOrPast()) {
          $elements.gameClock.text(formatTime(periodTime));
        } else if (intermissionTime <= 0) {
          $elements.gameClock.html('&nbsp;');
        } else {
          $elements.gameClock.text(formatTime(intermissionTime));
        }
      // Between periods, show the intermission clock
      } else if (currentPeriod > 0 && currentPeriod < numPeriods && intermissionRunning && !periodRunning) {
        $elements.gameClock.text(formatTime(intermissionTime));
      } else {
        $elements.gameClock.text(formatTime(periodTime));
      }
      
      if (!loadingTracker.initialized) loadingTracker.markReceived('gameInfo');
      
    } catch(error) {
      logger.error('Error updating clock:', error);
    }
  }

  // Update game state (period info)
  function updateGameState() {
    if (!isWSReady()) return;
    
    try {
      const currentPeriod = parseInt(safeGetState('ScoreBoard.CurrentGame.CurrentPeriodNumber')) || 0;
      const inOvertime = isTrue(safeGetState('ScoreBoard.CurrentGame.InOvertime'));
      const officialScore = isTrue(safeGetState('ScoreBoard.CurrentGame.OfficialScore'));
      const intermissionTime = parseInt(safeGetState('ScoreBoard.CurrentGame.Clock(Intermission).Time')) || 0;
      const periodRunning = isTrue(safeGetState('ScoreBoard.CurrentGame.Clock(Period).Running'));
      const numPeriods = parseInt(safeGetState('ScoreBoard.CurrentGame.Rule(Period.Number)')) || 2;
      const intermissionRunning = isTrue(safeGetState('ScoreBoard.CurrentGame.Clock(Intermission).Running'));

      // Get intermission labels from settings with fallback to defaults
      const labels = {
        preGame: getIntermissionLabel('ScoreBoard.Settings.Setting(ScoreBoard.Intermission.PreGame)', LABELS.intermission.preGame),
        intermission: getIntermissionLabel('ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Intermission)', LABELS.intermission.intermission),
        unofficial: getIntermissionLabel('ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Unofficial)', LABELS.intermission.unofficial),
        official: getIntermissionLabel('ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Official)', LABELS.intermission.official)
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
        text = LABELS.intermission.overtime;
      } else if (currentPeriod > 0 && currentPeriod < numPeriods && intermissionRunning && !periodRunning) {
        text = labels.intermission;
      } else if (currentPeriod > 0 && currentPeriod <= numPeriods) {
        text = `Period ${currentPeriod}`;
      // If start time is missing or in past, show LABELS.preFirstPeriodLabel for the upcoming period
      } else if (currentPeriod === 0 && isStartTimeMissingOrPast()) {
        text = LABELS.preFirstPeriodLabel;
      } else if (currentPeriod === 0 && intermissionTime > 0) {
        text = labels.preGame;
      } else {
        text = LABELS.intermission.comingUp;
      }
      
      $elements.periodInfo.text(text);
      updateClock();
      
      if (!loadingTracker.initialized) loadingTracker.markReceived('gameInfo');
      
    } catch(error) {
      logger.error('Error updating game state:', error);
    }
  }

  // Update tournament name and game number if available
  function updateTournamentName() {
    const tournament = trimValue(safeGetState('ScoreBoard.CurrentGame.EventInfo(Tournament)'));
    const gameNo = trimValue(safeGetState('ScoreBoard.CurrentGame.EventInfo(GameNo)'));
    
    if (tournament) {
      const displayText = gameNo ? `${tournament} - Game ${gameNo}` : tournament;
      $elements.tournamentName.text(displayText).show();
    } else {
      $elements.tournamentName.hide();
    }
    
    if (!loadingTracker.initialized) loadingTracker.markReceived('gameInfo');
  }

  // Load custom logo if available
  function loadCustomLogo() {
    // Check if the logo path is configured
    if (!CONFIG.bannerLogoPath) {
      return;
    }

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

  /**************************************
  ** WebSocket event handler functions **
  **************************************/

  // Debounced penalty update with cleanup
  const debouncedPenaltyUpdate = {
    timers: {},

    update(teamNum) {
      const delay = appState.flags.initialLoadComplete 
        ? TIMING.debouncePenaltyNormalMs 
        : TIMING.debouncePenaltyInitMs;

      // Clear existing timer
      if (this.timers[teamNum]) {
        clearTimeout(this.timers[teamNum]);
      }
      
      this.timers[teamNum] = setTimeout(() => {
        // Clean up timer reference after execution
        delete this.timers[teamNum];
        
        // Run update only if WebSocket is ready
        if (isWSReady()) {
          updatePenalties(teamNum);
        }
      }, delay);
    },
    
    // Clear all timers
    clearAll() {
      Object.values(this.timers).forEach(timer => clearTimeout(timer));
      this.timers = {};
    },
    
    // Clear specific team timer
    clear(teamNum) {
      if (this.timers[teamNum]) {
        clearTimeout(this.timers[teamNum]);
        delete this.timers[teamNum];
      }
    }
  };

  // Unified team update handler
  function handleTeamUpdate(key, value) {
    const match = key.match(REGEX_PATTERNS.teamNumber);
    if (!match) return;

    const teamNum = parseInt(match[1]);
    const team = $elements[`team${teamNum}`];

    // Check for a team name in the "whiteboard" custom name
    if (REGEX_PATTERNS.alternateName.test(key) || 
        (REGEX_PATTERNS.teamName.test(key) && !REGEX_PATTERNS.hasAlternateName.test(key) && !REGEX_PATTERNS.hasSkater.test(key))) {

      const altName = trimValue(safeGetState(`ScoreBoard.CurrentGame.Team(${teamNum}).AlternateName(whiteboard)`));
      const name = altName || trimValue(value);

      // Use the IGRF team name or a default value if the "whiteboard" custom name is empty/default
      const currentText = team.name.text();
      if (name || !currentText || currentText === `${LABELS.defaultTeamNamePrefix}${teamNum}`) {
        team.name.text(name || '');
        if (name) {
          appState.flags.teamNameSet[teamNum] = true;
        }
        updateQueue.schedule(equalizeTeamBoxWidths);
      }
      
      if (!loadingTracker.initialized) loadingTracker.markReceived('teamsBasicData');

    } else if (REGEX_PATTERNS.teamScore.test(key) && !REGEX_PATTERNS.hasSkater.test(key)) {
      team.score.text(value || '0');
      if (!loadingTracker.initialized) loadingTracker.markReceived('teamsBasicData');

    // Check for and display team logos
    } else if (REGEX_PATTERNS.teamLogo.test(key)) {
      appState.teams[teamNum].logo = value || '';
      checkAndDisplayLogos();

    // Update team roster colors
    } else if (REGEX_PATTERNS.teamColor.test(key)) {
      updateQueue.schedule(() => updateTeamColors(teamNum));

    // Set the team penalty total values
    } else if (REGEX_PATTERNS.teamPenalties.test(key)) {
      team.total.text(value || '0');
      if (!loadingTracker.initialized) loadingTracker.markReceived('teamsBasicData');
    }
  }

  // Unified player update handler
  function handleSkaterUpdate(key, value) {
    const match = key.match(REGEX_PATTERNS.skaterPattern);
    if (!match) return;
    
    const teamNum = parseInt(match[1]);
    const skaterId = match[2];
    const skater = getOrCreateSkater(teamNum, skaterId);
    
    if (REGEX_PATTERNS.skaterNumber.test(key)) {
      skater.number = trimValue(value);
      updateRosterAndPenalties(teamNum);
    } else if (REGEX_PATTERNS.skaterName.test(key) && !REGEX_PATTERNS.skaterNameExclude.test(key)) {
      skater.name = trimValue(value);
      updateRosterAndPenalties(teamNum);
    } else if (REGEX_PATTERNS.skaterFlags.test(key)) {
      skater.flags = trimValue(value);
      updateRosterAndPenalties(teamNum);
    }
  }

  // Handle penalty updates
  function handlePenaltyUpdate(key, _value) {
    const match = key.match(REGEX_PATTERNS.teamNumber);
    if (match) {
      debouncedPenaltyUpdate.update(parseInt(match[1]));
    }
  }

  // Handle expulsion updates
  function handleExpulsionUpdate(key, _value) {
    invalidateExpulsionCache();
    
    if (!loadingTracker.initialized) loadingTracker.markReceived('gameInfo');
    
    const expulsionIdMatch = key.match(REGEX_PATTERNS.expulsionId);
    
    if (expulsionIdMatch && expulsionIdMatch[1]) {
      const id = expulsionIdMatch[1];
      
      // Use reverse lookup map to find which team has this expulsion penalty ID
      const skaterInfo = appState.cache.penaltyIdToSkater[id];
      if (skaterInfo) {
        updateRosterAndPenalties(skaterInfo.teamNum);
        return;
      }
    }

    // Fallback: update both teams if we can't determine which team has this penalty
    updateRosterAndPenalties(1);
    updateRosterAndPenalties(2);
  }

  /***************************
  ** Memory leak prevention **
  ****************************/

  // Store all registered handlers for cleanup
  const registeredHandlers = [];
  let cleanupRegistered = false;

  // Register a WebSocket handler with automatic cleanup tracking
  function registerHandler(paths, handler) {
    if (!isWSReady()) {
      logger.warn('Attempted to register handler before WebSocket ready');
      return;
    }

    WS.Register(paths, handler);
    registeredHandlers.push({ paths, handler });
  }

  // Clean up all registered handlers and timers
  function cleanup() {
    logger.debug('Cleaning up overlay resources...');

    // Unregister WebSocket handlers
    registeredHandlers.forEach(({ paths, handler }) => {
      if (WS && WS.Unregister) {
        try {
          WS.Unregister(paths, handler);
        } catch (error) {
          logger.warn('Error unregistering handler:', error);
        }
      }
    });
    registeredHandlers.length = 0;
    
    // Clear all penalty update timers
    debouncedPenaltyUpdate.clearAll();

    // Clear update queue
    if (updateQueue.pending) {
      updateQueue.callbacks = [];
      updateQueue.pending = false;
    }

    logger.debug('Cleanup complete');
  }

  // Register cleanup handler ( once during initialization)
  function registerCleanupHandler() {
    if (cleanupRegistered) return;

    $(window).on('beforeunload', cleanup);

    // Also cleanup on visibility change (for SPAs)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cleanup();
      }
    });

    cleanupRegistered = true;
  }

  /*******************
  ** Initialization **
  *******************/

  // Set a default team name if none is provided after delay
  function setDefaultTeamNameIfNeeded(teamNum) {
    const currentText = $elements[`team${teamNum}`].name.text();
    const checkAltName = trimValue(safeGetState(`ScoreBoard.CurrentGame.Team(${teamNum}).AlternateName(whiteboard)`));
    const checkName = trimValue(safeGetState(`ScoreBoard.CurrentGame.Team(${teamNum}).Name`));
    
    if ((!currentText || currentText.trim() === '') && !checkAltName && !checkName && !appState.flags.teamNameSet[teamNum]) {
      $elements[`team${teamNum}`].name.text(`${LABELS.defaultTeamNamePrefix}${teamNum}`);
      updateQueue.schedule(equalizeTeamBoxWidths);
    }
  }

  // Initialize display with initial data
  function initializeDisplay() {
    if (!isWSReady()) {
      logger.warn('WebSocket not ready during initialization, retrying...');
      setTimeout(initializeDisplay, TIMING.wsWaitMs);
      return;
    }
    
    try {
      loadingTracker.startLoading();
      
      // Initialize team data
      for (let teamNum = 1; teamNum <= RULES.numTeams; teamNum++) {
        const altName = trimValue(safeGetState(`ScoreBoard.CurrentGame.Team(${teamNum}).AlternateName(whiteboard)`));
        const name = trimValue(safeGetState(`ScoreBoard.CurrentGame.Team(${teamNum}).Name`));
        const total = safeGetState(`ScoreBoard.CurrentGame.Team(${teamNum}).TotalPenalties`, '0');
        const score = safeGetState(`ScoreBoard.CurrentGame.Team(${teamNum}).Score`, '0');
        
        // Set team name, or default name after delay
        if (altName || name) {
          $elements[`team${teamNum}`].name.text(altName || name);
          appState.flags.teamNameSet[teamNum] = true;
        } else {
          setTimeout(() => setDefaultTeamNameIfNeeded(teamNum), TIMING.defaultNameDelayMs);
        }
        
        $elements[`team${teamNum}`].score.text(score);
        $elements[`team${teamNum}`].total.text(total);
        
        updateTeamColors(teamNum);
        updatePenalties(teamNum);
        
        // Mark basic team data as received for this team
        loadingTracker.markReceived('teamsBasicData');
      }

      updateTournamentName();
      updateClock();
      updateGameState();
      checkAndDisplayLogos();
      equalizeTeamBoxWidths();

    } catch(error) {
      logger.error('Error during initialization:', error);
      setTimeout(initializeDisplay, TIMING.wsWaitMs * 2);
    }
  }

  // Initialize WebSocket listeners
  function init() {
    if (!isWSReady()) {
      logger.debug('Waiting for WebSocket...');
      setTimeout(init, TIMING.wsWaitMs);
      return;
    }
    
    try {
      WS.Connect();
      WS.AutoRegister();

      // Register cleanup handler
      registerCleanupHandler();

      // Register all team data with wildcards (using safe wrapper)
      registerHandler(['ScoreBoard.CurrentGame.Team(*)'], handleTeamUpdate);
      registerHandler(['ScoreBoard.CurrentGame.Team(*).Skater(*)'], handleSkaterUpdate);
      registerHandler(['ScoreBoard.CurrentGame.Team(*).Skater(*).Penalty(*)'], handlePenaltyUpdate);

      // Register for expulsion updates
      registerHandler(['ScoreBoard.CurrentGame.Expulsion(*)'], handleExpulsionUpdate);

      // Clock and game state
      registerHandler(['ScoreBoard.CurrentGame.Clock(*)'], debounce(updateClock, TIMING.debounceClockMs));
      registerHandler(['ScoreBoard.CurrentGame'], updateGameState);
      registerHandler(['ScoreBoard.CurrentGame.OfficialScore'], updateGameState);

      // Intermission label settings
      registerHandler(['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.PreGame)'], updateGameState);
      registerHandler(['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Intermission)'], updateGameState);
      registerHandler(['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Unofficial)'], updateGameState);
      registerHandler(['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Official)'], updateGameState);

      // Tournament info
      registerHandler(['ScoreBoard.CurrentGame.EventInfo(Tournament)'], updateTournamentName);
      registerHandler(['ScoreBoard.CurrentGame.EventInfo(GameNo)'], updateTournamentName);

      // Event info for start time checking
      registerHandler(['ScoreBoard.CurrentGame.EventInfo(Date)'], updateGameState);
      registerHandler(['ScoreBoard.CurrentGame.EventInfo(StartTime)'], updateGameState);

      loadCustomLogo();
      setTimeout(initializeDisplay, TIMING.initDelayMs);
      
      logger.debug('Penalties overlay initialization started');
      
    } catch(error) {
      logger.error('Failed to initialize overlay:', error);
      // Retry after delay
      setTimeout(init, TIMING.wsWaitMs * 5);
    }
  }

  // Wait for WebSocket to finish loading
  function waitForWS() {
    if (typeof WS === 'undefined') {
      setTimeout(waitForWS, TIMING.wsWaitMs);
      return;
    }
    init();
  }

  // Set configurable HTML text values from config variables
  function setConfigurableText() {
    // Set the loading overlay text
    $('.loading-text').text(CONFIG.loadingOverlayText);
    
    // Set the penalties title text
    $('#penalties-title h1').text(CONFIG.penaltiesTitleText);
  }

  // Initialize configurable HTML text and start the application
  setConfigurableText();
  waitForWS();
});