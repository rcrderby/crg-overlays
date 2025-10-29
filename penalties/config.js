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
  }

  /*********************
  ** Display Settings **
  *********************/

  // TODO

  /********************
  ** Labels Settings **
  ********************/

  // TODO

  /*******************
  ** Rules Settings **
  *******************/

  // TODO

  /***********************
  ** Penalties Settings **
  ***********************/

  // TODO

};