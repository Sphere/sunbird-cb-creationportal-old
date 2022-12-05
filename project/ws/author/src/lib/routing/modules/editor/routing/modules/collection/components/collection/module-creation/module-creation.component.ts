import { Component, OnInit } from '@angular/core'
import { FormControl, FormGroup } from '@angular/forms'
import { MatDialog } from '@angular/material/dialog'

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
  resourceImg: string = '';
  isLinkFieldEnabled: boolean = false;
  moduleName: string = '';
  resourceNames: any = [];
  resourceCount: number = 0;
  independentResourceNames: any = [];
  independentResourceCount: number = 0;

  constructor(public dialog: MatDialog) {
    this.resourceForm = new FormGroup({
      resourceName: new FormControl(''),
      resourceLinks: new FormControl(''),
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

}
