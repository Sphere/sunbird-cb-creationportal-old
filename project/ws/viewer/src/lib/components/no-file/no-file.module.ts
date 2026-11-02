import { NgModule } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

import { NoFileComponent } from './no-file.component'

@NgModule({
  declarations: [NoFileComponent],
  imports: [MatIconModule],
  exports: [NoFileComponent],
})
export class NoFileModule {}
