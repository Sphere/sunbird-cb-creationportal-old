import { Injectable } from '@angular/core'
import { ICollectionEditorConfig } from './../interface/collection-editor'
import { ICreateEntity } from './../interface/create-entity'
import { IFormMeta } from './../interface/form'
import { IConditionsV2 } from '../interface/conditions-v2'
import { IMetaUnit } from '../routing/modules/editor/interface/meta'
import { Subject } from 'rxjs'
import { NSIQuality } from '../routing/modules/editor/interface/content-quality'

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
  contentQuality!: NSIQuality.IContentQualityConfig

  private messageSource = new Subject<any>()
  public currentMessage = this.messageSource.asObservable()
  private publishSource = new Subject<any>()
  public publishMessage = this.publishSource.asObservable()
  private reviewSource = new Subject<any>()
  public reviewMessage = this.reviewSource.asObservable()

  private backToHomeSource = new Subject<any>()
  public backToHomeMessage = this.backToHomeSource.asObservable()

  private uploadSource = new Subject<any>()
  public uploadMessage = this.uploadSource.asObservable()
  private editCourseContent = new Subject<any>()
  public editCourseMessage = this.editCourseContent.asObservable()

  private saveContent = new Subject<any>()
  public saveContentMessage = this.saveContent.asObservable()

  private createModule = new Subject<any>()
  public createModuleMessage = this.createModule.asObservable()

  private updateResource = new Subject<any>()
  public updateResourceMessage = this.updateResource.asObservable()

  private addAssessment = new Subject<any>()
  public updateAssessmentMessage = this.addAssessment.asObservable()

  private editAssessment = new Subject<any>()
  public editAssessmentMessage = this.editAssessment.asObservable()

  private showAssessment = new Subject<any>()
  public showAssessmentMessage = this.showAssessment.asObservable()

  private isAssessmentOrQuiz = new Subject<any>()
  public isAssessmentOrQuizMessage = this.isAssessmentOrQuiz.asObservable()

  private isBackButtonClicked = new Subject<any>()
  public isBackButtonClickedMessage = this.isBackButtonClicked.asObservable()

  private isBackButtonFromAssessmentClicked = new Subject<any>()
  public isBackButtonFromAssessmentClickedMessage = this.isBackButtonFromAssessmentClicked.asObservable()

  private isEditMetaPageClicked = new Subject<any>()
  public isEditMetaPageClickedClickedMessage = this.isEditMetaPageClicked.asObservable()

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
  reviewCheck(message: any) {
    this.reviewSource.next(message)
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
  updateResources(message: string) {
    this.updateResource.next(message)
  }
  updateAssessment(message: any) {
    this.addAssessment.next(message)
  }
  editAssessmentAction(message: any) {
    this.editAssessment.next(message)
  }
  showAssessmentAction(message: any) {
    this.showAssessment.next(message)
  }
  isAssessmentOrQuizAction(message: any) {
    this.isAssessmentOrQuiz.next(message)
  }
  isBackButtonClickedAction(message: any) {
    this.isBackButtonClicked.next(message)
  }
  isBackButtonClickedFromAssessmentAction(message: any) {
    this.isBackButtonFromAssessmentClicked.next(message)
  }
  isEditMetaPageAction(message: any) {
    this.isEditMetaPageClicked.next(message)
  }
  backToHome(message: any) {
    this.backToHomeSource.next(message)
  }

}
