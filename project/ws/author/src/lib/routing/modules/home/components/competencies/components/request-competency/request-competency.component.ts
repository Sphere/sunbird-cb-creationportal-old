import { Component, OnInit, OnDestroy } from '@angular/core'
import { map } from 'rxjs/operators'
import { ConfigurationsService, ValueService } from '@ws-widget/utils/src/public-api'
import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'
/* tslint:disable */
import _ from 'lodash'
import { ActivatedRoute, Router } from '@angular/router'
import { ILeftMenu } from '@ws-widget/collection'
import { Subject } from 'rxjs'
import { ICompLevel } from './add-comp-level/add-comp.model'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { NSCompetencyV2 } from '../../interface/competency'
import { CompService } from '../../services/competencies.service'
import { AddCompLevelComponent } from './add-comp-level/add-comp-level.component'
import { MatDialog, MatSnackBar } from '@angular/material'
/* tslint:enable */

@Component({
  selector: 'ws-auth-request-competency',
  templateUrl: './request-competency.component.html',
  styleUrls: ['./request-competency.component.scss'],
})
export class RequestCompetencyComponent implements OnInit, OnDestroy {
  eventsSubject: Subject<void> = new Subject<void>()
  public sideNavBarOpenedMain = true
  competencyDetailsForm!: FormGroup
  isAdmin = false
  leftmenues!: ILeftMenu[]
  areaList!: any[]
  compList: ICompLevel[] = []
  options = [
    { name: 'Behavioural', weight: 'Behavioural' },
    { name: 'Domain', weight: 'Domain' },
    { name: 'Functional', weight: 'Functional' },
  ]
  departmentData: any
  myRoles!: Set<string>
  userId!: string
  isLtMedium$ = this.valueSvc.isLtMedium$
  private defaultSideNavBarOpenedSubscription: any
  mode$ = this.isLtMedium$.pipe(map(isMedium => (isMedium ? 'over' : 'side')))
  public screenSizeIsLtMedium = false

  constructor(
    private activatedRoute: ActivatedRoute,
    private valueSvc: ValueService,
    private accessService: AccessControlService,
    private configService: ConfigurationsService,
    private compService: CompService,
    private dialog: MatDialog,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {
    this.userId = this.accessService.userId
    if (this.configService.userRoles) {
      this.myRoles = this.configService.userRoles
    }
    if (this.activatedRoute.snapshot.parent && this.activatedRoute.snapshot.parent.data.departmentData) {
      this.departmentData = this.activatedRoute.snapshot.parent.data.departmentData
    }

    this.leftmenues = this.activatedRoute.snapshot.data &&
      this.activatedRoute.snapshot.data.pageData.data.requestMenu || []

    this.isAdmin = this.accessService.hasRole(['admin', 'super-admin', 'content-admin', 'editor', 'content-creator'])
    this.fetchInitData()
  }

  ngOnInit() {
    this.defaultSideNavBarOpenedSubscription = this.isLtMedium$.subscribe(isLtMedium => {
      this.sideNavBarOpenedMain = !isLtMedium
      this.screenSizeIsLtMedium = isLtMedium
    })
  }
  fetchInitData() {
    this.competencyDetailsForm = new FormGroup({
      label: new FormControl('', [Validators.required]),
      desc: new FormControl('', [Validators.required]),
      typ: new FormControl('Behavioural', [Validators.required]),
      area: new FormControl('', [Validators.required]),
    })
    // this.configService.userProfile
    if (this.activatedRoute.snapshot && this.activatedRoute.snapshot.parent
      && this.activatedRoute.snapshot.parent.data.departmentData.data) {
      this.departmentData = this.activatedRoute.snapshot.parent.data.departmentData.data
    }
    this.getList()
  }

  ngOnDestroy() {
    if (this.defaultSideNavBarOpenedSubscription) {
      this.defaultSideNavBarOpenedSubscription.unsubscribe()
    }
  }

  onSubmit() {
    if (this.competencyDetailsForm.valid) {
      const data: NSCompetencyV2.ICompetencyDictionary = {
        additionalProperties: {
          competencyType: _.get(this.competencyDetailsForm.value, 'typ'),
          // cod: '',
          competencyArea: _.get(this.competencyDetailsForm.value, 'area'),
        },
        competencyType: '',
        description: _.get(this.competencyDetailsForm.value, 'desc'),
        id: undefined,
        name: _.get(this.competencyDetailsForm.value, 'label'),
        source: this.departmentData.deptName,
        type: 'COMPETENCY',
        children: _.map(this.compList, (l: ICompLevel) => {
          return {
            type: 'COMPETENCIESLEVEL',
            name: l.optionalLevel || l.level,
            level: l.level,
            description: l.description,
          }
        }),
      }
      this.compService.requestCompWithCheild(data).subscribe(resp => {
        if (resp && _.get(resp, 'statusInfo.statusCode') === 200) {
          this.snackBar.open('Success')
          this.competencyDetailsForm.reset()
          this.router.navigate(['author', 'competencies'])
        }
      })
    }
  }
  create(data?: ICompLevel) {
    this.dialog.open<AddCompLevelComponent>(AddCompLevelComponent, { data: data || {} })
      .afterClosed()
      .subscribe((res: any) => {
        if (res.result) {
          if (this.compList.length === 0) {
            this.compList = [res.result]
          } else {
            const idx = _.findIndex(this.compList, i => i.level === _.get(res, 'result.level'))
            if (idx === -1) {
              this.compList.push(res.result)
            } else {
              delete this.compList[idx]
              this.compList[idx] = res.result
            }
          }
        }
      })
  }
  getList() {
    this.areaList = _.get(this.activatedRoute, 'snapshot.data.areaList.data.responseData') || []
  }
}
