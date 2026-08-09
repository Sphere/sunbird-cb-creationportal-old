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

  private currentPageStatus = new Subject<any>()
  public currentPageStatusMessage = this.currentPageStatus.asObservable()

  private currentNavigation = new Subject<any>()
  public currentNavigationMessage = this.currentNavigation.asObservable()

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

  /**
   * The default value declared for a field against a content type, or undefined if the
   * table has no entry for it.
   *
   * Callers used to index straight through the table --
   * `authConfig[field].defaultValue[contentType][0].value` -- so a content type with no
   * row threw a TypeError. That exception was swallowed by a broad catch far upstream
   * and shown to authors as "Please Save Parent first and refresh page.", which sent
   * everyone looking in the wrong place. Returning undefined lets the caller leave the
   * field alone instead of aborting the whole save.
   *
   * The value is cloned because callers assign it straight onto content metadata and
   * would otherwise share the table's own objects. The clone stays a JSON round-trip
   * rather than structuredClone: expiryDate holds Date objects, and the round-trip
   * turns those into ISO strings, which is the shape every caller already handles.
   */
  defaultValueFor(field: keyof IFormMeta, contentType: string): any {
    const rule = this.authConfig?.[field]?.defaultValue?.[contentType]?.[0]
    return rule === undefined ? undefined : JSON.parse(JSON.stringify(rule.value))
  }

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
  currentPageAction(message: any) {
    this.currentPageStatus.next(message)
  }
  backToHome(message: any) {
    this.backToHomeSource.next(message)
  }
  currentNavigations(message: any) {
    this.currentNavigation.next(message)
  }
}
