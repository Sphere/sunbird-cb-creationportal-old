import { ComponentFixture, TestBed } from '@angular/core/testing'

import { AuthInitService } from '@ws/author/src/lib/services/init.service'

import { ProgressStepperComponent } from './progress-stepper.component'

describe('ProgressStepperComponent', () => {
  let component: ProgressStepperComponent
  let fixture: ComponentFixture<ProgressStepperComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProgressStepperComponent],
      providers: [AuthInitService],
    }).compileComponents()
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(ProgressStepperComponent)
    component = fixture.componentInstance
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('navigate', () => {
    it('should not navigate when the current step is "Introduction"', () => {
      component.steps = [
        { label: '1. Introduction', key: 'Introduction', activeStep: false, completed: true },
        { label: '2. Course Details', key: 'CourseDetails', activeStep: true, completed: false },
        { label: '3. Course Builder', key: 'CourseBuilder', activeStep: false, completed: false },
        { label: '4. Course Settings', key: 'CourseSettings', activeStep: false, completed: false },
      ]
      const emitSpy = jest.spyOn(component.sendSteps, 'emit')
      component.navigate('Introduction')
      expect(emitSpy).not.toHaveBeenCalled()
    })

    it('should not navigate when the current step is "AssessmentDetails"', () => {
      component.steps = [
        { label: '1. Self Assessment Details', key: 'AssessmentDetails', activeStep: false, completed: true },
        { label: '2. Self Assessment Builder', key: 'AssessmentBuilder', activeStep: true, completed: false },
        { label: '3. Self Assessment Settings', key: 'AssessmentSettings', activeStep: false, completed: false },
      ]
      const emitSpy = jest.spyOn(component.sendSteps, 'emit')
      component.navigate('AssessmentDetails')
      expect(emitSpy).not.toHaveBeenCalled()
    })

    it('should not navigate when the active index is 0', () => {
      component.steps = [
        { label: '1. Course Details', key: 'CourseDetails', activeStep: true, completed: false },
        { label: '2. Course Builder', key: 'CourseBuilder', activeStep: false, completed: false },
      ]
      const emitSpy = jest.spyOn(component.sendSteps, 'emit')
      component.navigate('CourseBuilder')
      expect(emitSpy).not.toHaveBeenCalled()
    })

    it('should navigate backwards to a previous step and emit', () => {
      component.steps = [
        { label: '1. Introduction', key: 'Introduction', activeStep: false, completed: true },
        { label: '2. Course Details', key: 'CourseDetails', activeStep: false, completed: true },
        { label: '3. Course Builder', key: 'CourseBuilder', activeStep: true, completed: false },
        { label: '4. Course Settings', key: 'CourseSettings', activeStep: false, completed: false },
      ]
      const emitSpy = jest.spyOn(component.sendSteps, 'emit')
      const navSpy = jest.spyOn((component as any).initService, 'currentNavigations').mockImplementation(() => {})
      component.navigate('CourseDetails')
      expect(component.isNavigating).toBe(true)
      expect(component.navigatingStep).toBe('CourseDetails')
      expect(emitSpy).toHaveBeenCalledWith('CourseDetails')
      expect(navSpy).toHaveBeenCalledWith('CourseDetails')
    })

    it('should not navigate forward to a later step', () => {
      component.steps = [
        { label: '1. Introduction', key: 'Introduction', activeStep: false, completed: true },
        { label: '2. Course Details', key: 'CourseDetails', activeStep: true, completed: false },
        { label: '3. Course Builder', key: 'CourseBuilder', activeStep: false, completed: false },
        { label: '4. Course Settings', key: 'CourseSettings', activeStep: false, completed: false },
      ]
      const emitSpy = jest.spyOn(component.sendSteps, 'emit')
      component.navigate('CourseSettings')
      expect(emitSpy).not.toHaveBeenCalled()
    })

    it('should ignore navigation while already navigating', () => {
      component.isNavigating = true
      const emitSpy = jest.spyOn(component.sendSteps, 'emit')
      component.navigate('CourseDetails')
      expect(emitSpy).not.toHaveBeenCalled()
    })
  })

  describe('stopNavigating', () => {
    it('should reset the navigating state', () => {
      component.isNavigating = true
      component.navigatingStep = 'CourseDetails'
      component.stopNavigating()
      expect(component.isNavigating).toBe(false)
      expect(component.navigatingStep).toBe('')
    })
  })

  describe('ngOnChanges', () => {
    it('should stop navigating when steps change after the first change while navigating', () => {
      component.isNavigating = true
      const spy = jest.spyOn(component, 'stopNavigating')
      component.ngOnChanges({
        steps: { firstChange: false, currentValue: [], previousValue: [], isFirstChange: () => false },
      })
      expect(spy).toHaveBeenCalled()
    })

    it('should not stop navigating on the first change', () => {
      component.isNavigating = true
      const spy = jest.spyOn(component, 'stopNavigating')
      component.ngOnChanges({
        steps: { firstChange: true, currentValue: [], previousValue: undefined, isFirstChange: () => true },
      })
      expect(spy).not.toHaveBeenCalled()
    })

    it('should not stop navigating when not currently navigating', () => {
      component.isNavigating = false
      const spy = jest.spyOn(component, 'stopNavigating')
      component.ngOnChanges({
        steps: { firstChange: false, currentValue: [], previousValue: [], isFirstChange: () => false },
      })
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('Next button', () => {
    it('should render the Next button by default', () => {
      fixture.detectChanges()
      const btn = fixture.nativeElement.querySelector('.stepper-next-btn')
      expect(btn).toBeTruthy()
    })

    it('should hide the Next button when hideNext is true', () => {
      component.hideNext = true
      fixture.detectChanges()
      const btn = fixture.nativeElement.querySelector('.stepper-next-btn')
      expect(btn).toBeFalsy()
    })

    it('should hide the Next button while navigating', () => {
      component.isNavigating = true
      fixture.detectChanges()
      const btn = fixture.nativeElement.querySelector('.stepper-next-btn')
      expect(btn).toBeFalsy()
    })

    it('should emit onNext when the Next button is clicked', () => {
      component.hideNext = false
      fixture.detectChanges()
      const emitSpy = jest.spyOn(component.onNext, 'emit')
      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.stepper-next-btn')
      btn.click()
      expect(emitSpy).toHaveBeenCalled()
    })
  })
})
