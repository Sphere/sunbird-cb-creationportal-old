import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { MatDialogModule } from '@angular/material/dialog'
import { BtnProfileComponent } from './btn-profile.component'

import { WidgetResolverModule } from '@ws-widget/resolver/src/public-api'

import { RouterModule } from '@angular/router'

import { LogoutModule } from '@ws-widget/utils'

import { AvatarPhotoModule } from '../_common/avatar-photo/avatar-photo.module'

// import { TreeCatalogModule } from '../tree-catalog/tree-catalog.module'


@NgModule({
  declarations: [BtnProfileComponent],
  imports: [
    AvatarPhotoModule,
    CommonModule,
    LogoutModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatSlideToggleModule,
    RouterModule,
    WidgetResolverModule,

  ],
})
export class BtnProfileModule { }
