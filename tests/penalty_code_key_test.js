// The penalty code key: which codes it lists, and how it fits them on one line

import assert from 'node:assert/strict';
import { loadOverlay } from './support/overlay.js';
import {
  PENALTY_CODE,
  SKATER,
  TEAM_1_SKATERS,
  TEAM_2_SKATERS,
  overlaySetting,
  penaltyCode
} from './support/channels.js';

const TEAM_2_SKATER = 'ScoreBoard.CurrentGame.Team(2).Skater(def456)';

// Two players carrying penalties, with a description for each code in play
function withCodes(extra = {}) {
  return {
    [`${SKATER}.Penalty(1).Code`]: 'C',
    [`${SKATER}.Penalty(2).Code`]: 'B',
    [`${TEAM_2_SKATER}.Penalty(1).Code`]: 'B',
    [penaltyCode('B')]: 'Back block, blocking with the back, forearms',
    [penaltyCode('C')]: 'Cut, cutting the track',
    ...extra
  };
}

const codesShown = (overlay) => overlay.key().items.map((item) => item.code);

Deno.test('a cue keeps only the first phrase CRG publishes', async () => {
  const { getPenaltyCodeCue } = await loadOverlay({
    state: {
      [penaltyCode('B')]: 'Back block, blocking with the back, forearms',
      [penaltyCode('C')]: '  Cut  ',
      [penaltyCode('D')]: '',
      [penaltyCode('E')]: '   '
    }
  });

  assert.equal(getPenaltyCodeCue('B'), 'Back block');
  assert.equal(getPenaltyCodeCue('C'), 'Cut');

  // A code with no usable description stays out of the key
  assert.equal(getPenaltyCodeCue('D'), null);
  assert.equal(getPenaltyCodeCue('E'), null);
  assert.equal(getPenaltyCodeCue('X'), null);
});

Deno.test('the key lists each code in play once, with its cue', async () => {
  const overlay = await loadOverlay({ state: withCodes() });
  overlay.buildPenaltyCodeKey();

  const { visible, items } = overlay.key();
  assert.equal(visible, true);

  // 'B' is on both teams, and appears once
  assert.deepEqual(items, [
    { code: 'B', cue: 'Back block' },
    { code: 'C', cue: 'Cut' }
  ]);
});

Deno.test('a code CRG does not describe is left out', async () => {
  const overlay = await loadOverlay({ state: withCodes({ [`${SKATER}.Penalty(3).Code`]: 'Z' }) });
  overlay.buildPenaltyCodeKey();

  assert.deepEqual(codesShown(overlay), ['B', 'C']);
});

Deno.test('the key stays hidden when nothing can be described', async () => {
  const overlay = await loadOverlay({ state: { [`${SKATER}.Penalty(1).Code`]: 'Z' } });
  overlay.buildPenaltyCodeKey();

  const { visible, items } = overlay.key();
  assert.equal(visible, false);
  assert.deepEqual(items, []);
});

Deno.test('turning the key off empties it', async () => {
  const overlay = await loadOverlay({ state: withCodes({ [overlaySetting('PenaltyCodeKey')]: 'false' }) });
  overlay.setPenaltyCodeKey();
  overlay.buildPenaltyCodeKey();

  const { visible, items } = overlay.key();
  assert.equal(visible, false);
  assert.deepEqual(items, []);
});

Deno.test('the key shrinks its text to fit one line', async () => {
  const overlay = await loadOverlay({
    state: withCodes(),
    dom: { available: 100, codeWidth: 80, fontSize: 15 }
  });
  overlay.buildPenaltyCodeKey();

  // Two codes at 80px do not fit 100px, so 15px shrinks by the same ratio
  assert.equal(overlay.key().fittedSize, '9px');
});

Deno.test('the key keeps its configured size when the codes already fit', async () => {
  const overlay = await loadOverlay({
    state: withCodes(),
    dom: { available: 400, codeWidth: 80, fontSize: 15 }
  });
  overlay.buildPenaltyCodeKey();

  assert.equal(overlay.key().fittedSize, null);
});

Deno.test('a key the browser has not laid out yet is left alone', async () => {
  const overlay = await loadOverlay({
    state: withCodes(),
    dom: { available: 0, codeWidth: 80, fontSize: 15 }
  });
  overlay.buildPenaltyCodeKey();

  assert.equal(overlay.key().fittedSize, null);
});

Deno.test('fitting twice measures from the configured size, not the previous fit', async () => {
  const overlay = await loadOverlay({
    state: withCodes(),
    dom: { available: 100, codeWidth: 80, fontSize: 15 }
  });
  overlay.buildPenaltyCodeKey();
  const first = overlay.key().fittedSize;

  overlay.fitPenaltyCodeKey();

  // Measuring at the fitted size instead would shrink 9px again, to 5px
  assert.equal(first, '9px');
  assert.equal(overlay.key().fittedSize, first);
});

Deno.test('a burst of updates rebuilds the key once', async () => {
  const overlay = await loadOverlay({ state: withCodes() });

  overlay.schedulePenaltyCodeKeyRebuild();
  overlay.schedulePenaltyCodeKeyRebuild();
  overlay.schedulePenaltyCodeKeyRebuild();
  assert.equal(overlay.timers.length, 1, 'three updates should schedule one rebuild');

  const [timer] = overlay.runTimers();
  assert.equal(timer.delay, overlay.TIMING.penaltyCodeKeyRebuild);
  assert.deepEqual(codesShown(overlay), ['B', 'C']);

  // The next burst schedules again
  overlay.schedulePenaltyCodeKeyRebuild();
  assert.equal(overlay.timers.length, 1);
});

Deno.test('the key registers the channels it depends on', async () => {
  const overlay = await loadOverlay({ state: withCodes() });
  overlay.registerPenaltyCodeKey();

  assert.equal(overlay.WS.registrations.length, 1);
  assert.deepEqual(overlay.WS.registrations[0].paths, [PENALTY_CODE, TEAM_1_SKATERS, TEAM_2_SKATERS]);
});

// The admin page can turn the key on during a game, and the overlay registers only once
Deno.test('a key that is turned off still registers, so it can be turned on', async () => {
  const overlay = await loadOverlay({ state: withCodes({ [overlaySetting('PenaltyCodeKey')]: 'false' }) });
  overlay.setPenaltyCodeKey();
  overlay.registerPenaltyCodeKey();

  assert.equal(overlay.WS.registrations.length, 1);
  assert.deepEqual(overlay.WS.registrations[0].paths, [PENALTY_CODE, TEAM_1_SKATERS, TEAM_2_SKATERS]);
});
