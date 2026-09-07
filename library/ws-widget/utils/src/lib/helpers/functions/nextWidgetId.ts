let counter = 0

/**
 * A unique DOM id for a widget instance.
 *
 * Replaces `id = \`prefix_${Math.random()}\``, which Sonar flags (S2245) because
 * `Math.random()` is not a cryptographic PRNG. These ids are not security
 * sensitive, but a counter is also simply better: it is collision-*free* rather
 * than merely collision-unlikely, and the ids are stable and readable.
 *
 * The counter is module-level and therefore shared across every caller, so two
 * different components using the same prefix (card-content and card-table both
 * use `ws-card_`) can never produce the same id.
 *
 * @param prefix identifies the widget, e.g. `ws-card_`
 */
export function nextWidgetId(prefix: string): string {
  counter += 1
  return `${prefix}${counter}`
}
