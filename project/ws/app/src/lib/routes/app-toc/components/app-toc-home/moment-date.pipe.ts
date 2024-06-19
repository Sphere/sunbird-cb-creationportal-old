import { Pipe, PipeTransform } from '@angular/core'
import moment from 'moment-timezone'

@Pipe({
  name: 'momentDate'
})
export class MomentDatePipe implements PipeTransform {

  transform(value: any, format: string = 'DD/MM/YY hh:mm:ss A'): any {
    if (!value) return value

    // Use Moment.js to format the date in IST
    return moment(value).tz('Asia/Kolkata').format(format)
  }
}
