import { getFullScreenElement, requestFullScreen, requestExitFullScreen, hasFullScreenSupport } from './fullscreen.util'

describe('fullscreen.util', () => {
  const originalDocDescriptors: { [k: string]: PropertyDescriptor | undefined } = {}

  const defineDocProp = (prop: string, value: any) => {
    if (!(prop in originalDocDescriptors)) {
      originalDocDescriptors[prop] = Object.getOwnPropertyDescriptor(document, prop)
    }
    Object.defineProperty(document, prop, { value, configurable: true, writable: true })
  }

  afterEach(() => {
    // restore any document props we tampered with
    Object.keys(originalDocDescriptors).forEach(prop => {
      const desc = originalDocDescriptors[prop]
      if (desc) {
        Object.defineProperty(document, prop, desc)
      } else {
        // property didn't exist originally; blank it out
        Object.defineProperty(document, prop, { value: undefined, configurable: true, writable: true })
      }
      delete originalDocDescriptors[prop]
    })
    jest.clearAllMocks()
  })

  describe('getFullScreenElement', () => {
    it('returns the standard document.fullscreenElement when present', () => {
      const fakeEl = { id: 'std' } as unknown as HTMLElement
      defineDocProp('fullscreenElement', fakeEl)
      defineDocProp('webkitFullscreenElement', null)
      defineDocProp('mozFullScreenElement', null)
      defineDocProp('msFullscreenElement', null)
      expect(getFullScreenElement()).toBe(fakeEl)
    })

    it('falls back to webkitFullscreenElement', () => {
      const fakeEl = { id: 'webkit' } as unknown as HTMLElement
      defineDocProp('fullscreenElement', null)
      defineDocProp('webkitFullscreenElement', fakeEl)
      defineDocProp('mozFullScreenElement', null)
      defineDocProp('msFullscreenElement', null)
      expect(getFullScreenElement()).toBe(fakeEl)
    })

    it('falls back to mozFullScreenElement', () => {
      const fakeEl = { id: 'moz' } as unknown as HTMLElement
      defineDocProp('fullscreenElement', null)
      defineDocProp('webkitFullscreenElement', null)
      defineDocProp('mozFullScreenElement', fakeEl)
      defineDocProp('msFullscreenElement', null)
      expect(getFullScreenElement()).toBe(fakeEl)
    })

    it('falls back to msFullscreenElement', () => {
      const fakeEl = { id: 'ms' } as unknown as HTMLElement
      defineDocProp('fullscreenElement', null)
      defineDocProp('webkitFullscreenElement', null)
      defineDocProp('mozFullScreenElement', null)
      defineDocProp('msFullscreenElement', fakeEl)
      expect(getFullScreenElement()).toBe(fakeEl)
    })

    it('returns a falsy value when none are set', () => {
      defineDocProp('fullscreenElement', null)
      defineDocProp('webkitFullscreenElement', null)
      defineDocProp('mozFullScreenElement', null)
      defineDocProp('msFullscreenElement', null)
      expect(getFullScreenElement()).toBeFalsy()
    })
  })

  describe('requestFullScreen', () => {
    it('prefers the standard requestFullscreen', () => {
      const requestFullscreen = jest.fn()
      const elem = { requestFullscreen } as unknown as HTMLElement
      requestFullScreen(elem)
      expect(requestFullscreen).toHaveBeenCalledTimes(1)
    })

    it('uses mozRequestFullScreen when standard is missing', () => {
      const mozRequestFullScreen = jest.fn()
      const elem = { mozRequestFullScreen } as unknown as HTMLElement
      requestFullScreen(elem)
      expect(mozRequestFullScreen).toHaveBeenCalledTimes(1)
    })

    it('uses webkitRequestFullscreen when standard and moz are missing', () => {
      const webkitRequestFullscreen = jest.fn()
      const elem = { webkitRequestFullscreen } as unknown as HTMLElement
      requestFullScreen(elem)
      expect(webkitRequestFullscreen).toHaveBeenCalledTimes(1)
    })

    it('uses msRequestFullscreen as the last resort', () => {
      const msRequestFullscreen = jest.fn()
      const elem = { msRequestFullscreen } as unknown as HTMLElement
      requestFullScreen(elem)
      expect(msRequestFullscreen).toHaveBeenCalledTimes(1)
    })

    it('does nothing when no fullscreen API is available', () => {
      const elem = {} as unknown as HTMLElement
      expect(() => requestFullScreen(elem)).not.toThrow()
    })
  })

  describe('requestExitFullScreen', () => {
    it('prefers the standard exitFullscreen', () => {
      const exitFullscreen = jest.fn()
      defineDocProp('exitFullscreen', exitFullscreen)
      requestExitFullScreen()
      expect(exitFullscreen).toHaveBeenCalledTimes(1)
    })

    it('uses mozCancelFullScreen when standard is missing', () => {
      const mozCancelFullScreen = jest.fn()
      defineDocProp('exitFullscreen', undefined)
      defineDocProp('mozCancelFullScreen', mozCancelFullScreen)
      requestExitFullScreen()
      expect(mozCancelFullScreen).toHaveBeenCalledTimes(1)
    })

    it('uses webkitExitFullscreen when standard and moz are missing', () => {
      const webkitExitFullscreen = jest.fn()
      defineDocProp('exitFullscreen', undefined)
      defineDocProp('mozCancelFullScreen', undefined)
      defineDocProp('webkitExitFullscreen', webkitExitFullscreen)
      requestExitFullScreen()
      expect(webkitExitFullscreen).toHaveBeenCalledTimes(1)
    })

    it('uses msExitFullscreen as the last resort', () => {
      const msExitFullscreen = jest.fn()
      defineDocProp('exitFullscreen', undefined)
      defineDocProp('mozCancelFullScreen', undefined)
      defineDocProp('webkitExitFullscreen', undefined)
      defineDocProp('msExitFullscreen', msExitFullscreen)
      requestExitFullScreen()
      expect(msExitFullscreen).toHaveBeenCalledTimes(1)
    })

    it('does nothing when no exit API is available', () => {
      defineDocProp('exitFullscreen', undefined)
      defineDocProp('mozCancelFullScreen', undefined)
      defineDocProp('webkitExitFullscreen', undefined)
      defineDocProp('msExitFullscreen', undefined)
      expect(() => requestExitFullScreen()).not.toThrow()
    })
  })

  describe('hasFullScreenSupport', () => {
    it('returns true when the standard requestFullscreen exists', () => {
      const elem = { requestFullscreen: jest.fn() } as unknown as HTMLElement
      expect(hasFullScreenSupport(elem)).toBe(true)
    })

    it('returns true for a vendor-prefixed variant', () => {
      const elem = { webkitRequestFullscreen: jest.fn() } as unknown as HTMLElement
      expect(hasFullScreenSupport(elem)).toBe(true)
    })

    it('returns false when no fullscreen API is available', () => {
      const elem = {} as unknown as HTMLElement
      expect(hasFullScreenSupport(elem)).toBe(false)
    })
  })
})
