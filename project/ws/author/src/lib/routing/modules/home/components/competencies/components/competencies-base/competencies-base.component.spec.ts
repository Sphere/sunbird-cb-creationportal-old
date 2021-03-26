import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { CompetenciesBaseComponent } from './competencies-base.component'

describe('CompetenciesBaseComponent', () => {
  let component: CompetenciesBaseComponent
  let fixture: ComponentFixture<CompetenciesBaseComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CompetenciesBaseComponent],
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(CompetenciesBaseComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
