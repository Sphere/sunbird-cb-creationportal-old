import { Component, OnInit, OnDestroy } from '@angular/core'
import { map } from 'rxjs/operators'
import { ConfigurationsService, ValueService } from '@ws-widget/utils/src/public-api'
import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'
/* tslint:disable */
import _ from 'lodash'
import { ActivatedRoute, Router } from '@angular/router'
import { ILeftMenu } from '../../../../../../../../../../../../library/ws-widget/collection/src/public-api'
import { Subject } from 'rxjs'
import { NSCompetencyV2 } from '../../interface/competency'
import { ITable } from '../comp-card-table/comp-card-table.model'
/* tslint:enable */

@Component({
  selector: 'ws-auth-detailed-area',
  templateUrl: './detailed-area.component.html',
  styleUrls: ['./detailed-area.component.scss'],
})
export class DetailedAreaComponent implements OnInit, OnDestroy {
  eventsSubject: Subject<void> = new Subject<void>()
  public sideNavBarOpenedMain = true
  areaId!: string
  isAdmin = false
  leftmenues!: ILeftMenu[]
  departmentData: any
  myRoles!: Set<string>
  selectedareaId!: string
  selectedCompData!: NSCompetencyV2.ICompetencyDictionary
  userId!: string
  isLtMedium$ = this.valueSvc.isLtMedium$
  private defaultSideNavBarOpenedSubscription: any
  mode$ = this.isLtMedium$.pipe(map(isMedium => (isMedium ? 'over' : 'side')))
  public screenSizeIsLtMedium = false
  status = 'levels'
  table!: ITable
  /**Tagged CBPs */
  filterType = 'all'
  filtertext!: string
  /**Tagged CBPs */

  constructor(
    private activatedRoute: ActivatedRoute,
    private valueSvc: ValueService,
    private accessService: AccessControlService,
    private configService: ConfigurationsService,
    private router: Router,
  ) {
    this.userId = this.accessService.userId
    if (this.configService.userRoles) {
      this.myRoles = this.configService.userRoles
    }
    // if (this.activatedRoute.snapshot.parent && this.activatedRoute.snapshot.parent.data.departmentData) {
    //   this.departmentData = this.activatedRoute.snapshot.parent.data.departmentData
    // }

    this.leftmenues = this.activatedRoute.snapshot.data &&
      this.activatedRoute.snapshot.data.pageData.data.areaDetailMenu || []

    this.isAdmin = this.accessService.hasRole(['admin', 'super-admin', 'content-admin', 'editor', 'content-creator'])
    // this.fetchInitData()
    this.initCardTable()
  }

  ngOnInit() {
    this.defaultSideNavBarOpenedSubscription = this.isLtMedium$.subscribe(isLtMedium => {
      this.sideNavBarOpenedMain = !isLtMedium
      this.screenSizeIsLtMedium = isLtMedium
    })
    this.activatedRoute.params.subscribe(params =>
      this.areaId = params['areaId']
    )
    // this.activatedRoute.queryParams.subscribe(pParams => {
    //   if (pParams && pParams['typ']) {
    //     this.status = pParams['typ']
    //   }
    // })
    // this.activatedRoute.paramMap.subscribe(params => {
    //   this.selectedareaId = params.get('areaId') || ''
    // }, () => {
    //   this.router.navigate(['error-internal-server'])
    // })
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
          { name: 'Delete', action: 'delete', disabled: false, icon: 'delete' }],
        rowIcon: 'more_vert',
      },
    }
  }
  get getTableData(): any[] {
    if (_.get(this.activatedRoute, 'snapshot.data.competencies.data.responseData')
      && _.get(this.activatedRoute, 'snapshot.data.competencies.data.responseData').length > 0) {
      return _.map(_.get(this.activatedRoute, 'snapshot.data.competencies.data.responseData'), i => {
        return i
      })
    }
    return []
  }
  action($event: any) {
    if ($event) {

    }
  }
  clicked($event: any) {
    if ($event) {
      this.router.navigate(['/author/competencies/competency', _.get($event, 'id')])
    }
  }
  // fetchInitData() {
  //   const data = _.get(this.activatedRoute, 'snapshot.data.competency.data.responseData')
  //   if (data) {
  //     this.selectedCompData = data
  //   }
  // }
  updateStatus(newStatus: 'levels' | 'roles' | 'positions') {
    this.status = newStatus
  }
  get filterPath() {
    return `${'/author/competencies/competency'}/${this.areaId}`
  }
  ngOnDestroy() {
    if (this.defaultSideNavBarOpenedSubscription) {
      this.defaultSideNavBarOpenedSubscription.unsubscribe()
    }
  }

  save() {
    this.eventsSubject.next()

  }

  /**Tagged CBPs */
  filterCBP(filter: 'all' | 'own') {
    if (filter && !this.filtertext) {
      this.filterType = filter
    }
  }
  /**Tagged CBPs */

}
