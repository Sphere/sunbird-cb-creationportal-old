import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core'
import { map } from 'rxjs/operators'
import { ConfigurationsService, ValueService } from '@ws-widget/utils/src/public-api'
import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'
// import { REVIEW_ROLE, PUBLISH_ROLE, CREATE_ROLE } from '@ws/author/src/lib/constants/content-role'
import { ILeftMenu, ITable } from '@ws-widget/collection'
/* tslint:disable */
import _ from 'lodash'
/* tslint:enable */
import { ActivatedRoute, Router } from '@angular/router'
import { AuthInitService } from '../../../../../../../services/init.service'
import { NSCompetencyV2 } from '../../interface/competency'
// import { CompService } from '../../services/competencies.service'

@Component({
  selector: 'ws-auth-competencies-home',
  templateUrl: './competencies-home.component.html',
  styleUrls: ['./competencies-home.component.scss'],
})
export class CompetenciesHomeComponent implements OnInit, OnDestroy {
  filterPath = '/author/competencies/competency'
  public sideNavBarOpenedMain = true
  isAdmin = false
  status = 'dictionary'
  myRoles!: Set<string>
  userId!: string
  departmentData: any
  competencies!: NSCompetencyV2.ICompetencyDictionary[]
  competencyArea!: NSCompetencyV2.ICompetencyDictionary[]
  isLtMedium$ = this.valueSvc.isLtMedium$
  private defaultSideNavBarOpenedSubscription: any
  mode$ = this.isLtMedium$.pipe(map(isMedium => (isMedium ? 'over' : 'side')))
  public screenSizeIsLtMedium = false
  leftmenues!: ILeftMenu[]
  table!: ITable
  public tableContent!: any[]
  public count = {
    dictionary: 0,
    area: 0,
    requested: 0,
  }
  @ViewChild('searchInput', { static: false }) searchInputElem: ElementRef<any> = {} as ElementRef<
    any
  >
  constructor(
    private valueSvc: ValueService,
    private accessService: AccessControlService,
    private configService: ConfigurationsService,
    private activatedRoute: ActivatedRoute,
    private authInitService: AuthInitService,
    // private compService: CompService,
    private router: Router,
  ) {
    this.userId = this.accessService.userId
    if (this.configService.userRoles) {
      this.myRoles = this.configService.userRoles
    }
    if (this.activatedRoute.snapshot.parent && this.activatedRoute.snapshot.parent.data.departmentData) {
      this.departmentData = this.activatedRoute.snapshot.parent.data.departmentData
    }
    if (this.activatedRoute.snapshot.parent && this.activatedRoute.snapshot.parent.data.competencies) {
      this.competencies = _.get(this.activatedRoute, 'snapshot.parent.data.competencies.data.responseData')
    }
    if (this.departmentData) {
      const leftData = this.authInitService.authAdditionalConfig.menus
      _.set(leftData, 'widgetData.logo', true)
      _.set(leftData, 'widgetData.logoPath', _.get(this.activatedRoute, 'snapshot.parent.data.departmentData.data.logo'))
      _.set(leftData, 'widgetData.name', _.get(this.activatedRoute, 'snapshot.parent.data.departmentData.data.deptName'))
      _.set(leftData, 'widgetData.userRoles', this.myRoles)
      this.leftmenues = leftData
    } else {
      this.leftmenues = this.authInitService.authAdditionalConfig.menus
    }
    this.isAdmin = this.accessService.hasRole(['admin', 'super-admin', 'content-admin', 'editor', 'content-creator'])
    this.fetchInitData()

  }

  ngOnInit() {
    this.defaultSideNavBarOpenedSubscription = this.isLtMedium$.subscribe(isLtMedium => {
      this.sideNavBarOpenedMain = !isLtMedium
      this.screenSizeIsLtMedium = isLtMedium
    })
    this.activatedRoute.url.subscribe(() => {
      this.status = this.router.url.split('?')[0].split('/').pop() || 'dictionary'

    })
  }
  fetchInitData() {
    // this.compService.fetchDictionary().subscribe((response: NSCompetencyV2.ICompetencyDictionary[]) => {
    //   this.tableContent = response
    // }, () => {
    //   // error
    // })
  }
  nev(nevParam: string) {
    this.router.navigate([this.filterPath], { queryParams: { typ: nevParam } })
  }
  isLinkActive(url?: string, index: number = 0): boolean {
    let returnVal = false
    const typo = this.activatedRoute.snapshot.queryParams['typ']
    if (typo) {
      if (typo === url) {
        returnVal = true
      }
    } else {
      if (index === 0) {
        returnVal = true
      }
    }
    return returnVal
  }
  ngOnDestroy() {
    if (this.defaultSideNavBarOpenedSubscription) {
      this.defaultSideNavBarOpenedSubscription.unsubscribe()
    }
  }
  get getTableData(): any[] {
    if (_.get(this.activatedRoute, 'snapshot.parent.data.competencies.data.responseData')
      && _.get(this.activatedRoute, 'snapshot.parent.data.competencies.data.responseData').length > 0) {
      if (this.status === 'dictionary') {
        return _.map(_.get(this.activatedRoute, 'snapshot.parent.data.competencies.data.responseData'), i => {
          i.type = _.get(i, 'additionalProperties.competencyType')
          return i
        })
      }  if (this.status === 'area') {
        return _.map(_.get(this.activatedRoute, 'snapshot.parent.data.competencies.data.responseData'), i => {
          return i
        })
      }
    }
    return []
  }
  action($event: any) {
    if ($event) {

    }
  }
  createNewcompetency() {
    this.router.navigate(['author', 'competencies', 'request-new'])
  }
  search() {

  }
}
