import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { PipeFilterModule, PipeHtmlTagRemovalModule, PipeOrderByModule, PipeRelativeTimeModule } from '@ws-widget/utils'

import { MatGridListModule } from '@angular/material/grid-list'

import { MatExpansionModule } from '@angular/material/expansion'

import { MatDividerModule } from '@angular/material/divider'

import { WidgetResolverModule } from '@ws-widget/resolver'

import { MatIconModule } from '@angular/material/icon'
import { MatListModule } from '@angular/material/list'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatDialogModule } from '@angular/material/dialog'
import { MatSelectModule } from '@angular/material/select'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MatCardModule } from '@angular/material/card'

import { ReactiveFormsModule, FormsModule } from '@angular/forms'

import { InitResolver } from './resolvers/init-resolve.service'

import { RouterModule } from '@angular/router'

import { HomeRoutingModule } from './home.rounting.module'

import { HomeComponent } from './routes/home/home.component'

import { UsersViewComponent } from './routes/users-view/users-view.component'

import { AvatarPhotoModule, BtnPageBackModule, LeftMenuModule, UITableModule } from '@ws-widget/collection'

import { AboutComponent } from './routes/about/about.component'


@NgModule({
  declarations: [
    HomeComponent,
    UsersViewComponent,
    AboutComponent,
  ],
  imports: [
    CommonModule,
    UITableModule,
    WidgetResolverModule,
    ReactiveFormsModule,
    HomeRoutingModule,
    LeftMenuModule,
    FormsModule,
    RouterModule,
    MatGridListModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatDividerModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatListModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatDialogModule,
    MatButtonModule,
    MatSidenavModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    PipeFilterModule,
    PipeHtmlTagRemovalModule,
    PipeRelativeTimeModule,
    AvatarPhotoModule,
    // EditorSharedModule,
    // CkEditorModule,
    PipeOrderByModule,
    BtnPageBackModule,
    WidgetResolverModule,
  ],
  providers: [
    // CKEditorService,
    // LoaderService,
    InitResolver,
  ],
})
export class HomeModule {

}
