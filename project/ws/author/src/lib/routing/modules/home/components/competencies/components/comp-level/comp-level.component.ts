import {
  AfterViewInit,
  Component,
  HostBinding,
  Input,
  // OnChanges,
  OnDestroy,
  OnInit,
} from '@angular/core'
import { NsWidgetResolver, WidgetBaseComponent } from '@ws-widget/resolver'
/* tslint:disable */
import _ from 'lodash'
/* tslint:enable */
@Component({
  selector: 'ws-auth-comp-level',
  templateUrl: './comp-level.component.html',
  styleUrls: ['./comp-level.component.scss'],
})
export class CompLevelComponent extends WidgetBaseComponent
  implements OnInit, OnDestroy, AfterViewInit, NsWidgetResolver.IWidgetData<any> {
  @Input() widgetData!: any
  @HostBinding('id')
  public id = `ws-card_${Math.random()}`
  @HostBinding('class') class = 'flex-1'
  constructor(
    // private events: EventService,
    // private configSvc: ConfigurationsService,
    // private utilitySvc: UtilityService,
    // private snackBar: MatSnackBar,
  ) {
    super()

  }
  ngOnDestroy(): void {
    // throw new Error('Method not implemented.')
  }

  ngOnInit() {
    if (this.widgetData) {

    }
  }
  create() {

  }
  // ngOnChanges(data: any) {
  // }

  ngAfterViewInit() {
    // this.cd.detectChanges();
  }

}
