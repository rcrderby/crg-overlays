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
    // Enable debug logging to browser console (set to `true` for troubleshooting)
    enabled: false
  },

  /***************************
  ** Configuration Settings **
  ***************************/

  config: {
    // Path to an optional custom logo in the game information section
    bannerLogoPath: 'logos/banner-logo.png',

    // Skater flags to filter from roster display (Not Skating, Bench Alt Captain, Bench Staff)
    filteredSkaterFlags: ['ALT', 'B', 'BA'],

    // Default roster shadow properties
    defaultRosterShadowProperties: '.5px .5px 1px',

    // Text displayed on the "loading" screen
    loadingOverlayText: 'Loading game data...',

    // Title banner
    titleBannerText: 'PENALTIES',

    // Overlay scale size percentage: 100 fills the frame, 90 = 90% size, etc. (1 to 100)
    // The `scale` URL parameter overrides this value
    overlayScale: 100,

    // Font pairing: `saira`, `league-gothic`, `anton`, or `bricolage`
    // The `font` URL parameter overrides this value
    overlayFont: 'saira',

    // Point the overlay scales from: `top`, `center`, or `bottom`
    // The `anchor` URL parameter overrides this value
    overlayAnchor: 'top'
  },

  /****************
  ** CSS Classes **
  ****************/

  classes: {
    // CSS Selector for the custom logo container
    customLogoSelector: '#custom-logo',

    // CSS Selector for the custom logo space container
    customLogoSpaceSelector: '#custom-logo-space',

    // CSS Selector for the visible custom logo space container
    customLogoSpaceVisibleSelectorSuffix: 'visible',

    // CSS Selector for the loading overlay fade out
    loadingOverlayFadeOutSuffixSelector: 'fade-out',

    // CSS Selector for the loading overlay
    loadingOverlaySelector: '#loading-overlay',

    // CSS Selector for the loading overlay text
    loadingOverlayTextSelector: '.loading-text',

    // CSS Selector for the penalties title H1 text
    penaltiesTitleH1Selector: '#penalties-title h1',

    // CSS Selector for the team scores custom logo padding container
    teamsScoresHasLogoSelectorSuffix: 'has-logo',

    // CSS Selector for the team scores container
    teamsScoresSelector: '#teams-scores',

    // CSS Variable for text shadows
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
    defaultTeamNamePrefix: 'Team',

    // Prefix used for default period label
    defaultPeriodLabelPrefix: 'Period',

    // Text displayed for expelled skaters
    expelledDisplay: 'EXP',

    // Text displayed for fouled out skaters
    fouloutDisplay: 'FO',

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
    // Number of penalties before a foulout, based on the active ruleset, that trigger warning colors
    warningPenaltyOffsets: {
      // First warning color, two penalties before a foulout
      first: 2,

      // Second warning color, one penalty before a foulout
      second: 1
    }
  },

  /***********************
  ** Penalties Settings **
  ***********************/

  penalties: {
    // Penalty code for fouled out players
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

    // How often to check if the game rules arrived (ms)
    loadCheckInterval: 100,

    // Longest time to wait for the game rules before displaying anyway (ms)
    maxLoadWaitMs: 5000,

    // Minimum time to show loading screen (ms)
    minLoadDisplayMs: 500,
  }
};