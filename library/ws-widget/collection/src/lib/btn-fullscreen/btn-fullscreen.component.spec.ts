import { BtnFullscreenComponent } from './btn-fullscreen.component'
import * as fsUtil from './fullscreen.util'

jest.mock('./fullscreen.util', () => ({
  getFullScreenElement: jest.fn(),
  requestExitFullScreen: jest.fn(),
  requestFullScreen: jest.fn(),
  hasFullScreenSupport: jest.fn(),
}))

const mockedUtil = fsUtil as jest.Mocked<typeof fsUtil>

describe('BtnFullscreenComponent', () => {
  let component: BtnFullscreenComponent

  beforeEach(() => {
    jest.clearAllMocks()
    mockedUtil.getFullScreenElement.mockReturnValue(null)
    mockedUtil.hasFullScreenSupport.mockReturnValue(true)
    component = new BtnFullscreenComponent()
  })

  it('should create with defaults', () => {
    expect(component).toBeTruthy()
    expect(component.id).toBe('fullscreen')
    expect(component.isInFs).toBe(false)
    expect(component.isFullScreenSupported).toBe(false)
    expect(component.fsChangeSubs).toBeNull()
  })

  describe('ngOnInit', () => {
    it('does nothing when there is no fsContainer', () => {
      component.widgetData = { fsContainer: null }

      component.ngOnInit()

      expect(component.fsChangeSubs).toBeNull()
      expect(component.isFullScreenSupported).toBe(false)
      expect(mockedUtil.hasFullScreenSupport).not.toHaveBeenCalled()
    })

    it('initializes fullscreen state and subscribes to fullscreenchange', () => {
      const container = document.createElement('div')
      component.widgetData = { fsContainer: container }

      component.ngOnInit()

      expect(component.fsChangeSubs).not.toBeNull()
      expect(mockedUtil.hasFullScreenSupport).toHaveBeenCalledWith(container)
      expect(component.isFullScreenSupported).toBe(true)
      expect(component.isInFs).toBe(false)
    })

    it('reflects the fullscreen element being present at init', () => {
      mockedUtil.getFullScreenElement.mockReturnValue(document.createElement('div') as any)
      component.widgetData = { fsContainer: document.createElement('div') }

      component.ngOnInit()

      expect(component.isInFs).toBe(true)
    })

    it('updates isInFs when a fullscreenchange event fires', () => {
      component.widgetData = { fsContainer: document.createElement('div') }
      component.ngOnInit()

      mockedUtil.getFullScreenElement.mockReturnValue(document.createElement('div') as any)
      document.dispatchEvent(new Event('fullscreenchange'))

      expect(component.isInFs).toBe(true)
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes from the fullscreenchange subscription', () => {
      component.widgetData = { fsContainer: document.createElement('div') }
      component.ngOnInit()
      const subs = component.fsChangeSubs!
      const spy = jest.spyOn(subs, 'unsubscribe')

      component.ngOnDestroy()

      expect(spy).toHaveBeenCalled()
    })

    it('is safe when no subscription exists', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })

  describe('toggleFs', () => {
    it('exits fullscreen and emits false when already in fullscreen', () => {
      mockedUtil.getFullScreenElement.mockReturnValue(document.createElement('div') as any)
      const emit = jest.spyOn(component.fsState, 'emit')

      component.toggleFs()

      expect(mockedUtil.requestExitFullScreen).toHaveBeenCalled()
      expect(emit).toHaveBeenCalledWith(false)
    })

    it('enters fullscreen, emits true and adds the background class', () => {
      mockedUtil.getFullScreenElement.mockReturnValue(null)
      const container = document.createElement('div')
      component.widgetData = { fsContainer: container }
      const emit = jest.spyOn(component.fsState, 'emit')

      component.toggleFs()

      expect(mockedUtil.requestFullScreen).toHaveBeenCalledWith(container)
      expect(emit).toHaveBeenCalledWith(true)
      expect(container.classList.contains('mat-app-background')).toBe(true)
    })

    it('swallows errors when adding the class fails', () => {
      mockedUtil.getFullScreenElement.mockReturnValue(null)
      const badContainer: any = {
        classList: {
          add: () => {
            throw new Error('no classList')
          },
        },
      }
      component.widgetData = { fsContainer: badContainer }

      expect(() => component.toggleFs()).not.toThrow()
      expect(mockedUtil.requestFullScreen).toHaveBeenCalledWith(badContainer)
    })

    it('does nothing to enter fullscreen when there is no container', () => {
      mockedUtil.getFullScreenElement.mockReturnValue(null)
      component.widgetData = { fsContainer: null }
      const emit = jest.spyOn(component.fsState, 'emit')

      component.toggleFs()

      expect(mockedUtil.requestFullScreen).not.toHaveBeenCalled()
      expect(mockedUtil.requestExitFullScreen).not.toHaveBeenCalled()
      expect(emit).not.toHaveBeenCalled()
    })
  })
})
