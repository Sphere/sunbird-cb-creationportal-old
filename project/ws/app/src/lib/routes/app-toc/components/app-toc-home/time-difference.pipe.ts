import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
  name: 'timeDifference'
})
export class TimeDifferencePipe implements PipeTransform {
  transform(value: string): string {
    const currentTimestamp: any = new Date()
    const timestamp: any = new Date(value)
    const differenceInSeconds = Math.floor((currentTimestamp - timestamp) / 1000)
    console.log(differenceInSeconds)
    if (differenceInSeconds < 60) {
      return `${differenceInSeconds} seconds ago`
    } else if (differenceInSeconds < 3600) {
      const minutes = Math.floor(differenceInSeconds / 60)
      return `${minutes} ${minutes > 1 ? 'minutes' : 'minute'} ago`
    } else if (differenceInSeconds < 86400) {
      const hours = Math.floor(differenceInSeconds / 3600)
      return `${hours} ${hours > 1 ? 'hours' : 'hour'} ago`
    } else {
      const days = Math.floor(differenceInSeconds / 86400)
      return `${days} ${days > 1 ? 'days' : 'day'} ago`
    }
  }
}
