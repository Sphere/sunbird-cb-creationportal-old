import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
  name: 'MimeTypePipe'
})
export class MimeTypePipe implements PipeTransform {
  contentList: any[] = [
    {
      name: 'application/pdf',
      type: 'PDF'
    },
    {
      name: 'text/x-url',
      type: 'Link'
    },
    {
      name: 'application/json',
      type: 'Assessment'
    },
    {
      name: 'audio/mpeg',
      type: 'Audio'
    },
    {
      name: 'video/mp4',
      type: 'Video'
    },

    {
      name: 'application/vnd.ekstep.html-archive',
      type: 'Scrom'
    }
  ]
  transform(name: string): string {
    const matchingType = this.contentList.find(item => item.name === name)
    return matchingType ? matchingType.type : 'Unknown'
  }
}