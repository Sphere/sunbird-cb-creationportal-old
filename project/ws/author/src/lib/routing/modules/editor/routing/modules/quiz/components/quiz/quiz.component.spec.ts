import { QuizComponent } from './quiz.component'
import { MatIconModule, MatCardModule } from '@angular/material'
import { ComponentFixture, TestBed, async } from '@angular/core/testing'

describe('QuizComponent', () => {
  let fixture: ComponentFixture<QuizComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [QuizComponent],
      imports: [MatIconModule, MatCardModule],
      providers: [],
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(QuizComponent)
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy()
  })
})
