import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { CompetenciesHomeComponent } from './competencies-home.component'

describe('CompetenciesHomeComponent', () => {
  let component: CompetenciesHomeComponent
  let fixture: ComponentFixture<CompetenciesHomeComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CompetenciesHomeComponent],
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(CompetenciesHomeComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
