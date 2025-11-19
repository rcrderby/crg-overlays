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

// Create a global namespace for variables
window.AppConfig = window.AppConfig || {};

// Global variables
window.AppConfig.PenaltiesOverlayConfig = {

  /********************
  ** Debug Settings **
  ********************/

  debug: {
    // Enable debug logging to browser console (set to "true" for troubleshooting)
    enabled: true
  },

  /***************************
  ** Configuration Settings **
  ***************************/

  config: {
    // Path to an optional custom logo in the game information section
    // Set to null or empty string to disable
    bannerLogoPath: 'logos/banner-logo.png',

    // Skater flags to filter from roster display (Not Skating, Bench Alt Captain, Bench Staff)
    filteredSkaterFlags: ['ALT', 'B', 'BA'],

    // Game info box side padding with optional banner logo
    gameInfoPaddingWithLogo: 180,

    // Game info box side padding without optional banner logo
    gameInfoPaddingWithoutLogo: 90,

    // Default roster shadow properties
    defaultRosterShadowProperties: '.5px .5px 1px',

    // Loading overlay text
    loadingOverlayText: 'Loading game data...',

    // Penalties title text
    penaltiesTitleText: 'PENALTIES',

    // Buffer pixels to prevent team name overflow
    teamNameOverflowBufferPixels: 1
  },

  /********************
  ** Labels Settings **
  ********************/

  labels: {
    // Character displayed next to alternate captain names
    altCaptainFlag: 'A',

    // Character displayed next to team captain names
    captainFlag: 'C',    

    // Prefix used for default team names
    defaultTeamNamePrefix: 'Team ',

    // Text displayed for expelled skaters
    expelledDisplay: 'EXP',

    // Text displayed for fouled out skaters
    fouloutDisplay: 'FO',

    // Default/fallback intermission labels
    intermission: {
      preGame: 'Time to Derby',
      intermission: 'Intermission',
      unofficial: 'Unofficial Score',
      official: 'Final Score',
      overtime: 'Overtime',
      comingUp: 'Coming Up'
    },

    // Label shown before P1 when IGRF start time is missing or in the past
    preFirstPeriodLabel: 'Period 1',

    // Text displayed for removed skaters
    removedDisplay: 'RE',

    // Timeout indicator labels
    timeout: {
      untyped: 'Timeout',
      official: 'Official Timeout',
      team: 'Team Timeout',
      review: 'Official Review'
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

  penalties: {
    // Penalty codes to filter from each player's list of penalties
    filteredCodes: ['FO', 'RE'],
  
    // Penalty code for player's removed by the head referee
    removedCode: 'RE'
  },

  /********************
  ** Timing Settings **
  ********************/

  timing: {

    // Delay before initializing display after WebSocket connects (ms)
    initWebSocket: 100,
  }
};