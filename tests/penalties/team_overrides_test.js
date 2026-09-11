// The team name and color overrides, which replace what CRG supplies
// A blank override, one a switch turns off, and an invalid one all fall back to CRG

import assert from 'node:assert/strict';
import { loadOverlay, readSource } from './support/overlay.js';
import { overlaySetting, teamAlternateName, teamColorChannel, teamNameChannel } from './support/channels.js';

// The colors CRG is sending for both teams, with no glow on team 2
const CRG_COLORS = {
  [teamColorChannel(1, 'bg')]: '#78cbca',
  [teamColorChannel(1, 'fg')]: '#000000',
  [teamColorChannel(1, 'glow')]: '#ffffff',
  [teamColorChannel(2, 'bg')]: '#be1f2f',
  [teamColorChannel(2, 'fg')]: '#ffffff',
  [teamColorChannel(2, 'glow')]: ''
};

// An overlay in a game CRG is sending colors for, plus whatever the admin page holds
function withOverrides(settings = {}, state = {}) {
  const stored = Object.fromEntries(
    Object.entries(settings).map(([name, value]) => [overlaySetting(name), String(value)])
  );

  return loadOverlay({ state: { ...CRG_COLORS, ...stored, ...state } });
}

// The key CRG hands a binding when a team path fires
const teamKey = (team) => ({ Team: String(team) });

Deno.test('a binding reads its team from a CRG path and from a setting', async () => {
  const { teamNumberFromKey } = await withOverrides();

  assert.equal(teamNumberFromKey(teamKey(2)), '2');
  assert.equal(teamNumberFromKey({ Setting: 'Penalties.Overlay.Team1BackgroundColor' }), '1');
  assert.equal(teamNumberFromKey({ Setting: 'Penalties.Overlay.TeamLogos' }), undefined);
  assert.equal(teamNumberFromKey(null), undefined);
});

Deno.test('nothing overrides until the operator sets something', async () => {
  const overlay = await withOverrides();

  assert.equal(overlay.teamColorOverridden(1), false);
  assert.equal(overlay.teamColorOverridden(2), false);
  assert.equal(overlay.teamColor(1, 'background'), '#78cbca');
  assert.equal(overlay.teamColor(2, 'glow'), '', 'CRG sends team 2 no glow');
  assert.deepEqual(overlay.warnings, [], 'an unset override is the normal state, not a problem');
});

Deno.test('a team shows the colors CRG supplies until its override is switched on', async () => {
  const off = await withOverrides({ Team1BackgroundColor: '#123456' });

  assert.equal(off.teamColor(1, 'background'), '#78cbca', 'a color on its own changes nothing');

  const on = await withOverrides({ Team1ColorOverride: 'true', Team1BackgroundColor: '#123456' });

  assert.equal(on.teamColor(1, 'background'), '#123456');
  assert.equal(on.teamColor(2, 'background'), '#be1f2f', 'the other team keeps its CRG colors');
});

Deno.test('each color overrides on its own, and the rest stay with CRG', async () => {
  const overlay = await withOverrides({ Team1ColorOverride: 'true', Team1TextColor: '#ff8800' });

  assert.equal(overlay.teamColor(1, 'text'), '#ff8800');
  assert.equal(overlay.teamColor(1, 'background'), '#78cbca');
  assert.equal(overlay.teamColor(1, 'glow'), '#ffffff');
});

Deno.test('a switch on with no colors set leaves the team as CRG sends it', async () => {
  const overlay = await withOverrides({ Team2ColorOverride: 'true' });

  assert.equal(overlay.teamColorOverridden(2), true);
  assert.equal(overlay.teamColor(2, 'background'), '#be1f2f');
  assert.equal(overlay.teamColor(2, 'text'), '#ffffff');
});

Deno.test('an invalid override falls back to CRG and reports itself once', async () => {
  const overlay = await withOverrides({ Team2ColorOverride: 'true', Team2TextColor: 'rebeccapurple' });

  assert.equal(overlay.teamColor(2, 'text'), '#ffffff');
  overlay.teamColor(2, 'text');

  const reported = overlay.warnings.filter((message) => message.includes('team 2 text color'));

  assert.equal(reported.length, 1, 'a repaint does not report it again');
  assert.match(reported[0], /must be a six digit hex color/);
});

Deno.test('a hex color is accepted in the length a color picker holds', async () => {
  const { isColor } = await withOverrides();

  for (const value of ['#aabbcc', '#AABBCC', ' #aabbcc ']) {
    assert.equal(isColor(value).value, value.trim().toLowerCase(), `${value} is a color`);
  }

  // A picker holds none of these, and replaces one with black rather than reporting it
  for (const value of ['#abc', '#abcd', '#aabbccdd', 'aabbcc', '#ab', '#abcde', 'red', '', '#gggggg']) {
    assert.equal('value' in isColor(value), false, `${value} is not a color`);
  }
});

Deno.test('the overlay writes each team the colors its panel shows', async () => {
  const overlay = await withOverrides({ Team1ColorOverride: 'true', Team1GlowColor: '#ff0000' });

  overlay.applyTeamColors();

  const team1 = overlay.teamProperties(1);
  const team2 = overlay.teamProperties(2);

  assert.equal(team1['--team-background-color'], '#78cbca');
  assert.equal(team1['--team-text-color'], '#000000');
  assert.equal(team1['--team-text-shadow'], `${overlay.CONFIG.defaultRosterShadowProperties} #ff0000`);

  assert.equal(team2['--team-background-color'], '#be1f2f');
  assert.equal(team2['--team-text-color'], '#ffffff');

  // A blank value has to come off the panel, or the stylesheet's own shadow never applies
  assert.equal('--team-text-shadow' in team2, false);
});

Deno.test('a color CRG stops sending comes back off the panel', async () => {
  const overlay = await withOverrides();

  overlay.applyTeamColors();
  assert.equal(overlay.teamProperties(1)['--team-background-color'], '#78cbca');

  overlay.WS.state[teamColorChannel(1, 'bg')] = '';
  overlay.applyTeamColors();

  assert.equal('--team-background-color' in overlay.teamProperties(1), false);
});

Deno.test('the overlay follows the whiteboard colors both teams send', async () => {
  const overlay = await withOverrides();

  overlay.registerTeamColors();

  assert.deepEqual(overlay.WS.registrations.at(-1).paths, [
    teamColorChannel(1, 'bg'),
    teamColorChannel(1, 'glow'),
    teamColorChannel(1, 'fg'),
    teamColorChannel(2, 'bg'),
    teamColorChannel(2, 'glow'),
    teamColorChannel(2, 'fg')
  ]);
});

Deno.test('a whiteboard color change repaints the panel', async () => {
  const overlay = await withOverrides();

  overlay.registerTeamColors();
  overlay.WS.Set(teamColorChannel(2, 'bg'), '#101010');

  assert.equal(overlay.teamProperties(2)['--team-background-color'], '#101010');
});

Deno.test('a team name falls through the override, the whiteboard, CRG and a default', async () => {
  const crgName = await withOverrides({}, { [teamNameChannel(1)]: 'Bad Apples' });

  assert.equal(crgName.window.getTeamNameWithDefault(teamKey(1)), 'Bad Apples');
  assert.equal(crgName.window.getTeamNameWithDefault(teamKey(2)), 'Team 2');

  const named = { [teamNameChannel(1)]: 'Bad Apples', [teamAlternateName(1)]: 'Whiteboard Name' };
  const whiteboard = await withOverrides({}, named);

  assert.equal(whiteboard.window.getTeamNameWithDefault(teamKey(1)), 'Whiteboard Name');

  const override = await withOverrides({ Team1NameOverride: 'true', Team1Name: 'Wheels of Justice' }, named);

  assert.equal(override.window.getTeamNameWithDefault(teamKey(1)), 'Wheels of Justice');
});

Deno.test('a team keeps the name CRG supplies until its name switch is on', async () => {
  const off = await withOverrides({ Team1Name: 'Wheels of Justice' }, { [teamNameChannel(1)]: 'Bad Apples' });

  assert.equal(off.teamNameOverridden(1), false);
  assert.equal(off.window.getTeamNameWithDefault(teamKey(1)), 'Bad Apples', 'a name alone changes nothing');

  const on = await withOverrides(
    { Team1NameOverride: 'true', Team1Name: 'Wheels of Justice' },
    { [teamNameChannel(1)]: 'Bad Apples', [teamNameChannel(2)]: 'Axles' }
  );

  assert.equal(on.window.getTeamNameWithDefault(teamKey(2)), 'Axles', 'the other team keeps its CRG name');
});

// The name switch is registered alongside the name, so turning it off repaints the heading
Deno.test('a name switch turned off goes back to the name CRG supplies', async () => {
  const overlay = await withOverrides(
    { Team1NameOverride: 'true', Team1Name: 'Wheels of Justice' },
    { [teamNameChannel(1)]: 'Bad Apples' }
  );

  assert.equal(overlay.window.getTeamNameWithDefault(teamKey(1)), 'Wheels of Justice');

  overlay.WS.Set(overlaySetting('Team1NameOverride'), 'false');

  assert.equal(overlay.window.getTeamNameWithDefault(teamKey(1)), 'Bad Apples');
});

// The name binding lists the setting alongside the CRG paths, so either can fire it
Deno.test('a name binding fired by its setting still finds its team', async () => {
  const overlay = await withOverrides(
    { Team2NameOverride: 'true', Team2Name: 'Axles of Annihilation' },
    { [teamNameChannel(2)]: 'Bad Apples' }
  );

  const settingKey = { Setting: 'Penalties.Overlay.Team2Name' };

  assert.equal(overlay.window.getTeamNameWithDefault(settingKey), 'Axles of Annihilation');
});

Deno.test('config.js sets an override, and the admin page outranks it', async () => {
  const source = await readSource('penalties/config.js');
  const configSource = source
    .replace('team1ColorOverride: false', 'team1ColorOverride: true')
    .replace('team1NameOverride: false', 'team1NameOverride: true')
    .replace("team1BackgroundColor: ''", "team1BackgroundColor: '#0f0f0f'")
    .replace("team1Name: ''", "team1Name: 'Configured Name'");

  const configured = await loadOverlay({ configSource, state: CRG_COLORS });

  assert.equal(configured.teamColor(1, 'background'), '#0f0f0f');
  assert.equal(configured.window.getTeamNameWithDefault(teamKey(1)), 'Configured Name');

  const stored = await loadOverlay({
    configSource,
    state: { ...CRG_COLORS, [overlaySetting('Team1BackgroundColor')]: '#123456' }
  });

  assert.equal(stored.teamColor(1, 'background'), '#123456');
});

// Every setting shares one registration, so a color change repaints through
// applyOverlaySettings rather than through a CRG color update
Deno.test('an override switched on from the admin page repaints the panel', async () => {
  const overlay = await withOverrides({ Team1BackgroundColor: '#123456' });

  overlay.registerOverlaySettings();
  overlay.applyOverlaySettings();

  assert.equal(overlay.teamProperties(1)['--team-background-color'], '#78cbca');

  overlay.WS.Set(overlaySetting('Team1ColorOverride'), 'true');

  assert.equal(overlay.teamProperties(1)['--team-background-color'], '#123456');
});
