import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { SharedModule } from '@ws/author/src/lib/modules/shared/shared.module'
import { ReactiveFormsModule, FormsModule } from '@angular/forms'
import { AuthHomeComponent } from './components/home/home.component'
import { DashboardComponent } from './components/dashboard/dashboard.component'
import { RouterModule } from '@angular/router'
import { DashBoardService } from './components/dashboard/dashboard.service'
import { WsAuthorHomeRoutingModule } from './home.routing.module'

@NgModule({
  declarations: [
    AuthHomeComponent,
    DashboardComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    ReactiveFormsModule,
    WsAuthorHomeRoutingModule,
    FormsModule,
    RouterModule,
  ],
  providers: [
    DashBoardService,
  ],
})
export class HomeModule { }
