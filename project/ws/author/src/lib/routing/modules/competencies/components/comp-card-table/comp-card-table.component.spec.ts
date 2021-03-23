import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { compCardTableComponent } from './comp-card-table.component'

describe('compCardTableComponent', () => {
  let component: compCardTableComponent
  let fixture: ComponentFixture<compCardTableComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [compCardTableComponent],
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(compCardTableComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
