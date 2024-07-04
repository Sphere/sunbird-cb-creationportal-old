import { Pipe, PipeTransform } from '@angular/core'
import moment from 'moment-timezone'

@Pipe({
  name: 'momentDate'
})
export class MomentDatePipe implements PipeTransform {

  transform(value: any, format: string = 'DD/MM/YY hh:mm:ss A'): any {
    if (!value) return value

    const utcMoment = moment.utc(value) // Convert to UTC
    const localMoment = utcMoment.tz('Asia/Kolkata') // Convert to desired timezone

    return localMoment.format(format)
    // Use Moment.js with timezone support to format the date in IST
    //return moment.tz(value, 'Asia/Kolkata').format(format)
  }
}
