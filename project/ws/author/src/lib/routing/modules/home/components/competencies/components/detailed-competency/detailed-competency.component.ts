import { Component, OnInit, OnDestroy } from '@angular/core'
import { map } from 'rxjs/operators'
import { ConfigurationsService, ValueService } from '@ws-widget/utils/src/public-api'
import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'
/* tslint:disable */
import _ from 'lodash'
import { ActivatedRoute } from '@angular/router'
import { ILeftMenu } from '../../../../../../../../../../../../library/ws-widget/collection/src/public-api'
import { Subject } from 'rxjs'
/* tslint:enable */


@Component({
  selector: 'ws-auth-detailed-competency',
  templateUrl: './detailed-competency.component.html',
  styleUrls: ['./detailed-competency.component.scss'],
})
export class DetailedCompetencyComponent implements OnInit, OnDestroy {
  eventsSubject: Subject<void> = new Subject<void>();
  public sideNavBarOpenedMain = true
  compId!: string
  isAdmin = false
  leftmenues!: ILeftMenu[]
  departmentData: any
  myRoles!: Set<string>
  userId!: string
  isLtMedium$ = this.valueSvc.isLtMedium$
  private defaultSideNavBarOpenedSubscription: any
  mode$ = this.isLtMedium$.pipe(map(isMedium => (isMedium ? 'over' : 'side')))
  public screenSizeIsLtMedium = false
  status = 'levels'

  constructor(
    private activatedRoute: ActivatedRoute,
    private valueSvc: ValueService,
    private accessService: AccessControlService,
    private configService: ConfigurationsService,
  ) {
    this.userId = this.accessService.userId
    if (this.configService.userRoles) {
      this.myRoles = this.configService.userRoles
    }
    if (this.activatedRoute.snapshot.parent && this.activatedRoute.snapshot.parent.data.departmentData) {
      this.departmentData = this.activatedRoute.snapshot.parent.data.departmentData
    }

    this.leftmenues = this.activatedRoute.snapshot.data &&
      this.activatedRoute.snapshot.data.pageData.data.detailMenu || []

    this.isAdmin = this.accessService.hasRole(['admin', 'super-admin', 'content-admin', 'editor', 'content-creator'])
    this.fetchInitData()
  }

  ngOnInit() {
    this.defaultSideNavBarOpenedSubscription = this.isLtMedium$.subscribe(isLtMedium => {
      this.sideNavBarOpenedMain = !isLtMedium
      this.screenSizeIsLtMedium = isLtMedium
    })
    this.activatedRoute.params.subscribe(params =>
      this.compId = params['competencyId']
    )
    this.activatedRoute.queryParams.subscribe(pParams => {
      if (pParams && pParams['typ']) {
        this.status = pParams['typ']
      }
    })
  }
  fetchInitData() {

  }
  get filterPath() {
    return `${'/author/competencies'}/${this.compId}`
  }
  ngOnDestroy() {
    if (this.defaultSideNavBarOpenedSubscription) {
      this.defaultSideNavBarOpenedSubscription.unsubscribe()
    }
  }

  save() {
    this.eventsSubject.next()

  }

}
