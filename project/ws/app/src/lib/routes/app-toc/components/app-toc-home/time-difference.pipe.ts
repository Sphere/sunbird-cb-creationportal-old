import { Pipe, PipeTransform } from '@angular/core'
//import { time } from 'console'
import moment from 'moment'
@Pipe({
  name: 'timeDifference'
})
export class TimeDifferencePipe implements PipeTransform {
  transform(value: string): string {
    const duration = moment.duration(moment(new Date()).diff(moment(new Date(value))))
    console.log(moment().format('YYYY-MM-DD HH:mm:ss')), moment(new Date(value))
    console.log(duration)
    const days = duration.days()
    const hours = duration.hours()
    const minutes = duration.minutes()
    console.log(days, hours, minutes)
    let formattedString = ''

    if (days > 0) {
      formattedString += `${days} day${days !== 1 ? 's' : ''} `
    }
    if (hours > 0) {
      formattedString += `${hours} hour${hours !== 1 ? 's' : ''} `
    }
    if (minutes > 0) {
      formattedString += `${minutes} minute${minutes !== 1 ? 's' : ''} `
    }

    return formattedString.trim() || 'Just now'
    // const currentTimestamp: any = new Date()
    // const timestamp: any = new Date(value)
    // console.log(moment(timestamp))
    // const differenceInSeconds = Math.floor((currentTimestamp - timestamp) / 1000)
    // console.log(differenceInSeconds)
    // if (differenceInSeconds < 60) {
    //   return `${differenceInSeconds} seconds ago`
    // } else if (differenceInSeconds < 3600) {
    //   const minutes = Math.floor(differenceInSeconds / 60)
    //   return `${minutes} ${minutes > 1 ? 'minutes' : 'minute'} ago`
    // } else if (differenceInSeconds < 86400) {
    //   const hours = Math.floor(differenceInSeconds / 3600)
    //   return `${hours} ${hours > 1 ? 'hours' : 'hour'} ago`
    // } else {
    //   const days = Math.floor(differenceInSeconds / 86400)
    //   return `${days} ${days > 1 ? 'days' : 'day'} ago`
    // }
  }
}
