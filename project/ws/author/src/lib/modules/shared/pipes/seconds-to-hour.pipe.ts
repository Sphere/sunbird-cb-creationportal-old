import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
  name: 'formatDuration'
})
export class FormatDurationPipe implements PipeTransform {
  transform(value: number): string {

    let minutes = value > 59 ? Math.floor(value / 60) : 0
    const second = value % 60
    const hours = minutes ? (minutes > 59 ? Math.floor(minutes / 60) : 0) : 0
    minutes = minutes ? minutes % 60 : 0
    const seconds = second || 0


    // const hours = Math.floor(value / 3600)
    // const minutes = Math.floor((value % 3600) / 60)
    // const seconds = value % 60

    const formattedHours = (hours < 10) ? `0${hours}` : `${hours}`
    const formattedMinutes = (minutes < 10) ? `0${minutes}` : `${minutes}`
    const formattedSeconds = (seconds < 10) ? `0${seconds}` : `${seconds}`

    return `${formattedHours}h ${formattedMinutes}m ${formattedSeconds}s`
  }
}