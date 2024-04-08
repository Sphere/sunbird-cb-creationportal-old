import { ComponentFixture, TestBed } from '@angular/core/testing'
import { QuizComponent } from './quiz.component'
import { UploadService } from '@ws/author/src/lib/routing/modules/editor/shared/services/upload.service'
import { MatMenuModule } from '@angular/material/menu'
import { MatIconModule } from '@angular/material/icon'
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatFormFieldModule } from '@angular/material/form-field'
import { QuestionEditorComponent } from './../question-editor/question-editor.component'
import { CUSTOM_ELEMENTS_SCHEMA, InjectionToken } from '@angular/core'
import { ViewerComponent } from '../../../../../../../components/viewer/viewer.component'
import { EditMetaComponent } from '../../../../../shared/components/edit-meta/edit-meta.component'
import { QuestionEditorSidenavComponent } from '../../shared/components/question-editor-sidenav/question-editor-sidenav.component'
import { PipeSafeSanitizerPipe } from '../../../../../../../../../../../../../library/ws-widget/utils/src/lib/pipes/pipe-safe-sanitizer/pipe-safe-sanitizer.pipe'
import { CommonModule } from '@angular/common'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatChipsModule } from '@angular/material/chips'
import { MatAutocompleteModule } from '@angular/material/autocomplete'
export const appBaseHrefToken = new InjectionToken<string>('appBaseHref')

describe('QuizComponent', () => {
  let component: QuizComponent
  let fixture: ComponentFixture<QuizComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        QuizComponent,
        ViewerComponent,
        EditMetaComponent,
        PipeSafeSanitizerPipe,
        QuestionEditorSidenavComponent,
        QuestionEditorComponent
      ],
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatInputModule,
        MatSelectModule,
        MatChipsModule,
        MatAutocompleteModule,
        MatMenuModule,
        MatIconModule,
        MatSidenavModule,
        MatFormFieldModule
      ],
      providers: [
        UploadService,
        { provide: appBaseHrefToken, useValue: '/' }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents()
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(QuizComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should display loader overlay when isLoading is true', () => {
    component.isLoading = true
    fixture.detectChanges()
    const overlayElement = fixture.nativeElement.querySelector('.overlay')
    expect(overlayElement).toBeTruthy()
  })


  it('should display quiz details section for Assessment type', () => {
    component.isQuiz = 'Assessment'
    component.questionsArr = [{}, {}]
    fixture.detectChanges()
    const passPercentageInput = fixture.nativeElement.querySelector('input[placeholder="Enter pass percentage"]')
    const durationInput = fixture.nativeElement.querySelector('input[placeholder="Enter duration"]')
    const randomCountInput = fixture.nativeElement.querySelector('input[placeholder="Enter Random Question Count"]')
    expect(passPercentageInput).toBeTruthy()
    expect(durationInput).toBeTruthy()
    expect(randomCountInput).toBeTruthy()
  })

  it('should enable navigation buttons based on quiz index', () => {
    component.questionsArr = [{}, {}, {}]
    component.selectedQuizIndex = 1
    fixture.detectChanges()
    const prevButton = fixture.nativeElement.querySelector('button[aria-label="navigate to next quiz"]')
    const nextButton = fixture.nativeElement.querySelector('button[aria-label="navigate to previous quiz"]')
    expect(prevButton.disabled).toBe(false)
    expect(nextButton.disabled).toBe(false)
  })

  it('should enable and handle action buttons based on conditions', () => {
    component.canEditJson = true
    component.isCreatorEnable = true
    component.passPercentage = 80
    component.assessmentDuration = 10
    fixture.detectChanges()
    const saveButton = fixture.nativeElement.querySelector('#assessmentSave')
    expect(saveButton.disabled).toBe(false)
  })
})
