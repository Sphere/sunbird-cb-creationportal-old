import { Pipe, PipeTransform } from '@angular/core'

import { DomSanitizer, SafeHtml, SafeResourceUrl, SafeScript, SafeStyle, SafeUrl } from '@angular/platform-browser'

import { SafeContentService } from '../../services/safe-content.service'

/**
 * Thin delegate over SafeContentService. The bypass calls used to live here too;
 * they are in that one service now so there is a single place to audit.
 */
@Pipe({
  standalone: false,
  name: 'pipeSafeSanitizer',
})
export class PipeSafeSanitizerPipe implements PipeTransform {
  constructor(protected sanitizer: DomSanitizer) {}

  public transform(value: string, type: string = 'html'): SafeHtml | SafeStyle | SafeScript | SafeUrl | SafeResourceUrl {
    return SafeContentService.trust(this.sanitizer, value, type)
  }
}
