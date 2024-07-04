import { ComponentFixture, TestBed } from '@angular/core/testing'
import { AuthInitService } from '@ws/author/src/lib/services/init.service'
import { ProgressStepperComponent } from './progress-stepper.component'

describe('ProgressStepperComponent', () => {
  let component: ProgressStepperComponent
  let fixture: ComponentFixture<ProgressStepperComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProgressStepperComponent],
      providers: [AuthInitService]
    }).compileComponents()
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(ProgressStepperComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })


  describe('navigate', () => {

    it('should not navigate when the current step is "Introduction"', () => {
      const steps = [
        { label: '1. Introduction', key: 'Introduction', activeStep: false, completed: true },
        { label: '2. Course Details', key: 'CourseDetails', activeStep: true, completed: false },
        { label: '3. Course Builder', key: 'CourseBuilder', activeStep: false, completed: false },
        { label: '4. Course Settings', key: 'CourseSettings', activeStep: false, completed: false }
      ]
      component.steps = steps
      spyOn(component.sendSteps, 'emit')
      component.navigate('Introduction')
      expect(component.sendSteps.emit).not.toHaveBeenCalled()
    })

    it('should not navigate when the current step is "AssessmentDetails"', () => {
      const steps = [
        { label: '1. Self Assessment Details', key: 'AssessmentDetails', activeStep: false, completed: true },
        { label: '2. Self Assessment Builder', key: 'AssessmentBuilder', activeStep: true, completed: false },
        { label: '3. Self Assessment Settings', key: 'AssessmentSettings', activeStep: false, completed: false }
      ]
      component.steps = steps
      spyOn(component.sendSteps, 'emit')
      component.navigate('AssessmentDetails')
      expect(component.sendSteps.emit).not.toHaveBeenCalled()
    })

    it('should not navigate when the active index is 0', () => {
      const steps = [
        { label: '1. Self Assessment Details', key: 'AssessmentDetails', activeStep: false, completed: true },
        { label: '2. Self Assessment Builder', key: 'AssessmentBuilder', activeStep: true, completed: false },
        { label: '3. Self Assessment Settings', key: 'AssessmentSettings', activeStep: false, completed: false }
      ]
      component.steps = steps
      spyOn(component.sendSteps, 'emit')
      component.navigate('AssessmentDetails')
      expect(component.sendSteps.emit).not.toHaveBeenCalled()
    })
  })
})
