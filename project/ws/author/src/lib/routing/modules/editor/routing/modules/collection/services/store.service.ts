import { Injectable } from '@angular/core'
import { LoggerService, ConfigurationsService } from '@ws-widget/utils'
import { DEPTH_RUE } from '@ws/author/src/lib/constants/depth-rule'
import { IAllowedType } from '@ws/author/src/lib/interface/collection-child-config'
import { NSContent } from '@ws/author/src/lib/interface/content'
import { ICreateEntity } from '@ws/author/src/lib/interface/create-entity'
import { EditorContentService } from '@ws/author/src/lib/routing/modules/editor/services/editor-content.service'
import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'
import { AuthInitService } from '@ws/author/src/lib/services/init.service'
import { BehaviorSubject, ReplaySubject } from 'rxjs'
// import { tap } from 'rxjs/operators'
import { IContentNode, IContentTreeNode } from './../interface/icontent-tree'
import { CollectionResolverService } from './resolver.service'
import { NSApiRequest } from '@ws/author/src/lib/interface/apiRequest'
import { Router } from '@angular/router'
// import { v4 as uuidv4 } from 'uuid'
import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'
import { environment } from '../../../../../../../../../../../../src/environments/environment'

interface IProcessedError {
  id: string | number
  name: string
  message: string[]
}
@Injectable()
export class CollectionStoreService {
  parentNode: string[] = []
  invalidIds: number[] = []
  createdModuleUpdate = false
  onInvalidNodeChange = new ReplaySubject<number[]>()
  /**
   * Map from flat node to nested node. This helps us finding the nested node to be modified
   */
  flatNodeMap = new Map<number, IContentNode>()

  /**
   * Map for unique id and lex id. This helps us finding the lex id of the node
   */
  uniqueIdMap = new Map<number, string>()

  /**
   * Map for Lex id with unique id. This helps us tracking the change
   */
  lexIdMap = new Map<string, number[]>()

  changedHierarchy: any = {}

  currentParentNode!: number
  currentSelectedNode!: number

  hierarchyTree: any = {}

  constructor(
    private contentService: EditorContentService,
    private editorService: EditorService,
    private resolver: CollectionResolverService,
    private authInitService: AuthInitService,
    private logger: LoggerService,
    private router: Router,
    private accessService: AccessControlService,
    private configSvc: ConfigurationsService,
  ) { }

  treeStructureChange = new BehaviorSubject<IContentNode | null>(null)
  selectedNodeChange = new BehaviorSubject<number | null>(null)
  get selectedNode() {
    return this.selectedNodeChange.value
  }

  uploadFileType = new BehaviorSubject<string | null>(null)
  get uploadFileTypeValue() {
    return this.uploadFileType.value
  }

  allowDrop(dragNode: IContentTreeNode, dropNode: IContentTreeNode): boolean {
    let allow = true
    if (!dragNode.editable || !dropNode.editable) {
      allow = false
    } else if (!this.authInitService.collectionConfig.childrenConfig[dropNode.category]) {
      allow = false
    } else if (
      !this.resolver.hasAccess(
        this.contentService.getUpdatedMeta(dropNode.identifier),
        dropNode.parentId
          ? this.contentService.getUpdatedMeta(
            (this.flatNodeMap.get(dropNode.parentId) as IContentNode).identifier,
          )
          : undefined,
      )
    ) {
      allow = false
    } else if (
      this.authInitService.collectionConfig.maxDepth <=
      dropNode.level + DEPTH_RUE[dragNode.category]
    ) {
      allow = false
    }
    return allow
  }

  // dragAndDrop(
  //   dragNode: IContentTreeNode | IContentNode,
  //   dropNode: IContentTreeNode,
  //   adjacentId?: number,
  //   dropLocation: 'above' | 'below' = 'below',
  //   emitChange = true,
  // ) {
  //   const oldParentNode = dragNode.parentId ? this.flatNodeMap.get(dragNode.parentId) : undefined
  //   const newParentNode = this.flatNodeMap.get(dropNode.id) as IContentNode
  //   const oldParentChildList = oldParentNode ? (oldParentNode.children as IContentNode[]) : []
  //   const newParentChildList = newParentNode.children as IContentNode[]
  //   oldParentChildList.splice(
  //     oldParentChildList.findIndex(v => v.id === dragNode.id),
  //     1,
  //   )
  //   const childNode = this.flatNodeMap.get(dragNode.id) as IContentNode
  //   childNode.parentId = dropNode.id
  //   if (adjacentId) {
  //     const dropPosition =
  //       (dropNode.children || []).indexOf(adjacentId) + (dropLocation === 'above' ? -1 : 1)
  //     const children = newParentNode.children as IContentNode[]
  //     children.splice(dropPosition, 0, childNode)
  //   } else {
  //     if (newParentChildList) {
  //       newParentChildList.push(childNode)
  //     } else {
  //       newParentNode.children = [childNode]
  //     }
  //   }
  //   if (oldParentNode) {
  //     this.changedHierarchy[oldParentNode.identifier] = {
  //       root: this.parentNode.includes(oldParentNode.identifier),
  //       contentType: oldParentNode.contentType,
  //       children: oldParentChildList.map(v => {
  //         const child = v.identifier
  //         return child
  //       }),
  //       // children: oldParentChildList.map(v => {
  //       //   const child = {
  //       //     identifier: v.identifier,
  //       //     reasonAdded: 'Added from Authoring Tool',
  //       //     childrenClassifiers: [],
  //       //   }
  //       //   return child
  //       // }),
  //     }
  //   }
  //   this.changedHierarchy[newParentNode.identifier] = {
  //     root: this.parentNode.includes(newParentNode.identifier),
  //     contentType: newParentNode.contentType,
  //     children: newParentChildList.map(v => {
  //       const child = v.identifier
  //       return child
  //     }),
  //     // children: newParentChildList.map(v => {
  //     //   const child = {
  //     //     identifier: v.identifier,
  //     //     reasonAdded: 'Added from Authoring Tool',
  //     //     childrenClassifiers: [],
  //     //   }
  //     //   return child
  //     // }),
  //   }
  //   if (emitChange) {
  //     this.treeStructureChange.next(this.treeStructureChange.value)
  //   }
  // }

  async dragAndDrop(
    dragNode: IContentTreeNode | IContentNode,
    dropNode: IContentTreeNode,
    adjacentId?: number,
    dropLocation: 'above' | 'below' = 'below',
    emitChange = true,
  ) {

    const oldParentNode = dragNode.parentId ? this.flatNodeMap.get(dragNode.parentId) : undefined
    const newParentNode = this.flatNodeMap.get(dropNode.id) as IContentNode
    const oldParentChildList = oldParentNode ? (oldParentNode.children as IContentNode[]) : []
    const newParentChildList = newParentNode.children as IContentNode[]
    let request: any
    oldParentChildList.splice(
      oldParentChildList.findIndex(v => v.id === dragNode.id),
      1,
    )

    const childNode = this.flatNodeMap.get(dragNode.id) as IContentNode
    childNode.parentId = dropNode.id
    if (adjacentId) {
      const dropPosition =
        (dropNode.children || []).indexOf(adjacentId) + (dropLocation === 'above' ? -1 : 1)
      const children = newParentNode.children as IContentNode[]
      children.splice(dropPosition, 0, childNode)
    } else {
      if (newParentChildList) {
        newParentChildList.push(childNode)
      } else {
        newParentNode.children = [childNode]
      }
    }
    if (oldParentNode) {
      this.changedHierarchy[oldParentNode.identifier] = {
        root: this.parentNode.includes(oldParentNode.identifier),
        // contentType: "Course",
        contentType: oldParentNode.contentType,
        children: oldParentChildList.map(v => {
          const child = v.identifier
          return child
        }),
        // children: oldParentChildList.map(v => {
        //   const child = {
        //     identifier: v.identifier,
        //     reasonAdded: 'Added from Authoring Tool',
        //     childrenClassifiers: [],
        //   }
        //   return child
        // }),
      }
    }
    this.changedHierarchy[newParentNode.identifier] = {
      root: this.parentNode.includes(newParentNode.identifier),
      // contentType: "Course",
      contentType: newParentNode.contentType,
      children: newParentChildList.map(v => {
        const child = v.identifier
        return child
      }),
      // children: newParentChildList.map(v => {
      //   const child = {
      //     identifier: v.identifier,
      //     reasonAdded: 'Added from Authoring Tool',
      //     childrenClassifiers: [],
      //   }
      //   return child
      // }),
    }

    if (newParentChildList.length > 0) {
      newParentChildList.forEach(element => {
        if (element.children && element.children.length > 0 && !(Object.keys(this.changedHierarchy).includes(element.identifier))) {
          this.changedHierarchy[element.identifier] = {
            root: this.parentNode.includes(element.identifier),
            // contentType: element.contentType,
            contentType: element.contentType,
            children: element.children.map(v => {
              const child = v.identifier
              return child
            }),
          }
        }
      })
      request = {
        request: {
          rootId: this.parentNode[0],
          unitId: dropNode.identifier,
          children: [this.editorService.resourseID],
        },
      }
      if (this.parentNode[0] !== dropNode.identifier) {
        const result = await this.editorService.resourceToModule(request).toPromise()
        // tslint:disable-next-line:no-console
        console.log(result)
      }
    }
    if (this.parentNode.length > 0) {
      this.parentNode.forEach(element => {
        if (!Object.keys(this.changedHierarchy).includes(element)) {
          const tempData: any = this.contentService.getOriginalMeta(element)
          const childrenArray: any = []
          if (tempData.children.length > 0) {
            tempData.children.forEach((childData: any) => {
              childrenArray.push(childData.identifier)
            })
          }

          this.changedHierarchy[element] = {
            root: this.parentNode.includes(element),
            contentType: tempData.contentType,
            children: childrenArray,
          }
        }
      })
    }
    if (emitChange) {
      this.treeStructureChange.next(this.treeStructureChange.value)
    }
  }

  async addChildOrSibling(
    ids: string[],
    dropNode: IContentTreeNode,
    adjacentId?: number,
    dropLocation: 'above' | 'below' = 'below',
  ): Promise<boolean> {
    try {
      const contents = await this.editorService.readMultipleContent(ids).toPromise()
      const contentDataMap = new Map<string, NSContent.IContentMeta>()
      contents.map((v, index) => {
        this.contentService.setOriginalMeta(v)
        const treeStructure = this.resolver.buildTreeAndMap(
          v,
          contentDataMap,
          this.flatNodeMap,
          this.uniqueIdMap,
          this.lexIdMap,
        )
        this.dragAndDrop(
          treeStructure,
          dropNode,
          adjacentId,
          dropLocation,
          index === ids.length - 1,
        )
      })
      return true
    } catch (ex) {
      this.logger.error(ex)
      return false
    }
  }

  setUploadContentAcceptType() {
    let acceptMimeType = ''
    switch (this.uploadFileTypeValue) {
      case 'audio':
        acceptMimeType = 'audio/mpeg'
        break
      case 'video':
        acceptMimeType = 'video/mp4'
        break
      case 'pdf':
        acceptMimeType = 'application/pdf'
        break
      case 'zip':
        acceptMimeType = 'application/vnd.ekstep.html-archive'
        break
      default:
        acceptMimeType = 'application/pdf'
    }
    return acceptMimeType
  }

  async createChildOrSibling(
    type: string,
    dropNode: IContentTreeNode,
    adjacentId?: number,
    dropLocation: 'above' | 'below' = 'below',
    topicObj?: any,
    fileType?: string,
    sendContent?: boolean
    // ): Promise<boolean> {
  ): Promise<any> {
    try {
      let cType = type
      // For Link
      if (type === 'web') {
        cType = 'link'
      }

      const newChildUpdateCall = true
      let topicName = 'Untitled Content'
      let topicDescription = ''
      if (Object.keys(topicObj).length !== 0) {
        topicName = topicObj.topicName
        topicDescription = topicObj.topicDescription
      }

      const meta = this.authInitService.creationEntity.get(cType) as ICreateEntity
      const parentData = this.contentService.parentUpdatedMeta()
      let content
      // Temporary Static Value
      let mimeTypeData = meta.mimeType
      // if (cType.toLowerCase() === 'assessment') {
      //   mimeTypeData = 'application/json'
      //   // mimeTypeData = 'application/vnd.ekstep.ecml-archive'
      // }

      if (cType === 'upload') {
        mimeTypeData = this.setUploadContentAcceptType()
      }

      const requestBody = {
        name: topicName,
        description: topicDescription,
        // mimeType: meta.mimeType,
        mimeType: mimeTypeData,
        contentType: meta.contentType,
        resourceType: parentData.categoryType || '',
        categoryType: parentData.categoryType || '',
        fileType: fileType || '',

        // thumbnail: parentData.thumbnail,
        // appIcon: parentData.appIcon,
        posterImage: parentData.posterImage,
        sourceName: parentData.sourceName,
        subTitle: parentData.subTitle,
        body: parentData.body,
        //   sourceName : parentData.sourceName,

        locale:
          // tslint:disable-next-line: ter-computed-property-spacing
          this.contentService.originalContent[
            (this.flatNodeMap.get(this.currentParentNode) as IContentNode).identifier
            // tslint:disable-next-line: ter-computed-property-spacing
          ].locale || 'en',
        ...(meta.additionalMeta || {}),
        // primaryCategory: meta.primaryCategory
        primaryCategory: meta.primaryCategory || 'Learning Resource',
        ownershipType: ['createdFor'],
      }

      // requestBody.posterImage = parentData.posterImage
      // requestBody.sourceName = parentData.sourceName
      // requestBody.subTitle = parentData.subTitle
      // requestBody.body = parentData.body
      // requestBody.categoryType = parentData.categoryType

      // const content = await this.editorService.createAndReadContent(requestBody).toPromise()

      if (meta.primaryCategory === 'Course Unit') {
        content = await this.editorService.createAndReadModule(this.getModuleRequest(requestBody),
                                                               parentData.identifier).toPromise()
        this.createdModuleUpdate = true
      } else {
        content = await this.editorService.createAndReadContentV2(requestBody).toPromise()
      }

      // if (content) {
      //  // content.thumbnail = parentData.thumbnail
      //  // content.appIcon = parentData.appIcon
      // }
      if (content) {
        this.contentService.setOriginalMeta(content)

        const contentDataMap = new Map<string, NSContent.IContentMeta>()
        const treeStructure = this.resolver.buildTreeAndMap(
          content,
          contentDataMap,
          this.flatNodeMap,
          this.uniqueIdMap,
          this.lexIdMap,
        )
        this.dragAndDrop(treeStructure, dropNode, adjacentId, dropLocation)
      }
      if (newChildUpdateCall) {
        // this.getHierarchyTreeStructure()
      }

      if (sendContent) {
        return { content, isDone: true }
      }

      return true
    } catch (ex) {
      this.logger.error(ex)
      return false
    }
  }

  getModuleRequest(meta: any) {
    const parentData = this.contentService.getOriginalMeta(this.contentService.parentContent)
    const nodesModify: any = {}
    // const uuidValue = uuidv4()
    let randomNumber = ''
    // tslint:disable-next-line: no-increment-decrement
    for (let i = 0; i < 16; i++) {
      randomNumber += Math.floor(Math.random() * 10)
    }
    if (parentData && parentData.children && parentData.children.length > 0) {
      nodesModify[parentData.identifier] = {
        objectType: 'Content',
        contentType: 'Course',
        isNew: false,
        root: true,
      }
      // parentData.children.forEach((element: any) => {
      //   if (element.primaryCategory === 'Course Unit') {
      //     nodesModify[element.identifier] = {
      //       isNew: false,
      //       root: (element.identifier === parentData.identifier) ? true : false,
      //     }
      //   }
      //   if (element.children && element.children.length > 0) {
      //     parentData.children.forEach((subEle: any) => {
      //       if (subEle.primaryCategory === 'Course Unit') {
      //         nodesModify[subEle.identifier] = {
      //           isNew: false,
      //           root: (subEle.identifier === parentData.identifier) ? true : false,
      //         }
      //       }
      //     })
      //   }
      // })
    } else {
      nodesModify[parentData.identifier] = {
        objectType: 'Content',
        contentType: 'Course',
        isNew: false,
        root: true,
      }
    }
    nodesModify[meta.name] = {
      isNew: true,
      root: false,
      metadata: {
        code: randomNumber,
        contentType: meta.contentType,
        createdBy: this.accessService.userId,
        createdFor: [(this.configSvc.userProfile && this.configSvc.userProfile.rootOrgId) ? this.configSvc.userProfile.rootOrgId : ''],
        creator: this.accessService.userName,
        description: meta.description,
        framework: environment.framework,
        mimeType: meta.mimeType,
        name: meta.name,
        organisation: [
          (this.configSvc.userProfile && this.configSvc.userProfile.departmentName) ? this.configSvc.userProfile.departmentName : '',
        ],
        isExternal: meta.mimeType === 'application/html',
        primaryCategory: meta.primaryCategory,
        license: (meta.license) ? meta.license : 'CC BY 4.0',
        ownershipType: ['createdFor'],
        // purpose: (purpose) ? purpose : '',
        purpose: '',
        // visibility: (meta.primaryCategory === 'Course Unit') ? 'Parent' : 'Default',
      },
    }
    const hierarchyData = this.getTreeHierarchy()
    hierarchyData[meta.name] = {
      root: false,
      contentType: meta.contentType,
      primaryCategory: meta.primaryCategory,
      children: [],
    }
    Object.keys(hierarchyData).forEach((ele: any) => {
      if (hierarchyData[ele].root) {
        hierarchyData[ele].children.push(meta.name)
      }
    })

    parentData.children.forEach((element: any) => {
      // if (element.primaryCategory === 'Course Unit') {
      hierarchyData[element.identifier] = {
        // isNew: false,
        children: [],
        name: element.name,
        root: (element.identifier === parentData.identifier) ? true : false,
      }
      // }
      if (element.children && element.children.length > 0) {
        parentData.children.forEach((subEle: any) => {
          // if (subEle.primaryCategory === 'Course Unit') {
          hierarchyData[subEle.identifier] = {
            // isNew: false,
            children: [],
            name: subEle.name,
            root: (subEle.identifier === parentData.identifier) ? true : false,
          }
          // }
        })
      }
    })

    const modulePayload = {
      request: {
        data: {
          nodesModified: nodesModify,
          hierarchy: hierarchyData,
        },
      },
    }
    return modulePayload
  }

  getHierarchyTreeStructure() {
    const hierarchyObj: any = {}
    this.treeStructureChange.subscribe((d: any) => {
      if (!d.parentId) {
        hierarchyObj[d.identifier] = {}
        hierarchyObj[d.identifier]['children'] = []
        hierarchyObj[d.identifier]['root'] = true
      }
      if (hierarchyObj[d.identifier]) {
        d.children.forEach((e: any) => {
          hierarchyObj[d.identifier]['children'].push(e.identifier)
          if (e.children.length > 0) {
            hierarchyObj[e.identifier] = {}
            hierarchyObj[e.identifier]['children'] = []
            hierarchyObj[e.identifier]['root'] = false
          }
          if (hierarchyObj[e.identifier]) {
            e.children.forEach((el: any) => {
              hierarchyObj[e.identifier]['children'].push(el.identifier)
            })
          }
        })
      }
    })
    const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
      request: {
        data: {
          nodesModified: {},
          hierarchy: hierarchyObj,
        },
      },
    }
    this.editorService.updateContentV4(requestBodyV2).subscribe(() => {
      this.changedHierarchy = {}
      Object.keys(this.contentService.upDatedContent).forEach(async id => {
        this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
      })
      this.contentService.upDatedContent = {}
    })
  }

  updateNewSubChild() {
    // let childArr: any[] = []
    const hierarchyOb = this.changedHierarchy
    if (Object.keys(hierarchyOb).length !== 0) {
      // this.changedHierarchy[this.contentService.currentContent]['children'].forEach((e: any) => {
      //   childArr.push(e.identifier)
      // })
      // hierarchyOb[this.contentService.currentContent]['children'] = childArr
      hierarchyOb[this.contentService.currentContent]['root'] = true
    }
    const requestBodyV2: NSApiRequest.IContentUpdateV3 = {
      request: {
        data: {
          nodesModified: {},
          hierarchy: hierarchyOb,
        },
      },
    }

    // console.log('updateContentV4   ', meta)
    // this.apiService.patch<null>(
    //   `/apis/proxies/v8/action/content/v3/hierarchy/update`,
    //   meta,
    // ).subscribe((d) => {
    //   console.log('DDDDDD     ', d)
    // })
    this.editorService.updateContentV4(requestBodyV2).subscribe(() => {
      this.changedHierarchy = {}
      Object.keys(this.contentService.upDatedContent).forEach(async id => {
        this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
      })
      this.contentService.upDatedContent = {}
    })

    // this.editorService.updateContentV4(requestBodyV2).pipe(
    //   tap(() => {
    //     console.log('RESPONSE 0000')
    //     this.changedHierarchy = {}
    //     Object.keys(this.contentService.upDatedContent).forEach(async id => {
    //       this.contentService.resetOriginalMeta(this.contentService.upDatedContent[id], id)
    //     })
    //     this.contentService.upDatedContent = {}
    //   }),
    // )
  }

  deleteNode(id: number) {
    const deleteIds = this.resolver.getFlatHierarchy(id, this.flatNodeMap, false)
    const node = this.flatNodeMap.get(id) as IContentNode
    const parentNode = node.parentId ? this.flatNodeMap.get(node.parentId) : undefined

    deleteIds.forEach(v => {
      this.flatNodeMap.delete(v)
      const lexId = this.uniqueIdMap.get(v) as string
      this.uniqueIdMap.delete(v)
      const uniqueIds = this.lexIdMap.get(lexId) as number[]
      if (uniqueIds.length > 1) {
        uniqueIds.splice(
          uniqueIds.findIndex(currId => v === currId),
          1,
        )
      } else {
        this.lexIdMap.delete(lexId)
        delete this.contentService.originalContent[lexId]
        delete this.contentService.upDatedContent[lexId]
        delete this.changedHierarchy[lexId]
      }
    })

    if (parentNode) {
      const children = parentNode.children || []
      children.splice(
        children.findIndex(v => v.id === id),
        1,
      )

      this.changedHierarchy[parentNode.identifier] = {
        root: this.parentNode.includes(parentNode.identifier),
        children: children.map(v => {
          const child = v.identifier
          // const child = {
          //   identifier: v.identifier,
          //   reasonAdded: 'Added from Authoring Tool',
          //   childrenClassifiers: [],
          // }
          return child
        }),
      }
      if (children.length > 0) {
        children.forEach(element => {
          if (element.children && element.children.length > 0 && !(Object.keys(this.changedHierarchy).includes(element.identifier))) {
            this.changedHierarchy[element.identifier] = {
              root: this.parentNode.includes(element.identifier),
              contentType: element.contentType,
              children: element.children.map(v => {
                const child = v.identifier
                return child
              }),
            }
          }
        })
      }
      if (this.parentNode.length > 0) {
        this.parentNode.forEach(element => {
          if (!Object.keys(this.changedHierarchy).includes(element)) {
            const tempData: any = this.contentService.getOriginalMeta(element)
            const childrenArray: any = []
            if (tempData.children.length > 0) {
              tempData.children.forEach((childData: any) => {
                childrenArray.push(childData.identifier)
              })
            }
            this.changedHierarchy[element] = {
              root: this.parentNode.includes(element),
              contentType: tempData.contentType,
              children: childrenArray,
            }
          }
        })
      }
    }
    this.treeStructureChange.next(this.treeStructureChange.value)
  }

  cascadeDown(id: number, value: any, field: string, single = false): boolean {
    const dependantIds = this.resolver.getFlatHierarchy(id, this.flatNodeMap, true)
    if (dependantIds.length <= 1) {
      return false
    }
    dependantIds
      .filter(v => v !== id)
      .forEach(v => {
        const lexId = this.uniqueIdMap.get(v) as string
        if (single) {
          // tslint:disable-next-line: ter-computed-property-spacing
          let meta = this.contentService.getUpdatedMeta(lexId)[
            field as keyof NSContent.IContentMeta
            // tslint:disable-next-line: ter-computed-property-spacing
          ]
          if (meta) {
            meta.push(value)
          } else {
            meta = [value]
          }
          this.contentService.setUpdatedMeta(
            ({ field: meta } as unknown) as NSContent.IContentMeta,
            lexId,
          )
        } else {
          this.contentService.setUpdatedMeta(
            ({ field: value } as unknown) as NSContent.IContentMeta,
            lexId,
          )
        }
      })
    return true
  }

  validationCheck(id: number): IProcessedError[] | null {
    const returnValue: Map<number, IProcessedError> = new Map<number, IProcessedError>()
    const errorIds = new Set<number>()
    const hierarchy = this.resolver.getFlatHierarchy(id, this.flatNodeMap)
    this.metaValidationCheck(hierarchy, errorIds, returnValue)
    this.hierarchyStructureCheck(hierarchy, errorIds, returnValue)
    this.onInvalidNodeChange.next(Array.from(errorIds))
    return returnValue.size ? Array.from(returnValue.values()) : null
  }

  hierarchyStructureCheck(
    ids: number[],
    errorId: Set<number>,
    errorMap: Map<number, IProcessedError>,
  ) {
    ids.forEach(v => {
      const contentNode = this.flatNodeMap.get(v) as IContentNode
      const category = contentNode.category as any
      const childConfig = this.authInitService.collectionConfig.childrenConfig[category]
      const errorMsg: string[] = []
      const lexId = this.uniqueIdMap.get(v) as string
      const content = this.contentService.getUpdatedMeta(lexId)
      let currNode = contentNode
      let currentLevel = 0
      while (currNode.parentId) {
        currentLevel = currentLevel + 1
        currNode = this.flatNodeMap.get(currNode.parentId) as IContentNode
      }
      const excessLevel =
        DEPTH_RUE[contentNode.category] +
        currentLevel -
        this.authInitService.collectionConfig.maxDepth
      if (excessLevel > 0) {
        errorMsg.push(
          `Breached maximum level of depth allowed. It should be ${excessLevel} level above`,
        )
      }

      if (childConfig) {
        const allowedTypes = childConfig.childTypes
        const childTypeMap: number[] = allowedTypes.map(() => 0)
        const children = contentNode.children || []
        if (childConfig.minChildren && children.length < childConfig.minChildren) {
          errorMsg.push(
            `Minimum ${childConfig.minChildren} children is required. But ${children.length ? children.length : 'nothing'
            } present`,
          )
        }
        if (childConfig.maxChildren && children.length > childConfig.maxChildren) {
          errorMsg.push(
            `Maximum ${childConfig.minChildren} children is allowed. But ${children.length} present`,
          )
        }
        children.forEach((child: IContentNode, position: number) => {
          const childContent = this.contentService.getUpdatedMeta(child.identifier)
          /* tslint:disable-next-line */
          console.log(content)
          let canPresent = false

          allowedTypes.forEach((element: IAllowedType, index: number) => {
            const canAllow = this.contentService.checkConditionV2(childContent, element.conditions)
            if (canAllow) {
              canPresent = true
              childTypeMap[index] = childTypeMap[index] + 1
              if (position) {
                return
              }
              // if (element.position === 'n' && position !== children.length - 1) {
              //   let isSameChild = true
              //   children.slice(position).forEach(sibling => {
              //     const siblingChild = this.contentService.getUpdatedMeta(sibling.identifier)
              //     isSameChild = this.contentService.checkConditionV2(
              //       siblingChild,
              //       element.conditions,
              //     )
              //     // if (!isSameChild) {
              //     //   errorMsg.push(`${childContent.name || 'Untitled Content'} should be last child`)
              //     //   return
              //     // }
              //   })
              // }
              return
            }
          })
          if (!canPresent) {
            errorMsg.push(`${childContent.name || 'Untitled Content'} is not allowed to add here`)
          }
        })
        allowedTypes.forEach((type: IAllowedType, index: number) => {
          const url = this.router.url
          const id = url.split('/')
          let contentData: any
          this.editorService.readcontentV3(id[3]).subscribe((res: any) => {
            contentData = res
            if (contentData.status === 'Draft') {
              if (type.minimum && childTypeMap[index] < type.minimum) {
                errorMsg.push(
                  `Minimum ${type.minimum} contents of type ${this.formStringFromCondition(
                    type.conditions,
                  )} is required. But only ${childTypeMap[index]} is present`,
                )
              }
            }
          })
          if (type.maximum && type.maximum < childTypeMap[index]) {
            errorMsg.push(
              `Maximum ${type.maximum} contents of type ${this.formStringFromCondition(
                type.conditions,
              )} is allowed. But ${childTypeMap[index]} is present`,
            )
          }
        })
      } else if (contentNode.children && contentNode.children.length) {
        errorMsg.push(`Should not contain any child. But ${contentNode.children.length} were added`)
      }
      this.populateErrorMsg(v, errorMsg, content, errorId, errorMap)
    })
  }

  formStringFromCondition(condition: any): string {
    let returnValue = ''
    if (condition.fit) {
      condition.fit.forEach((subCondition: any, majorIndex: number) => {
        Object.keys(subCondition).forEach((v: any, index: number) => {
          returnValue = `${returnValue}${majorIndex > 0 ? ' or ' : ''}${index > 0 ? ' ' : ''
            }${v} in ${subCondition[v].join(' or ')}`
        })
      })
    }
    return returnValue
  }

  metaValidationCheck(ids: number[], errorId: Set<number>, errorMap: Map<number, IProcessedError>) {
    ids.forEach(v => {
      const errorMsg: string[] = []
      const lexId = this.uniqueIdMap.get(v) as string
      const content = this.contentService.getUpdatedMeta(lexId)
      // const url = this.router.url
      // const id = url.split('/')
      if (content.name === '') {
        errorMsg.push('Course title cannot be empty')
      }
      if (content.description === '' && content.status === 'Draft') {
        errorMsg.push('Course description/summary cannot be empty')
      }
      if (content.purpose === '') {
        errorMsg.push('Course subtitle cannot be empty')
      }
      if (content.instructions === '') {
        errorMsg.push('Course long description cannot be empty')
      }
      /*Workaround*/
      // && content.parent != id[3]
      if (content.thumbnail === undefined && content.status === 'Draft') {
        errorMsg.push('Course thumbnail cannot be empty')
      }
      if (content.sourceName === undefined && content.status === 'Draft' && content.parent !== undefined) {
        errorMsg.push('Course provider/source cannot be empty')
      }
      if (content.mimeType === 'text/x-url' && content.artifactUrl === '') {
        errorMsg.push('Course artifactUrl cannot be empty')
      }
      // if (content.mimeType === 'text/x-url' && !(/(http(s?)):\/\//i.test(content.artifactUrl))) {
      // if (content.mimeType === 'text/x-url') {
      //   errorMsg.push('Course artifactUrl entered is not valid')
      // }
      if (content.publisherDetails && content.publisherDetails.length === 0 && content.parent === undefined) {
        errorMsg.push('Course publisher details cannot be empty')
      }
      if (content.trackContacts && content.trackContacts.length === 0 && content.parent === undefined) {
        errorMsg.push('Course reviewer details cannot be empty')
      }

      if (!this.contentService.isValid(lexId)) {
        errorMsg.push('Mandatory fields are missing')
      }

      if (content.category === 'Resource') {
        if (content.mimeType === 'application/html' && !content.artifactUrl && !content.body) {
          errorMsg.push('Provide URL or populate "Body" field')
        } else if (
          ['application/pdf', 'application/x-mpegURL'].includes(content.mimeType) &&
          !content.artifactUrl
        ) {
          errorMsg.push('Upload file')
        }
      }
      this.populateErrorMsg(v, errorMsg, content, errorId, errorMap)
    })
  }

  populateErrorMsg(
    id: number,
    errorMsg: string[],
    content: NSContent.IContentMeta,
    errorId: Set<number>,
    errorMap: Map<number, IProcessedError>,
  ) {
    if (errorMsg.length) {
      errorId.add(id)
      if (errorMap.has(id)) {
        // tslint:disable-next-line: semicolon    // tslint:disable-next-line: whitespace
        ; (errorMap.get(id) as IProcessedError).message = (errorMap.get(
          id,
        ) as IProcessedError).message.concat(errorMsg)
      } else {
        errorMap.set(id, {
          id,
          name: content.name || 'Untitled Content',
          message: errorMsg,
        })
      }
    }
  }

  getTreeHierarchy() {
    const newParentNode = this.flatNodeMap.get(this.currentParentNode) as IContentNode
    this.hierarchyTree[newParentNode.identifier] = {
      root: this.parentNode.includes(newParentNode.identifier),
      contentType: newParentNode.category,
      children: (newParentNode.children) ? newParentNode.children.map(v => {
        const child = v.identifier
        if (v.primaryCategory) {
          this.hierarchyTree[v.identifier] = {
            root: false,
            contentType: v.contentType === 'Resource' ? undefined : v.contentType,
            primaryCategory: v.primaryCategory === 'Resource' ? undefined : v.primaryCategory,
            name: v.name,
            children: [],
          }
        }
        return child
      }) : [],
    }
    if (newParentNode.children && newParentNode.children.length > 0) {
      newParentNode.children.forEach(element => {
        if (element.children && element.children.length > 0) {
          this.hierarchyTree[element.identifier] = {
            root: this.parentNode.includes(element.identifier),
            // contentType: element.contentType,
            primaryCategory: element.primaryCategory,
            contentType: element.contentType,
            children: element.children.map(v => {
              const child = v.identifier
              if (v.category) {
                this.hierarchyTree[v.identifier] = {
                  root: false,
                  contentType: v.contentType === 'Resource' ? undefined : v.contentType,
                  primaryCategory: v.primaryCategory === 'Resource' ? undefined : v.primaryCategory,
                  name: v.name,
                  children: [],
                }
              }
              return child
            }),
          }
          element.children.forEach(subElement => {
            if (subElement.children && subElement.children.length > 0) {
              this.hierarchyTree[subElement.identifier] = {
                root: this.parentNode.includes(subElement.identifier),
                contentType: subElement.contentType,
                primaryCategory: subElement.primaryCategory,
                children: subElement.children.map(v => {
                  const child = v.identifier
                  if (v.primaryCategory) {
                    this.hierarchyTree[v.identifier] = {
                      root: false,
                      contentType: v.contentType === 'Resource' ? undefined : v.contentType,
                      primaryCategory: v.primaryCategory === 'Resource' ? undefined : v.primaryCategory,
                      name: v.name,
                      children: [],
                    }
                  }
                  return child
                }),
              }
            }
          })
        }
      })
    }
    return this.hierarchyTree
  }

  async deleteContentNode(content: any) {
    const newParentNode = this.flatNodeMap.get(this.currentParentNode) as IContentNode
    if (newParentNode && newParentNode.children && newParentNode.children.length > 0) {
      let contentNodeId = 0
      await newParentNode.children.forEach((element: any) => {
        if (element.identifier === content.identifier) {
          contentNodeId = element.id
        }
        if (element.children && element.children.length > 0) {
          element.children.forEach((subEle: any) => {
            if (subEle.identifier === content.identifier) {
              contentNodeId = subEle.id
            }
          })
        }
      })
      if (contentNodeId > 0) {
        this.deleteNode(contentNodeId)
      }
    }
  }

}
