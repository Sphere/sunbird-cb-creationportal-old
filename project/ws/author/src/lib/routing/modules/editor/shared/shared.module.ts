import { CommonModule } from '@angular/common'
import { TextFieldModule } from '@angular/cdk/text-field'

import { NgModule } from '@angular/core'

import { DisplayContentTypeModule } from '@ws-widget/collection'

import { DefaultThumbnailModule, PipeDurationTransformModule } from '@ws-widget/utils'

import { SharedModule } from '@ws/author/src/lib/modules/shared/shared.module'

import { AceEditorCompatModule } from '@ws-widget/utils'

import { CKEditorModule } from 'ckeditor4-angular'

import { CatalogSelectModule } from '../shared/components/catalog-select/catalog-select.module'

import { AceEditorComponent } from './components/ace-editor/ace-editor.component'

import { AuthEditorActionButtonsComponent } from './components/auth-editor-action-buttons/auth-editor-action-buttons.component'

import { AuthLanguageSelectBarComponent } from './components/auth-language-select-bar/auth-language-select-bar.component'

import { AuthPickerComponent } from './components/auth-picker/auth-picker.component'

import { EditMetaComponent } from './components/edit-meta/edit-meta.component'

import { PlainCKEditorComponent } from './components/plain-ckeditor/plain-ckeditor.component'

import { QuillComponent } from './components/rich-text-editor/quill.component'

import { DragDropDirective } from './directives/drag-drop.directive'

import { UploadService } from './services/upload.service'

import { BackNavigateService } from './services/backNavigate.service'

import { CourseSettingsComponent } from './components/course-settings/course-settings.component'

import { ContentQualityService } from './services/content-quality.service'

@NgModule({
  declarations: [
    QuillComponent,
    PlainCKEditorComponent,
    EditMetaComponent,
    DragDropDirective,
    AceEditorComponent,
    AuthLanguageSelectBarComponent,
    AuthPickerComponent,
    AuthEditorActionButtonsComponent,
    CourseSettingsComponent,
  ],
  imports: [
    CommonModule,
    TextFieldModule,
    DefaultThumbnailModule,
    PipeDurationTransformModule,
    DisplayContentTypeModule,
    CKEditorModule,
    SharedModule,
    AceEditorCompatModule,
    CatalogSelectModule,
  ],
  exports: [
    QuillComponent,
    PlainCKEditorComponent,
    EditMetaComponent,
    DragDropDirective,
    AceEditorComponent,
    AuthEditorActionButtonsComponent,
    AuthPickerComponent,
    CourseSettingsComponent,
  ],
  providers: [UploadService, BackNavigateService, ContentQualityService],
})
export class EditorSharedModule {}
