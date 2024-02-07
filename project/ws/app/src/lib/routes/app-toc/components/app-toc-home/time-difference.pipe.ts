import { Pipe, PipeTransform } from '@angular/core'
//import { time } from 'console'
//import moment from 'moment'
import moment from 'moment-timezone'
@Pipe({
  name: 'timeDifference'
})
export class TimeDifferencePipe implements PipeTransform {
  transform(value: string): string {

    // const currentTimestamp: any = new Date()
    // const timestamp: any = new Date(value)
    // console.log(timestamp)
    // console.log(moment(new Date()).utcOffset(330))
    // console.log(moment(new Date()).toISOString(), 'ss', moment(value).utcOffset(330))
    // console.log(moment.duration(moment(new Date()).diff(moment(value))))
    // console.log(moment(value).utcOffset(330))
    let d1 = moment(new Date()).utcOffset(330)
    let d2 = moment(value).utcOffset(330)
    console.log(d2.toString(), moment(new Date()).toISOString())
    const duration = moment.duration(moment(d1).diff(moment(d2)))
    //console.log(moment().format('YYYY-MM-DD HH:mm:ss')), moment(new Date(value))
    console.log(duration)
    const days = duration.days()
    const hours = duration.hours()
    const minutes = duration.minutes()
    console.log(days, hours, minutes)
    let formattedString = ''

    if (days > 0) {
      formattedString += `${days} day${days !== 1 ? 's ago' : 'ago'} `
    }
    if (hours > 0) {
      formattedString += `${hours} hour${hours !== 1 ? 's ago' : 'ago'} `
    }
    if (minutes > 0) {
      formattedString += `${minutes} minute${minutes !== 1 ? 's ago' : 'ago'} `
    }

    const utcMoment = moment.utc(value) // Convert to UTC
    const localMoment = utcMoment.tz('Asia/Kolkata') // Convert to desired timezone

    return localMoment.fromNow()

    //return moment(value).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
    //return moment(value).tz('Asia/Kolkata').fromNow()
    //return formattedString.trim() || 'Just now'
  }
}
