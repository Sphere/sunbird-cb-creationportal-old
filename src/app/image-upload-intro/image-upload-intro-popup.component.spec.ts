import { async, ComponentFixture, TestBed } from '@angular/core/testing'

import { ImageUploadIntroPopupComponent } from './image-upload-intro-popup.component'

describe('ImageUploadIntroPopupComponent', () => {
  let component: ImageUploadIntroPopupComponent
  let fixture: ComponentFixture<ImageUploadIntroPopupComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ImageUploadIntroPopupComponent]
    })
      .compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageUploadIntroPopupComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
