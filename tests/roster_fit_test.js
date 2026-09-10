// The roster text grows to fill the panel a short roster leaves partially empty
// Both rosters take one scale, and the penalty code column caps how far it goes

import assert from 'node:assert/strict';
import { loadOverlay, readSource } from './support/overlay.js';
import { overlaySetting } from './support/channels.js';

const overlay = await loadOverlay();
const { max: MAX_SCALE } = overlay.VALIDATION.rosterScale;

// One stored setting, as the scoreboard holds it
const stored = (name, value) => ({ [overlaySetting(name)]: String(value) });

// A roster panel, sized the way the shipped overlay sizes one
const TEAM_HEADING = 46;
const panel = (rows, height, extra = {}) => ({
  rows,
  height,
  rowHeight: 29,
  headings: 24,
  gap: 4,
  teamHeading: TEAM_HEADING,
  ...extra
});

// The scale the overlay should settle on: the team name scales with the rows,
// so it shares the space rather than taking a fixed slice of it
const expected = (rows, height, teamHeading = TEAM_HEADING) =>
  Math.round(((height + teamHeading) / (teamHeading + rows * 29 + 28)) * 1000) / 1000;

// The scale the overlay settled on, as a number
async function fittedScale(rosters, options = {}) {
  const applied = await loadOverlay({ rosters, ...options });

  applied.setRosterTextScaling();
  applied.fitRosterText();

  return Number(applied.properties['--roster-scale']);
}

// The space 20 rows and their headings need, which is what the panel ships at
const FULL_ROSTER = 20 * 29 + 28;

Deno.test('a full roster keeps the configured text sizes', async () => {
  assert.equal(await fittedScale([panel(20, FULL_ROSTER), panel(20, FULL_ROSTER)]), 1);
});

Deno.test('a short roster grows its text to fill the panel', async () => {
  // Twelve rows in the space twenty need, less the headings that grow with them
  const scale = await fittedScale([panel(16, FULL_ROSTER), panel(16, FULL_ROSTER)]);

  assert.equal(scale, Math.min(expected(16, FULL_ROSTER), MAX_SCALE));
  assert.ok(scale > 1, 'a short roster scales up');
});

Deno.test('both rosters take the scale the longer one allows', async () => {
  const uneven = await fittedScale([panel(16, FULL_ROSTER), panel(19, FULL_ROSTER)]);
  const longer = await fittedScale([panel(19, FULL_ROSTER), panel(19, FULL_ROSTER)]);
  const shorter = await fittedScale([panel(16, FULL_ROSTER), panel(16, FULL_ROSTER)]);

  assert.equal(uneven, longer, 'the nineteen row roster decides for both');
  assert.ok(uneven < shorter, 'and it holds the scale below what sixteen rows alone would take');
});

Deno.test('the shorter panel decides the space, so neither one overflows', async () => {
  const even = await fittedScale([panel(18, FULL_ROSTER), panel(18, FULL_ROSTER)]);
  const cramped = await fittedScale([panel(18, FULL_ROSTER), panel(18, FULL_ROSTER - 28)]);

  assert.ok(cramped < even, 'the shorter panel holds the scale down');
  assert.ok(cramped > 1, 'and it still scales up');
});

Deno.test('the scale is held to the configured maximum', async () => {
  // Six rows would fill the panel several times over
  const scale = await fittedScale([panel(6, FULL_ROSTER), panel(6, FULL_ROSTER)]);

  assert.equal(scale, MAX_SCALE);
});

Deno.test('hidden skaters do not count toward the fit', async () => {
  const twelve = await fittedScale([panel(12, FULL_ROSTER), panel(12, FULL_ROSTER)]);
  const withBench = await fittedScale([
    panel(12, FULL_ROSTER, { hiddenRows: 8 }),
    panel(12, FULL_ROSTER, { hiddenRows: 8 })
  ]);

  assert.equal(withBench, twelve);
});

Deno.test('the headings take their share of the space at any scale', async () => {
  // Without the headings in the sum the scale would come out higher
  const scale = await fittedScale([panel(18, FULL_ROSTER), panel(18, FULL_ROSTER)]);

  assert.equal(scale, expected(18, FULL_ROSTER), 'the column headings are in the sum');
  assert.ok(scale < Math.round((FULL_ROSTER / (18 * 29)) * 1000) / 1000, 'so the scale lands lower');
});

Deno.test('the team name takes its share of the space as it scales', async () => {
  const withHeading = await fittedScale([panel(18, FULL_ROSTER), panel(18, FULL_ROSTER)]);
  const taller = await fittedScale([
    panel(18, FULL_ROSTER, { teamHeading: TEAM_HEADING * 2 }),
    panel(18, FULL_ROSTER, { teamHeading: TEAM_HEADING * 2 })
  ]);

  assert.equal(withHeading, expected(18, FULL_ROSTER));
  assert.equal(taller, expected(18, FULL_ROSTER, TEAM_HEADING * 2));
  assert.ok(taller < withHeading, 'a taller team name leaves the rows less room to grow into');
});

Deno.test('scaling turned off leaves the configured sizes alone', async () => {
  const scale = await fittedScale([panel(6, FULL_ROSTER), panel(6, FULL_ROSTER)], {
    state: stored('RosterTextScaling', 'false')
  });

  assert.equal(scale, 1);
});

Deno.test('config.js turns scaling off when the scoreboard holds nothing', async () => {
  const source = await readSource('penalties/config.js');
  const configSource = source.replace('rosterTextScaling: true,', 'rosterTextScaling: false,');
  const rosters = [panel(6, FULL_ROSTER), panel(6, FULL_ROSTER)];

  assert.equal(await fittedScale(rosters), MAX_SCALE, 'on by default');
  assert.equal(await fittedScale(rosters, { configSource }), 1, 'off from config.js');
});

Deno.test('an empty roster leaves the configured sizes alone', async () => {
  assert.equal(await fittedScale([panel(0, FULL_ROSTER), panel(0, FULL_ROSTER)]), 1);
});

Deno.test('a roster with no panel on the page leaves the sizes alone', async () => {
  assert.equal(await fittedScale([]), 1);
});

Deno.test('a height too short for the content holds the overlay taller instead', async () => {
  // The content runs 120px past the box the height setting asked for
  const short = await loadOverlay({
    rosters: [panel(12, FULL_ROSTER), panel(12, FULL_ROSTER)],
    overlayFrame: { height: 1080, inset: 32, offsetHeight: 600, clientHeight: 574, scrollHeight: 694 }
  });

  short.setRosterTextScaling();
  short.fitRosterText();

  assert.equal(short.properties['--overlay-min-height'], '720px', 'held at the height its content needs');
});

Deno.test('the overlay is never held past the video frame', async () => {
  // A roster far longer than the frame can show, asking for far more than it has
  const overlong = await loadOverlay({
    rosters: [panel(30, FULL_ROSTER), panel(30, FULL_ROSTER)],
    overlayFrame: { height: 1080, inset: 32, offsetHeight: 1016, clientHeight: 990, scrollHeight: 1600 }
  });

  overlong.setRosterTextScaling();
  overlong.fitRosterText();

  // 1080 less the inset above and below it
  assert.equal(overlong.properties['--overlay-min-height'], '1016px');
});

Deno.test('content that fits leaves the overlay height alone', async () => {
  const fits = await loadOverlay({ rosters: [panel(12, FULL_ROSTER), panel(12, FULL_ROSTER)] });

  fits.setRosterTextScaling();
  fits.fitRosterText();

  assert.equal(fits.properties['--overlay-min-height'], '0');
});

Deno.test('a roster shows no more skaters than the panel holds', async () => {
  const { max } = overlay.VALIDATION.rosterRows;
  const crowded = await loadOverlay({ rosters: [panel(max + 6, FULL_ROSTER), panel(max + 6, FULL_ROSTER)] });

  crowded.limitRosterRows();

  const shown = crowded.dom.rosters[0].lines.filter((line) => line.offsetHeight > 0).length;

  assert.equal(shown, max, `only ${max} skaters are on display`);
});

Deno.test('hiding skaters is reported whether or not debug logging is on', async () => {
  const { max } = overlay.VALIDATION.rosterRows;
  const crowded = await loadOverlay({ rosters: [panel(max + 3, FULL_ROSTER), panel(max + 3, FULL_ROSTER)] });

  crowded.limitRosterRows();

  assert.equal(crowded.DEBUG, false, 'debug logging is off');
  assert.match(crowded.warnings.join(' '), new RegExp(`holds ${max + 3} skaters`));
  assert.match(crowded.warnings.join(' '), new RegExp(`displays ${max}`));
});

Deno.test('a roster that fits reports nothing', async () => {
  const { max } = overlay.VALIDATION.rosterRows;
  const room = await loadOverlay({ rosters: [panel(max, FULL_ROSTER), panel(max, FULL_ROSTER)] });

  room.limitRosterRows();

  assert.deepEqual(room.warnings, []);
});

Deno.test('the same crowded roster is reported once, not on every update', async () => {
  const { max } = overlay.VALIDATION.rosterRows;
  const crowded = await loadOverlay({ rosters: [panel(max + 3, FULL_ROSTER), panel(max + 3, FULL_ROSTER)] });

  crowded.limitRosterRows();
  crowded.limitRosterRows();
  crowded.limitRosterRows();

  assert.equal(crowded.warnings.length, 1, 'said once');
});

Deno.test('a roster within the limit keeps every skater', async () => {
  const { max } = overlay.VALIDATION.rosterRows;
  const room = await loadOverlay({ rosters: [panel(max, FULL_ROSTER), panel(max, FULL_ROSTER)] });

  room.limitRosterRows();

  assert.equal(room.dom.rosters[0].lines.filter((line) => line.offsetHeight > 0).length, max);
});

Deno.test('the skaters CRG hides do not use up the limit', async () => {
  const { max } = overlay.VALIDATION.rosterRows;
  const benched = await loadOverlay({
    rosters: [panel(max, FULL_ROSTER, { hiddenRows: 8 }), panel(max, FULL_ROSTER, { hiddenRows: 8 })]
  });

  benched.limitRosterRows();

  assert.equal(benched.dom.rosters[0].lines.filter((line) => line.offsetHeight > 0).length, max);
});

Deno.test('the logo row keeps its height when a short height squeezes it', async () => {
  // The logos have given up 40px and no timeout is running to claim it
  const squeezed = await loadOverlay({
    rosters: [panel(12, FULL_ROSTER), panel(12, FULL_ROSTER)],
    overlayFrame: {
      offsetHeight: 600,
      clientHeight: 600,
      scrollHeight: 600,
      logoRowSteps: [60, 100],
      timeoutRow: 0
    }
  });

  squeezed.setRosterTextScaling();
  squeezed.holdOverlayHeight();

  assert.equal(squeezed.properties['--overlay-min-height'], '640px', 'the 40px is given back');
});

Deno.test('the logo row is looked at again until it has its height back', async () => {
  // The row recovers in two steps, the way handing space back moves the layout
  const recovering = await loadOverlay({
    rosters: [panel(10, FULL_ROSTER), panel(10, FULL_ROSTER)],
    overlayFrame: {
      offsetHeight: 616,
      clientHeight: 616,
      scrollHeight: 616,
      logoRowSteps: [44, 89, 100]
    }
  });

  recovering.setRosterTextScaling();
  recovering.holdOverlayHeight();

  // 616 + 56 on the first look, then + 11 more on the second
  assert.equal(recovering.properties['--overlay-min-height'], '683px');
});

Deno.test('a logo row that cannot recover is offered the room once', async () => {
  // The row stays at its minimum however much height it is handed
  const stuck = await loadOverlay({
    rosters: [panel(10, FULL_ROSTER), panel(10, FULL_ROSTER)],
    overlayFrame: { offsetHeight: 400, clientHeight: 400, scrollHeight: 400, logoRow: 44 }
  });

  stuck.setRosterTextScaling();
  stuck.holdOverlayHeight();

  // 56px once, rather than the same 56px on every look
  assert.equal(stuck.properties['--overlay-min-height'], '456px');
});

Deno.test('the height floor gives up rather than looking forever', async () => {
  // A row that recovers by less each time would otherwise be chased indefinitely
  const crawling = await loadOverlay({
    rosters: [panel(10, FULL_ROSTER), panel(10, FULL_ROSTER)],
    overlayFrame: {
      offsetHeight: 616,
      clientHeight: 616,
      scrollHeight: 616,
      logoRowSteps: [44, 89, 95, 98, 99, 100]
    }
  });

  crawling.setRosterTextScaling();
  crawling.holdOverlayHeight();

  // Three looks: 616 + 56, then + 11, then + 5, and no more
  assert.equal(crawling.HEIGHT_HOLD_PASSES, 3);
  assert.equal(crawling.properties['--overlay-min-height'], '688px');
});

Deno.test('a full roster with a timeout banner leaves the logos squeezed', async () => {
  // Already at the frame, with far more content than it can hold, and logos 40px down
  const full = await loadOverlay({
    rosters: [panel(20, FULL_ROSTER), panel(20, FULL_ROSTER)],
    overlayFrame: { offsetHeight: 1016, clientHeight: 990, scrollHeight: 1400, logoRow: 60, timeoutRow: 48 }
  });

  full.setRosterTextScaling();
  full.holdOverlayHeight();

  // The frame has nothing left to give, so the logo row keeps carrying the banner
  assert.equal(full.properties['--overlay-min-height'], '1016px');
});

Deno.test('the fit runs once after a burst of roster updates', async () => {
  const applied = await loadOverlay({ rosters: [panel(12, FULL_ROSTER), panel(12, FULL_ROSTER)] });

  applied.scheduleRosterTextFit();
  applied.scheduleRosterTextFit();
  applied.scheduleRosterTextFit();

  assert.equal(applied.timers.length, 1, 'a burst schedules one fit');
  assert.equal(applied.timers[0].delay, applied.TIMING.rosterTextFit);
});

Deno.test('the overlay refits when a roster changes', async () => {
  const applied = await loadOverlay({ rosters: [panel(12, FULL_ROSTER), panel(12, FULL_ROSTER)] });

  applied.registerRosterTextFit();

  const registered = applied.WS.registrations.at(-1).paths;

  assert.deepEqual(registered, ['ScoreBoard.CurrentGame.Team(1).Skater', 'ScoreBoard.CurrentGame.Team(2).Skater']);
});
