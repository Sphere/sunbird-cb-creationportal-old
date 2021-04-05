import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { CompDraftComponent } from './comp-draft.component'

describe('CompDraftComponent', () => {
  let component: CompDraftComponent
  let fixture: ComponentFixture<CompDraftComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [CompDraftComponent],
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(CompDraftComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
