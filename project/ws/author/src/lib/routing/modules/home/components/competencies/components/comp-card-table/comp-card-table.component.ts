import { SelectionModel } from '@angular/cdk/collections'
import {
  AfterViewInit,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  // SimpleChange,
  // SimpleChange,
  ViewChild,
} from '@angular/core'
import { MatPaginator, MatSort, MatTableDataSource } from '@angular/material'
import { NsWidgetResolver, WidgetBaseComponent } from '@ws-widget/resolver'
import { IColums, ITable } from './comp-card-table.model'
/* tslint:disable */
import _ from 'lodash'
import { NSContent } from '../../../../../../../interface/content'
/* tslint:enable */
@Component({
  selector: 'ws-auth-comp-card-content',
  templateUrl: './comp-card-table.component.html',
  styleUrls: ['./comp-card-table.component.scss'],
})
export class CompCardTableComponent extends WidgetBaseComponent
  implements OnInit, OnDestroy, AfterViewInit, OnChanges, NsWidgetResolver.IWidgetData<ITable> {
  @Input() widgetData!: ITable
  @HostBinding('id')
  public id = `ws-card_${Math.random()}`
  @HostBinding('class') class = 'flex-1'

  @Input() data?: []
  selection = new SelectionModel<any>(true, [])
  @Input() userRoles: Set<string> | null = null
  @Input() userId!: string
  @Output() clicked?: EventEmitter<any>
  @Output() actionsClick?: EventEmitter<any>
  bodyHeight = document.body.clientHeight - 125
  displayedColumns!: IColums[]
  dataSource = new MatTableDataSource<any>()
  displayType = this.widgetData && this.widgetData.display || 'card'
  cardTableColumns!: IColums[]
  @ViewChild(MatSort, { static: false }) set matSort(sort: MatSort) {
    if (!this.dataSource.sort) {
      this.dataSource.sort = sort
    }
  }
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator
  constructor() {
    super()
    this.actionsClick = new EventEmitter()
    this.clicked = new EventEmitter()
  }
  ngOnDestroy(): void {
    // throw new Error('Method not implemented.')
  }
  updatedisplay() {
    this.displayType = this.displayType === 'table' ? 'card' : 'table'
  }
  get display() {
    return this.displayType
  }
  ngOnInit() {
    if (this.widgetData) {
      this.displayType = this.widgetData && this.widgetData.display || 'card'
      this.displayedColumns = this.widgetData.columns || []
      if (this.data) {
        this.dataSource.data = this.data
        this.dataSource.paginator = this.paginator
      }
    }
  }

  ngOnChanges(data: any) {
    this.dataSource.data = _.get(data, 'data.currentValue')
  }

  ngAfterViewInit() {
    // this.cd.detectChanges();
  }
  changeToDefaultImg($event: any) {
    $event.target.src = '/assets/instances/eagle/app_logos/default.png'
  }
  changeToDefaultSourceImg($event: any) {
    $event.target.src = '/assets/instances/eagle/app_logos/sourcenew.png'
  }
  // need to bind with output
  redirect(cardData: any) {
    if (this.clicked) {
      //   const lest = this.router.url.split('?')[0].split('/').pop() || 'dictionary'
      //   this.route.navigate(['/author/competencies/competency', lest, _.get(cardData, 'id')])
      // }
      this.clicked.emit(cardData)
    }
  }
  getRatingIcon(content: any, ratingIndex: number): 'star' | 'star_border' | 'star_half' {
    if (content && content.averageRating) {
      const avgRating = content.averageRating
      const ratingFloor = Math.floor(avgRating)
      if (ratingIndex <= ratingFloor) {
        return 'star'
      }
      if (ratingFloor === ratingIndex - 1 && avgRating % 1 > 0) {
        return 'star_half'
      }
    }
    return 'star_border'
  }
  applyFilter(filterValue: any) {
    if (filterValue && filterValue.value) {
      let fValue = filterValue.value.trim()
      fValue = filterValue.value.toLowerCase()
      this.dataSource.filter = fValue
    } else {
      this.dataSource.filter = ''
    }
  }
  buttonClick(action: string, row: any) {
    // console.log(action, row);
    const isDisabled = _.get(_.find(this.widgetData.actions, ac => ac.name === action), 'disabled') || false
    if (!isDisabled && this.actionsClick) {
      this.actionsClick.emit({ action, row })
    }
  }
  getFinalColumns() {
    const columns = _.map(this.widgetData.columns, c => c.key)
    if (this.widgetData.needCheckBox) {
      columns.splice(0, 0, 'select')
    }
    if (this.widgetData.needHash) {
      columns.splice(0, 0, 'SR')
    }
    if (this.widgetData.actions && this.widgetData.actions.length > 0) {
      columns.push('Actions')
    }
    if (this.widgetData.actionsMenu && this.widgetData.actionsMenu.menus.length > 0) {
      columns.push('ActionsMenu')
    }
    // console.log(columns);

    return columns || []
  }

  getCardHeadRows() {
    const col = _.first(this.widgetData.columns)
    if (col) {
      this.cardTableColumns = [col]
      const newColumns = [_.first(_.map(this.widgetData.columns, c => c.key))]
      newColumns.push('ActionsMenu')
      return newColumns
    }
    return []
  }
  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length
    const numRows = this.dataSource.data.length
    return numSelected === numRows
  }
  filterList(list: any[], key: string) {
    return list.map(lst => lst[key])
  }
  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
      this.selection.clear() :
      this.dataSource.data.forEach(row => this.selection.select(row))
  }
  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: any): string {
    if (!row) {
      return `${this.isAllSelected() ? 'select' : 'deselect'} all`
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.position + 1}`
  }

  showMenuItem(menuType: string, row: any) {
    if (menuType && row) {
      let returnValue = true
      return returnValue
    }
    return false
  }
  takeAction(action: string, row: any) {
    const isDisabled = _.get(_.find(this.widgetData.actions, ac => ac.name === action), 'disabled') || false
    if (!isDisabled && this.actionsClick) {
      this.actionsClick.emit({ type: action, data: row })
    }
  }
  hasAccess(
    meta: NSContent.IContentMeta,
    forPreview = false,
    parentMeta?: NSContent.IContentMeta,
  ): boolean {
    if (this.hasRole(['editor', 'admin'])) {
      return true
    }
    let returnValue = false
    if (['Draft', 'Live'].indexOf(meta.status) > -1) {
      if (meta.creatorContacts && meta.creatorContacts.length) {
        meta.creatorContacts.forEach(v => {
          if (v.id === this.userId) {
            returnValue = true
          }
        })
      }
    }
    if (meta.status === 'InReview' && this.hasRole(['reviewer'])) {
      if (meta.trackContacts && meta.trackContacts.length) {
        meta.trackContacts.forEach(v => {
          if (v.id === this.userId) {
            returnValue = true
          }
        })
      }
      if (!returnValue && parentMeta && parentMeta.creatorContacts && meta.creatorContacts) {
        returnValue = parentMeta.creatorContacts.some(v =>
          meta.creatorContacts.find(cv => cv.id === v.id),
        )
      }
    }
    if (['Reviewed'].indexOf(meta.status) > -1 && this.hasRole(['publisher'])) {
      if (meta.publisherDetails && meta.publisherDetails.length) {
        meta.publisherDetails.forEach(v => {
          if (v.id === this.userId) {
            returnValue = true
          }
        })
      }
      if (!returnValue && parentMeta && parentMeta.creatorContacts && meta.creatorContacts) {
        returnValue = parentMeta.creatorContacts.some(v =>
          meta.creatorContacts.find(cv => cv.id === v.id),
        )
      }
    }
    if (forPreview && meta.visibility === 'Public') {
      returnValue = true
    }
    return returnValue
  }
  hasRole(role: string[]): boolean {
    let returnValue = false
    role.forEach(v => {
      if ((this.userRoles || new Set()).has(v)) {
        returnValue = true
      }
    })
    return returnValue
  }
}
