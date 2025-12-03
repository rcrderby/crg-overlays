// JavaScript for amph.js

(function() {
  'use strict';

  /******************
  ** Configuration **
  ******************/

  const AMPH_CONFIG = {
    enabled: false,

    // Amph image paths 
    amphs: [
      'amph/amphs/amph-1.png',
      'amph/amphs/amph-2.png',
      'amph/amphs/amph-3.png'
    ],

    // Time between amph appearances (ms)
    amphInterval: 20000,

    // DOM selectors
    containerSelector: '#amph-container',
    imageSelector: '#amph-image'
  };

  /******************
  ** Module state **
  ******************/

  let animating = false;
  let scheduledTimeout = null;
  let validAmphs = [];

  /*********************
  ** Helper Functions **
  *********************/

  function warn(message) {
    console.warn('[Amph]', message);
  }

  function getAnimationDuration() {
    const duration = parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--amph-animation-duration')
    );
    return duration || 3000;
  }

  /****************
  ** CSS Loading **
  *****************/

  function loadCSS() {
    const link = document.createElement('link');
    link.href = 'amph/amph.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }

  /******************
  ** Image Preload **
  ******************/

  function preloadImages(callback) {
    if (!AMPH_CONFIG.amphs || AMPH_CONFIG.amphs.length === 0) {
      callback([]);
      return;
    }

    const promises = AMPH_CONFIG.amphs.map(path => {
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve({ path: path, valid: true });
        img.onerror = () => {
          warn(`Failed to load: ${path}.`);
          resolve({ path: path, valid: false });
        };
        img.src = path;
      });
    });

    Promise.all(promises).then(results => {
      callback(results.filter(a => a.valid));
    });
  }

  /********************
  ** ANIMATION LOGIC **
  ********************/

  function showAmph() {
    // Skip if already animating or no valid amphs
    if (animating || validAmphs.length === 0) {
      return;
    }

    try {
      // Get DOM elements
      const $container = $(AMPH_CONFIG.containerSelector);
      const $image = $(AMPH_CONFIG.imageSelector);

      // Exit if elements don't exist
      if ($container.length === 0 || $image.length === 0) {
        warn('DOM elements not found.');
        return;
      }

      // Pick random amph
      const amph = validAmphs[Math.floor(Math.random() * validAmphs.length)];
      
      // Set image and animation class
      $image.attr('src', amph.path);
      $container.removeClass('peek');
      $container.addClass('peek');

      animating = true;

      // Clean up after animation (match CSS animation duration)
      const animationDuration = getAnimationDuration();
      
      setTimeout(() => {
        $container.removeClass('peek');
        animating = false;
        scheduleNext();
      }, animationDuration);

    } catch (error) {
      warn(`Error showing amph: ${error.message}`);
      animating = false;
      scheduleNext();
    }
  }

  function scheduleNext() {
    if (scheduledTimeout) {
      clearTimeout(scheduledTimeout);
    }

    const interval = Math.max(1000, AMPH_CONFIG.amphInterval);
    scheduledTimeout = setTimeout(showAmph, interval);
  }

  /********************
  ** Initialization **
  ********************/

  function init() {
    // Exit if disabled
    if (!AMPH_CONFIG.enabled) {
      return;
    }

    // Check jQuery
    if (typeof $ === 'undefined') {
      warn('jQuery not found - cannot initialize.');
      return;
    }

    console.log('Amph enabled.');

    // Load CSS
    loadCSS();

    // Preload images
    preloadImages(valid => {
      validAmphs = valid;

      if (validAmphs.length === 0) {
        warn('No valid amph images found - disabled.');
        return;
      }

      scheduleNext();
    });
  }

  // Auto-initialize when the document is ready
  $(function() {
    setTimeout(init, 100);
  });

})();