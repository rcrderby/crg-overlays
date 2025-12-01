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
    enabled: false
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
    gameInfoPaddingWithLogo: 70,

    // Game info box side padding without optional banner logo
    gameInfoPaddingWithoutLogo: 25,

    // Default roster shadow properties
    defaultRosterShadowProperties: '.5px .5px 1px',

    // Loading overlay text
    loadingOverlayText: 'Loading game data...',

    // Title banner background color
    titleBannerBackgroundColor: '#666666',
  
    // Title banner text/foreground color
    titleBannerForegroundColor: '#ffffff',

    // Title banner shadow visibility
    titleBannerShadow: true,

    // Overall overlay scale (percentage: 100 = full size, 90 = 90% size, etc.)
    overlayScale: 100,

    // Penalties title text
    penaltiesTitleText: 'PENALTIES'
  },

  /****************
  ** CSS Classes **
  ****************/

  classes: {
    textShadow: 'var(--team-penalties-default-text-shadow)'
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

    // Prefix used for default period label
    defaultPeriodLabelPrefix: 'Period',

    // Text displayed for expelled skaters
    expelledDisplay: 'EXP',

    // Text displayed for fouled out skaters
    fouloutDisplay: 'FO',

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
    },

    // Timeout owner indicators
    timeoutOwner: {
      official: 'O',
      team1: '_1',
      team2: '_2'
    }
  },

  /*******************
  ** Rules Settings **
  *******************/

 rules: {
    // Number of penalties that result in a foulout
    fouloutPenaltyCount: 7,

    // Override a custom number of periods
    numPeriods: 2,

    // Override a custom number of teams
    numTeams: 2,

    // Penalty count that triggers the first warning color
    warningPenaltyCount5: 5,

    // Penalty count that triggers second warning color
    warningPenaltyCount6: 6
  },

  /***********************
  ** Penalties Settings **
  ***********************/

  penalties: {
    // Penalty codes for fouled out players
    fouloutCode: 'FO',
  
    // Penalty code for players removed by the head referee
    removedCode: 'RE'
  },

  /********************
  ** Timing Settings **
  ********************/

  timing: {

    // Delay before initializing display after WebSocket connects (ms)
    initWebSocket: 100,

    // Minimum time to show loading screen (ms)
    minLoadDisplayMs: 500,
  }
};