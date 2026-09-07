/*******************************************
 ** Penalties Overlay Settings Page Logic **
 ******************************************/

// The overlay's configuration file, which holds the defaults and the allowed
// ranges this page presents
const PenaltiesOverlayConfig = window.AppConfig?.PenaltiesOverlayConfig;

if (!PenaltiesOverlayConfig) {
  console.error('ERROR: config.js did not load.');
  console.error('index.html must include: <script src="../config.js"></script>');
  console.error('before the <script> tag that imports core.js.');
  throw new Error('Configuration file (config.js) failed to load');
}

const CONFIG = PenaltiesOverlayConfig.config;
const VALIDATION = PenaltiesOverlayConfig.validation;

// CRG stores every setting as a string under one prefix, and pushes changes to
// each open overlay.  The overlay reads the same channels
const SETTING_CHANNEL_PREFIX = 'ScoreBoard.Settings.Setting(Penalties.Overlay.';

// The scoreboard channel a setting is stored in
function settingChannel(name) {
  return `${SETTING_CHANNEL_PREFIX}${name})`;
}

// CRG covers a page with its own loading screen until a channel it registered
// sends a value, and a setting the scoreboard does not hold sends nothing.  The
// page registers a channel the scoreboard always has, so that screen clears and
// CRG's own disconnection warning still works
const READY_CHANNEL = 'ScoreBoard.Version(release)';

// Every setting the page writes, and where the overlay reads it in the
// configuration file: `config` holds the value, `validation` the range and the
// last resort default
const SETTINGS = {
  Anchor: { config: 'overlayAnchor', validation: 'anchor' },
  BackgroundAnimation: { config: 'backgroundAnimation', validation: 'backgroundAnimation' },
  Font: { config: 'overlayFont', validation: 'font' },
  Opacity: { config: 'overlayOpacity', validation: 'opacity' },
  PenaltyCodeKey: { config: 'penaltyCodeKey', validation: 'penaltyCodeKey' },
  Scale: { config: 'overlayScale', validation: 'scale' },
  TimeoutAnimation: { config: 'timeoutAnimation', validation: 'timeoutAnimation' },
  TitleText: { config: 'titleBannerText', validation: 'title' },
  Width: { config: 'overlayWidth', validation: 'width' }
};

// The functions that show a control its value, so the page can paint them
// before the scoreboard has sent anything
const painters = [];

// The value the overlay is showing, which is the scoreboard setting, then the
// configured value, then the default, exactly as the overlay resolves it
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

// Sliders, number boxes and the title field.  CRG's own binding leaves a field
// empty until a setting exists, which would hide the value the overlay is
// showing, so the page binds these itself
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

    // The title text reaches the overlay as it is typed, while a slider waits
    // for the operator to let go
    field.on(field.attr('type') === 'text' ? 'input' : 'change', function () {
      WS.Set(channel, String(field.val()));
    });

    const paint = paintField(field, name);

    // An empty field reads as the value the overlay falls back to
    field.on('blur', paint);

    painters.push(paint);
    WS.Register([channel], paint);
  });
}

// Show the value the overlay is showing, unless the operator is typing in the
// field at the time
function paintField(field, name) {
  return function () {
    if (!field.is(':focus')) {
      field.val(settingValue(name));
    }
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

// The overlay is see-through, so a change in background opacity is invisible
// against the panel's own dark background.  This belongs to whoever is looking
// at the page, not to the overlay, so it never reaches the scoreboard
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

// The overlay renders at 1920x1080, then scales to whatever room the panel has
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

// The URL a streaming team points a browser source at, with no parameters, so
// nothing pins the source against the settings on this page
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

// CRG serves plain HTTP, where the clipboard API is unavailable, so fall back
// to a selection the operator can copy by hand
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

  // CRG sends nothing for a setting the scoreboard does not hold, so the
  // controls start on the values the overlay is showing
  paintControls();

  scalePreview();
  $(window).on('resize', scalePreview);
  $('#preview-overlay').on('load', scalePreview);

  console.log('Penalties Overlay settings ready.');
});
