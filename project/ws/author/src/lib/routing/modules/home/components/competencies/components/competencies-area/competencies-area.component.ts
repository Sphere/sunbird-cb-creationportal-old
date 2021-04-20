import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core'
import { map } from 'rxjs/operators'
import { ConfigurationsService, ValueService } from '@ws-widget/utils/src/public-api'
import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'
// import { REVIEW_ROLE, PUBLISH_ROLE, CREATE_ROLE } from '@ws/author/src/lib/constants/content-role'
import { ILeftMenu } from '@ws-widget/collection'
/* tslint:disable */
import _ from 'lodash'
/* tslint:enable */
import { ActivatedRoute, Router } from '@angular/router'
import { NSCompetencyV2 } from '../../interface/competency'
import { ITable } from '../comp-card-table/comp-card-table.model'
// import { CompService } from '../../services/competencies.service'

@Component({
  selector: 'ws-auth-competencies-area',
  templateUrl: './competencies-area.component.html',
  styleUrls: ['./competencies-area.component.scss'],
})
export class CompetenciesAreaComponent implements OnInit, OnDestroy {
  filterPath = '/author/competencies/home'
  public sideNavBarOpenedMain = true
  isAdmin = false
  status = 'dictionary'
  myRoles!: Set<string>
  userId!: string
  departmentData: any
  competencies!: NSCompetencyV2.ICompetencyDictionary[]
  competencyArea!: NSCompetencyV2.ICompetencyDictionary[]
  isLtMedium$ = this.valueSvc.isLtMedium$
  // private defaultSideNavBarOpenedSubscription: any
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
    // private authInitService: AuthInitService,
    // private compService: CompService,
    private router: Router,
  ) {
    this.userId = this.accessService.userId
    if (this.configService.userRoles) {
      this.myRoles = this.configService.userRoles
    }
    this.initCardTable()
  }

  ngOnInit() {
    // this.activatedRoute.queryParams.subscribe(params => {
    //   this.status = params.typ || 'dictionary'

    // })
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
    // if (this.defaultSideNavBarOpenedSubscription) {
    //   this.defaultSideNavBarOpenedSubscription.unsubscribe()
    // }
  }
  initCardTable() {
    this.table = {
      columns: [
        // { displayName: 'ID', key: 'id', defaultValue: '001' },
        {

          displayName: 'Competency area', key: 'name',
          link: { path: '/author/competencies/area/', dParams: 'id' },
          defaultValue: 'Untitled Area',
          // image: 'appIcon',
        },
        { displayName: 'Number of competencies', key: 'noc', defaultValue: 0 },
        { displayName: 'Number of CBPS', key: 'uniqueUsersCount', defaultValue: 0 },
        { displayName: 'Description', key: 'description', defaultValue: 'NA' },
      ], //  :> this will load from json
      actions: [], // :> this will load from json
      needCheckBox: false,
      needHash: false,
      sortColumn: 'name',
      sortState: 'asc',
      display: 'table',
      actionsMenu: undefined,
    }
  }
  get getTableData(): any[] {
    if (_.get(this.activatedRoute, 'snapshot.data.area.data.responseData')
      && _.get(this.activatedRoute, 'snapshot.data.area.data.responseData').length > 0) {
      // if (this.status === 'dictionary') {
      //   return _.map(_.get(this.activatedRoute, 'snapshot.data.area.data.responseData'), i => {
      //     i.type = _.get(i, 'additionalProperties.competencyType')
      //     return i
      //   })
      // } else if (this.status === 'area') {
      return _.map(_.get(this.activatedRoute, 'snapshot.data.area.data.responseData'), i => {
        // i.source = _.get(i, 'source')
        return i
      })
      // }
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
  clicked($event: any) {
    if ($event) {
      this.router.navigate(['/author/competencies/area', _.get($event, 'id')])
    }
  }
}
