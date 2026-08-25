import { AuthExpiryDateConfirmComponent } from '@ws/author/src/lib/modules/shared/components/auth-expiry-date-confirm/auth-expiry-date-confirm.component'

import { FlatTreeControl } from '@angular/cdk/tree'

import { Directive, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core'

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

import { MyContentService } from '../services/my-content.service'

import { map } from 'rxjs/operators'

import { ConfigurationsService, PipeDurationTransformPipe, ValueService, isActivationKey } from '@ws-widget/utils'

/* tslint:disable */
import _ from 'lodash'

import { ILeftMenu, ITable } from '@ws-widget/collection'

import { PipeContentTypePipe } from '@ws-widget/utils'

/* tslint:enable */

const defaultFilter = [
  {
    key: 'contentType',
    value: ['Collection', 'Course', 'Learning Path'],
  },
]

/**
 * Members that AllContentComponent and MyContentComponent held verbatim in common.
 *
 * Only byte-identical members live here; anything that differed between the two
 * stays on its own component, so this removes copies without merging behaviour.
 *
 * Carries @Directive() with no selector because the subclasses inherit these
 * constructor dependencies (NG2006/NG2007).
 */
@Directive()
export abstract class MyContentListBaseComponent {
  /**
   * Implemented differently by each component, so they stay there. Declared here so the
   * shared members above can call them.
   */
  abstract searchInputElem: ElementRef<any>

  abstract action(event: { data: NSContent.IContentMeta; type: string }): void

  abstract fetchContent(loadMoreFlag: boolean, changeFilter?: boolean): void

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
  ) {}

  actionClick(event: any) {
    if (event) {
      switch (event.action) {
        case 'edit':
        case 'delete':
          this.action({ type: event.action, data: event.data })
          break
        default:
          break
      }
    }
  }

  actionOnExpiry(content: NSContent.IContentMeta) {
    const dialogRef = this.dialog.open(AuthExpiryDateConfirmComponent, {
      width: '750px',
      height: '300px',
      data: content,
    })

    dialogRef.afterClosed().subscribe((userAction?: { isExtend: boolean; expiryDate?: string }) => {
      if (userAction) {
        this.cardContent = (this.cardContent || []).filter(v => v.identifier !== content.identifier)
      }
    })
  }

  allLanguages: any[] = []

  public cardContent!: any[]

  complexityLevel: string[] = []

  confirmAction(content: any) {
    let message = ''
    if (content.type === 'delete') {
      message = 'delete'
    } else if (content.type === 'restoreDeleted') {
      message = 'restoreDeleted'
    } else if (content.type === 'unpublish') {
      message = 'unpublish'
    } else if (content.type === 'moveToDraft' || content.type === 'moveToInReview') {
      if (content.data.mimeType.indexOf('collection') >= 0) {
        message = 'retrieveParent'
      } else {
        message = 'retrieveChild'
      }
    } else {
      this.forwardBackward(content)
      return
    }
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '600px',
      height: '200px',
      data: message,
    })

    dialogRef.afterClosed().subscribe((confirm: any) => {
      if (confirm) {
        if (content.type === 'delete') {
          this.deleteContent(content.data)
        } else if (content.type === 'restoreDeleted') {
          this.restoreContent(content.data)
        } else if (content.type === 'unpublish' || (content.type === 'moveToDraft' && content.data.status === 'Unpublished')) {
          this.unPublishOrDraft(content.data)
        } else {
          this.forwardBackward(content)
        }
      }
    })
  }

  contentType: string[] = []

  count: any = {}

  createContent(request: NSContent.IContentMeta) {
    this.loadService.changeLoad.next(true)
    this.myContSvc.createInAnotherLanguage(request.identifier, request.locale).subscribe(
      (id: string) => {
        this.loadService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.CONTENT_CREATE_SUCCESS,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
        this.router.navigateByUrl(`/author/editor/${id}`)
      },
      error => {
        if (error.status === 409) {
          this.dialog.open(ErrorParserComponent, {
            width: '750px',
            height: '450px',
            data: {
              errorFromBackendData: error.error,
            },
          })
        }
        this.loadService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.CONTENT_FAIL,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      },
    )
  }

  createNewComponent() {
    this.router.navigate(['author', 'editor', 'new', 'collection'])
  }

  currentAction: 'author' | 'reviewer' | 'expiry' | 'deleted' = 'author'

  dataSource: any

  protected defaultSideNavBarOpenedSubscription: any

  deleteContent(request: NSContent.IContentMeta) {
    this.loadService.changeLoad.next(true)
    this.myContSvc.deleteContent(request.identifier, request.contentType === 'Knowledge Board').subscribe(
      () => {
        this.loadService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.SUCCESS,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
        this.cardContent = (this.cardContent || []).filter(v => v.identifier !== request.identifier)
      },
      error => {
        if (error.status === 409) {
          this.dialog.open(ErrorParserComponent, {
            width: '80vw',
            height: '90vh',
            data: {
              errorFromBackendData: error.error,
            },
          })
        }
        this.loadService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.CONTENT_FAIL,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      },
    )
  }

  departmentData: any

  public fetchError = false

  public filterMenuItems: any = []

  filterMenuTreeControl: FlatTreeControl<IMenuFlatNode>

  filterMenuTreeFlattener: any

  public filters: any[] = []

  finalCall(commentsForm: FormGroup, content: any) {
    if (commentsForm) {
      let operationValue: any
      switch (content.type) {
        case 'moveToDraft':
          operationValue = 0
          break
        case 'moveToInReview':
          operationValue = -1
          break
      }
      const body: NSApiRequest.IForwardBackwardActionGeneral = {
        comment: commentsForm.controls.comments.value,
        operation: operationValue,
      }
      this.loadService.changeLoad.next(true)
      this.myContSvc.forwardBackward(body, content.data.identifier, content.data.status).subscribe(
        () => {
          this.loadService.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.SUCCESS,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
          this.cardContent = (this.cardContent || []).filter(v => v.identifier !== content.data.identifier)
        },
        error => {
          if (error.status === 409) {
            this.dialog.open(ErrorParserComponent, {
              width: '80vw',
              height: '90vh',
              data: {
                errorFromBackendData: error.error,
              },
            })
          }
          this.loadService.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: {
              type: Notify.CONTENT_FAIL,
            },
            duration: NOTIFICATION_TIME * 1000,
          })
        },
      )
    }
  }

  finalFilters: any = defaultFilter

  forwardBackward(content: any) {
    const dialogRef = this.dialog.open(CommentsDialogComponent, {
      width: '750px',
      height: '450px',
      data: { ...content.data, status: 'Draft' },
    })

    dialogRef.afterClosed().subscribe((commentsForm: FormGroup) => {
      if (commentsForm) {
        this.finalCall(commentsForm, content)
      }
    })
  }

  hasChild = (_: number, node: IMenuFlatNode) => node.expandable

  initCardTable() {
    this.tableData = {
      columns: [
        {
          displayName: 'Course Name',
          key: 'name',
          isList: false,
          prop: '',
          link: { path: '/author/content-detail/', dParams: 'identifier' },
          defaultValue: 'Untitled Content',
          image: 'appIcon',
        },
        { displayName: 'Kind', key: 'contentType', isList: false, prop: '', defaultValue: 'NA', pipe: PipeContentTypePipe },
        // { displayName: 'Active users', key: 'uniqueUsersCount', isList: false, prop: '', defaultValue: 0 },
        { displayName: 'Duration', key: 'duration', defaultValue: 0, pipe: PipeDurationTransformPipe },
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

  readonly isActivationKey = isActivationKey

  isAdmin = false

  isLtMedium$ = this.valueSvc.isLtMedium$

  leftmenues!: ILeftMenu

  loadMore() {
    this.pagination.offset += 1
    this.fetchContent(true, false)
  }

  mode$ = this.isLtMedium$.pipe(map(isMedium => (isMedium ? 'over' : 'side')))

  myRoles!: Set<string>

  newDesign = true

  ordinals: any

  public pagination!: IAuthoringPagination

  queryFilter = ''

  resourses: any

  restoreContent(request: NSContent.IContentMeta) {
    this.loadService.changeLoad.next(true)
    this.myContSvc.restoreContent(request.identifier).subscribe(
      () => {
        this.loadService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.SUCCESS,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
        this.cardContent = (this.cardContent || []).filter(v => v.identifier !== request.identifier)
      },
      error => {
        if (error.status === 409) {
          this.dialog.open(ErrorParserComponent, {
            width: '80vw',
            height: '90vh',
            data: {
              errorFromBackendData: error.error,
            },
          })
        }
        this.loadService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.CONTENT_FAIL,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      },
    )
  }

  routerSubscription = <Subscription>{}

  public screenSizeIsLtMedium = false

  search() {
    if (this.searchInputElem.nativeElement) {
      this.queryFilter = this.searchInputElem.nativeElement.value.trim()
    }
    this.fetchContent(false, false)
  }

  searchLanguage = ''

  setAction() {
    switch (this.status) {
      case 'draft':
      case 'rejected':
      case 'inreview':
      case 'review':
      case 'published':
      case 'publish':
      case 'processing':
      case 'unpublished':
      case 'deleted':
        this.currentAction = 'author'
        break
      case 'expiry':
        this.currentAction = 'expiry'
        break
    }
  }

  setCurrentLanguage(lang: string) {
    this.searchLanguage = lang
  }

  showLoadMore!: boolean

  public sideNavBarOpened = false

  public sideNavBarOpenedMain = true

  public status = 'published'

  tableData!: ITable

  totalContent!: number

  unPublishOrDraft(request: NSContent.IContentMeta) {
    this.loadService.changeLoad.next(true)
    this.myContSvc.upPublishOrDraft(request.identifier, request.status !== 'Unpublished').subscribe(
      () => {
        this.loadService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.SUCCESS,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
        this.cardContent = (this.cardContent || []).filter(v => v.identifier !== request.identifier)
      },
      error => {
        if (error.status === 409) {
          this.dialog.open(ErrorParserComponent, {
            width: '750px',
            height: '450px',
            data: {
              errorFromBackendData: error.error,
            },
          })
        }
        this.loadService.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.CONTENT_FAIL,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      },
    )
  }

  unit: string[] = []

  userId!: string
}
