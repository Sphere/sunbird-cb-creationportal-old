import { Component, OnInit, OnDestroy } from '@angular/core'
import { map } from 'rxjs/operators'
import { ConfigurationsService, ValueService } from '@ws-widget/utils'
import { AccessControlService } from '../../../../../../../modules/shared/services/access-control.service'
import { ActivatedRoute } from '@angular/router'
import { AuthInitService } from '../../../../../../../services/init.service'
import { ILeftMenu } from '@ws-widget/collection'
/* tslint:disable */
import _ from 'lodash'
/* tslint:enable */

@Component({
  selector: 'ws-auth-competencies-base',
  templateUrl: './competencies-base.component.html',
  styleUrls: ['./competencies-base.component.scss'],
})
export class CompetenciesBaseComponent implements OnInit, OnDestroy {
  public sideNavBarOpenedMain = true
  isAdmin = false
  isLtMedium$ = this.valueSvc.isLtMedium$
  private defaultSideNavBarOpenedSubscription: any
  mode$ = this.isLtMedium$.pipe(map(isMedium => (isMedium ? 'over' : 'side')))
  public screenSizeIsLtMedium = false
  leftmenues!: ILeftMenu[]
  myRoles!: Set<string>
  userId!: string
  departmentData: any
  constructor(
    private valueSvc: ValueService,
    private accessService: AccessControlService,
    private configService: ConfigurationsService,
    private activatedRoute: ActivatedRoute,
    private authInitService: AuthInitService,
  ) {
    this.userId = this.accessService.userId
    if (this.configService.userRoles) {
      this.myRoles = this.configService.userRoles
    }
    if (this.activatedRoute.snapshot.data.departmentData) {
      this.departmentData = this.activatedRoute.snapshot.data.departmentData
    }
    // if (this.activatedRoute.snapshot.data.competencies) {
    //   this.competencies = _.get(this.activatedRoute, 'snapshot.data.competencies.data')
    // }
    if (this.departmentData) {
      const leftData = this.authInitService.authAdditionalConfig.menus
      _.set(leftData, 'widgetData.logo', true)
      _.set(leftData, 'widgetData.logoPath', _.get(this.activatedRoute, 'snapshot.data.departmentData.data.logo'))
      _.set(leftData, 'widgetData.name', _.get(this.activatedRoute, 'snapshot.data.departmentData.data.deptName'))
      _.set(leftData, 'widgetData.userRoles', this.myRoles)
      this.leftmenues = leftData
    } else {
      this.leftmenues = this.authInitService.authAdditionalConfig.menus
    }
    this.isAdmin = this.accessService.hasRole(['admin', 'super-admin', 'content-admin', 'editor', 'content-creator'])
  }

  ngOnInit() {
    this.defaultSideNavBarOpenedSubscription = this.isLtMedium$.subscribe(isLtMedium => {
      this.sideNavBarOpenedMain = !isLtMedium
      this.screenSizeIsLtMedium = isLtMedium
    })
  }

  ngOnDestroy() {
    if (this.defaultSideNavBarOpenedSubscription) {
      this.defaultSideNavBarOpenedSubscription.unsubscribe()
    }
  }
}
