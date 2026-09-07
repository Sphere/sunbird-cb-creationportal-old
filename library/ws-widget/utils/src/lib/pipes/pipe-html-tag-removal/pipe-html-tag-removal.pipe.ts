import { Pipe, PipeTransform } from '@angular/core'

import { stripHtmlTags } from '../../helpers/functions/stripHtmlTags'

/**
 * Thin delegate over stripHtmlTags. The expression used to be inline here and at three
 * other call sites; it is in one place now.
 */
@Pipe({
  standalone: false,
  name: 'pipeHtmlTagRemoval',
})
export class PipeHtmlTagRemovalPipe implements PipeTransform {
  transform(htmlString: string): string {
    return stripHtmlTags(htmlString)
  }
}
