import { NgModule } from '@angular/core'

import { FormsModule, ReactiveFormsModule } from '@angular/forms'

import { CommonModule } from '@angular/common'

import { BtnPlaylistComponent } from './btn-playlist.component'

import { BtnPlaylistDialogComponent } from './btn-playlist-dialog/btn-playlist-dialog.component'

import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatButtonModule } from '@angular/material/button'
import { MatMenuModule } from '@angular/material/menu'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatListModule } from '@angular/material/list'
import { MatInputModule } from '@angular/material/input'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatDialogModule } from '@angular/material/dialog'
import { BtnPlaylistSelectionComponent } from './btn-playlist-selection/btn-playlist-selection.component'


@NgModule({
  declarations: [BtnPlaylistComponent, BtnPlaylistDialogComponent, BtnPlaylistSelectionComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,

    // Material Imports
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatListModule,
  ],
  exports: [BtnPlaylistComponent],
})
export class BtnPlaylistModule { }
