// CRG WebSocket channels and the skater the tests build state around.
// index.js names these channels independently, so a typo on either side
// fails a test rather than agreeing with itself.

// Game state
export const CURRENT_PERIOD = 'ScoreBoard.CurrentGame.CurrentPeriodNumber';
export const INTERMISSION_RUNNING = 'ScoreBoard.CurrentGame.Clock(Intermission).Running';
export const OFFICIAL_SCORE = 'ScoreBoard.CurrentGame.OfficialScore';
export const OVERTIME = 'ScoreBoard.CurrentGame.InOvertime';

// Active ruleset
export const FOULOUT_RULE = 'ScoreBoard.CurrentGame.Rule(Penalties.NumberToFoulout)';
export const PERIOD_RULE = 'ScoreBoard.CurrentGame.Rule(Period.Number)';

// Intermission labels a scoreboard operator sets
export const INTERMISSION_LABEL = 'ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Intermission)';
export const PRE_GAME_LABEL = 'ScoreBoard.Settings.Setting(ScoreBoard.Intermission.PreGame)';

// A skater to hang penalty state on
export const SKATER = 'ScoreBoard.CurrentGame.Team(1).Skater(abc123)';
export const COUNT_KEY = `${SKATER}.PenaltyCount`;
