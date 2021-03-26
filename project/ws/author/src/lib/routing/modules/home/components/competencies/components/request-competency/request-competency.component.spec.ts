import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { RequestCompetencyComponent } from './request-competency.component'

describe('RequestCompetencyComponent', () => {
  let component: RequestCompetencyComponent
  let fixture: ComponentFixture<RequestCompetencyComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [RequestCompetencyComponent],
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(RequestCompetencyComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
