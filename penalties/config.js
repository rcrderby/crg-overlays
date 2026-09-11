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
   *******************/

  debug: {
    // Enable debug logging to browser console (set to `true` for troubleshooting)
    enabled: false
  },

  /****************************
   ** Configuration Settings **
   ***************************/

  config: {
    // Path to an optional custom logo in the game information section
    bannerLogoPath: 'logos/banner-logo.png',

    // Skater flags to filter from roster display (Not Skating, Bench Alt Captain, Bench Staff)
    filteredSkaterFlags: ['ALT', 'B', 'BA'],

    // Default roster shadow properties
    defaultRosterShadowProperties: '0.5px 0.5px 1px',

    // Text displayed on the "loading" screen
    loadingOverlayText: 'Loading game data...',

    // Text displayed as the overlay title
    titleBannerText: 'PENALTIES',

    // Show the overlay title
    titleBannerVisible: true,

    // Background animation: `trace`, `organic`, `shine`, or `off`
    backgroundAnimation: 'trace',

    // Edge the overlay sits against and scales from: `top`, `center`, or `bottom`
    overlayAnchor: 'top',

    // Font pairing: `saira`, `league-gothic`, `anton`, or `bricolage`
    overlayFont: 'saira',

    // Overlay height percentage of the video frame
    // The `validation` section sets the allowed range
    overlayHeight: 100,

    // Overlay background opacity percentage: 100 is solid, 0 is invisible
    // The `validation` section sets the allowed range
    overlayOpacity: 98,

    // Overlay scale percentage: 100 = full scale, 90 = 90% scale, etc.
    // The `validation` section sets the allowed range
    overlayScale: 100,

    // Overlay width percentage of the video frame
    // The `validation` section sets the allowed range
    overlayWidth: 85,

    // Show a key of the active penalty codes below the rosters
    penaltyCodeKey: true,

    // Grow the roster text to fill the panel when a roster is short
    rosterTextScaling: true,

    // Names and colors that replace those supplied by CRG
    // Any blank value uses CRG values
    // Colors only apply when a team's override is set to `true`
    team1BackgroundColor: '',
    team1ColorOverride: false,
    team1GlowColor: '',
    team1Name: '',
    team1NameOverride: false,
    team1TextColor: '',
    team2BackgroundColor: '',
    team2ColorOverride: false,
    team2GlowColor: '',
    team2Name: '',
    team2NameOverride: false,
    team2TextColor: '',

    // Show the team logos CRG supplies
    teamLogos: true,

    // Timeout banner animation: `glow`, `pulse`, `shine`, or `off`
    timeoutAnimation: 'glow'
  },

  /*********************
   ** Setting Storage **
   ********************/

  storage: {
    // Channel prefix CRG stores the overlay's settings under
    settingChannelPrefix: 'ScoreBoard.Settings.Setting(Penalties.Overlay.',

    // Path CRG serves the addresses it answers on, one URL per line
    networkUrlsPath: '/urls',

    // Channel prefix CRG stores a team's game data under, completed with the team number
    teamChannelPrefix: 'ScoreBoard.CurrentGame.Team(',

    // Fields CRG holds beneath a team, named the way the overlay and the admin page use each
    // Every color here is also named in an index.html binding
    teamChannels: {
      alternateName: 'AlternateName(whiteboard)',
      background: 'Color(whiteboard.bg)',
      glow: 'Color(whiteboard.glow)',
      name: 'Name',
      text: 'Color(whiteboard.fg)'
    }
  },

  /************************
   ** Setting Validation **
   ***********************/

  // Allowed values and defaults for configuration settings
  validation: {
    // Point the overlay scales from
    anchor: { default: 'top' },

    // Background animation
    backgroundAnimation: { default: 'trace' },

    // Debug logging
    debug: { default: false },

    // Font pairing
    font: { default: 'saira' },

    // Overlay height percentage of the video frame
    height: { min: 50, max: 100, default: 100 },

    // Overlay background opacity percentage
    opacity: { min: 0, max: 100, default: 98 },

    // Penalty code key visibility
    penaltyCodeKey: { default: true },

    // Max penalty codes a roster row displays
    penaltyCodes: { max: 9 },

    // Max skaters a roster displays, which the panel is built to hold
    rosterRows: { max: 20 },

    // Largest roster text scale, held so nine penalty codes still fit their column
    // Measured against the narrowest column and the widest bundled body face
    rosterScale: { max: 1.18 },

    // Roster text scaling
    rosterTextScaling: { default: true },

    // Overlay scale percentage
    scale: { min: 1, max: 100, default: 100 },

    // Team color override, blank to use the CRG-supplied color
    teamColor: { default: '' },

    // Whether a team's colors below replace the CRG-supplied color
    teamColorOverride: { default: false },

    // Team logo visibility
    teamLogos: { default: true },

    // Team name override, blank to use the CRG-supplied name
    teamName: { default: '' },

    // Whether a team's name below replaces the CRG-supplied name
    teamNameOverride: { default: false },

    // Timeout banner animation
    timeoutAnimation: { default: 'glow' },

    // Title banner text
    title: { default: 'PENALTIES' },

    // Title banner visibility
    titleVisible: { default: true },

    // Overlay width percentage of the video frame
    width: { min: 70, max: 100, default: 85 }
  },

  /*****************
   ** CSS Classes **
   ****************/

  classes: {
    // CSS Selector for the custom logo container
    customLogoSelector: '#custom-logo',

    // CSS Selector for the loading overlay text
    loadingOverlayTextSelector: '.loading-text',

    // CSS Selector for the penalty code key items
    penaltyCodeKeyItemsSelector: '.code-key-items',

    // CSS Selector for a roster
    rosterSelector: '.roster',

    // CSS Selector for the roster column headings
    rosterHeadingsSelector: '.roster-headings',

    // CSS Selector for a roster line
    rosterLineSelector: '.roster-line',

    // CSS Selector for a roster line past the display limit
    rosterLineOverLimitSelector: '.over-limit',

    // CSS Selector for the team name heading above a roster
    teamHeadingSelector: '.team-heading',

    // CSS Selector for team 1's roster and penalties panel
    team1PanelSelector: '#team1-rosters-penalties',

    // CSS Selector for team 2's roster and penalties panel
    team2PanelSelector: '#team2-rosters-penalties',

    // CSS Selector for the penalties title H1 text
    penaltiesTitleH1Selector: '#penalties-title h1',

    // CSS Selector for the row the timeout banner grows into
    timeoutBannerRowSelector: '#timeout-banner-row'
  },

  /*******************
   ** State Classes **
   ******************/

  // Overlay features that mark a container with a state class, and the class each adds
  // Every pair needs a rule in index.css that joins the selector and the class
  toggles: {
    customLogo: { selector: '#custom-logo-space', class: 'visible' },
    loadingOverlay: { selector: '#loading-overlay', class: 'fade-out' },
    penaltyCodeKey: { selector: '#penalty-code-key', class: 'visible' },
    teamLogos: { selector: '#teams-container', class: 'logos-hidden' },
    teamsRow: { selector: '#teams-container', class: 'row-empty' },
    titleBanner: { selector: '#penalties-title', class: 'visible' }
  },

  /*********************
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

  /********************
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

  /************************
   ** Penalties Settings **
   ***********************/

  penalties: {
    // Penalty code for fouled out players
    fouloutCode: 'FO',

    // Penalty code for players removed by the head referee
    removedCode: 'RE',

    // Penalty code CRG uses when the code is not known
    unknownCode: '?'
  },

  /*********************
   ** Timing Settings **
   ********************/

  timing: {
    // Delay before storing a color once the picker stops moving (ms)
    colorCommit: 150,

    // Delay before initializing display after WebSocket connects (ms)
    initWebSocket: 100,

    // How often to check if the game rules arrived (ms)
    loadCheckInterval: 100,

    // Longest time to wait for the game rules before displaying anyway (ms)
    maxLoadWaitMs: 5000,

    // Minimum time to show loading screen (ms)
    minLoadDisplayMs: 500,

    // Delay before rebuilding the penalty code key after an update (ms)
    penaltyCodeKeyRebuild: 50,

    // Delay before refitting the roster text after an update (ms)
    rosterTextFit: 60
  }
};
