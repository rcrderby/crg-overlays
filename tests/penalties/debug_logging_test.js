// What the overlay reports to the browser console while debug logging is on
// Each line names where a value was set, and is logged again only when it changes

import assert from 'node:assert/strict';
import { loadOverlay, readSource } from './support/overlay.js';
import {
  FOULOUT_RULE,
  PERIOD_RULE,
  overlaySetting,
  teamAlternateName,
  teamColorChannel,
  teamNameChannel
} from './support/channels.js';

const DEBUG_ON = '?debug=true';

// The configuration file with some of its values replaced
async function configWith(replacements) {
  let source = await readSource('penalties/config.js');

  for (const [from, to] of replacements) {
    assert.ok(source.includes(from), `config.js has no ${from}`);
    source = source.replace(from, to);
  }

  return source;
}

// One stored setting, as the scoreboard holds it
const stored = (name, value) => ({ [overlaySetting(name)]: String(value) });

// The key CRG hands a binding when a team path fires
const teamKey = (team) => ({ Team: String(team) });

// The lines logged on one subject
const linesAbout = (overlay, subject) => overlay.logs.filter((line) => line.startsWith(subject));

Deno.test('the overlay reports whether debug logging is on, and where that was set', async () => {
  const byDefault = await loadOverlay();
  const byUrl = await loadOverlay({ search: DEBUG_ON });
  const byConfig = await loadOverlay({ configSource: await configWith([['enabled: false', 'enabled: true']]) });

  assert.ok(byDefault.logs.includes('Debug logging off (from config.js).'));
  assert.ok(byUrl.logs.includes('Debug logging on (from URL parameter).'));
  assert.ok(byConfig.logs.includes('Debug logging on (from config.js).'));
});

Deno.test('the settings stay out of the console while debug logging is off', async () => {
  const overlay = await loadOverlay();
  const before = overlay.logs.length;

  overlay.applyOverlaySettings();
  overlay.window.getTeamNameWithDefault(teamKey(1));

  assert.equal(overlay.logs.length, before);
});

Deno.test('a setting is logged once, and again only when it changes', async () => {
  const overlay = await loadOverlay({ search: DEBUG_ON });

  overlay.applyOverlaySettings();

  const first = overlay.logs.length;

  assert.equal(linesAbout(overlay, 'Overlay width').length, 1);

  // The scoreboard sends every stored setting on its own, and each one applies them all again
  overlay.applyOverlaySettings();
  overlay.applyOverlaySettings();
  assert.equal(overlay.logs.length, first, 'applying the same settings again logs nothing');

  overlay.WS.state[overlaySetting('Width')] = '92';
  overlay.applyOverlaySettings();

  assert.deepEqual(overlay.logs.slice(first), ['Overlay width set to 92% of the video frame (from the admin page).']);
});

Deno.test('a setting whose value holds is logged again when its source changes', async () => {
  const overlay = await loadOverlay({ search: DEBUG_ON });

  overlay.setBackgroundAnimation();
  overlay.WS.state[overlaySetting('BackgroundAnimation')] = 'trace';
  overlay.setBackgroundAnimation();

  assert.deepEqual(linesAbout(overlay, 'Background animation'), [
    'Background animation set to trace (from config.js).',
    'Background animation set to trace (from the admin page).'
  ]);
});

Deno.test('the two animations log apart, though one function sets both', async () => {
  const overlay = await loadOverlay({ search: DEBUG_ON });

  overlay.setBackgroundAnimation();
  overlay.setTimeoutAnimation();
  overlay.setBackgroundAnimation();
  overlay.setTimeoutAnimation();

  assert.equal(linesAbout(overlay, 'Background animation').length, 1);
  assert.equal(linesAbout(overlay, 'Timeout animation').length, 1);
});

Deno.test('team colors are logged with where each one was set', async () => {
  const configSource = await configWith([
    ["team1BackgroundColor: ''", "team1BackgroundColor: '#ff0000'"],
    ['team1ColorOverride: false', 'team1ColorOverride: true']
  ]);
  const overlay = await loadOverlay({
    configSource,
    search: DEBUG_ON,
    state: { ...stored('Team1TextColor', '#00ff00'), [teamColorChannel(1, 'glow')]: '#ffffff' }
  });

  overlay.applyTeamColors();
  overlay.applyTeamColors();

  assert.deepEqual(linesAbout(overlay, 'Team 1 colors'), [
    'Team 1 colors set to background #ff0000 (from config.js), glow from CRG, ' +
      'text #00ff00 (from the admin page) - color override on (from config.js).'
  ]);
  assert.deepEqual(linesAbout(overlay, 'Team 2 colors'), [
    'Team 2 colors from CRG - color override off (from config.js).'
  ]);
});

// The admin page stores `false` when a switch is turned off, and that outranks the configuration file
Deno.test('a stored switch that outranks config.js is named in the log', async () => {
  const configSource = await configWith([
    ["team1BackgroundColor: ''", "team1BackgroundColor: '#ff0000'"],
    ['team1ColorOverride: false', 'team1ColorOverride: true']
  ]);
  const overlay = await loadOverlay({
    configSource,
    search: DEBUG_ON,
    state: stored('Team1ColorOverride', 'false')
  });

  overlay.applyTeamColors();

  assert.deepEqual(linesAbout(overlay, 'Team 1 colors'), [
    'Team 1 colors from CRG - color override off (from the admin page, which outranks true in config.js).'
  ]);

  // A stored switch that agrees with the configuration file outranks nothing
  overlay.WS.state[overlaySetting('Team1ColorOverride')] = 'true';
  overlay.applyTeamColors();

  assert.match(linesAbout(overlay, 'Team 1 colors')[1], /color override on \(from the admin page\)\.$/);
});

Deno.test('a team name is logged with the source that supplied it', async () => {
  const overlay = await loadOverlay({ search: DEBUG_ON });
  const name = () => overlay.window.getTeamNameWithDefault(teamKey(1));
  const last = () => linesAbout(overlay, 'Team 1 name').at(-1);
  const switchOff = ' - name override off (from config.js).';

  name();
  assert.equal(last(), `Team 1 name set to "Team 1" (from default)${switchOff}`);

  overlay.WS.state[teamNameChannel(1)] = 'Undead Avengers';
  name();
  assert.equal(last(), `Team 1 name set to "Undead Avengers" (from the CRG team name)${switchOff}`);

  overlay.WS.state[teamAlternateName(1)] = 'Avengers';
  name();
  assert.equal(last(), `Team 1 name set to "Avengers" (from the CRG whiteboard name)${switchOff}`);

  Object.assign(overlay.WS.state, stored('Team1Name', 'Home'), stored('Team1NameOverride', 'true'));
  name();
  assert.equal(last(), 'Team 1 name set to "Home" (from the admin page) - name override on (from the admin page).');

  // The binding repaints on every scoreboard update, and a name that holds says nothing more
  name();
  name();
  assert.equal(linesAbout(overlay, 'Team 1 name').length, 4);
});

Deno.test('a name override left blank reports the name CRG supplies', async () => {
  const overlay = await loadOverlay({
    search: DEBUG_ON,
    state: { ...stored('Team2NameOverride', 'true'), [teamNameChannel(2)]: 'Droids' }
  });

  overlay.window.getTeamNameWithDefault(teamKey(2));

  assert.deepEqual(linesAbout(overlay, 'Team 2 name'), [
    'Team 2 name set to "Droids" (from the CRG team name) - name override on (from the admin page).'
  ]);
});

Deno.test('the rules are logged as the ruleset supplies them', async () => {
  const overlay = await loadOverlay({ search: DEBUG_ON });

  overlay.registerGameRules();
  overlay.WS.Set(FOULOUT_RULE, 7);

  assert.deepEqual(linesAbout(overlay, 'Foul out count'), ['Foul out count set to 7 (from the CRG ruleset).']);
  assert.deepEqual(linesAbout(overlay, 'Period count'), [], 'a rule that has not arrived is not reported');

  overlay.WS.Set(PERIOD_RULE, 2);
  overlay.WS.Set(FOULOUT_RULE, 7);

  assert.deepEqual(linesAbout(overlay, 'Period count'), ['Period count set to 2 (from the CRG ruleset).']);
  assert.equal(linesAbout(overlay, 'Foul out count').length, 1, 'a rule that holds is not reported again');

  // A game moved to a ruleset with a different foul out count
  overlay.WS.Set(FOULOUT_RULE, 4);
  assert.equal(linesAbout(overlay, 'Foul out count').at(-1), 'Foul out count set to 4 (from the CRG ruleset).');
});

Deno.test('a rule the overlay cannot use is reported as one', async () => {
  const overlay = await loadOverlay({ search: DEBUG_ON });

  overlay.registerGameRules();
  overlay.WS.Set(FOULOUT_RULE, 'none');

  assert.deepEqual(linesAbout(overlay, 'Foul out count'), [
    'Foul out count "none" is not a usable count (from the CRG ruleset).'
  ]);
});
