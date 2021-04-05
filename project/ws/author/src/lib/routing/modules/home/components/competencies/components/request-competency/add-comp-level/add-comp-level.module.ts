import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { AddCompLevelComponent } from './add-comp-level.component'
import { MatDialogModule, MatButtonModule, MatIconModule, MatCardModule, MatSelectModule, MatInputModule, MatFormFieldModule } from '@angular/material'
import { RouterModule } from '@angular/router'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'

@NgModule({
  declarations: [AddCompLevelComponent],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    MatCardModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  entryComponents: [AddCompLevelComponent],
})
export class AddCompLevelDialogModule { }
