import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { AuthorCardComponent } from './author-card.component'

import { WidgetResolverModule } from '@ws-widget/resolver'

import { RouterModule } from '@angular/router'

import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { AvatarPhotoModule } from '../_common/avatar-photo/avatar-photo.module'


@NgModule({
  declarations: [AuthorCardComponent],
  imports: [CommonModule, WidgetResolverModule, RouterModule, MatCardModule, MatIconModule, AvatarPhotoModule],
  exports: [AuthorCardComponent],
})
export class AuthorCardModule { }
