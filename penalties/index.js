// CSS for custom penalties overlay - index.html
$(function() {
  'use strict';

  // Wait for WS to be loaded by core.js
  function waitForWS() {
    if (typeof WS === 'undefined') {
      setTimeout(waitForWS, 100);
      return;
    }
    init();
  }

  // Start initialization when WS is ready
  waitForWS();
});