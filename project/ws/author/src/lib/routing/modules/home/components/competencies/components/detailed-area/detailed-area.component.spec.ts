import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { DetailedAreaComponent } from './detailed-area.component'

describe('DetailedAreaComponent', () => {
  let component: DetailedAreaComponent
  let fixture: ComponentFixture<DetailedAreaComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DetailedAreaComponent],
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailedAreaComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
