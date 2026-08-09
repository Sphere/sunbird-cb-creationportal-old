import { AuthExpiryDateConfirmComponent } from '@ws/author/src/lib/modules/shared/components/auth-expiry-date-confirm/auth-expiry-date-confirm.component'

import { FlatTreeControl } from '@angular/cdk/tree'

import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core'

import { FormGroup } from '@angular/forms'

import { MatDialog } from '@angular/material/dialog'
import { MatSnackBar } from '@angular/material/snack-bar'
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree'
import { ActivatedRoute, Router } from '@angular/router'

import { NOTIFICATION_TIME } from '@ws/author/src/lib/constants/constant'

import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

import { NSApiRequest } from '@ws/author/src/lib/interface/apiRequest'

import { IAuthoringPagination, IFilterMenuNode, IMenuFlatNode } from '@ws/author/src/lib/interface/authored'

import { NSContent } from '@ws/author/src/lib/interface/content'

import { CommentsDialogComponent } from '@ws/author/src/lib/modules/shared/components/comments-dialog/comments-dialog.component'

import { ConfirmDialogComponent } from '@ws/author/src/lib/modules/shared/components/confirm-dialog/confirm-dialog.component'

import { ErrorParserComponent } from '@ws/author/src/lib/modules/shared/components/error-parser/error-parser.component'

import { NotificationComponent } from '@ws/author/src/lib/modules/shared/components/notification/notification.component'

import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'

import { AuthInitService } from '@ws/author/src/lib/services/init.service'

import { LoaderService } from '@ws/author/src/lib/services/loader.service'

import { Subscription } from 'rxjs'

import { MyContentService } from '../../services/my-content.service'

import { map } from 'rxjs/operators'

import { ConfigurationsService, PipeDurationTransformPipe, ValueService, isActivationKey } from '@ws-widget/utils'

/* tslint:disable */
import _ from 'lodash'

import { ILeftMenu, ITable } from '@ws-widget/collection'

import { PipeContentTypePipe } from '../../../../../../../../../../../../library/ws-widget/utils/src/lib/pipes/pipe-content-type/pipe-content-type.pipe'

import { MyContentListBaseComponent } from '../my-content-list-base.component'

/* tslint:enable */

const defaultFilter = [
  {
    key: 'contentType',
    value: ['Collection', 'Course', 'Learning Path'],
  },
]
@Component({
  standalone: false,
  selector: 'ws-auth-my-content',
  templateUrl: './my-content.component.html',
  styleUrls: ['./my-content.component.scss'],
  providers: [PipeDurationTransformPipe],
})
export class MyContentComponent extends MyContentListBaseComponent implements OnInit, OnDestroy {
  /** Enter/Space keyboard equivalent for (click) handlers. */

  filterPath = '/author/cbp/me'
  // currentFilter = 'publish'
  // public status = 'draft'
  isReviewer = false
  isPublisher = false
  @ViewChild('searchInput', { static: false }) searchInputElem: ElementRef<any> = {} as ElementRef<any>
  /* tslint:disable */
  courseTaken = _.get(this.activatedRoute, 'snapshot.data.courseTaken.data')

  private _transformer = (node: IFilterMenuNode, level: number) => {
    return {
      expandable: !!node.values && node.values.length > 0,
      displayName: node.name,
      checked: node.checked,
      type: node.name,
      count: node.count ? node.count : 0,
      levels: level,
    }
  }
  /* tslint:enable */

  constructor(
    protected myContSvc: MyContentService,
    protected activatedRoute: ActivatedRoute,
    protected router: Router,
    protected loadService: LoaderService,
    protected accessService: AccessControlService,
    protected snackBar: MatSnackBar,
    protected dialog: MatDialog,
    protected authInitService: AuthInitService,
    protected valueSvc: ValueService,
    protected configService: ConfigurationsService,
  ) {
    super(myContSvc, activatedRoute, router, loadService, accessService, snackBar, dialog, authInitService, valueSvc, configService)
    this.courseTaken = {
      mandatoryCourseCompleted: true,
    }
    this.isAdmin = this.accessService.hasRole(['admin', 'super-admin', 'content-admin', 'editor', 'content_creator'])
    this.isReviewer = this.accessService.hasRole(['content_reviewer'])
    this.isPublisher = this.accessService.hasRole(['content_publisher'])
    if (this.configService.userRoles) {
      this.myRoles = this.configService.userRoles
    }
    if (this.activatedRoute.snapshot.data.departmentData) {
      this.departmentData = this.activatedRoute.snapshot.data.departmentData
    }
    this.filterMenuTreeControl = new FlatTreeControl<IMenuFlatNode>(
      node => node.levels,
      node => node.expandable,
    )
    this.filterMenuTreeFlattener = new MatTreeFlattener(
      this._transformer,
      node => node.levels,
      node => node.expandable,
      node => node.values,
    )
    this.dataSource = new MatTreeFlatDataSource(this.filterMenuTreeControl, this.filterMenuTreeFlattener)
    this.dataSource.data = this.filterMenuItems
    this.userId = this.accessService.userId

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
    this.isAdmin = this.accessService.hasRole(['admin', 'super-admin', 'content-admin', 'editor'])
    // if (this.courseTaken.mandatoryCourseCompleted) {
    this.initCardTable()
    // } else {
    //   this.resourses = _.map(this.courseTaken.contentDetails, (v, k) => {
    //     return { key: k, ...v }
    //   })
    // }
  }

  ngOnDestroy() {
    if (this.routerSubscription.unsubscribe) {
      this.routerSubscription.unsubscribe()
    }
    if (this.defaultSideNavBarOpenedSubscription) {
      this.defaultSideNavBarOpenedSubscription.unsubscribe()
    }
    this.loadService.changeLoad.next(false)
  }

  ngOnInit() {
    this.pagination = {
      offset: 0,
      limit: 24,
    }
    this.newDesign = _.get(this.accessService, 'authoringConfig.newDesign')
    this.ordinals = this.authInitService.ordinals
    this.allLanguages = this.authInitService.ordinals.subTitles || []
    this.defaultSideNavBarOpenedSubscription = this.isLtMedium$.subscribe(isLtMedium => {
      this.sideNavBarOpenedMain = !isLtMedium
      this.screenSizeIsLtMedium = isLtMedium
    })
    this.activatedRoute.queryParams.subscribe(params => {
      this.status = params.status || 'published'
      this.setAction()
      this.fetchContent(false)
    })
  }

  fetchStatus() {
    switch (this.status) {
      case 'draft':
      case 'rejected':
        return ['Draft']
      case 'inreview':
        return ['Review', 'QualityReview']
      case 'review':
        return ['InReview']
      case 'published':
      case 'expiry':
        return ['Live']
      case 'publish':
        return ['Reviewed']
      case 'processing':
        return ['Processing']
      case 'unpublished':
        return ['Unpublished']
      case 'deleted':
        return ['Deleted']
    }
    return ['Draft']
  }

  fetchContent(loadMoreFlag: boolean, changeFilter = true) {
    const searchV6Data = this.myContSvc.getSearchBody(
      this.status,
      this.searchLanguage ? [this.searchLanguage] : [],
      loadMoreFlag ? this.pagination.offset : 0,
      this.queryFilter,
      this.isAdmin,
    )
    let isUserRecordEnabled = true
    const adminOnlyRoles = this.accessService.hasRole(['admin', 'super-admin', 'content-admin', 'editor', 'content_creator'])
    if (adminOnlyRoles && isUserRecordEnabled) {
      isUserRecordEnabled = true
    } else if (this.accessService.hasRole(['content_reviewer', 'content_publisher'])) {
      isUserRecordEnabled = false
    }
    const requestData = {
      locale: this.searchLanguage ? [this.searchLanguage] : ['en'],
      query: this.queryFilter,
      request: {
        query: this.queryFilter,
        filters: {
          status: this.fetchStatus(),
          // creatorContacts: <string[]>[],
          // trackContacts: <string[]>[],
          // publisherDetails: <string[]>[],
          // isMetaEditingDisabled: [false],
          // isContentEditingDisabled: [false]
        },
        // pageNo: loadMoreFlag ? this.pagination.offset : 0,
        sort_by: { lastUpdatedOn: 'desc' },
        // pageSize: this.pagination.limit,
        fields: [
          'name',
          'appIcon',
          'mimeType',
          'gradeLevel',
          'identifier',
          'medium',
          'pkgVersion',
          'board',
          'subject',
          'resourceType',
          'primaryCategory',
          'contentType',
          'channel',
          'organisation',
          'trackable',
          'status',
          'authoringDisabled',
        ],
        facets: ['primaryCategory', 'mimeType'],
        // pageNo: loadMoreFlag ? this.pagination.offset : 0,
        // sort: [{ lastUpdatedOn: 'desc' }],
        // pageSize: this.pagination.limit,
        // uuid: this.userId,
        // rootOrg: this.accessService.rootOrg,
        // // this is for Author Only
        // isUserRecordEnabled: true,
      },
    }
    if (this.finalFilters.length) {
      this.finalFilters.forEach((v: any) => {
        searchV6Data.filters.forEach((filter: any) => {
          filter.andFilters[0] = {
            ...filter.andFilters[0],
            [v.key]: v.value,
          }
        })
        requestData.request.filters = { ...requestData.request.filters, [v.key]: v.value }
      })
    }
    // if (this.queryFilter) {
    //   // tslint:disable
    //   delete requestData.request.sort
    //   // tslint:enable
    // }
    // if (
    //   [
    //     'draft',
    //     'rejected',
    //     'inreview',
    //     'published',
    //     'unpublished',
    //     'processing',
    //     'deleted',
    //   ].indexOf(this.status) > -1 &&
    //   !this.isAdmin
    // ) {
    //   requestData.request.filters.creatorContacts.push(this.userId)
    // }
    // if (this.status === 'review' && !this.isAdmin) {
    //   requestData.request.filters.trackContacts.push(this.userId)
    // }
    // if (this.status === 'publish' && !this.isAdmin) {
    //   requestData.request.filters.publisherDetails.push(this.userId)
    // }

    this.loadService.changeLoad.next(true)
    const observable =
      this.status === 'expiry' || this.newDesign
        ? this.myContSvc.fetchFromSearchV6(searchV6Data, this.isAdmin).pipe(
            map((v: any) => {
              return {
                result: {
                  response: v,
                },
              }
            }),
          )
        : this.myContSvc.fetchContent(requestData)
    this.loadService.changeLoad.next(true)
    observable.subscribe(
      data => {
        this.loadService.changeLoad.next(false)
        if (changeFilter) {
          this.filterMenuItems = data && data.result && data.result.facets ? data.result.facets : this.filterMenuItems
          this.dataSource.data = this.filterMenuItems
        }
        this.cardContent =
          loadMoreFlag && !this.queryFilter
            ? (this.cardContent || []).concat(data && data.result ? data.result.content : [])
            : data && data.result.content
              ? data.result.content
              : []
        this.totalContent = data && data.result ? data.result.count : 0
        // const index = _.findIndex(this.count, i => i.n === this.status)
        // if (index >= 0) {
        this.count[this.status] = this.totalContent
        // }
        this.showLoadMore = this.pagination.offset * this.pagination.limit + this.pagination.limit < this.totalContent ? true : false
        this.fetchError = false
      },
      () => {
        this.fetchError = true
        this.cardContent = []
        this.showLoadMore = false
        this.loadService.changeLoad.next(false)
      },
    )
  }
  getTableData(): any[] {
    if (this.cardContent && this.cardContent.length > 0) {
      return _.map(this.cardContent, i => {
        // const duration = this.durationPipe.transform(i.duration || 0, 'hms') || '0'
        // i.duration = duration
        return i
      })
    }
    return []
  }

  filterApplyEvent(node: any) {
    this.pagination.offset = 0
    this.sideNavBarOpened = false
    const filterIndex = this.filters.findIndex(v => v.displayName === node.displayName)
    const filterMenuItemsIndex = this.filterMenuItems.findIndex((obj: any) => obj.values.some((val: any) => val.name === node.type))
    const ind = this.finalFilters.indexOf(this.filterMenuItems[filterMenuItemsIndex].name)
    if (filterIndex === -1 && node.checked) {
      this.filters.push(node)
      this.filterMenuItems[filterMenuItemsIndex].values.find((v: any) => v.name === node.displayName).checked = true

      if (ind === -1) {
        this.finalFilters.push({
          key: this.filterMenuItems[filterMenuItemsIndex].name,
          value: [node.type],
        })
      } else {
        this.finalFilters[ind].value.push(node.type)
        // this.finalFilters.push({
        //   key: node.displayName,
        //   value: [node.type],
        // })
      }
    } else {
      this.filterMenuItems[filterMenuItemsIndex].values.find((v: any) => v.name === node.displayName).checked = false
      this.filters.splice(filterIndex, 1)
      this.finalFilters.splice(ind, 1)
    }
    this.dataSource.data = this.filterMenuItems
    this.fetchContent(false, false)
  }

  clearAllFilters() {
    this.finalFilters = defaultFilter
    this.searchInputElem.nativeElement.value = ''
    this.queryFilter = ''
    this.filterMenuItems.map((val: any) => val.values.map((v: any) => (v.checked = false)))
    this.dataSource.data = this.filterMenuItems
    this.filters = []
    this.fetchContent(false)
  }

  action(event: { data: NSContent.IContentMeta; type: string }) {
    switch (event.type) {
      case 'create':
        this.createContent(event.data)
        break

      case 'review':
      case 'publish':
      case 'edit':
        // need to check edit of published content
        this.router.navigateByUrl(`/author/editor/${event.data.identifier}`)
        break
      case 'remove':
        this.cardContent = (this.cardContent || []).filter(v => v.identifier !== event.data.identifier)
        break
      case 'moveToInReview':
      case 'moveToDraft':
      case 'delete':
      case 'unpublish':
      case 'restoreDeleted':
        this.confirmAction(event)
        break
      case 'expiryExtend':
        this.actionOnExpiry(event.data)
    }
  }
}
