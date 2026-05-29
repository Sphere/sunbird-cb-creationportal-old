import { NgModule } from '@angular/core'

import { ProfileAcademicsComponent } from './profile-academics.component'

import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatChipsModule } from '@angular/material/chips'
import { MatDividerModule } from '@angular/material/divider'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { BrowserModule } from '@angular/platform-browser'

import { PipeOrderByModule } from '@ws-widget/utils'


@NgModule({
  declarations: [ProfileAcademicsComponent],
  imports: [BrowserModule, MatButtonModule, MatCardModule, MatChipsModule,
    MatDividerModule, MatExpansionModule, MatIconModule, MatProgressSpinnerModule, PipeOrderByModule],
})
export class ProfileAcademicsModule {

}
