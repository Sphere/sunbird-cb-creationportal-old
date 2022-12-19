import { Component, OnInit } from '@angular/core'
import { FormControl, FormGroup } from '@angular/forms'
import { MatDialog } from '@angular/material/dialog'
import { ConfigurationsService, ImageCropComponent } from '@ws-widget/utils'
import { IMAGE_MAX_SIZE, IMAGE_SUPPORT_TYPES } from '@ws/author/src/lib/constants/upload'
import { MatSnackBar } from '@angular/material/snack-bar'
import { NotificationComponent } from '@ws/author/src/lib/modules/shared/components/notification/notification.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { NOTIFICATION_TIME } from '@ws/author/src/lib/constants/constant'
import { LoaderService } from '../../../../../../../../../services/loader.service'

@Component({
  selector: 'ws-author-module-creation',
  templateUrl: './module-creation.component.html',
  styleUrls: ['./module-creation.component.scss']
})
export class ModuleCreationComponent implements OnInit {
  contentList: any[] = [
    {
      name: 'Link',
      icon: 'link'

    },
    {
      name: 'PDF',
      icon: 'picture_as_pdf'
    },
    {
      name: 'Audio',
      icon: 'music_note'
    },
    {
      name: 'Video',
      icon: 'videocam'
    },
    {
      name: 'SCORM',
      icon: 'cloud_upload'
    }
  ]

  accessList: any[] = [
    {
      name: 'Assessment',
      icon: 'assessment'
    },
    {
      name: 'Quiz',
      icon: 'smartphone'
    }
  ]

  showAddModuleForm: boolean = false
  moduleNames: any = [];
  isSaveModuleFormEnable: boolean = false
  moduleButtonName: string = 'Create';
  isResourceTypeEnabled: boolean = false
  isLinkPageEnabled: boolean = false
  isOnClickOfResourceTypeEnabled: boolean = false;
  resourceForm: FormGroup
  moduleForm!: FormGroup
  resourceImg: string = '';
  isLinkFieldEnabled: boolean = false;
  moduleName: string = '';
  resourceNames: any = [];
  resourceCount: number = 0;
  independentResourceNames: any = [];
  independentResourceCount: number = 0;
  imageTypes = IMAGE_SUPPORT_TYPES

  constructor(public dialog: MatDialog,
    private configSvc: ConfigurationsService,
    private snackBar: MatSnackBar,
    private loader: LoaderService,) {
    this.resourceForm = new FormGroup({
      resourceName: new FormControl(''),
      resourceLinks: new FormControl(''),
      appIcon: new FormControl('')
    })
    this.moduleForm = new FormGroup({
      appIcon: new FormControl('')
    })
  }

  ngOnInit() {
  }

  moduleCreate(name: string) {
    if (this.moduleButtonName == 'Create') {
      this.moduleName = name
      this.isSaveModuleFormEnable = true
      this.moduleButtonName = 'Save'
    } else if (this.moduleButtonName == 'Save') {
      this.isResourceTypeEnabled = true
    }
  }

  createResourseContent(name: string): void {
    if (name == 'Link') {
      this.isLinkFieldEnabled = true
    } else if (name == 'PDF') {
      this.isLinkFieldEnabled = false
      this.resourceImg = '/assets/pfds/pdf-icon.svg'
    } else if (name == 'Audio') {
      this.isLinkFieldEnabled = false
      this.resourceImg = '/assets/pfds/pdf-icon.svg'
    } else if (name == 'Vedio') {
      this.isLinkFieldEnabled = false
      this.resourceImg = '/assets/pfds/vedio-img.svg'
    } else if (name == 'SCORM') {
      this.isLinkFieldEnabled = false
      this.resourceImg = '/assets/pfds/SCROM-img.svg'
    }
    this.addResource()
    this.isLinkPageEnabled = true
    this.isResourceTypeEnabled = false
    this.isOnClickOfResourceTypeEnabled = true
  }

  addModule() {
    this.showAddModuleForm = true
    this.moduleNames.push({ name: 'Create Course' })
    this.moduleName = 'Create Course'
  }

  addResource() {
    this.resourceCount = this.resourceCount + 1
    this.resourceNames.push({ name: 'Resource ' + this.resourceCount })
  }

  addIndependentResource() {
    this.showAddModuleForm = true
    this.independentResourceCount = this.independentResourceCount + 1
    this.independentResourceNames.push({ name: 'Resource ' + this.independentResourceCount })
  }

  changeToDefaultImg($event: any) {
    $event.target.src = this.configSvc.instanceConfig
      ? this.configSvc.instanceConfig.logos.defaultContent
      : ''
  }

  uploadAppIcon(file: File) {
    const formdata = new FormData()
    const fileName = file.name.replace(/[^A-Za-z0-9.]/g, '')
    if (
      !(
        IMAGE_SUPPORT_TYPES.indexOf(
          `.${fileName
            .toLowerCase()
            .split('.')
            .pop()}`,
        ) > -1
      )
    ) {
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.INVALID_FORMAT,
        },
        duration: NOTIFICATION_TIME * 1000,
      })
      return
    }

    if (file.size > IMAGE_MAX_SIZE) {
      this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.SIZE_ERROR,
        },
        duration: NOTIFICATION_TIME * 1000,
      })
      return
    }

    const dialogRef = this.dialog.open(ImageCropComponent, {
      width: '70%',
      data: {
        isRoundCrop: false,
        imageFile: file,
        width: 265,
        height: 150,
        isThumbnail: true,
        imageFileName: fileName,
      },
    })
    dialogRef.afterClosed().subscribe({
      next: (result: File) => {
        if (result) {
          formdata.append('content', result, fileName)
          this.loader.changeLoad.next(true)

          let randomNumber = ''
          // tslint:disable-next-line: no-increment-decrement
          for (let i = 0; i < 16; i++) {
            randomNumber += Math.floor(Math.random() * 10)
          }
        }
      }
    })
  }

}
