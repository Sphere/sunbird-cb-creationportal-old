import { ComponentFixture, TestBed } from '@angular/core/testing'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { CommentsViewComponent } from './comments-view.component'

describe('CommentsViewComponent', () => {
  let component: CommentsViewComponent
  let fixture: ComponentFixture<CommentsViewComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CommentsViewComponent],
      providers: [
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
        { provide: MAT_DIALOG_DATA, useValue: { comment: 'Test Comment' } }
      ]

    })
      .compileComponents()
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(CommentsViewComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should display the comment', () => {
    const compiled = fixture.nativeElement
    expect(compiled.querySelector('span').textContent).toContain('Test Comment')
  })

  it('should display the correct comment content', () => {
    component.data.comment = 'Another Test Comment'
    fixture.detectChanges()
    const compiled = fixture.nativeElement
    expect(compiled.querySelector('span').textContent).toContain('Another Test Comment')
  })

})
