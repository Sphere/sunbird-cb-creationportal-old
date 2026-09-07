import { of } from 'rxjs'

import { ContentProgressComponent } from './content-progress.component'

describe('ContentProgressComponent', () => {
  let component: ContentProgressComponent
  let progressSvc: { getProgressFor: jest.Mock }

  beforeEach(() => {
    progressSvc = {
      getProgressFor: jest.fn().mockReturnValue(of(0)),
    }
    component = new ContentProgressComponent(progressSvc as any)
  })

  it('should create with default input values', () => {
    expect(component).toBeTruthy()
    expect(component.contentId).toBe('')
    expect(component.progress).toBe(0)
    expect(component.forPreview).toBe(false)
    expect(component.className).toBe('')
    expect(component.id).toContain('progress_')
  })

  describe('ngOnChanges', () => {
    it('should fetch progress when contentId set, no progress and not preview', () => {
      progressSvc.getProgressFor.mockReturnValue(of(0.5))
      component.contentId = 'do_123'
      component.progress = 0
      component.forPreview = false

      component.ngOnChanges()

      expect(progressSvc.getProgressFor).toHaveBeenCalledWith('do_123')
      // 0.5 -> Math.round(0.5*10000)/100 = 50 inside subscribe,
      // then the trailing block rounds 50 -> Math.round(50*10000)/100 = 5000
      expect(component.progress).toBe(5000)
    })

    it('should keep progress 0 when fetched value is 0', () => {
      progressSvc.getProgressFor.mockReturnValue(of(0))
      component.contentId = 'do_1'
      component.progress = 0
      component.forPreview = false

      component.ngOnChanges()

      expect(progressSvc.getProgressFor).toHaveBeenCalledWith('do_1')
      expect(component.progress).toBe(0)
    })

    it('should NOT fetch progress when forPreview is true', () => {
      component.contentId = 'do_1'
      component.progress = 0
      component.forPreview = true

      component.ngOnChanges()

      expect(progressSvc.getProgressFor).not.toHaveBeenCalled()
    })

    it('should NOT fetch progress when contentId is empty', () => {
      component.contentId = ''
      component.progress = 0
      component.forPreview = false

      component.ngOnChanges()

      expect(progressSvc.getProgressFor).not.toHaveBeenCalled()
    })

    it('should NOT fetch when progress already set, but round the existing progress', () => {
      component.contentId = 'do_1'
      component.progress = 0.5
      component.forPreview = false

      component.ngOnChanges()

      expect(progressSvc.getProgressFor).not.toHaveBeenCalled()
      // Math.round(0.5*10000)/100 = 50
      expect(component.progress).toBe(50)
    })

    it('should leave progress at 0 when no contentId and no progress', () => {
      component.contentId = ''
      component.progress = 0
      component.forPreview = false

      component.ngOnChanges()

      expect(component.progress).toBe(0)
    })
  })
})
