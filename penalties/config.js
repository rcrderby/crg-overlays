/****************************************************************************
** Configuration file for Roller Derby Penalties Overlay
**
** This file contains all customizable settings for the overlay.
** 
** This file must load within index.html before it loads core.js or index.js:
** <script type="text/javascript" src="config.js"></script>
** <script type="text/javascript" src="/json/core.js"></script>
** <script type="text/javascript" src="index.js"></script>
****************************************************************************/

var PenaltiesOverlayConfig = {
  /********************
  ** Timing Settings **
  ********************/

  timing: {
    // Cache expiration time in milliseconds (30 seconds)
    cacheExpiryMs: 30000,

    // Debounce delay for clock updates in milliseconds
    debounceClockMs: 50,

    // Debounce delay for penalty updates during initialization
    debouncePenaltyInitMs: 300,
    
    // Debounce delay for penalty updates during normal operation
    debouncePenaltyNormalMs: 50,
    
    // Time to wait before marking initialization as complete
    initCompleteMs: 800,
    
    // Delay before setting default team names if no names provided
    defaultNameDelayMs: 500,
    
    // Polling interval to wait for WebSocket connection
    wsWaitMs: 100,
    
    // Delay before initializing display after WebSocket connects
    initDelayMs: 200
  },

  /*********************
  ** Display Settings **
  *********************/

  display: {
    // Path to an optional custom logo in the game information section
    // Set to null or empty string to disable
    bannerLogoPath: 'logos/banner-logo.png',
    
    // Buffer pixels to prevent team name overflow
    teamNameOverflowBufferPixels: 1
  },

  /********************
  ** Labels Settings **
  ********************/

  labels: {
    // Character displayed next to team captain names
    captainFlag: 'C',
    
    // Prefix used for default team names
    defaultTeamNamePrefix: 'Team ',
    
    // Text displayed for expelled skaters
    expelledDisplay: 'EXP',
    
    // Text displayed for fouled out skaters
    fouloutDisplay: 'FO',
    
    // Label shown before P1 when IGRF start time is missing or in the past
    preFirstPeriodLabel: 'Period 1',
    
    // Default/fallback intermission labels
    intermission: {
      preGame: 'Time to Derby',
      intermission: 'Intermission',
      unofficial: 'Unofficial Score',
      official: 'Final Score',
      overtime: 'Overtime',
      comingUp: 'Coming Up'
    }
  },

  /*******************
  ** Rules Settings **
  *******************/

  rules: {
    // Override any custom rules settings
    // Number of teams
    numTeams: 2,

    // Number of penalties that result in a foulout
    fouloutPenaltyCount: 7,
    
    // Penalty count that triggers the first warning color
    warningPenaltyCount5: 5,
    
    // Penalty count that triggers second warning color
    warningPenaltyCount6: 6
  },

  /***********************
  ** Penalties Settings **
  ***********************/

  // TODO

};