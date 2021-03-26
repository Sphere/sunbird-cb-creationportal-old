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
  selector: 'ws-auth-comp-draft',
  templateUrl: './comp-draft.component.html',
  styleUrls: ['./comp-draft.component.scss'],
})
export class CompDraftComponent extends WidgetBaseComponent
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
  changeToDefaultImg($event: any) {
    $event.target.src = '/assets/instances/eagle/app_logos/default.png'
  }
  // ngOnChanges(data: any) {
  // }

  ngAfterViewInit() {
    // this.cd.detectChanges();
  }

}
