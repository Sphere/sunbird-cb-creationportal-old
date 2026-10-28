import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
  standalone: false,
  name: 'MimeTypePipe',
})
export class MimeTypePipe implements PipeTransform {
  contentList: any[] = [
    {
      name: 'application/pdf',
      type: 'PDF',
    },
    {
      name: 'text/x-url',
      type: 'Link',
    },
    {
      name: 'application/json',
      type: 'Assessment',
    },
    {
      name: 'audio/mpeg',
      type: 'Audio',
    },
    {
      name: 'video/mp4',
      type: 'Video',
    },

    {
      name: 'application/vnd.ekstep.html-archive',
      type: 'Scrom',
    },
  ]
  /**
   * `packageType` tells the two zip resources apart: only an HTML package is
   * saved with 'html'; existing SCORM has none.
   */
  transform(name: string, packageType?: string): string {
    if (name === 'application/vnd.ekstep.html-archive' && packageType === 'html') {
      return 'HTML'
    }
    const matchingType = this.contentList.find(item => item.name === name)
    return matchingType ? matchingType.type : 'Unknown'
  }
}
