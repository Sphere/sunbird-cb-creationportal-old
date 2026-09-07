/**
 * Keyboard equivalent for a `(click)` handler on a non-native control.
 *
 * Native controls (`<button>`, `<a href>`, `<input type="button">`) already fire
 * their click handler on Enter/Space. Elements such as `<div>`, `<span>` and
 * `<mat-icon>` do not, so a `(click)`-only binding is unreachable for keyboard
 * and screen-reader users. Pair each such `(click)` with:
 *
 * ```html
 * <div (click)="doThing()" (keydown)="isActivationKey($event) && doThing()" [attr.tabindex]="0">
 * ```
 *
 * Only Enter and Space activate — matching native button behaviour — so keys
 * used for navigation (Tab, arrows, Escape) never trigger the action. Space is
 * prevented from scrolling the page, and Enter from submitting an enclosing
 * form, only when the key is actually an activation key.
 *
 * @param event the keyboard event from a `(keydown)` binding
 * @returns true when the caller should run its click action
 */
export function isActivationKey(event: KeyboardEvent): boolean {
  if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') {
    return false
  }
  event.preventDefault()
  return true
}
