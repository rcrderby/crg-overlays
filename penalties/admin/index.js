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

// Sections the admin page reads
const REQUIRED_SECTIONS = ['config', 'storage', 'timing', 'validation'];
const missingSections = REQUIRED_SECTIONS.filter((section) => !PenaltiesOverlayConfig[section]);

if (missingSections.length > 0) {
  const errorMsg = `Configuration file (config.js) is missing required sections: ${missingSections.join(', ')}`;

  console.error('ERROR:', errorMsg);
  throw new Error(errorMsg);
}

const CONFIG = PenaltiesOverlayConfig.config;
const STORAGE = PenaltiesOverlayConfig.storage;
const TIMING = PenaltiesOverlayConfig.timing;
const VALIDATION = PenaltiesOverlayConfig.validation;

// CRG stores every setting as a string under one prefix
const SETTING_CHANNEL_PREFIX = STORAGE.settingChannelPrefix;

// The scoreboard channel a setting is stored in
function settingChannel(name) {
  return `${SETTING_CHANNEL_PREFIX}${name})`;
}

// Fields CRG holds beneath a team, which an unset override falls back to
const TEAM_CHANNELS = STORAGE.teamChannels;

// The scoreboard channel holding one of a team's fields
function teamChannel(teamNumber, field) {
  return `${STORAGE.teamChannelPrefix}${teamNumber}).${field}`;
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
  Height: { config: 'overlayHeight', validation: 'height' },
  Opacity: { config: 'overlayOpacity', validation: 'opacity' },
  PenaltyCodeKey: { config: 'penaltyCodeKey', validation: 'penaltyCodeKey' },
  RosterTextScaling: { config: 'rosterTextScaling', validation: 'rosterTextScaling' },
  Scale: { config: 'overlayScale', validation: 'scale' },
  Team1BackgroundColor: { config: 'team1BackgroundColor', validation: 'teamColor' },
  Team1ColorOverride: { config: 'team1ColorOverride', validation: 'teamColorOverride' },
  Team1GlowColor: { config: 'team1GlowColor', validation: 'teamColor' },
  Team1Name: { config: 'team1Name', validation: 'teamName' },
  Team1NameOverride: { config: 'team1NameOverride', validation: 'teamNameOverride' },
  Team1TextColor: { config: 'team1TextColor', validation: 'teamColor' },
  Team2BackgroundColor: { config: 'team2BackgroundColor', validation: 'teamColor' },
  Team2ColorOverride: { config: 'team2ColorOverride', validation: 'teamColorOverride' },
  Team2GlowColor: { config: 'team2GlowColor', validation: 'teamColor' },
  Team2Name: { config: 'team2Name', validation: 'teamName' },
  Team2NameOverride: { config: 'team2NameOverride', validation: 'teamNameOverride' },
  Team2TextColor: { config: 'team2TextColor', validation: 'teamColor' },
  TeamLogos: { config: 'teamLogos', validation: 'teamLogos' },
  TimeoutAnimation: { config: 'timeoutAnimation', validation: 'timeoutAnimation' },
  TitleText: { config: 'titleBannerText', validation: 'title' },
  TitleVisible: { config: 'titleBannerVisible', validation: 'titleVisible' },
  Width: { config: 'overlayWidth', validation: 'width' }
};

// Each color picker's switch and the CRG color behind it
const TEAM_COLOR_FIELDS = {
  Team1BackgroundColor: { override: 'Team1ColorOverride', crg: teamChannel(1, TEAM_CHANNELS.background) },
  Team1GlowColor: { override: 'Team1ColorOverride', crg: teamChannel(1, TEAM_CHANNELS.glow) },
  Team1TextColor: { override: 'Team1ColorOverride', crg: teamChannel(1, TEAM_CHANNELS.text) },
  Team2BackgroundColor: { override: 'Team2ColorOverride', crg: teamChannel(2, TEAM_CHANNELS.background) },
  Team2GlowColor: { override: 'Team2ColorOverride', crg: teamChannel(2, TEAM_CHANNELS.glow) },
  Team2TextColor: { override: 'Team2ColorOverride', crg: teamChannel(2, TEAM_CHANNELS.text) }
};

// Each name field's switch and the names CRG sends behind it, in the order the overlay reads them
const TEAM_NAME_FIELDS = {
  Team1Name: {
    override: 'Team1NameOverride',
    crg: [teamChannel(1, TEAM_CHANNELS.alternateName), teamChannel(1, TEAM_CHANNELS.name)]
  },
  Team2Name: {
    override: 'Team2NameOverride',
    crg: [teamChannel(2, TEAM_CHANNELS.alternateName), teamChannel(2, TEAM_CHANNELS.name)]
  }
};

// The switch a team control waits on, or nothing for a control that has none
function overrideSwitch(name) {
  return (TEAM_COLOR_FIELDS[name] ?? TEAM_NAME_FIELDS[name])?.override;
}

// Whether a team control's switch is on, and a control with no switch always is
function overrideOn(name) {
  const override = overrideSwitch(name);

  return override === undefined || settingValue(override) === 'true';
}

// The functions that show each control its value, for the first paint
const painters = [];

// The value the overlay is showing: the scoreboard setting, then config.js, then the default
function settingValue(name) {
  const setting = SETTINGS[name];
  const value = [WS.state[settingChannel(name)], CONFIG[setting.config], VALIDATION[setting.validation].default].find(
    (candidate) => candidate !== undefined && candidate !== null && String(candidate).trim() !== ''
  );

  // Every candidate can be blank, which reads as no value rather than "undefined"
  return value === undefined ? '' : String(value).trim();
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
      const chosen = String(button.data('value')) === value;

      button.toggleClass('selected', chosen);

      // A switch carries its own state, which the class it is drawn from does not report
      if (button.hasClass('setting-switch')) {
        button.attr('aria-checked', String(chosen));
      }
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
    const picker = TEAM_COLOR_FIELDS[name] !== undefined;

    // A range lives in the configuration file, so it is set in one place
    if (limits.min !== undefined) {
      field.attr({ min: limits.min, max: limits.max });
    }

    const commit = function () {
      const value = committedValue(field, name);

      WS.Set(channel, value);

      // Show what was stored, which a number box may have held to its range
      if (field.attr('type') === 'number') {
        field.val(value === '' ? settingValue(name) : value);
      }
    };

    // Commit text as it is typed, a color as it is chosen, and a slider value when the operator lets go
    // A picker reports a color to 'input' and closes without a 'change', so a color
    // waiting on 'change' is lost the moment the operator clicks away
    const live = picker || field.attr('type') === 'text';

    field.on(live ? 'input' : 'change', picker ? onceChosen(commit) : commit);

    const paint = paintField(field, name);

    // Repaint on blur, so an empty field shows the value the overlay falls back to
    // A picker holds a color at all times, and repainting one undoes a pick that has not been stored yet
    if (!picker) {
      field.on('blur', paint);
    }

    painters.push(paint);
    WS.Register(watchedChannels(name), paint);
  });
}

// A team control follows the switch that gates it and the CRG value behind it
function watchedChannels(name) {
  const color = TEAM_COLOR_FIELDS[name];

  if (color) {
    return [settingChannel(name), settingChannel(color.override), color.crg];
  }

  const team = TEAM_NAME_FIELDS[name];

  if (team) {
    return [settingChannel(name), settingChannel(team.override), ...team.crg];
  }

  return [settingChannel(name)];
}

// The name CRG is sending for a team, which stands behind an empty name field
function crgTeamName(name) {
  return TEAM_NAME_FIELDS[name].crg.map((channel) => WS.state[channel]).find((value) => value) ?? '';
}

// A drag through a picker reports every color it crosses, so the write waits for the operator to settle on one
function onceChosen(commit) {
  let pending = null;

  return function () {
    clearTimeout(pending);
    pending = setTimeout(commit, TIMING.colorCommit);
  };
}

// The value a field stores, held to the range in the configuration file
// An empty number box clears the setting, which falls back to config.js
function committedValue(field, name) {
  const raw = String(field.val()).trim();
  const limits = VALIDATION[SETTINGS[name].validation];

  if (limits.min === undefined) {
    return raw;
  }

  const number = Number(raw);

  if (raw === '' || !Number.isFinite(number)) {
    return '';
  }

  return String(Math.min(Math.max(number, limits.min), limits.max));
}

// Show the value the overlay is showing, unless the operator is in the field
function paintField(field, name) {
  return function () {
    if (field.is(':focus')) {
      return;
    }

    // A team control shows what the overlay is showing, which is CRG's value while its switch is off
    const color = TEAM_COLOR_FIELDS[name];

    if (color) {
      field.val((overrideOn(name) && settingValue(name)) || WS.state[color.crg] || '');
      field.prop('disabled', !overrideOn(name));

      return;
    }

    // A name field stays empty until it overrides, and shows CRG's name behind it
    if (TEAM_NAME_FIELDS[name]) {
      field.attr('placeholder', crgTeamName(name));
      field.val(overrideOn(name) ? settingValue(name) : '');
      field.prop('disabled', !overrideOn(name));

      return;
    }

    field.val(settingValue(name));
  };
}

/**********************
 ** Default Buttons **
 *********************/

// A default button clears its setting, so the overlay falls back to CRG-supplied values
function registerDefaults() {
  $('.setting-default').each(function () {
    const button = $(this);
    const name = button.data('setting');
    const override = overrideSwitch(name);

    button.on('click', function () {
      WS.Set(settingChannel(name), '');
    });

    if (override === undefined) {
      return;
    }

    // A button follows the switch that gates the control beside it
    const paint = function () {
      button.prop('disabled', !overrideOn(name));
    };

    painters.push(paint);
    WS.Register([settingChannel(override)], paint);
  });
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

    // The overlay decides its own height and text size
    refitPreview();
  });
}

// The preview document, or null before the overlay has loaded
function previewDocument() {
  const frame = document.getElementById('preview-overlay');

  return frame && frame.contentDocument ? frame.contentDocument : null;
}

// The preview's own window, which carries the overlay's functions
function previewWindow() {
  const frame = document.getElementById('preview-overlay');

  return frame && frame.contentWindow ? frame.contentWindow : null;
}

// Run the overlay's fit inside the preview, so a slider drag previews in real time
function refitPreview() {
  const overlay = previewWindow();

  if (overlay && typeof overlay.fitRosterText === 'function') {
    overlay.fitRosterText();
  }
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

// The overlay renders at the size the stylesheet gives the frame, then scales to fill the panel
function scalePreview() {
  const stage = document.getElementById('preview-stage');
  const frame = document.getElementById('preview-overlay');

  // A transform leaves `offsetWidth` alone, so the frame reports the size it renders at
  if (!stage || !frame || !frame.offsetWidth) {
    return;
  }

  frame.style.transform = `scale(${stage.clientWidth / frame.offsetWidth})`;
}

/******************
 ** Page Actions **
 *****************/

// The URL a streaming team points a browser source at
function overlayUrl() {
  const address = new URL('../', window.location.href);

  return `http://${address.host}${address.pathname.replace(/\/$/, '')}`;
}

// Only report IPv4 CRG addresses
// Host names may resolve differently from one computer to the next
// IPv6 are surrounded with brackets
const IPV4_ADDRESS = /^\d{1,3}(\.\d{1,3}){3}$/;

function ipv4Host(line) {
  try {
    const address = new URL(line.trim());

    return IPV4_ADDRESS.test(address.hostname) ? address.host : '';
  } catch {
    return '';
  }
}

// URLs for every address the overlay listens on, plus the current URL
function overlayUrlChoices(reported) {
  const here = overlayUrl();

  // Take the path from the address above, so every choice is written the same way
  const path = here.slice(new URL(here).origin.length);
  const choices = [here];

  String(reported)
    .split('\n')
    .forEach(function (line) {
      const host = ipv4Host(line);

      if (host && !choices.some((choice) => new URL(choice).host === host)) {
        choices.push(`http://${host}${path}`);
      }
    });

  return choices;
}

// Addresses the overlay listens on, filled in once CRG reports them
let urlChoices = [];

// Ask CRG for the addresses it listens on, and offer them beside the current URL
function loadNetworkUrls() {
  return fetch(STORAGE.networkUrlsPath)
    .then((response) => (response.ok ? response.text() : ''))
    .catch(() => '')
    .then(showUrlChoices);
}

function setUrlListOpen(open) {
  $('#copy-url-list').toggleClass('open', open);
  $('#copy-url').attr('aria-expanded', String(open));
}

// List the addresses to choose between, and leave the list empty when there is no choice
function showUrlChoices(reported) {
  urlChoices = overlayUrlChoices(reported);

  const list = $('#copy-url-list');

  list.empty();
  setUrlListOpen(false);

  if (urlChoices.length < 2) {
    return;
  }

  urlChoices.forEach(function (url) {
    const option = $('<button>').addClass('copy-url-option').attr('type', 'button').text(url);

    option.on('click', function () {
      copyUrl(url);
      setUrlListOpen(false);
    });

    $('<li>').append(option).appendTo(list);
  });
}

// The label the markup gives the copy button, read before a reply covers it
let copyUrlLabel = '';

// The timer that puts the label back, so a second copy replaces the first reply
let copyUrlReply = null;

// Copy an address and report back on the button, which returns to its label
function copyUrl(url) {
  const button = $('#copy-url');

  return copyText(url).then(function (copied) {
    button.text(copied ? 'Copied' : url);

    clearTimeout(copyUrlReply);
    copyUrlReply = setTimeout(function () {
      button.text(copyUrlLabel);
    }, TIMING.copyReply);
  });
}

function registerActions() {
  const button = $('#copy-url');

  copyUrlLabel = button.text();

  button.attr('title', overlayUrl()).on('click', function () {
    // One address is this page's own, and there is nothing to choose between
    if (urlChoices.length < 2) {
      copyUrl(overlayUrl());

      return;
    }

    setUrlListOpen(!$('#copy-url-list').hasClass('open'));
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
  registerDefaults();
  registerSliderPreview();
  registerBackdrops();
  registerActions();
  paintControls();
  loadNetworkUrls();

  scalePreview();
  $(window).on('resize', scalePreview);
  $('#preview-overlay').on('load', scalePreview);

  console.log('Penalties Overlay settings ready.');
});
