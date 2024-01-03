import { TestBed, async, ComponentFixture } from '@angular/core/testing'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { MatIconModule } from '@angular/material/icon'
import { ImageUploadIntroPopupComponent } from './image-upload-intro-popup.component'
import { ConfigurationsService } from '@ws-widget/utils'

describe('ImageUploadIntroPopupComponent', () => {
  let component: ImageUploadIntroPopupComponent
  let fixture: ComponentFixture<ImageUploadIntroPopupComponent>

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ImageUploadIntroPopupComponent],
      imports: [MatDialogModule, HttpClientTestingModule, MatIconModule],
      providers: [
        ConfigurationsService,
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
      ],
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageUploadIntroPopupComponent)
    component = fixture.componentInstance
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  function getImageSrc(index: number): string | null {
    const images = fixture.debugElement.nativeElement.querySelectorAll('.help-image')
    if (images && images.length > index) {
      return images[index].getAttribute('src')
    }
    return null
  }

  it('should display images when uploadImageInto is set', () => {
    // Set the uploadImageInto property
    component.uploadImageInto = {
      first: 'path/to/first-image.jpg',
      second: 'path/to/second-image.jpg',
      third: 'path/to/third-image.jpg'
    }
    fixture.detectChanges()
    // Assert the src attribute of each image
    expect(getImageSrc(0)).toContain('path/to/first-image.jpg')
    expect(getImageSrc(1)).toContain('path/to/second-image.jpg')
    expect(getImageSrc(2)).toContain('path/to/third-image.jpg')
  })
})
