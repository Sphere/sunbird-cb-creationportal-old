import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { ReviewerChecklist } from './reviewer-checklist.component'

describe('ReviewerChecklist', () => {
  let component: ReviewerChecklist
  let fixture: ComponentFixture<ReviewerChecklist>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ReviewerChecklist],
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(ReviewerChecklist)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
