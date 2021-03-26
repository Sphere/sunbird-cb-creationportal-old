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
import { CompService } from '../../services/competencies.service'

@Component({
  selector: 'ws-auth-competencies-home',
  templateUrl: './competencies-home.component.html',
  styleUrls: ['./competencies-home.component.scss'],
})
export class CompetenciesHomeComponent implements OnInit, OnDestroy {
  filterPath = '/author/competencies/home'
  public sideNavBarOpenedMain = true
  isAdmin = false
  count: any = {}
  status = 'published'
  myRoles!: Set<string>
  userId!: string
  departmentData: any
  competencies!: NSCompetencyV2.ICompetencyDictionary[]
  isLtMedium$ = this.valueSvc.isLtMedium$
  private defaultSideNavBarOpenedSubscription: any
  mode$ = this.isLtMedium$.pipe(map(isMedium => (isMedium ? 'over' : 'side')))
  public screenSizeIsLtMedium = false
  leftmenues!: ILeftMenu[]
  table!: ITable
  public tableContent!: any[]
  @ViewChild('searchInput', { static: false }) searchInputElem: ElementRef<any> = {} as ElementRef<
    any
  >
  constructor(
    private valueSvc: ValueService,
    private accessService: AccessControlService,
    private configService: ConfigurationsService,
    private activatedRoute: ActivatedRoute,
    private authInitService: AuthInitService,
    private compService: CompService,
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

      this.competencies = _.get(this.activatedRoute, 'snapshot.parent.data.competencies.data')
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
    this.initCardTable()
  }

  ngOnInit() {
    this.defaultSideNavBarOpenedSubscription = this.isLtMedium$.subscribe(isLtMedium => {
      this.sideNavBarOpenedMain = !isLtMedium
      this.screenSizeIsLtMedium = isLtMedium
    })
    this.activatedRoute.queryParams.subscribe(params => {
      this.status = params.status || 'published'
      // this.setAction()
      // this.fetchContent(false)
    })
  }
  fetchInitData() {
    this.compService.fetchDictionary().subscribe((response: NSCompetencyV2.ICompetencyDictionary[]) => {
      this.tableContent = response
    }, () => {
      // error
    })
  }

  ngOnDestroy() {
    if (this.defaultSideNavBarOpenedSubscription) {
      this.defaultSideNavBarOpenedSubscription.unsubscribe()
    }
  }
  initCardTable() {
    this.table = {
      columns: [
        {
          displayName: 'Competency', key: 'name', isList: false, prop: '',
          // link: { path: '/author/content-detail/', dParams: 'identifier' },
          defaultValue: 'Untitled Competency',
          // image: 'appIcon',
        },
        { displayName: 'Type', key: 'type', isList: false, prop: '', defaultValue: 'NA' },
        {
          displayName: 'Number of CBPS', key: 'uniqueUsersCount', isList: false, prop: '', defaultValue: 0,
        },
        { displayName: 'Description', key: 'description', defaultValue: 0 },
      ], //  :> this will load from json
      actions: [], // :> this will load from json
      needCheckBox: false,
      needHash: false,
      sortColumn: 'name',
      sortState: 'asc',
      actionsMenu: {
        headIcon: 'apps',
        menus: [
          { name: 'Edit', action: 'edit', disabled: false, icon: 'edit' },
          { name: 'Delete', action: 'delete', disabled: false, icon: 'delete' },
        ],
        rowIcon: 'more_vert',
      },
    }
  }
  get getTableData(): any[] {
    if (this.tableContent && this.tableContent.length > 0) {
      return _.map(this.tableContent, i => {
        // const duration = this.durationPipe.transform(i.duration || 0, 'hms') || '0'
        // i.duration = duration
        i.type = _.get(i, 'additionalProperties.competencyType')
        return i
      })
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
  // canShow(role: string): boolean {
  //   switch (role) {
  //     case 'review':
  //       return this.accessService.hasRole(REVIEW_ROLE)
  //     case 'publish':
  //       return this.accessService.hasRole(PUBLISH_ROLE)
  //     case 'author':
  //       return this.accessService.hasRole(CREATE_ROLE)
  //     default:
  //       return false
  //   }
  // }
}
