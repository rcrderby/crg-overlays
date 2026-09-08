/****************************************
 ** Penalties Overlay Admin Page Logic **
 ***************************************/

// The overlay's configuration file, which holds the defaults and allowed ranges
const PenaltiesOverlayConfig = window.AppConfig?.PenaltiesOverlayConfig;

if (!PenaltiesOverlayConfig) {
  console.error('ERROR: config.js did not load.');
  console.error('index.html must include: <script src="../config.js"></script>');
  console.error('before the <script> tag that imports core.js.');
  throw new Error('Configuration file (config.js) failed to load');
}

const CONFIG = PenaltiesOverlayConfig.config;
const VALIDATION = PenaltiesOverlayConfig.validation;

// CRG stores every setting as a string under one prefix
const SETTING_CHANNEL_PREFIX = 'ScoreBoard.Settings.Setting(Penalties.Overlay.';

// The scoreboard channel a setting is stored in
function settingChannel(name) {
  return `${SETTING_CHANNEL_PREFIX}${name})`;
}

// CRG covers a page with its loading screen until a registered channel sends a value
// A setting the scoreboard does not hold sends no value, so the page registers a known channel
const READY_CHANNEL = 'ScoreBoard.Version(release)';

// Every setting the page writes, and where the overlay reads each from config.js
// 'config' holds the value, and validation holds the allowed range and the last resort default
const SETTINGS = {
  Anchor: { config: 'overlayAnchor', validation: 'anchor' },
  BackgroundAnimation: { config: 'backgroundAnimation', validation: 'backgroundAnimation' },
  Font: { config: 'overlayFont', validation: 'font' },
  Opacity: { config: 'overlayOpacity', validation: 'opacity' },
  PenaltyCodeKey: { config: 'penaltyCodeKey', validation: 'penaltyCodeKey' },
  Scale: { config: 'overlayScale', validation: 'scale' },
  TimeoutAnimation: { config: 'timeoutAnimation', validation: 'timeoutAnimation' },
  TitleText: { config: 'titleBannerText', validation: 'title' },
  TitleVisible: { config: 'titleBannerVisible', validation: 'titleVisible' },
  Width: { config: 'overlayWidth', validation: 'width' }
};

// The functions that show each control its value, for the first paint
const painters = [];

// The value the overlay is showing: the scoreboard setting, then config.js, then the default
function settingValue(name) {
  const setting = SETTINGS[name];
  const value = [WS.state[settingChannel(name)], CONFIG[setting.config], VALIDATION[setting.validation].default].find(
    (candidate) => candidate !== undefined && candidate !== null && String(candidate).trim() !== ''
  );

  return String(value).trim();
}

// Show every control the value the overlay is showing
function paintControls() {
  painters.forEach(function (paint) {
    paint();
  });
}

/***********************
 ** Choice Selections **
 **********************/

// Buttons that write one fixed value, rather than a field to type into
function registerChoices() {
  $('.setting-choices').each(function () {
    const group = $(this);
    const name = group.data('setting');
    const channel = settingChannel(name);

    group.find('.setting-choice').on('click', function () {
      // A data attribute of 'true' reads back as a boolean
      const chosen = String($(this).data('value'));

      // A switch reports the value it would set, so clicking it again clears it
      const isSwitch = $(this).hasClass('setting-switch');

      WS.Set(channel, isSwitch && settingValue(name) === chosen ? 'false' : chosen);
    });

    // Show which value is in effect, including the default when nothing is set
    const paint = paintChoices(group, name);

    painters.push(paint);
    WS.Register([channel], paint);
  });
}

// Mark the button holding the value the overlay is showing
function paintChoices(group, name) {
  return function () {
    const value = settingValue(name);

    group.find('.setting-choice').each(function () {
      const button = $(this);

      button.toggleClass('selected', String(button.data('value')) === value);
    });
  };
}

/************
 ** Fields **
 ***********/

// Bind the sliders, number boxes and the title field
// CRG's own binding leaves a field empty until a setting exists, so the page binds them
function registerFields() {
  $('input[data-setting]').each(function () {
    const field = $(this);
    const name = field.data('setting');
    const channel = settingChannel(name);
    const limits = VALIDATION[SETTINGS[name].validation];

    // A range lives in the configuration file, so it is set in one place
    if (limits.min !== undefined) {
      field.attr({ min: limits.min, max: limits.max });
    }

    // Commit text as it is typed, and a slider value when the operator lets go
    field.on(field.attr('type') === 'text' ? 'input' : 'change', function () {
      WS.Set(channel, isTickBox(field) ? String(tickBoxValue(field)) : String(field.val()));
    });

    const paint = paintField(field, name);

    // Repaint on blur, so an empty field shows the value the overlay falls back to
    field.on('blur', paint);

    painters.push(paint);
    WS.Register([channel], paint);
  });
}

// Determine if the field is a tick box
function isTickBox(field) {
  return field.attr('type') === 'checkbox';
}

// The value a tick box stores, inverted for the title's Hide box
function tickBoxValue(field) {
  const ticked = field.prop('checked');

  return field.data('invert') ? !ticked : ticked;
}

// Show the value the overlay is showing, unless the operator is in the field
function paintField(field, name) {
  return function () {
    if (field.is(':focus')) {
      return;
    }

    if (isTickBox(field)) {
      const on = settingValue(name) === 'true';

      field.prop('checked', field.data('invert') ? !on : on);

      return;
    }

    field.val(settingValue(name));
  };
}

/*************************
 ** Live Slider Preview **
 ************************/

// A slider commits on release, so the preview follows the drag itself
function registerSliderPreview() {
  $('input[type=range][data-preview]').on('input', function () {
    const slider = $(this);
    const property = slider.data('preview');
    const value = slider.data('preview-ratio')
      ? Number(slider.val()) / 100
      : `${slider.val()}${slider.data('preview-unit') || ''}`;

    // Mirror the number box beside it, which CRG updates only on release
    slider.closest('.setting-row').find('input[type=number]').val(slider.val());

    const overlay = previewDocument();
    if (overlay) {
      overlay.documentElement.style.setProperty(property, value);
    }
  });
}

// The preview document, or null before the overlay has loaded
function previewDocument() {
  const frame = document.getElementById('preview-overlay');

  return frame && frame.contentDocument ? frame.contentDocument : null;
}

/**********************
 ** Preview Backdrop **
 *********************/

// Switch the preview backdrop when a button is clicked
function registerBackdrops() {
  const stage = $('#preview-stage');
  const buttons = $('.preview-backdrop');

  buttons.on('click', function () {
    const chosen = String($(this).data('backdrop'));

    stage.attr('data-backdrop', chosen);
    buttons.each(function () {
      const button = $(this);

      button.toggleClass('selected', String(button.data('backdrop')) === chosen);
    });
  });
}

/*********************
 ** Preview Scaling **
 ********************/

// The overlay renders at 1920x1080, then scales to fill available space
function scalePreview() {
  const stage = document.getElementById('preview-stage');
  const frame = document.getElementById('preview-overlay');

  if (!stage || !frame) {
    return;
  }

  frame.style.transform = `scale(${stage.clientWidth / 1920})`;
}

/******************
 ** Page Actions **
 *****************/

// The URL a streaming team points a browser source at
function overlayUrl() {
  return new URL('../', window.location.href).href.replace(/\/$/, '');
}

function registerActions() {
  const url = overlayUrl();

  $('#copy-url')
    .attr('title', url)
    .on('click', function () {
      const button = $(this);

      copyText(url).then(function (copied) {
        button.text(copied ? 'Copied' : url);
        setTimeout(function () {
          button.text('Copy overlay URL');
        }, 2000);
      });
    });

  $('#reset-settings').on('click', function () {
    Object.keys(SETTINGS).forEach(function (name) {
      WS.Set(settingChannel(name), '');
    });
  });
}

// Fall back to a selection the operator can copy when the clipboard API is unavailable
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => false
    );
  }

  const field = $('<input>').val(text).css({ left: '-9999px', position: 'fixed' }).appendTo('body');

  field.trigger('select');
  const copied = document.execCommand ? document.execCommand('copy') : false;
  field.remove();

  return Promise.resolve(copied);
}

/********************************
 ** Application Initialization **
 *******************************/

$(function () {
  WS.Register([READY_CHANNEL]);
  registerChoices();
  registerFields();
  registerSliderPreview();
  registerBackdrops();
  registerActions();

  // Controls start on the values the overlay is showing
  paintControls();

  scalePreview();
  $(window).on('resize', scalePreview);
  $('#preview-overlay').on('load', scalePreview);

  console.log('Penalties Overlay settings ready.');
});
