import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, ViewChild, AfterViewInit, HostListener } from '@angular/core'

import { MatSnackBar } from '@angular/material/snack-bar'

import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'

import { ActivatedRoute, Router } from '@angular/router'

import {
  NsContent,
  //WidgetContentService
} from '@ws-widget/collection'

import { ConfigurationsService, EventService, TelemetryService } from '@ws-widget/utils'

import { TFetchStatus } from '@ws-widget/utils/src/public-api'

import { MobileAppsService } from '../../../../../../../src/app/services/mobile-apps.service'

import { SCORMAdapterService } from 'project/ws/viewer/src/lib/plugins/html/SCORMAdapter/scormAdapter'


// import { Interval, Observable, Subscription } from 'rxjs'

//import { ViewerUtilService } from '../../../../../../../project/ws/viewer/src/lib/viewer-util.service'


@Component({
  standalone: false,
  selector: 'viewer-plugin-html',
  templateUrl: './html.component.html',
  styleUrls: ['./html.component.scss'],
})
export class HtmlComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {

  // private mobileOpenInNewTab!: any
  @ViewChild('iframeElem', { static: false }) iframeElem!: ElementRef<HTMLIFrameElement>
  @ViewChild('mobileOpenInNewTab', { read: ElementRef, static: false }) mobileOpenInNewTab !: ElementRef<HTMLAnchorElement>
  @Input() htmlContent: NsContent.IContent | null = null
  iframeUrl: SafeResourceUrl | null = null

  showIframeSupportWarning = false
  showIsLoadingMessage = false
  showUnBlockMessage = false
  pageFetchStatus: TFetchStatus | 'artifactUrlMissing' = 'fetching'
  isUserInIntranet = false
  intranetUrlPatterns: string[] | undefined = []
  isIntranetUrl = false
  progress = 100
  iframeName = `piframe_${Date.now()}`
  urlContains = ''
  mimeType = ''
  iframeSupport: any

  @HostListener('window:blur')
  onBlur(): void {
    if (this.urlContains.includes('youtube') && this.htmlContent !== null) {
      // const collectionId = this.activatedRoute.snapshot.queryParams.collectionId ?
      //   this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier
      // const batchId = this.activatedRoute.snapshot.queryParams.batchId ?
      //   this.activatedRoute.snapshot.queryParams.batchId : this.htmlContent.identifier

      // this.telemetrySvc.start('youtube', 'youtube-start', this.activatedRoute.snapshot.queryParams.collectionId ?
      //   this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier)

      // setTimeout(() => {
      //   const data2 = {
      //     current: 10,
      //     max_size: 10,
      //     mime_type: this.mimeType,
      //   }
      //   // @ts-ignore: Object is possibly 'null'.
      //   this.viewerSvc.realTimeProgressUpdate(this.htmlContent.identifier, data2, collectionId, batchId).subscribe((data: any) => {
      //     console.log(data.result.contentList)
      //     let result = data.result
      //     result["type"] = 'youtube'
      //     this.contentSvc.changeMessage(result)
      //   })

      // }, 50)
      // const data1: any = {
      //   courseID: this.activatedRoute.snapshot.queryParams.collectionId ?
      //     this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier,
      //   contentId: this.htmlContent.identifier,
      //   name: this.htmlContent.name,
      //   moduleId: this.htmlContent!.parent ? this.htmlContent.parent : undefined,
      // }
      // this.telemetrySvc.end('youtube', 'youtube-close', this.activatedRoute.snapshot.queryParams.collectionId ?
      //   this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier, data1)
      //this.contentSvc.changeMessage('youtube')
    }
  }

  // Stable bound reference so addEventListener and removeEventListener use the
  // SAME function — `this.receiveMessage.bind(this)` created a new reference each
  // call, so the old removeEventListener never matched and leaked a window
  // 'message' listener on every viewer mount.
  private readonly boundReceiveMessage = (msg: any) => this.receiveMessage(msg)

  constructor(
    private domSanitizer: DomSanitizer,
    public mobAppSvc: MobileAppsService,
    private scormAdapterService: SCORMAdapterService,
    private router: Router,
    private configSvc: ConfigurationsService,
    private snackBar: MatSnackBar,
    private events: EventService,
    //private contentSvc: WidgetContentService,
    //private viewerSvc: ViewerUtilService,
    private activatedRoute: ActivatedRoute,
    private telemetrySvc: TelemetryService,

  ) {
    (window as any).API = this.scormAdapterService
    // if (window.addEventListener) {
    window.addEventListener('message', this.boundReceiveMessage)
  }

  ngOnInit() {
    // this.mobAppSvc.simulateMobile()
    // if (this.htmlContent && this.htmlContent.identifier) {
    //   console.log(this.htmlContent.identifier)
    //   this.scormAdapterService.contentId = this.htmlContent.identifier
    //   // this.scormAdapterService.loadData()
    //   this.scormAdapterService.loadDataV2()
    // }

  }
  ngAfterViewInit() {
  }

  ngOnDestroy() {
    window.removeEventListener('message', this.boundReceiveMessage)
    // Release the global SCORM adapter reference set in the constructor (only if it
    // still points at this instance's service) so the component can be GC'd.
    if ((window as any).API === this.scormAdapterService) {
      (window as any).API = undefined
    }
  }

  executeForms() {
    if (this.urlContains.includes('docs.google') && this.htmlContent !== null) {
      // const collectionId = this.activatedRoute.snapshot.queryParams.collectionId ?
      //   this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier
      // const batchId = this.activatedRoute.snapshot.queryParams.batchId ?
      //   this.activatedRoute.snapshot.queryParams.batchId : this.htmlContent.identifier
      // setTimeout(() => {
      //   const data2 = {
      //     current: 10,
      //     max_size: 10,
      //     mime_type: this.mimeType,
      //   }
      //   // @ts-ignore: Object is possibly 'null'.
      //   this.viewerSvc.realTimeProgressUpdate(this.htmlContent.identifier, data2, collectionId, batchId).subscribe((data: any) => {
      //     console.log(data.result.contentList)
      //     let result = data.result
      //     result["type"] = 'docs.google'
      //     //  this.contentSvc.changeMessage(result)
      //   })
      // }, 50)

      // const data1: any = {
      //   courseID: this.activatedRoute.snapshot.queryParams.collectionId ?
      //     this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier,
      //   contentId: this.htmlContent.identifier,
      //   name: this.htmlContent.name,
      //   moduleId: this.htmlContent!.parent ? this.htmlContent.parent : undefined,
      // }
      // this.telemetrySvc.end('docs.google', 'docs.google-close', this.activatedRoute.snapshot.queryParams.collectionId ?
      //   this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier, data1)

      //this.contentSvc.changeMessage('docs.google')
    }
  }
  ngOnChanges() {
    if (this.htmlContent && this.htmlContent.identifier) {
      this.urlContains = this.htmlContent.artifactUrl
      //const courseId = this.activatedRoute.snapshot.queryParams.collectionId ?
      //this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier
      // const obj = {
      //   resourceID: this.htmlContent.identifier,
      //   courseID: courseId,
      //   moduleID: this.htmlContent.parent,
      // }
      //  this.telemetrySvc.end('player', 'view', '', obj)
    }

    if (this.urlContains.includes('docs.google') && this.htmlContent !== null) {
      this.telemetrySvc.start('docs.google', 'docs.google-start', this.activatedRoute.snapshot.queryParams.collectionId ?
        this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier)
      this.executeForms()
    }

    if (this.htmlContent && this.htmlContent.identifier && this.htmlContent.mimeType === 'application/vnd.ekstep.html-archive') {

      // this.telemetrySvc.start('scorm', 'scorm-start', this.activatedRoute.snapshot.queryParams.collectionId ?
      //   this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier)

      //this.contentSvc.changeMessage('scorm')
      this.scormAdapterService.contentId = this.htmlContent.identifier
      // this.scormAdapterService.loadData()
      this.scormAdapterService.loadDataV2()
      // const data1: any = {
      //   courseID: this.activatedRoute.snapshot.queryParams.collectionId ?
      //     this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier,
      //   contentId: this.htmlContent.identifier,
      //   name: this.htmlContent.name,
      //   moduleId: this.htmlContent!.parent ? this.htmlContent.parent : undefined,
      // }
      // this.telemetrySvc.end('scorm', 'scorm-close', this.activatedRoute.snapshot.queryParams.collectionId ?
      //   this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier, data1)
    }

    this.isIntranetUrl = false
    this.progress = 100
    this.pageFetchStatus = 'fetching'
    this.showIframeSupportWarning = false
    this.intranetUrlPatterns = this.configSvc.instanceConfig
      ? this.configSvc.instanceConfig.intranetIframeUrls
      : []

    let iframeSupport: boolean | string | null =
      this.htmlContent && this.htmlContent.isIframeSupported

    if (this.htmlContent && this.htmlContent.artifactUrl) {
      if (this.htmlContent.artifactUrl.startsWith('http://') && this.htmlContent.isExternal) {
        this.htmlContent.isIframeSupported = 'No'
      }
      if (typeof iframeSupport !== 'boolean') {
        console.log(this.htmlContent.isIframeSupported)
        iframeSupport = this.htmlContent.isIframeSupported ? this.htmlContent.isIframeSupported : 'No'
        this.iframeSupport = iframeSupport
        if (iframeSupport === 'Yes' && this.htmlContent.mimeType !== 'application/vnd.ekstep.html-archive') {
          this.showIframeSupportWarning = true
          setTimeout(
            () => {
              this.openInNewTab()
            },
            3000,
          )
          setInterval(
            () => {
              this.progress -= 1
            },
            30,
          )
        } else if (iframeSupport === 'Maybe') {
          this.showIframeSupportWarning = true
        } else {
          this.showIframeSupportWarning = false
          if (this.htmlContent.mimeType === 'text/x-url') {
            // const collectionId = this.activatedRoute.snapshot.queryParams.collectionId ?
            //   this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier
            // const batchId = this.activatedRoute.snapshot.queryParams.batchId ?
            //   this.activatedRoute.snapshot.queryParams.batchId : this.htmlContent.identifier

            // this.telemetrySvc.start('html/x-url', 'html/x-url-start', this.activatedRoute.snapshot.queryParams.collectionId ?
            //   this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier)

            // const data1 = {
            //   current: 1,
            //   max_size: 1,
            //   mime_type: this.htmlContent.mimeType,
            // }

            // setTimeout(() => {
            //   if (this.htmlContent) {
            //     this.viewerSvc
            //       .realTimeProgressUpdate(this.htmlContent.identifier, data1, collectionId, batchId).subscribe((data: any) => {
            //         console.log(data.result.contentList)
            //         let result = data.result
            //         result["type"] = 'html'
            //         this.contentSvc.changeMessage(result)
            //       })
            //     //this.contentSvc.changeMessage('html')
            //   }
            // }, 50)

            // const data2: any = {
            //   courseID: this.activatedRoute.snapshot.queryParams.collectionId ?
            //     this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier,
            //   contentId: this.htmlContent.identifier,
            //   name: this.htmlContent.name,
            //   moduleId: this.htmlContent!.parent ? this.htmlContent.parent : undefined,
            // }
            // this.telemetrySvc.end('html/x-url', 'html/x-url-close', this.activatedRoute.snapshot.queryParams.collectionId ?
            //   this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier, data2)

          }
        }
      }
      if (this.intranetUrlPatterns && this.intranetUrlPatterns.length) {
        this.intranetUrlPatterns.forEach(iup => {
          if (this.htmlContent && this.htmlContent.artifactUrl) {
            if (this.htmlContent.artifactUrl.startsWith(iup)) {
              this.isIntranetUrl = true
            }
          }
        })
      }

      this.showIsLoadingMessage = false

      if (this.htmlContent.isIframeSupported !== 'No') {
        setTimeout(
          () => {
            if (this.pageFetchStatus === 'fetching' && !this.urlContains.includes('docs.google')) {
              this.showIsLoadingMessage = true
            }
          },
          3000,
        )
      }

      if (this.htmlContent.mimeType === 'application/vnd.ekstep.html-archive') {
        this.mimeType = this.htmlContent.mimeType
        // if (this.htmlContent.status !== 'Live') {
        //   if (this.htmlContent && this.htmlContent.artifactUrl) {
        //     this.contentSvc
        //       .fetchHierarchyContent(this.htmlContent.identifier)
        //       .toPromise()
        //       .then((res: any) => {

        //         let url = res['result']['content']['streamingUrl']
        //         // if (res['result']['content']['entryPoint']) {
        //         //   url = url + res['result']['content']['entryPoint']

        //         // }
        //         this.iframeUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(url)
        //         console.log(this.iframeUrl)
        //       })
        //       .catch((err: any) => {
        //         /* tslint:disable-next-line */
        //         console.log(err)
        //       })
        //   }
        // } else {
        if (this.htmlContent && this.htmlContent.artifactUrl) {
          // Use backend API to serve SCORM content
          const entryPoint = this.htmlContent.entryPoint || 'index_lms.html'

          if (this.htmlContent.artifactUrl && this.htmlContent.artifactUrl.endsWith('.zip')) {
            console.log('[SCORM] Loading from backend proxy:', this.htmlContent.artifactUrl)
            this.loadScormFromBackend(entryPoint)
          } else {
            console.error('SCORM artifactUrl must be a ZIP file')
            this.pageFetchStatus = 'error'
          }
        }

        // if (this.htmlContent.entryPoint && this.htmlContent.entryPoint.includes('lms') === false) {
        //   const collectionId = this.activatedRoute.snapshot.queryParams.collectionId ?
        //     this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier
        //   const batchId = this.activatedRoute.snapshot.queryParams.batchId ?
        //     this.activatedRoute.snapshot.queryParams.batchId : this.htmlContent.identifier

        //   this.telemetrySvc.start('html/lms', 'html/lms-start', this.activatedRoute.snapshot.queryParams.collectionId ?
        //     this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier)

        //   const data1 = {
        //     current: 1,
        //     max_size: 1,
        //     mime_type: this.mimeType,
        //   }

        //   setTimeout(() => {
        //     if (this.htmlContent) {
        //       this.viewerSvc
        //         .realTimeProgressUpdate(this.htmlContent.identifier, data1, collectionId, batchId).subscribe((data: any) => {
        //           console.log(data.result.contentList)
        //           let result = data.result
        //           result["type"] = 'html'
        //           this.contentSvc.changeMessage(result)
        //         })
        //       //this.contentSvc.changeMessage('html')
        //     }
        //   }, 50)

        //   const data2: any = {
        //     courseID: this.activatedRoute.snapshot.queryParams.collectionId ?
        //       this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier,
        //     contentId: this.htmlContent.identifier,
        //     name: this.htmlContent.name,
        //     moduleId: this.htmlContent!.parent ? this.htmlContent.parent : undefined,
        //   }
        //   this.telemetrySvc.end('html/lms', 'html/lms-close', this.activatedRoute.snapshot.queryParams.collectionId ?
        //     this.activatedRoute.snapshot.queryParams.collectionId : this.htmlContent.identifier, data2)

        // }

      } else {
        this.mimeType = this.htmlContent.mimeType
        this.iframeUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(
          this.htmlContent.artifactUrl)
      }

    } else if (this.htmlContent && this.htmlContent.artifactUrl === '') {
      this.iframeUrl = null
      this.pageFetchStatus = 'artifactUrlMissing'
    } else {
      this.iframeUrl = null
      this.pageFetchStatus = 'error'
    }
  }

  // backToDetailsPage() {
  //   this.router.navigate([
  //     `/app/toc/${this.htmlContent ? this.htmlContent.identifier : ''}/overview`,
  //   ])
  // }

  backToDetailsPage() {
    this.router.navigate(
      [`/app/toc/${this.htmlContent ? this.htmlContent.identifier : ''}/overview`],
      { queryParams: { primaryCategory: this.htmlContent ? this.htmlContent.primaryCategory : '' } })
  }

  raiseTelemetry(data: any) {
    if (this.htmlContent) {
      /* tslint:disable-next-line */
      // console.log(this.htmlContent.identifier)
      this.events.raiseInteractTelemetry(data.event, 'scrom', {
        contentId: this.htmlContent.identifier,
        ...data,
      })
    }
  }
  receiveMessage(msg: any) {
    // Handle SCORM API calls via postMessage
    if (msg.data && msg.data.type === 'SCORM_API_CALL') {
      console.log('[SCORM Component] Received SCORM API call via postMessage:', msg.data)
      this.handleSCORMApiCallViaMessage(msg.data)
      return
    }

    // Handle messages for telemetry
    if (msg.data) {
      this.raiseTelemetry(msg.data)
    } else {
      this.raiseTelemetry({
        event: msg.message,
        id: msg.id,
      })
    }
  }

  openInNewTab() {
    if (this.htmlContent) {
      if (this.mobAppSvc && this.mobAppSvc.isMobile) {
        // window.open(this.htmlContent.artifactUrl)
        setTimeout(
          () => {
            this.mobileOpenInNewTab.nativeElement.click()
          },
          0,
        )
      } else {
        const width = window.outerWidth
        const height = window.outerHeight
        const isWindowOpen = window.open(
          this.htmlContent.artifactUrl,
          '_blank',
          `toolbar=yes,
             scrollbars=yes,
             resizable=yes,
             menubar=no,
             location=no,
             addressbar=no,
             top=${(15 * height) / 100},
             left=${(2 * width) / 100},
             width=${(65 * width) / 100},
             height=${(70 * height) / 100}`,
        )
        if (isWindowOpen === null) {
          const msg = 'The pop up window has been blocked by your browser, please unblock to continue.'
          this.snackBar.open(msg)
        }
      }
    }
  }
  dismiss() {
    this.showIframeSupportWarning = false
    this.isIntranetUrl = false
  }

  onIframeLoadOrError(evt: 'load' | 'error', iframe?: HTMLIFrameElement, event?: any) {
    console.log('[SCORM] Iframe event:', evt, 'URL:', iframe && iframe.src)
    console.log('[SCORM] pageFetchStatus:', this.pageFetchStatus)
    console.log('[SCORM] showIsLoadingMessage:', this.showIsLoadingMessage)

    if (evt === 'error') {
      console.error('[SCORM] Iframe load error')
      this.pageFetchStatus = evt
    }
    if (evt === 'load' && iframe && iframe.contentWindow) {
      console.log('[SCORM] Iframe loaded successfully')

      // Monitor for JavaScript errors in the iframe
      iframe.contentWindow.addEventListener('error', (error) => {
        console.error('[SCORM] JavaScript error in iframe:', error)
      })

      // Monitor for unhandled promise rejections
      iframe.contentWindow.addEventListener('unhandledrejection', (event) => {
        console.error('[SCORM] Unhandled promise rejection in iframe:', event.reason)
      })

      if (event && iframe.onload) {
        iframe.onload(event)
      }

      iframe.onload = (data => {
        console.log("data: " + data)
        if (data.target) {
          this.pageFetchStatus = 'done'
        }
      })
      this.showIsLoadingMessage = false
      console.log('[SCORM] After iframe load - showIsLoadingMessage:', this.showIsLoadingMessage)
    }
  }

  /**
   * Loads SCORM package from ZIP file, extracts it, and creates blob URLs
   * Supports both local and S3-hosted SCORM packages
   */
  /**
   * Load SCORM content using production proxy pattern
   * Uses /apis/proxies/v8/getContents/content/html/{contentId}/{entryPoint}
   * SCORM packages must be pre-extracted to /content/html/{contentId}/ on backend
   */
  private loadScormFromBackend(entryPoint: string) {
    console.log('[SCORM] Loading SCORM using production streaming URL pattern')
    this.pageFetchStatus = 'fetching'

    if (this.htmlContent && this.htmlContent.streamingUrl) {
      let streamingUrl = this.htmlContent.streamingUrl

      // Log the original URL for debugging
      console.log('[SCORM] Original streamingUrl:', streamingUrl)

      // Extract the path part after the domain for all URLs and use proxy
      if (streamingUrl.includes('https://static.sphere.aastrika.org')) {
        // CDN domain: extract path after 'https://static.sphere.aastrika.org' (35 chars)
        streamingUrl = streamingUrl.substring(35)
      } else if (streamingUrl.includes('https://sunbirdcontent-stage.s3-ap-south-1.amazonaws.com')) {
        // S3 stage domain: extract path after domain (56 chars)
        streamingUrl = streamingUrl.substring(56)
      } else {
        // Fallback for other S3 or cloud domains
        streamingUrl = streamingUrl.substring(50)
      }

      // Ensure path starts with /
      if (!streamingUrl.startsWith('/')) {
        streamingUrl = '/' + streamingUrl
      }

      const entryPoint_processed = entryPoint || this.htmlContent.entryPoint || ''
      const newUrl = `/apis/proxies/v8/getContents${streamingUrl}${entryPoint_processed}`
      console.log('[SCORM] Using proxy URL:', newUrl, { streamingUrl, entryPoint: entryPoint_processed })
      this.iframeUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(newUrl)
      this.showIsLoadingMessage = true
    } else {
      console.error('[SCORM] streamingUrl not available')
      this.pageFetchStatus = 'error'
    }
  }

  /**
   * Handles SCORM API calls coming from the iframe via postMessage
   */
  private handleSCORMApiCallViaMessage(request: any): void {
    try {
      const methodName = request.method
      const args = request.args || []

      if ((this.scormAdapterService as any)[methodName] &&
        typeof (this.scormAdapterService as any)[methodName] === 'function') {

        const result = (this.scormAdapterService as any)[methodName](...args)

        // Send response back to iframe
        if (this.iframeElem && this.iframeElem.nativeElement && this.iframeElem.nativeElement.contentWindow) {
          const response = {
            type: 'SCORM_API_RESPONSE',
            id: request.id,
            result: result
          }
          this.iframeElem.nativeElement.contentWindow.postMessage(response, '*')
          console.log('[SCORM Component] Sent response:', response)
        }
      } else {
        console.warn(`[SCORM Component] SCORM method not found: ${methodName}`)
      }
    } catch (err) {
      console.error('[SCORM Component] Error handling SCORM API call:', err)
    }
  }
}

