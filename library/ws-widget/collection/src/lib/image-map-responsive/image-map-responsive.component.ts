import { Component, OnInit, AfterViewInit, OnDestroy, Input, ViewChild, ElementRef } from '@angular/core'

import { fromEvent, Subscription } from 'rxjs'

import { debounceTime } from 'rxjs/operators'

import { WidgetBaseComponent, NsWidgetResolver } from '../../../../resolver/src/public-api'

import { IWidgetImageMap, IWidgetMapMeta, IWidgetScale, IWidgetMapCoords } from './image-map-responsive.model'

@Component({
  standalone: false,
  selector: 'ws-widget-image-map-responsive',
  templateUrl: './image-map-responsive.component.html',
  styleUrls: ['./image-map-responsive.component.scss'],
})
export class ImageMapResponsiveComponent
  extends WidgetBaseComponent
  implements OnInit, AfterViewInit, OnDestroy, NsWidgetResolver.IWidgetData<IWidgetImageMap>
{
  scale: IWidgetScale = {
    height: 1,
    width: 1,
  }
  /**
   * The `<map>` body, bound to `[innerHTML]` and sanitized by Angular.
   *
   * This used to be wrapped in `bypassSecurityTrustHtml`, which was both
   * unnecessary and harmful: `<map>`, `<area>` and the `shape` / `coords` /
   * `href` / `alt` / `target` attributes all survive Angular's HTML sanitizer
   * untouched, so the image map renders identically — while `<script>`,
   * `javascript:` URLs and inline event handlers are stripped. Since this value
   * comes from authored content, the bypass was disabling XSS protection on
   * author-supplied markup for no functional gain.
   */
  htmlContent = ''
  initialCoords!: IWidgetMapCoords[]
  coords!: IWidgetMapCoords[]
  isUpdateCoords = true
  private resizeObserver: Subscription | null = null
  interval: any

  @ViewChild('map', { static: false }) mapElem!: ElementRef
  @Input() widgetData!: IWidgetImageMap

  updateCoords() {
    const currentWidth = this.mapElem.nativeElement.width
    const currentHeight = this.mapElem.nativeElement.height
    if (currentHeight) {
      clearInterval(this.interval)
    }
    this.scale.height = currentHeight / this.widgetData.imageHeight
    this.scale.width = currentWidth / this.widgetData.imageWidth
    this.coords.forEach((item, index) => {
      item.x1 = this.initialCoords[index].x1 * this.scale.width
      item.y1 = this.initialCoords[index].y1 * this.scale.height
      item.x2 = this.initialCoords[index].x2 * this.scale.width
      item.y2 = this.initialCoords[index].y2 * this.scale.height
    })
  }

  getInitialCoords() {
    this.initialCoords = this.widgetData.map.map((item: IWidgetMapMeta) => {
      return {
        x1: item.coords[0],
        y1: item.coords[1],
        x2: item.coords[2],
        y2: item.coords[3],
      }
    })
    this.coords = JSON.parse(JSON.stringify(this.initialCoords))
  }

  ngOnInit() {
    if (this.widgetData.externalData) {
      // The <map> body legitimately contains '>' (the <area> tags), so a negated
      // class cannot be used here and the lazy quantifier stays ambiguous. This is
      // accepted: the regex runs client-side over content the user is already
      // viewing, so pathological input can only slow that user's own tab — there is
      // no server-side or cross-user denial of service. Group 2 is the map body.
      const regex = /<map(.*?)>([\s\S]*?)<\/map>/gm
      const match = regex.exec(this.widgetData.externalData as string)
      // Guard the no-match case: the previous `(... as any)[2]` threw a
      // TypeError on any externalData without a <map>…</map> block, taking the
      // whole widget down. An empty body renders an empty map instead.
      this.htmlContent = match ? match[2] : ''
    } else {
      this.getInitialCoords()
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (!this.widgetData.externalData) {
        this.interval = setInterval(() => {
          this.updateCoords()
        }, 100)
      }
    }, 500)
    this.resizeObserver = fromEvent(window, 'resize')
      .pipe(debounceTime(500))
      .subscribe(() => {
        if (!this.widgetData.externalData) {
          this.interval = setInterval(() => {
            this.updateCoords()
          }, 100)
        }
      })
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.unsubscribe()
    }
  }
}
