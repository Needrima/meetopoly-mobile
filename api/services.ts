/**
 * Public API service functions for Meetopoly.
 * Re-exports orval-generated endpoints — do not add hand-written HTTP DTOs here.
 * Regenerate: `npm run api:generate`
 *
 * Prefer explicit named re-exports for anything hooks call often, so Metro
 * never drops a binding via `export *` + Fast Refresh.
 */
export * from './generated/endpoints';
export {
  buyProperty,
  endTurn,
  getEndTurnUrl,
  getGame,
  getGetGameUrl,
  getRollDiceUrl,
  resignGame,
  rollDice,
  setPinColor,
} from './generated/endpoints';
