import { Injectable } from '@angular/core'
import { ICollectionEditorConfig } from './../interface/collection-editor'
import { ICreateEntity } from './../interface/create-entity'
import { IFormMeta } from './../interface/form'
import { IConditionsV2 } from '../interface/conditions-v2'
import { IMetaUnit } from '../routing/modules/editor/interface/meta'
import { Subject } from 'rxjs'

interface IPermission {
  conditions: IConditionsV2
  enabledByDefault: boolean
}
/**
 * @export
 * @class AuthInitService
 *
 * Service acts as a store through which we can save data on
 * the first time load and access it on further request so no need
 * to call the api call again and again
 */
@Injectable()
export class AuthInitService {
  private messageSource = new Subject<any>()
  public currentMessage = this.messageSource.asObservable()
  private publishSource = new Subject<any>()
  public publishMessage = this.publishSource.asObservable()
  private uploadSource = new Subject<any>()
  public uploadMessage = this.uploadSource.asObservable()
  private editCourseContent = new Subject<any>()
  public editCourseMessage = this.editCourseContent.asObservable()

  private saveContent = new Subject<any>()
  public saveContentMessage = this.saveContent.asObservable()

  private createModule = new Subject<any>()
  public createModuleMessage = this.createModule.asObservable()

  private review = new Subject<any>()
  public reviewProcess = this.review.asObservable()

  authConfig!: IFormMeta
  authMetaV2!: { [key: string]: IMetaUnit<any> }
  ordinals: any
  authAdditionalConfig!: any
  collectionConfig!: ICollectionEditorConfig
  creationEntity = new Map<string, ICreateEntity>()
  optimizedWorkFlow!: { allow: boolean; conditions: IConditionsV2 }
  workFlowTable!: { conditions: IConditionsV2; workFlow: string[] }[]
  ownerDetails!: {
    status: string[]
    owner: string
    name: string
    relatedActions: string[]
    actionName: string
  }[]
  permissionDetails!: { role: string; editContent: IPermission; editMeta: IPermission }[]

  changeMessage(message: string) {
    this.messageSource.next(message)
  }
  publishData(message: any) {
    this.publishSource.next(message)
  }
  uploadData(message: any) {
    this.uploadSource.next(message)
  }
  editCourse(message: any) {
    this.editCourseContent.next(message)
  }
  saveData(message: any) {
    this.saveContent.next(message)
  }
  createModuleUnit(message: any) {
    this.createModule.next(message)
  }

  reviewCall(type: string) {
    this.review.next(type)
  }
}
