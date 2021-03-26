import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { DetailedCompetencyComponent } from './detailed-competency.component'

describe('DetailedCompetencyComponent', () => {
  let component: DetailedCompetencyComponent
  let fixture: ComponentFixture<DetailedCompetencyComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DetailedCompetencyComponent],
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailedCompetencyComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
