import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { RouterTestingModule } from '@angular/router/testing'

import { AuthInitService } from '@ws/author/src/lib/services/init.service'

import { PageTrackComponent } from './page-track.component'

describe('PageTrackComponent', () => {
  let component: PageTrackComponent
  let fixture: ComponentFixture<PageTrackComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PageTrackComponent],
      imports: [RouterTestingModule],
      providers: [AuthInitService],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents()
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(PageTrackComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
