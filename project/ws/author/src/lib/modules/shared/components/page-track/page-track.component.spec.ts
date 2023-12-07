import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { PageTrackComponent } from './page-track.component'

describe('StatusTrackComponent', () => {
  let component: PageTrackComponent
  let fixture: ComponentFixture<PageTrackComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PageTrackComponent],
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(PageTrackComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
