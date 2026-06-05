import {
  // AuthKeycloakService,
  ConfigurationsService,
} from '@ws-widget/utils'

import { OrgServiceService } from './../../org-service.service'

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core'

import { ActivatedRoute, Router, Data } from '@angular/router'

import forEach from 'lodash/forEach'

import get from 'lodash/get'


@Component({
  standalone: false,
  selector: 'ws-app-org',
  templateUrl: './org.component.html',
  styleUrls: ['./org.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgComponent implements OnInit, OnDestroy {
  // @ViewChild('target', { static: false }) target!: MdePopoverTrigger
  orgName!: string
  courseData!: any
  routeSubscription: any
  orgData: any
  currentOrgData: any
  showEndPopup = false
  btnText = ''
  courseCount = 0
  cardLimit = 5
  cometencyData: { identifier: string, name: any; levels: string }[] = []
  rating = 4
  starCount = 5
  color = 'accent'
  ratingArr: any = []
  index = 0
  constructor(
    private activateRoute: ActivatedRoute,
    private orgService: OrgServiceService,
    private router: Router,
    private configSvc: ConfigurationsService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    for (this.index = 0; this.index < this.starCount; this.index++) {
      this.ratingArr.push(this.index)
    }

    // this.orgName = this.activateRoute.snapshot.queryParams.orgId
    // if (this.orgName ) {
    //   this.orgService.hideHeaderFooter.next(true)
    // }
    this.routeSubscription = this.activateRoute.data.subscribe((response: Data) => {
      this.orgName = this.activateRoute.snapshot.queryParams.orgId
      const currentOrg = this.orgName.trim()
      if (response.orgData) {
        this.orgData = response.orgData.data.sources
        this.currentOrgData = this.orgData.filter((org: any) => org.sourceName === currentOrg)
        if (this.currentOrgData) {
          this.currentOrgData = this.currentOrgData[0]
        }
      }
      this.cdr.markForCheck()
    })

    this.orgService.getSearchResults(this.orgName).subscribe((result: any) => {
      this.courseData = result.result.content.filter(
        (org: any) => org.sourceName === this.orgName
      )
      this.courseCount = this.courseData
      if (this.courseData) {
        this.courseData.forEach((course: any) => {
          if (course && course.competencies_v1) {
            forEach(JSON.parse(get(course, 'competencies_v1')), (value: any) => {
              if (value.level) {
                this.cometencyData.push({
                  identifier: course.identifier,
                  name: value.competencyName,
                  levels: ` Level ${value.level}`,
                })
              }
              return this.cometencyData
            })
          }
        })
      }
      this.cdr.markForCheck()
    })

    this.configSvc.unMappedUser! == undefined ? this.btnText = 'Login' : this.btnText = 'View Course'
  }
  toggleCardLimit() {
    if (this.cardLimit === 5) {
      this.cardLimit = this.courseData.length
    } else {
      this.cardLimit = 5
    }
  }
  gotoOverview(identifier: any) {
    // if (this.configSvc.isAuthenticated) {
    this.router.navigate([`/author/toc/${identifier}/overview`])
    // } else {
    // const url = `/app/toc/${identifier}/overview`
    // localStorage.setItem('selectedCourse', url)
    // this.authSvc.login('S', url)
    // }
  }

  ngOnDestroy() {
    this.orgService.hideHeaderFooter.next(false)
  }
  goToLink(a: string) {
    window.open(a, '_blank')
  }


}
