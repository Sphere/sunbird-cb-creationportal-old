import { DragDropModule } from '@angular/cdk/drag-drop'
import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { MatTreeModule } from '@angular/material/tree'
import { SharedModule } from '@ws/author/src/lib/modules/shared/shared.module'
import { AuthViewerModule } from '@ws/author/src/lib/modules/viewer/viewer.module'
import { EditorSharedModule } from '@ws/author/src/lib/routing/modules/editor/shared/shared.module'
import { CurateModule } from './../curate/curate.module'
import { UploadModule } from './../upload/upload.module'
import { CollectionRoutingModule } from './collection-routing.module'
import { AuthCollectionMatmenuComponent } from './components/auth-collection-matmenu/auth-collection-matmenu.component'
import { AuthEditorOptionsComponent } from './components/auth-editor-options/auth-editor-options.component'
import { AuthTableOfContentsComponent } from './components/auth-table-of-contents/auth-table-of-contents.component'
import { AuthTableTreeLabelComponent } from './components/auth-table-tree-label/auth-table-tree-label.component'
import { CollectionComponent } from './components/collection/collection.component'
import { CourseCollectionComponent } from './components/course-collection/course-collection.component'
import { AuthTocComponent } from './components/auth-toc/auth-toc.component'
import { QuizModule } from './../quiz/quiz.module'
import { CourseHeaderComponent } from './components/course-header/course-header.component'
import { BtnPageBackModule } from '@ws-widget/collection'
import { WebPageModule } from './../web-page/web-page.module'
import { ContentQualityComponent } from '../../../shared/components/content-quality/content-quality.component'
import { FormatDurationPipe } from '@ws/author/src/lib/modules/shared/pipes/seconds-to-hour.pipe'
import { MimeTypePipe } from '@ws/author/src/lib/modules/shared/pipes/mime-type.pipe'

import {
  MatToolbarModule,
  MatIconModule,
  MatButtonModule,
  MatTooltipModule,
  MatCheckboxModule,
  MatProgressBarModule,
  MatRadioModule,
  MatTableModule
} from '@angular/material'
import { ResourceModuleComponent } from './components/collection/resource-module/resource-module.component'
import { ModuleCreationComponent } from './components/collection/module-creation/module-creation.component'

@NgModule({
  declarations: [
    CollectionComponent,
    AuthTableOfContentsComponent,
    AuthEditorOptionsComponent,
    AuthTableTreeLabelComponent,
    AuthCollectionMatmenuComponent,
    CourseCollectionComponent,
    AuthTocComponent,
    CourseHeaderComponent,
    ResourceModuleComponent,
    ModuleCreationComponent,
    ContentQualityComponent,
    FormatDurationPipe,
    MimeTypePipe
  ],
  imports: [
    CommonModule,
    CollectionRoutingModule,
    SharedModule,
    EditorSharedModule,
    MatTreeModule,
    DragDropModule,
    AuthViewerModule,
    UploadModule,
    CurateModule,
    QuizModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    BtnPageBackModule,
    WebPageModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatRadioModule,
    MatTableModule
  ],
})
export class CollectionModule { }
