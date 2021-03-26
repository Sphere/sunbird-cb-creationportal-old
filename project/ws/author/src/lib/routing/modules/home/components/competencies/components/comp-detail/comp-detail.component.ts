import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { NsWidgetResolver, WidgetBaseComponent } from '@ws-widget/resolver'
/* tslint:disable */
import _ from 'lodash'
import { Observable, Subscription } from 'rxjs'
/* tslint:enable */
@Component({
  selector: 'ws-auth-comp-detail',
  templateUrl: './comp-detail.component.html',
  styleUrls: ['./comp-detail.component.scss'],
})
/** Please don't move this component to collections */
export class CompDetailComponent extends WidgetBaseComponent
  implements OnInit, OnDestroy, AfterViewInit, NsWidgetResolver.IWidgetData<any> {
  private eventsSubscription!: Subscription
  @Input() widgetData!: any
  @Input() events!: Observable<void>
  @HostBinding('id')
  public id = `ws-card_${Math.random()}`
  @HostBinding('class') class = 'flex-1'
  competencyDetailsForm!: FormGroup
  namePatern = `^[a-zA-Z\\s\\']{1,32}$`
  options = [
    { name: 'Behavioural', weight: 'Behavioural' },
    { name: 'Domain', weight: 'Domain' },
    { name: 'Functional', weight: 'Functional' },
  ]
  @ViewChild('savebtn', { read: ElementRef, static: false }) public savebtn!: ElementRef
  constructor(
    // private events: EventService,
    // private configSvc: ConfigurationsService,
    // private utilitySvc: UtilityService,
    // private snackBar: MatSnackBar,
  ) {
    super()
    this.competencyDetailsForm = new FormGroup({
      label: new FormControl('', [Validators.required]),
      desc: new FormControl('', [Validators.required]),
      typ: new FormControl('', [Validators.required]),
      area: new FormControl('', [Validators.required]),
    })
  }
  ngOnDestroy(): void {
    // throw new Error('Method not implemented.')
    this.eventsSubscription.unsubscribe()

  }

  ngOnInit() {
    if (this.widgetData) {
      this.eventsSubscription = this.events.subscribe(() => this.autosubmit())

    }
  }
  onSubmit() {
    if (this.competencyDetailsForm.valid) {
      debugger
    }
  }
  // ngOnChanges(data: any) {
  // }

  ngAfterViewInit() {
    // this.cd.detectChanges();
  }
  autosubmit() {
    debugger
    let inputElement: HTMLElement = this.savebtn.nativeElement as HTMLElement
    inputElement.click()
  }

}
