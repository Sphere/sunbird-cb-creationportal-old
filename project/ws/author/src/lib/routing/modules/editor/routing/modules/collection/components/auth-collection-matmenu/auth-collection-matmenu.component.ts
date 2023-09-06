import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core'
import { ICustomCreateEntity } from './../../interface/create-menu'
import { CollectionStoreService } from './../../services/store.service'

@Component({
  selector: 'ws-auth-collection-matmenu',
  templateUrl: './auth-collection-matmenu.component.html',
  styleUrls: ['./auth-collection-matmenu.component.scss'],
})
export class AuthCollectionMatmenuComponent implements OnInit {
  @Output() action = new EventEmitter<{ action: string; type?: string }>()
  @Input() type!: string
  @Input() childType!: ICustomCreateEntity[]
  @ViewChild('childMenu', { static: true }) public childMenu!: any
  concatItems = false

  constructor(
    private storeService: CollectionStoreService) { }

  ngOnInit() {
    const uploadItems = [{ children: [], icon: 'picture_as_pdf', id: 'upload', name: 'Upload PDF', subid: 'pdf' },
    { children: [], icon: 'audiotrack', id: 'upload', name: 'Upload Audio', subid: 'audio' },
    { children: [], icon: 'videocam', id: 'upload', name: 'Upload Video', subid: 'video' },
    { children: [], icon: 'cloud_upload', id: 'upload', name: 'Upload Scorm', subid: 'zip' },
    ]
    this.childType.forEach((element, index) => {
      if (element.id === 'upload') {
        this.childType.splice(index, 1)
        this.concatItems = true
      }
      // removed webmodule from topic
      if (element.id === 'webModule') {
        this.childType.splice(index, 1)
      }
    })
    if (this.concatItems) {
      this.childType = this.childType.concat(uploadItems)
    }
  }

  click(action: string, type?: string, subid?: string) {
    if (type === 'upload' && subid) {
      this.storeService.uploadFileType.next(subid)
    }
    this.action.emit({ action, type })
  }
}
