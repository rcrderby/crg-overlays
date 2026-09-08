// CRG WebSocket channels and the skater the tests build state around
// index.js names these channels itself, so a typo on either side fails a test

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

// Channels the penalty code key watches
export const PENALTY_CODE = 'ScoreBoard.CurrentGame.PenaltyCode';
export const TEAM_1_SKATERS = 'ScoreBoard.CurrentGame.Team(1).Skater';
export const TEAM_2_SKATERS = 'ScoreBoard.CurrentGame.Team(2).Skater';

// Where CRG publishes the description of one penalty code
export const penaltyCode = (code) => `${PENALTY_CODE}(${code})`;

// Where the admin page stores an overlay setting
export const overlaySetting = (name) => `ScoreBoard.Settings.Setting(Penalties.Overlay.${name})`;
