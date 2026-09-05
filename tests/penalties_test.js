// The roster and penalty display helpers CRG calls from the sb bindings

import assert from 'node:assert/strict';
import { loadOverlay } from './support/overlay.js';

const FOULOUT_RULE = 'ScoreBoard.CurrentGame.Rule(Penalties.NumberToFoulout)';
const SKATER = 'ScoreBoard.CurrentGame.Team(1).Skater(abc123)';
const COUNT_KEY = `${SKATER}.PenaltyCount`;

// Build an overlay whose skater carries the given Penalty(0) status code
function withSkater({ foulout = 7, penaltyZero } = {}) {
  const state = { [FOULOUT_RULE]: String(foulout) };
  if (penaltyZero !== undefined) {
    state[`${SKATER}.Penalty(0).Code`] = penaltyZero;
  }
  return loadOverlay({ state });
}

Deno.test('the penalty total shows the count until a skater fouls out', async () => {
  const { window } = await withSkater();
  assert.equal(window.getPenaltyCountDisplay(COUNT_KEY, '3'), 3);
  assert.equal(window.getPenaltyCountDisplay(COUNT_KEY, '6'), 6);
  assert.equal(window.getPenaltyCountDisplay(COUNT_KEY, '7'), 'FO');
  assert.equal(window.getPenaltyCountDisplay(COUNT_KEY, '9'), 'FO');
});

Deno.test('the penalty total is blank before the first penalty', async () => {
  const { window } = await withSkater();
  assert.equal(window.getPenaltyCountDisplay(COUNT_KEY, '0'), '');
});

Deno.test('an expelled or removed skater shows a status instead of a count', async () => {
  const removed = await withSkater({ penaltyZero: 'RE' });
  assert.equal(removed.window.getPenaltyCountDisplay(COUNT_KEY, '4'), 'RE');

  const expelled = await withSkater({ penaltyZero: 'B' });
  assert.equal(expelled.window.getPenaltyCountDisplay(COUNT_KEY, '4'), 'EXP');
});

Deno.test('the warning colors track the ruleset foulout count', async () => {
  const { window } = await withSkater({ foulout: 7 });

  // Two penalties before a foulout, then one before
  assert.equal(window.isPenaltyCountWarning1(COUNT_KEY, '5'), true);
  assert.equal(window.isPenaltyCountWarning1(COUNT_KEY, '4'), false);
  assert.equal(window.isPenaltyCountWarning2(COUNT_KEY, '6'), true);
  assert.equal(window.isPenaltyCountWarning2(COUNT_KEY, '5'), false);
});

Deno.test('the warning colors follow a different ruleset', async () => {
  const { window } = await withSkater({ foulout: 5 });
  assert.equal(window.isPenaltyCountWarning1(COUNT_KEY, '3'), true);
  assert.equal(window.isPenaltyCountWarning2(COUNT_KEY, '4'), true);
});

Deno.test('a removed skater gets the foulout color, not a warning color', async () => {
  const { window } = await withSkater({ penaltyZero: 'RE' });
  assert.equal(window.isPenaltyCountWarning1(COUNT_KEY, '5'), false);
  assert.equal(window.isPenaltyCountExpFoRe(COUNT_KEY, '5'), true);
});

Deno.test('a roster row displays no more codes than the configured maximum', async () => {
  const { window, VALIDATION } = await withSkater();
  const maximum = VALIDATION.penaltyCodes.max;

  for (let number = 1; number <= maximum; number++) {
    assert.equal(window.shouldHidePenaltyCode('', 'B', String(number)), false, `penalty ${number} should show`);
  }
  for (const number of [maximum + 1, maximum + 5]) {
    assert.equal(window.shouldHidePenaltyCode('', 'B', String(number)), true, `penalty ${number} should be hidden`);
  }
});

Deno.test('status codes never appear among the penalty codes', async () => {
  const { window } = await withSkater();
  assert.equal(window.shouldHidePenaltyCode('', 'FO', '3'), true);
  assert.equal(window.shouldHidePenaltyCode('', 'RE', '3'), true);
  assert.equal(window.shouldHidePenaltyCode('', 'B', '0'), true);
});

Deno.test('the captain indicator shows one letter, captain before alternate', async () => {
  const { window } = await withSkater();
  assert.equal(window.showCaptainIndicator(null, 'C'), 'C');
  assert.equal(window.showCaptainIndicator(null, 'A'), 'A');
  assert.equal(window.showCaptainIndicator(null, 'C,A'), 'C');
  assert.equal(window.showCaptainIndicator(null, 'ALT'), '');
  assert.equal(window.showCaptainIndicator(null, null), '');
});

Deno.test('non-skating roster entries are hidden', async () => {
  const { window } = await withSkater();
  assert.equal(window.shouldHideSkater(null, 'ALT'), true);
  assert.equal(window.shouldHideSkater(null, 'B'), true);
  assert.equal(window.shouldHideSkater(null, 'C'), false);
  assert.equal(window.shouldHideSkater(null, null), false);
});

Deno.test('the timeout banner names the kind of timeout', async () => {
  const { window } = await withSkater();
  assert.equal(window.getTimeoutText(null, 'O', true), 'Official Review');
  assert.equal(window.getTimeoutText(null, 'O', false), 'Official Timeout');
  assert.equal(window.getTimeoutText(null, '1_1', false), 'Team Timeout');
  assert.equal(window.getTimeoutText(null, '', false), 'Timeout');
});

Deno.test('the game number appears only when CRG has one', async () => {
  const { window } = await withSkater();
  assert.equal(window.prependGameNo(null, '6'), ' · Game 6');
  assert.equal(window.prependGameNo(null, '0'), '');
  assert.equal(window.prependGameNo(null, ''), '');
});

Deno.test('a team falls back to its CRG name, then to a numbered default', async () => {
  const { window, WS } = await loadOverlay({
    state: { 'ScoreBoard.CurrentGame.Team(1).Name': 'Bad Apples' }
  });
  assert.equal(window.getTeamNameWithDefault({ Team: '1' }, 'Whiteboard Name'), 'Whiteboard Name');
  assert.equal(window.getTeamNameWithDefault({ Team: '1' }, ''), 'Bad Apples');
  assert.equal(window.getTeamNameWithDefault({ Team: '2' }, ''), 'Team 2');
  assert.equal(typeof WS.state, 'object');
});

const PERIOD_RULE = 'ScoreBoard.CurrentGame.Rule(Period.Number)';
const PERIOD_NUMBER = 'ScoreBoard.CurrentGame.CurrentPeriodNumber';
const INTERMISSION = 'ScoreBoard.CurrentGame.Clock(Intermission).Running';

// Build an overlay in a two period game at the given point
function atGameState(state) {
  return loadOverlay({ state: { [PERIOD_RULE]: '2', ...state } });
}

Deno.test('"Coming Up" shows before the game starts and not after', async () => {
  const beforeGame = await atGameState({ [PERIOD_NUMBER]: '0' });
  assert.equal(beforeGame.window.shouldHideComingUp(), false);

  const firstPeriod = await atGameState({ [PERIOD_NUMBER]: '1' });
  assert.equal(firstPeriod.window.shouldHideComingUp(), true);

  const warmup = await atGameState({ [PERIOD_NUMBER]: '0', [INTERMISSION]: true });
  assert.equal(warmup.window.shouldHideComingUp(), true);
});

Deno.test('"Unofficial Score" shows after the final period, until the score is official', async () => {
  const afterFinalPeriod = await atGameState({ [PERIOD_NUMBER]: '2', [INTERMISSION]: true });
  assert.equal(afterFinalPeriod.window.shouldHideUnofficialScore(), false);

  const betweenPeriods = await atGameState({ [PERIOD_NUMBER]: '1', [INTERMISSION]: true });
  assert.equal(betweenPeriods.window.shouldHideUnofficialScore(), true);

  const official = await atGameState({
    [PERIOD_NUMBER]: '2',
    [INTERMISSION]: true,
    'ScoreBoard.CurrentGame.OfficialScore': true
  });
  assert.equal(official.window.shouldHideUnofficialScore(), true);

  const overtime = await atGameState({
    [PERIOD_NUMBER]: '2',
    [INTERMISSION]: true,
    'ScoreBoard.CurrentGame.InOvertime': true
  });
  assert.equal(overtime.window.shouldHideUnofficialScore(), true);
});
