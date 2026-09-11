// The game information helpers: timeout banner column, clock, and game state label

import assert from 'node:assert/strict';
import { loadOverlay } from './support/overlay.js';
import {
  COUNT_KEY,
  CURRENT_PERIOD,
  FOULOUT_RULE,
  INTERMISSION_LABEL,
  INTERMISSION_RUNNING,
  OFFICIAL_SCORE,
  OVERTIME,
  PERIOD_RULE,
  PRE_GAME_LABEL
} from './support/channels.js';

// A two period game at the given point
function atGameState(state = {}) {
  return loadOverlay({ state: { [PERIOD_RULE]: '2', ...state } });
}

// CRG 5.0 and later identify a team timeout as "<gameId>_1" or "<gameId>_2"
const TEAM_1_TIMEOUT = 'a1b2c3_1';
const TEAM_2_TIMEOUT = 'a1b2c3_2';
const OFFICIAL_TIMEOUT = 'O';
const UNTYPED_TIMEOUT = '';

Deno.test('the timeout banner appears only while a timeout runs', async () => {
  const { window } = await atGameState();
  assert.equal(window.isTimeoutVisible(null, true), true);
  assert.equal(window.isTimeoutVisible(null, false), false);
  assert.equal(window.isTimeoutVisible(null, undefined), false);
});

Deno.test("a team timeout sits in that team's column", async () => {
  const { window } = await atGameState();

  assert.equal(window.isPositionTeam1(null, TEAM_1_TIMEOUT), true);
  assert.equal(window.isPositionTeam2(null, TEAM_1_TIMEOUT), false);

  assert.equal(window.isPositionTeam2(null, TEAM_2_TIMEOUT), true);
  assert.equal(window.isPositionTeam1(null, TEAM_2_TIMEOUT), false);
});

Deno.test('official and untyped timeouts sit in the center column', async () => {
  const { window } = await atGameState();

  for (const owner of [OFFICIAL_TIMEOUT, UNTYPED_TIMEOUT]) {
    assert.equal(window.isPositionCenter(null, owner), true, `"${owner}" should be centered`);
    assert.equal(window.isPositionTeam1(null, owner), false);
    assert.equal(window.isPositionTeam2(null, owner), false);
  }
});

Deno.test('every timeout owner lands in exactly one column', async () => {
  const { window } = await atGameState();

  for (const owner of [UNTYPED_TIMEOUT, OFFICIAL_TIMEOUT, TEAM_1_TIMEOUT, TEAM_2_TIMEOUT]) {
    const columns = [
      window.isPositionCenter(null, owner),
      window.isPositionTeam1(null, owner),
      window.isPositionTeam2(null, owner)
    ].filter(Boolean);
    assert.equal(columns.length, 1, `"${owner}" matched ${columns.length} columns`);
  }
});

Deno.test('the period label counts periods and is blank before the game', async () => {
  const { window } = await atGameState();
  assert.equal(window.getPeriodLabel(null, '1'), 'Period 1');
  assert.equal(window.getPeriodLabel(null, '2'), 'Period 2');
  assert.equal(window.getPeriodLabel(null, '0'), '');
  assert.equal(window.getPeriodLabel(null, ''), '');
});

Deno.test('the intermission label follows the point in the game', async () => {
  const { window } = await atGameState({
    [PRE_GAME_LABEL]: 'Time to Derby',
    [INTERMISSION_LABEL]: 'Intermission'
  });

  assert.equal(window.getIntermissionLabel(null, '0'), 'Time to Derby');
  assert.equal(window.getIntermissionLabel(null, '1'), 'Intermission');

  // After the final period the score labels take over
  assert.equal(window.getIntermissionLabel(null, '2'), '');
});

Deno.test('the period clock shows only while a period is under way', async () => {
  const running = await atGameState({ [CURRENT_PERIOD]: '1' });
  assert.equal(running.window.shouldHidePeriodClock(null, false), false);

  const beforeGame = await atGameState({ [CURRENT_PERIOD]: '0' });
  assert.equal(beforeGame.window.shouldHidePeriodClock(null, false), true);

  const intermission = await atGameState({ [CURRENT_PERIOD]: '1' });
  assert.equal(intermission.window.shouldHidePeriodClock(null, true), true);

  for (const state of [{ [OFFICIAL_SCORE]: true }, { [OVERTIME]: true }]) {
    const overlay = await atGameState({ [CURRENT_PERIOD]: '1', ...state });
    assert.equal(overlay.window.shouldHidePeriodClock(null, false), true);
  }
});

Deno.test('the intermission clock shows only between periods', async () => {
  const betweenPeriods = await atGameState({ [CURRENT_PERIOD]: '1' });
  assert.equal(betweenPeriods.window.shouldHideIntermissionClock(null, true), false);

  const notRunning = await atGameState({ [CURRENT_PERIOD]: '1' });
  assert.equal(notRunning.window.shouldHideIntermissionClock(null, false), true);

  // After the final period, and once the score is official
  const afterFinalPeriod = await atGameState({ [CURRENT_PERIOD]: '2' });
  assert.equal(afterFinalPeriod.window.shouldHideIntermissionClock(null, true), true);

  const official = await atGameState({ [CURRENT_PERIOD]: '1', [OFFICIAL_SCORE]: true });
  assert.equal(official.window.shouldHideIntermissionClock(null, true), true);
});

Deno.test('the small binding helpers behave', async () => {
  const { window } = await atGameState();
  assert.equal(window.hasValue(null, 'Bad Apples'), true);
  assert.equal(window.hasValue(null, ''), false);
  assert.equal(window.invertBoolean(null, true), false);
  assert.equal(window.invertBoolean(null, false), true);
});

// The overlay displays after `maxLoadWaitMs` whether or not the ruleset arrives
// A game the ruleset has not reached, at a given point
function withoutRuleset(state = {}) {
  return loadOverlay({ state });
}

Deno.test('an unknown period count hides the score labels rather than guessing', async () => {
  // Mid-game intermission: the label belongs to the end of the game, so it stays hidden
  const midGame = await withoutRuleset({ [CURRENT_PERIOD]: '1', [INTERMISSION_RUNNING]: true });
  assert.equal(midGame.window.shouldHideUnofficialScore(), true);

  // The same state with the ruleset present still shows it after the final period
  const known = await atGameState({ [CURRENT_PERIOD]: '2', [INTERMISSION_RUNNING]: true });
  assert.equal(known.window.shouldHideUnofficialScore(), false);
});

Deno.test('an unknown period count keeps the intermission clock and its label together', async () => {
  const overlay = await withoutRuleset({
    [CURRENT_PERIOD]: '1',
    [INTERMISSION_RUNNING]: true,
    [INTERMISSION_LABEL]: 'Intermission'
  });

  // A running clock with no label reads as a broken overlay
  assert.equal(overlay.window.shouldHideIntermissionClock(null, true), false);
  assert.equal(overlay.window.getIntermissionLabel(null, '1'), 'Intermission');
});

Deno.test('an unknown foulout count leaves the penalty counts alone', async () => {
  const { window } = await withoutRuleset();

  // No count reads as a foulout, and no count earns a warning color
  assert.equal(window.getPenaltyCountDisplay(COUNT_KEY, '9'), 9);
  assert.equal(window.isPenaltyCountExpFoRe(COUNT_KEY, '9'), false);
  assert.equal(window.isPenaltyCountWarning1(COUNT_KEY, '9'), false);
  assert.equal(window.isPenaltyCountWarning2(COUNT_KEY, '9'), false);
});

Deno.test('a ruleset that supplies an unusable count is treated as unknown', async () => {
  for (const value of ['', 'many', '0']) {
    const { window } = await loadOverlay({ state: { [FOULOUT_RULE]: value } });
    assert.equal(
      window.getPenaltyCountDisplay(COUNT_KEY, '9'),
      9,
      `foulout count "${value}" should not foul anyone out`
    );
  }
});
