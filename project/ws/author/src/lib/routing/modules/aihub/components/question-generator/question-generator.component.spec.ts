import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ReactiveFormsModule } from '@angular/forms'

import { QuestionGeneratorComponent } from './question-generator.component'

describe('QuestionGeneratorComponent', () => {
  let component: QuestionGeneratorComponent
  let fixture: ComponentFixture<QuestionGeneratorComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QuestionGeneratorComponent],
      imports: [ReactiveFormsModule],
      providers: [provideHttpClient(), provideHttpClientTesting()],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents()
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(QuestionGeneratorComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
