// tslint:disable-next-line: max-line-length
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core'

import { MatSnackBar } from '@angular/material/snack-bar'

import {
  AUTHORING_CONTENT_BASE,
  CONTENT_BASE_STATIC,
  CONTENT_BASE_STREAM,
  CONTENT_BASE_WEBHOST,
  CONTENT_BASE_WEBHOST_ASSETS,
} from '@ws/author/src/lib/constants/apiEndpoints'

import { NOTIFICATION_TIME } from '@ws/author/src/lib/constants/constant'

import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

import { FILE_MAX_SIZE, IMAGE_MAX_SIZE, IMAGE_SUPPORT_TYPES } from '@ws/author/src/lib/constants/upload'

import { NotificationComponent } from '@ws/author/src/lib/modules/shared/components/notification/notification.component'

import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'

import { UploadService } from '@ws/author/src/lib/routing/modules/editor/shared/services/upload.service'

import { LoaderService } from '@ws/author/src/lib/services/loader.service'

import { ConfigurationsService } from 'library/ws-widget/utils/src/lib/services/configurations.service'

import { Subscription } from 'rxjs'

import { HttpClient } from '@angular/common/http'

import { AUTHORING_BASE } from '@ws/author/src/lib/constants/apiEndpoints'

declare const CKEDITOR: any

// Inline 16x16 SVG icons (base64 data URIs) for the custom insert-toolbar buttons.
// Kept inline because the pre-migration icon sprite (/assets/authoring/ckeditor/plugins/icons.png)
// no longer ships with the app.
const WS_UPLOAD_ICONS = {
  image:
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM0NDQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIyIi8+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjYiLz48cGF0aCBkPSJNMjEgMTZsLTQuNS00LjVMNSAyMSIvPjwvc3ZnPg==',
  file: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM0NDQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTQgMkg2YTIgMiAwIDAgMC0yIDJ2MTZhMiAyIDAgMCAwIDIgMmgxMmEyIDIgMCAwIDAgMi0yVjh6Ii8+PHBhdGggZD0iTTE0IDJ2Nmg2Ii8+PC9zdmc+',
  blank:
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM0NDQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNCAxOGgxNiIvPjxwYXRoIGQ9Ik04IDE0aDgiLz48L3N2Zz4=',
}

@Component({
  standalone: false,
  selector: 'ws-auth-plain-ckeditor',
  templateUrl: './plain-ckeditor.component.html',
  styleUrls: ['./plain-ckeditor.component.scss'],
})
export class PlainCKEditorComponent implements AfterViewInit, OnInit, OnDestroy {
  downloadRegex = new RegExp(`(https://.*?/content-store/.*?)(\\\)?\\\\?['"])`, 'gm')
  uploadRegex = new RegExp(`${AUTHORING_CONTENT_BASE}(.*?)(\\\)?\\\\?['"])`, 'gm')
  downloadPartialImgRegex = RegExp(` src=\s*['"](.*?)['"]`, 'gm')
  downloadPartialAncRegex = RegExp(` href\=\s*['"](.*?)['"]`, 'gm')
  @Input() doRegex = true
  @Input() doPartialRegex = false
  @Input() quiz!: boolean
  @Input() editCoursePage!: boolean
  html = ''
  @Input() set content(value: string) {
    if (this.doPartialRegex) {
      const reg = `${document.location.origin}/content-store/
              ${this.accessControlSvc.rootOrg}/${this.accessControlSvc.org}/Public/
              ${this.id}/web-hosted/assets`
      this.html = value
        .replace(this.downloadPartialImgRegex, ` src="${reg}$1"`)
        .replace(this.downloadPartialAncRegex, ` href="${reg}$1"`)
        .replace(this.downloadRegex, this.regexDownloadReplace)
    } else if (this.doRegex) {
      this.html = value.replace(this.downloadRegex, this.regexDownloadReplace)
    } else {
      this.html = value
    }
    if (this.editorInstance && this.editorInstance.status === 'ready') {
      // Only push data into the editor for genuine EXTERNAL changes. When the user is
      // typing, the parent echoes the value straight back through this setter; calling
      // setData() on that echo resets the caret to position 0, so each keystroke gets
      // inserted at the start and the text comes out reversed ("gninrom doog"). Skip
      // setData while the editor has focus, and when the data is already identical.
      const hasFocus = !!(this.editorInstance.focusManager && this.editorInstance.focusManager.hasFocus)
      if (!hasFocus && this.editorInstance.getData() !== this.html) {
        this.editorInstance.setData(this.html)
      }
    }
  }
  @Input() id = ''
  @Input() editMeta = ''
  @Input() location:
    | typeof CONTENT_BASE_STATIC
    | typeof CONTENT_BASE_STREAM
    | typeof CONTENT_BASE_WEBHOST
    | typeof CONTENT_BASE_WEBHOST_ASSETS = CONTENT_BASE_WEBHOST_ASSETS
  @Output() value = new EventEmitter<string>()
  config: any
  configsecond: any
  editorInstance: any = null
  private _editorDestroyed = false
  @ViewChild('editorHost', { static: false }) editorHost!: ElementRef
  @ViewChild('uploadImage', { static: false }) image!: ElementRef
  imageName = 'Insert Image'
  @ViewChild('uploadFile', { static: false }) file!: ElementRef
  fileName = 'Upload File'
  @ViewChild('addBlank', { static: false }) blank!: ElementRef
  blankName = 'Add Blank'
  timer: any
  showAdvancedSettings = false
  // The custom insert buttons are backed by one global CKEditor plugin; register it only once.
  private static uploadPluginRegistered = false
  // Editor selection captured when the upload button is clicked, so we can restore the caret
  // after the native file dialog steals focus (otherwise insertHtml has no range to insert at).
  private savedBookmarks: any = null

  subscription!: Subscription
  constructor(
    private snackBar: MatSnackBar,
    private uploadService: UploadService,
    private configurationSvc: ConfigurationsService,
    private accessControlSvc: AccessControlService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    this.allConfig()
    this.initiateConfig()
    if (!this.editMeta || this.editMeta === '' || this.editMeta == undefined) {
      this.showAdvancedSettings = true
    } else {
      this.showAdvancedSettings = false
    }

    this.makeTargetAsBlank()
    this.allowAdditionalContents()
    this.configurationSvc.prefChangeNotifier.subscribe(() => {
      const theme = this.theme
      if (this.config && this.config.uiColor !== theme) {
        this.config.uiColor = theme
        this.editorInstance?.setUiColor(theme)
      }
      if (this.configsecond && this.configsecond.uiColor !== theme) {
        this.configsecond.uiColor = theme
        this.editorInstance?.setUiColor(theme)
      }
    })
  }

  regexUploadReplace(_str = '', group1: string, group2: string): string {
    return `${decodeURIComponent(group1)}${group2}`
  }

  regexDownloadReplace(_str = '', group1: string, group2: string): string {
    return `${AUTHORING_CONTENT_BASE}${encodeURIComponent(group1)}${group2}`
  }

  initiateConfig() {
    this.config = {
      skin: 'moono-lisa',
      uiColor: this.theme,
      language: this.accessControlSvc.locale,
      toolbarGroups: [
        { name: 'basicstyles', groups: ['basicstyles'] },
        // ... other toolbar groups
      ],
      allowedContent: true,
      extraAllowedContent: 'a[!href,download,document-href,class]',
      ...this.uploadToolbarConfig(),
      removeButtons:
        'Cut,Copy,Paste,PasteText,PasteFromWord,Save,NewPage,Preview,Print,' +
        'Templates,Scayt,Form,Checkbox,Radio,TextField,Textarea,Select,Button,HiddenField,ImageButton' +
        ',Smiley,PageBreak,Flash,About,CreateDiv,Anchor,SelectAll,Image',
      disableNativeSpellChecker: true,
      removeDialogTabs: 'image:advanced;link:advanced',
      format_tags: 'p;h1;h2;h3;h4;h5;h6;div',
      forcePasteAsPlainText: false,
      image2_alignClasses: ['image-align-left', 'image-align-center', 'image-align-right'],
      image2_captionedClass: 'image-captioned',
      stylesSet: [
        {
          name: 'Narrow image',
          type: 'widget',
          widget: 'image',
          attributes: { class: 'image-narrow' },
        },
        {
          name: 'Wide image',
          type: 'widget',
          widget: 'image',
          attributes: { class: 'image-wide' },
        },
      ],
    }
  }
  // Add this property to your PlainCKEditorComponent class

  toggleAdvancedSettings() {
    this.showAdvancedSettings = !this.showAdvancedSettings
    setTimeout(() => this.initEditor(), 0)
  }

  allConfig() {
    this.configsecond = {
      skin: 'moono-lisa',
      uiColor: this.theme,
      language: this.accessControlSvc.locale,
      toolbarGroups: [
        { name: 'basicstyles', groups: ['basicstyles', 'cleanup'] },
        { name: 'paragraph', groups: ['list', 'indent', 'blocks', 'align', 'bidi', 'paragraph'] },
        { name: 'clipboard', groups: ['clipboard', 'undo'] },
        { name: 'document', groups: ['mode', 'document', 'doctools'] },
        { name: 'editing', groups: ['find', 'selection', 'editing'] },
        { name: 'links', groups: ['links'] },
        { name: 'insert', groups: ['insert'] },
        '/',
        { name: 'styles', groups: ['styles'] },
        { name: 'colors', groups: ['colors'] },
        { name: 'tools', groups: ['tools'] },
      ],
      allowedContent: true,
      extraAllowedContent: 'a[!href,download,document-href,class]',
      ...this.uploadToolbarConfig(),
      removeButtons:
        'Cut,Copy,Paste,PasteText,PasteFromWord,Save,NewPage,Preview,Print,' +
        'Templates,Scayt,Form,Checkbox,Radio,TextField,Textarea,Select,Button,HiddenField,ImageButton' +
        ',Smiley,PageBreak,Flash,About,CreateDiv,Anchor,SelectAll,Image',
      disableNativeSpellChecker: true,
      removeDialogTabs: 'image:advanced;link:advanced',
      format_tags: 'p;h1;h2;h3;h4;h5;h6;div',
      forcePasteAsPlainText: false,
      image2_alignClasses: ['image-align-left', 'image-align-center', 'image-align-right'],
      image2_captionedClass: 'image-captioned',
      stylesSet: [
        {
          name: 'Narrow image',
          type: 'widget',
          widget: 'image',
          attributes: { class: 'image-narrow' },
        },
        {
          name: 'Wide image',
          type: 'widget',
          widget: 'image',
          attributes: { class: 'image-wide' },
        },
      ],
    }
  }

  // Config fragment that adds the custom insert-toolbar buttons (Upload Image / Upload File /
  // Add Blank) and routes each button's command back to this component's existing handlers.
  // The handlers already existed; only the toolbar wiring was lost in the Angular migration.
  uploadToolbarConfig() {
    return {
      extraPlugins: 'wsuploads',
      wsUploadImageLabel: this.imageName,
      wsUploadFileLabel: this.fileName,
      wsAddBlankLabel: this.blankName,
      wsOnUploadImage: () => this.addImageUploadBtn(),
      wsOnUploadFile: () => this.addFileUploadBtn(),
      wsOnAddBlank: () => this.addBlankBtn(),
    }
  }

  // CKEditor 4's CKEDITOR.getUrl() rewrites the button `icon` path by prefixing its base path,
  // which corrupts a `data:` URI and leaves the icon blank. So we let CKEditor create the icon
  // <span> (via the icon option) and override its background here with !important, which beats
  // CKEditor's broken inline style. The icon class is `cke_button__<lowercased-name>_icon`.
  private injectUploadIconStyles() {
    if (typeof document === 'undefined') {
      return
    }
    if (document.getElementById('ws-ck-upload-icons')) {
      return
    }
    const rule = (name: string, uri: string) =>
      `.cke_button__${name}_icon,.cke_button__${name} .cke_button_icon` +
      `{background:url("${uri}") no-repeat center !important;background-size:16px 16px !important;}`
    const style = document.createElement('style')
    style.id = 'ws-ck-upload-icons'
    style.textContent =
      rule('wsuploadimage', WS_UPLOAD_ICONS.image) + rule('wsuploadfile', WS_UPLOAD_ICONS.file) + rule('wsaddblank', WS_UPLOAD_ICONS.blank)
    document.head.appendChild(style)
  }

  // Registers the single global CKEditor plugin that exposes the three custom buttons in the
  // 'insert' toolbar group. Each button's command reads its handler from the per-instance
  // editor config, so one shared plugin drives every editor instance correctly.
  registerUploadPlugin() {
    if (PlainCKEditorComponent.uploadPluginRegistered) {
      return
    }
    if (typeof CKEDITOR === 'undefined' || !CKEDITOR.plugins || !CKEDITOR.plugins.add) {
      return
    }
    this.injectUploadIconStyles()
    const specs = [
      {
        btn: 'WsUploadImage',
        cmd: 'wsUploadImageCmd',
        handler: 'wsOnUploadImage',
        label: 'wsUploadImageLabel',
        fallback: 'Upload Image',
        icon: WS_UPLOAD_ICONS.image,
      },
      {
        btn: 'WsUploadFile',
        cmd: 'wsUploadFileCmd',
        handler: 'wsOnUploadFile',
        label: 'wsUploadFileLabel',
        fallback: 'Upload File',
        icon: WS_UPLOAD_ICONS.file,
      },
      {
        btn: 'WsAddBlank',
        cmd: 'wsAddBlankCmd',
        handler: 'wsOnAddBlank',
        label: 'wsAddBlankLabel',
        fallback: 'Add Blank',
        icon: WS_UPLOAD_ICONS.blank,
      },
    ]
    CKEDITOR.plugins.add('wsuploads', {
      init(editor: any) {
        specs.forEach(spec => {
          editor.addCommand(spec.cmd, {
            exec: (ed: any) => {
              const handler = ed.config[spec.handler]
              if (typeof handler === 'function') {
                handler()
              }
            },
          })
          editor.ui.addButton(spec.btn, {
            label: editor.config[spec.label] || spec.fallback,
            command: spec.cmd,
            toolbar: 'insert',
            icon: spec.icon,
          })
        })
      },
    })
    PlainCKEditorComponent.uploadPluginRegistered = true
  }

  ngOnDestroy() {
    this._editorDestroyed = true
    if (this.editorInstance) {
      this.editorInstance.destroy()
      this.editorInstance = null
    }
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
    this.cdr.detach()
  }

  ngAfterViewInit() {
    this.imageName = this.image.nativeElement.innerHTML
    this.fileName = this.file.nativeElement.innerHTML
    this.blankName = this.blank.nativeElement.innerHTML
    this.cdr.detectChanges()
    setTimeout(() => this.initEditor(), 0)
  }

  private initEditor() {
    if (this._editorDestroyed || !this.editorHost?.nativeElement) {
      return
    }
    if (this.editorInstance) {
      this.editorInstance.destroy()
      this.editorInstance = null
    }
    // Destroy any CKEditor still bound to this host element. Re-inits (e.g. ngAfterViewInit
    // re-firing during an assessment reload) can otherwise leave an orphan instance: its editable
    // stays in the DOM (what the user sees) while this.editorInstance — the one insertHtml/getData
    // operate on — points elsewhere, so inserted images never appear on screen.
    this.destroyEditorsOnHost(this.editorHost.nativeElement)
    this.registerUploadPlugin()
    const cfg = this.showAdvancedSettings ? { ...this.configsecond } : { ...this.config }
    // Labels come from the hidden i18n spans, which are only populated in ngAfterViewInit
    // (after initiateConfig/allConfig ran in ngOnInit), so refresh them onto the live config.
    cfg.wsUploadImageLabel = this.imageName
    cfg.wsUploadFileLabel = this.fileName
    cfg.wsAddBlankLabel = this.blankName
    this.editorInstance = CKEDITOR.replace(this.editorHost.nativeElement, cfg)
    this.editorInstance.on('instanceReady', () => {
      if (this.html) {
        this.editorInstance.setData(this.html)
      }
    })
    this.editorInstance.on('change', () => {
      this.html = this.editorInstance.getData()
      this.onContentChanged()
    })
  }

  // Destroys every CKEditor instance currently bound to the given host element, so exactly one
  // live instance exists per editor and this.editorInstance is always the one rendered on screen.
  private destroyEditorsOnHost(host: any) {
    if (!host || typeof CKEDITOR === 'undefined' || !CKEDITOR.instances) {
      return
    }
    Object.keys(CKEDITOR.instances).forEach(name => {
      const inst = CKEDITOR.instances[name]
      const el = inst && inst.element && inst.element.$
      if (el === host) {
        try {
          inst.destroy(true)
        } catch {
          /* already gone */
        }
      }
    })
  }

  onContentChanged() {
    if (this.doPartialRegex) {
      this.value.emit(
        this.html
          .replace(this.uploadRegex, this.regexUploadReplace)
          .replace(/ src=\s*['"].*?\/content-store\/(.*?)['"]/gm, ' src="$1"')
          .replace(/ href=\s*['"].*?\/content-store\/(.*?)['"]/gm, ' href="$1"'),
      )
    } else if (this.doRegex) {
      this.value.emit(this.html.replace(this.uploadRegex, this.regexUploadReplace))
    } else {
      this.value.emit(this.html)
    }
  }

  makeTargetAsBlank() {
    CKEDITOR.on('dialogDefinition', (ev: any) => {
      try {
        const dialogName = ev.data.name
        const dialogDefinition = ev.data.definition
        if (dialogName === 'link') {
          const informationTab = dialogDefinition.getContents('target')
          const targetField = informationTab.get('linkTargetType')
          targetField['default'] = '_blank'
        }
      } catch (exception) {
        // //console.log('Error ' + ev.message)
      }
    })
  }

  allowAdditionalContents() {
    CKEDITOR.dtd['a']['div'] = 1
    CKEDITOR.dtd['a']['p'] = 1
    CKEDITOR.dtd['a']['i'] = 1
    CKEDITOR.dtd['a']['span'] = 1
  }

  addImageUploadBtn() {
    // Toolbar clicks keep the editable focused, so the caret is still valid here — snapshot it
    // before the file dialog (opened below) blurs the editor.
    this.captureEditorSelection()
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', IMAGE_SUPPORT_TYPES.toString())
    input.style.display = 'none'
    input.addEventListener(
      'change',
      (e: any) => {
        const file = e.target.files[0]
        if (file) {
          const fileExtension = file.name.toLowerCase().split('.')
          if (IMAGE_SUPPORT_TYPES.indexOf(`.${fileExtension[fileExtension.length - 1]}`) > -1) {
            if (file.size > IMAGE_MAX_SIZE) {
              this.snackBar.openFromComponent(NotificationComponent, {
                data: {
                  type: Notify.SIZE_ERROR,
                },
                duration: NOTIFICATION_TIME * 1000,
              })
              input.remove()
              return
            }
            const form = new FormData()
            const fileName = file.name.replace(/[^A-Za-z0-9.]/g, '')
            form.set('content', file, file.name.replace(/[^A-Za-z0-9.]/g, ''))
            this.loaderService.changeLoad.next(true)
            console.log('contentId: this.id, contentType: this.location', this.id, this.location)

            let randomNumber = ''
            // tslint:disable-next-line: no-increment-decrement
            for (let i = 0; i < 16; i++) {
              randomNumber += Math.floor(Math.random() * 10)
            }
            const requestBody: any = {
              request: {
                content: {
                  code: randomNumber,
                  contentType: 'Asset',
                  createdBy: this.accessControlSvc.userId,
                  creator: this.accessControlSvc.userName,
                  mimeType: 'image/jpeg',
                  mediaType: 'image',
                  name: fileName,
                  lang: ['English'],
                  license: 'CC BY 4.0',
                  primaryCategory: 'Asset',
                },
              },
            }

            this.http.post<any>(`${AUTHORING_BASE}content/v3/create`, requestBody).subscribe((meta: any) => {
              // return data.result.identifier
              this.uploadService
                .upload(form, {
                  contentId: meta.result.identifier,
                  contentType: CONTENT_BASE_STATIC,
                })

                .subscribe(
                  data => {
                    if (data && data.name !== 'Error') {
                      this.loaderService.changeLoad.next(false)
                      this.snackBar.openFromComponent(NotificationComponent, {
                        data: {
                          type: Notify.UPLOAD_SUCCESS,
                        },
                        duration: NOTIFICATION_TIME * 2000,
                      })
                      console.log('yes here', data)
                      let url = data.artifactUrl
                      if (!this.doRegex) {
                        url = `/${url.split('/').slice(3).join('/')}`
                      }
                      this.insertImageHtml(url)
                    } else {
                      this.loaderService.changeLoad.next(false)
                      this.snackBar.open(data.message, undefined, { duration: 2000 })
                    }
                  },
                  () => {
                    this.loaderService.changeLoad.next(false)
                    this.snackBar.openFromComponent(NotificationComponent, {
                      data: {
                        type: Notify.UPLOAD_FAIL,
                      },
                      duration: NOTIFICATION_TIME * 1000,
                    })
                  },
                )
            })

            // this.uploadService
            //   .upload(form, { contentId: this.id, contentType: this.location })
            //   .subscribe(
            //     data => {
            //       // if (data.code) {
            //       //   let url = data.artifactURL
            //       if (data.result) {
            //         let url = data.result.artifactUrl
            //         if (!this.doRegex) {
            //           url = `/${url.split('/').slice(3).join('/')}`
            //         }
            //         this.editorInstance?.insertHtml(
            //           `<img alt='' src='${AUTHORING_CONTENT_BASE}${encodeURIComponent(
            //             url,
            //           )}'></img>`,
            //         )
            //         this.snackBar.openFromComponent(NotificationComponent, {
            //           data: {
            //             type: Notify.UPLOAD_SUCCESS,
            //           },
            //           duration: NOTIFICATION_TIME * 1000,
            //         })
            //         input.remove()
            //         this.loaderService.changeLoad.next(false)
            //       }
            //     },
            //     () => {
            //       this.loaderService.changeLoad.next(false)
            //       this.snackBar.openFromComponent(NotificationComponent, {
            //         data: {
            //           type: Notify.UPLOAD_FAIL,
            //         },
            //         duration: NOTIFICATION_TIME * 1000,
            //       })
            //       input.remove()
            //     },
            //   )
          } else {
            this.snackBar.openFromComponent(NotificationComponent, {
              data: {
                type: Notify.INVALID_FORMAT,
              },
              duration: NOTIFICATION_TIME * 1000,
            })
            input.remove()
            return
          }
        }
      },
      false,
    )
    document.body.appendChild(input)
    input.click()
  }

  // Inserts the uploaded image into the editor. Called from the async upload callback, by which
  // point the file-picker dialog has stolen focus from the editable — so insertHtml() would have
  // no selection and silently do nothing. Focusing first restores a valid selection, and syncing
  // this.html + emitting guarantees the new content reaches the parent quiz store.
  insertImageHtml(url: string) {
    const editor = this.editorInstance
    if (!editor) {
      return
    }
    // Insert the asset's plain URL so the <img> loads and paints immediately. The previous
    // `AUTHORING_CONTENT_BASE + encodeURIComponent(url)` form produced a proxied, percent-encoded
    // src (/apis/authContent/https%3A%2F%2F...) that did not resolve, so a freshly inserted image
    // stayed blank until an echo/reload rewrote it to the plain URL. The stored value is identical
    // either way — onContentChanged's uploadRegex only rewrites the AUTHORING_CONTENT_BASE form,
    // and a plain URL passes through unchanged.
    const img = `<img alt="" src="${url}" />`
    if (editor.focus) {
      editor.focus()
    }
    this.restoreOrPlaceSelection(editor)
    this.savedBookmarks = null
    editor.insertHtml(img)
    this.html = editor.getData ? editor.getData() : this.html
    this.onContentChanged()
  }

  // Snapshots the current editor selection as serializable bookmarks (survive DOM/HTML changes).
  private captureEditorSelection() {
    const editor = this.editorInstance
    const sel = editor && editor.getSelection ? editor.getSelection() : null
    this.savedBookmarks = sel && sel.getRanges && sel.getRanges().length && sel.createBookmarks2 ? sel.createBookmarks2(true) : null
  }

  // Restores the caret captured before the file dialog; if none was captured (user never placed
  // the cursor in the editor), falls back to the end of the editable so insertHtml has a range.
  private restoreOrPlaceSelection(editor: any) {
    const sel = editor.getSelection ? editor.getSelection() : null
    if (this.savedBookmarks && sel && sel.selectBookmarks) {
      try {
        sel.selectBookmarks(this.savedBookmarks)
        return
      } catch {
        // fall through to end-of-editable placement
      }
    }
    const editable = editor.editable ? editor.editable() : null
    if (editable && editor.createRange && editor.getSelection) {
      const range = editor.createRange()
      range.moveToElementEditEnd(editable)
      const selection = editor.getSelection()
      if (selection && selection.selectRanges) {
        selection.selectRanges([range])
      }
    }
  }

  addFileUploadBtn() {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', '.zip')
    input.style.display = 'none'
    input.addEventListener(
      'change',
      (e: any) => {
        const file = e.target.files[0]
        if (file) {
          if (file.name.toLowerCase().endsWith('.zip')) {
            if (file.size > FILE_MAX_SIZE) {
              this.snackBar.openFromComponent(NotificationComponent, {
                data: {
                  type: Notify.SIZE_ERROR,
                },
                duration: NOTIFICATION_TIME * 1000,
              })
              input.remove()
              return
            }
            const form = new FormData()
            form.set('content', file, file.name.replace(/[^A-Za-z0-9.]/g, ''))
            this.loaderService.changeLoad.next(true)
            this.uploadService.upload(form, { contentId: this.id, contentType: this.location }).subscribe(
              data => {
                // if (data.code) {
                //   let url = data.artifactURL
                if (data.result) {
                  let url = data.result.artifactUrl
                  if (this.doRegex) {
                    url = `/${url.split('/').slice(3).join('/')}`
                  }
                  this.editorInstance?.insertHtml(`<a href='${url}' download>Click here to download</a>`)
                  this.snackBar.openFromComponent(NotificationComponent, {
                    data: {
                      type: Notify.UPLOAD_SUCCESS,
                    },
                    duration: NOTIFICATION_TIME * 1000,
                  })
                  input.remove()
                  this.loaderService.changeLoad.next(false)
                }
              },
              () => {
                this.loaderService.changeLoad.next(false)
                this.snackBar.openFromComponent(NotificationComponent, {
                  data: {
                    type: Notify.UPLOAD_FAIL,
                  },
                  duration: NOTIFICATION_TIME * 1000,
                })
                input.remove()
              },
            )
          } else {
            input.remove()
            this.snackBar.openFromComponent(NotificationComponent, {
              data: {
                type: Notify.INVALID_FORMAT,
              },
              duration: NOTIFICATION_TIME * 1000,
            })
            return
          }
        }
      },
      false,
    )
    document.body.appendChild(input)
    input.click()
  }

  addBlankBtn() {
    this.editorInstance?.insertHtml(' <input style="border-style:none none solid none"> ')
  }

  get theme(): string {
    const color = (getComputedStyle(document.body as any).backgroundColor as any)
      .replace('rgba', '')
      .replace('rgb', '')
      .replace('(', '')
      .replace(')', '')
      .split(',')
    return (
      // tslint:disable-next-line: prefer-template
      '#' +
      ('0' + parseInt(color[0], 10).toString(16)).slice(-2) +
      ('0' + parseInt(color[1], 10).toString(16)).slice(-2) +
      ('0' + parseInt(color[2], 10).toString(16)).slice(-2)
    )
  }
}
