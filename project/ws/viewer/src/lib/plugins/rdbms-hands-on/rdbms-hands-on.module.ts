import { CommonModule } from '@angular/common'

import { FormsModule, ReactiveFormsModule } from '@angular/forms'

import { NgModule } from '@angular/core'


import { AceEditorCompatModule } from '@ws-widget/utils'


import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatDialogModule } from '@angular/material/dialog'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatListModule } from '@angular/material/list'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MatSelectModule } from '@angular/material/select'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { MatTableModule } from '@angular/material/table'
import { MatTabsModule } from '@angular/material/tabs'
import { DbmsBestPracticeComponent } from './components/dbms-best-practice/dbms-best-practice.component'

import { DbmsConceptCreateComponent } from './components/dbms-concept-create/dbms-concept-create.component'

import { DbmsConceptDropdownComponent } from './components/dbms-concept-dropdown/dbms-concept-dropdown.component'

import { DbmsExerciseComponent } from './components/dbms-exercise/dbms-exercise.component'

import { RdbmsHandsOnComponent } from './rdbms-hands-on.component'

import { DbmsPlaygroundComponent } from './components/dbms-playground/dbms-playground.component'

import { ExecutionResultComponent } from './components/execution-result/execution-result.component'

import { SubmissionDialogComponent } from './components/submission-dialog/submission-dialog.component'


@NgModule({
  declarations: [
    DbmsBestPracticeComponent,
    DbmsConceptCreateComponent,
    DbmsConceptDropdownComponent,
    DbmsExerciseComponent,
    RdbmsHandsOnComponent,
    DbmsPlaygroundComponent,
    ExecutionResultComponent,
    SubmissionDialogComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatCardModule,
    MatInputModule,
    MatIconModule,
    MatProgressBarModule,
    MatTabsModule,
    MatSelectModule,
    MatButtonModule,
    MatTableModule,
    MatListModule,
    MatDialogModule,
    MatSnackBarModule,
    MatExpansionModule,
    AceEditorCompatModule,
  ],
  exports: [
    RdbmsHandsOnComponent,
  ],
})
export class RdbmsHandsOnModule { }
