// The game information helpers: which column a timeout banner lands in, and
// which clock and label the overlay shows for a game state

import assert from 'node:assert/strict';
import { loadOverlay } from './support/overlay.js';

const PERIOD_RULE = 'ScoreBoard.CurrentGame.Rule(Period.Number)';
const PERIOD_NUMBER = 'ScoreBoard.CurrentGame.CurrentPeriodNumber';
const OFFICIAL_SCORE = 'ScoreBoard.CurrentGame.OfficialScore';
const OVERTIME = 'ScoreBoard.CurrentGame.InOvertime';
const PRE_GAME_LABEL = 'ScoreBoard.Settings.Setting(ScoreBoard.Intermission.PreGame)';
const INTERMISSION_LABEL = 'ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Intermission)';

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
  const running = await atGameState({ [PERIOD_NUMBER]: '1' });
  assert.equal(running.window.shouldHidePeriodClock(null, false), false);

  const beforeGame = await atGameState({ [PERIOD_NUMBER]: '0' });
  assert.equal(beforeGame.window.shouldHidePeriodClock(null, false), true);

  const intermission = await atGameState({ [PERIOD_NUMBER]: '1' });
  assert.equal(intermission.window.shouldHidePeriodClock(null, true), true);

  for (const state of [{ [OFFICIAL_SCORE]: true }, { [OVERTIME]: true }]) {
    const overlay = await atGameState({ [PERIOD_NUMBER]: '1', ...state });
    assert.equal(overlay.window.shouldHidePeriodClock(null, false), true);
  }
});

Deno.test('the intermission clock shows only between periods', async () => {
  const betweenPeriods = await atGameState({ [PERIOD_NUMBER]: '1' });
  assert.equal(betweenPeriods.window.shouldHideIntermissionClock(null, true), false);

  const notRunning = await atGameState({ [PERIOD_NUMBER]: '1' });
  assert.equal(notRunning.window.shouldHideIntermissionClock(null, false), true);

  // After the final period, and once the score is official
  const afterFinalPeriod = await atGameState({ [PERIOD_NUMBER]: '2' });
  assert.equal(afterFinalPeriod.window.shouldHideIntermissionClock(null, true), true);

  const official = await atGameState({ [PERIOD_NUMBER]: '1', [OFFICIAL_SCORE]: true });
  assert.equal(official.window.shouldHideIntermissionClock(null, true), true);
});

Deno.test('a team glow color becomes a text shadow, and its absence falls back', async () => {
  const { window, CONFIG, CLASSES } = await atGameState();
  assert.equal(window.glowColorToShadow(null, '#ff0000'), `${CONFIG.defaultRosterShadowProperties} #ff0000`);
  assert.equal(window.glowColorToShadow(null, ''), CLASSES.textShadow);
  assert.equal(window.glowColorToShadow(null, null), CLASSES.textShadow);
});

Deno.test('the small binding helpers behave', async () => {
  const { window } = await atGameState();
  assert.equal(window.hasValue(null, 'Bad Apples'), true);
  assert.equal(window.hasValue(null, ''), '');
  assert.equal(window.invertBoolean(null, true), false);
  assert.equal(window.invertBoolean(null, false), true);
});
