import { TestBed, ComponentFixture } from '@angular/core/testing'
import { ModuleCreationComponent } from './module-creation.component'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { MatGridListModule } from '@angular/material/grid-list'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatIconModule } from '@angular/material/icon'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatFormFieldModule } from '@angular/material/form-field'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatInputModule } from '@angular/material/input'
import { MatRadioModule } from '@angular/material/radio'
import { MatChipsModule } from '@angular/material/chips'
import { MatAutocompleteModule } from '@angular/material/autocomplete'
import { MatSelectModule } from '@angular/material/select'
import { Router, RouterModule, ActivatedRoute } from '@angular/router'
import { CourseSettingsComponent } from '../../../../../../../editor/shared/components/course-settings/course-settings.component'
import { FormatDurationPipe } from '../../../../../../../../../../../../author/src/lib/modules/shared/pipes/seconds-to-hour.pipe'
import { MimeTypePipe } from '../../../../../../../../../../../../author/src/lib/modules/shared/pipes/mime-type.pipe'
import { APP_BASE_HREF } from '@angular/common'
import { AuthInitService } from '../../../../../../../../../services/init.service'
import { EditorContentService } from '../../../../../../../../../../lib/routing/modules/editor/services/editor-content.service'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import { MatDialog } from '@angular/material/dialog'
import { ProfanityService } from '../../../../upload/services/profanity.service'
import { MatSnackBar } from '@angular/material/snack-bar'
import { UploadService } from '../../../../../../shared/services/upload.service'
import { QuizStoreService } from '../../../../quiz/services/store.service'
import { QuizResolverService } from '../../../../quiz/services/resolver.service'
import { Subject, of, BehaviorSubject } from 'rxjs'
import { ZipJSResolverService } from '../../../../../../../../../../../../author/src/lib/services/zip-js-resolve.service'

describe('ModuleCreationComponent without extractFile()', () => {
  let component: ModuleCreationComponent
  let fixture: ComponentFixture<ModuleCreationComponent>
  let mockContentService: Partial<EditorContentService>

  beforeEach(async () => {
    mockContentService = {
      changeActiveCont: new BehaviorSubject<string>('initial value'),
    }

    await TestBed.configureTestingModule({
      declarations: [
        ModuleCreationComponent,
        CourseSettingsComponent,
        FormatDurationPipe,
        MimeTypePipe,
      ],
      imports: [
        BrowserAnimationsModule,
        MatGridListModule,
        MatToolbarModule,
        MatSidenavModule,
        MatTooltipModule,
        MatIconModule,
        MatCheckboxModule,
        MatFormFieldModule,
        FormsModule,
        ReactiveFormsModule,
        MatInputModule,
        MatRadioModule,
        MatChipsModule,
        MatAutocompleteModule,
        MatSelectModule,
        RouterModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: EditorContentService, useValue: mockContentService },
        { provide: APP_BASE_HREF, useValue: '/' },
        { provide: AuthInitService, useValue: { backToHomeMessage: new Subject<any>(), changeActiveCont: of({}), updateResourceMessage: new Subject<any>() } },
        { provide: Router, useValue: {} },
        { provide: MatDialog, useValue: {} },
        { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
        { provide: ProfanityService, useValue: {} },
        { provide: MatSnackBar, useValue: {} },
        { provide: UploadService, useValue: {} },
        { provide: QuizStoreService, useValue: {} },
        { provide: QuizResolverService, useValue: {} },
        { provide: ZipJSResolverService, useValue: {} },
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(ModuleCreationComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should toggle showChildren property from false to true', () => {
    const module = { identifier: 'module1' }
    component.showChildrenMap[module.identifier] = false

    component.toggleChildren(module)

    expect(component.showChildrenMap[module.identifier]).toBe(true)
  })

  it('should toggle showChildren property from true to false', () => {
    const module = { identifier: 'module1' }
    component.showChildrenMap[module.identifier] = true

    component.toggleChildren(module)

    expect(component.showChildrenMap[module.identifier]).toBe(false)
  })

  it('should not change other modules\' showChildren properties', () => {
    const module1 = { identifier: 'module1' }
    const module2 = { identifier: 'module2' }

    component.showChildrenMap[module1.identifier] = true
    component.showChildrenMap[module2.identifier] = false

    component.toggleChildren(module1)

    expect(component.showChildrenMap[module1.identifier]).toBe(false)
    expect(component.showChildrenMap[module2.identifier]).toBe(false)
  })

})
