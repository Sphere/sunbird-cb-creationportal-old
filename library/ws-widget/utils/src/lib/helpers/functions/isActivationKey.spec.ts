import { isActivationKey } from './isActivationKey'

describe('isActivationKey', () => {
  const keyEvent = (key: string) => {
    const event = { key, preventDefault: jest.fn() }
    return event as unknown as KeyboardEvent & { preventDefault: jest.Mock }
  }

  describe('activation keys', () => {
    it.each(['Enter', ' ', 'Spacebar'])('returns true for %j', key => {
      expect(isActivationKey(keyEvent(key))).toBe(true)
    })

    it.each(['Enter', ' ', 'Spacebar'])('calls preventDefault for %j so Space does not scroll and Enter does not submit', key => {
      const event = keyEvent(key)
      isActivationKey(event)
      expect(event.preventDefault).toHaveBeenCalledTimes(1)
    })
  })

  describe('non-activation keys', () => {
    // Tab and the arrows must stay usable for keyboard navigation — this is the
    // regression the previous `(keydown)="doThing()"` fixes introduced.
    it.each(['Tab', 'Escape', 'ArrowDown', 'ArrowUp', 'a', 'Shift', 'Backspace'])('returns false for %j', key => {
      expect(isActivationKey(keyEvent(key))).toBe(false)
    })

    it.each(['Tab', 'Escape', 'ArrowDown'])('does not call preventDefault for %j', key => {
      const event = keyEvent(key)
      isActivationKey(event)
      expect(event.preventDefault).not.toHaveBeenCalled()
    })
  })

  it('is safe to call twice on the same event (multi-statement templates)', () => {
    const event = keyEvent('Enter')
    expect(isActivationKey(event)).toBe(true)
    expect(isActivationKey(event)).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledTimes(2)
  })

  it('guards a click action so it runs only for activation keys', () => {
    const action = jest.fn()
    // mirrors the template form: isActivationKey($event) && (action())
    for (const key of ['Enter', ' ', 'Tab', 'Escape']) {
      // eslint-disable-next-line no-unused-expressions
      isActivationKey(keyEvent(key)) && action()
    }
    expect(action).toHaveBeenCalledTimes(2)
  })
})
