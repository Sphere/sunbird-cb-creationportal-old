import { Injectable } from '@angular/core'
import { Router, NavigationEnd } from '@angular/router'


@Injectable()
export class BackNavigateService {
  private history: string[] = []

  constructor(private router: Router) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.history.push(event.urlAfterRedirects)
      }
    })
  }

  back(): void {
    // this.history.pop()
    // if (this.history.length > 0) {
    //   this.location.back()
    // } else {
    // this.router.navigate(['author', 'cbp'])
    this.router.navigateByUrl('/author/home')
    // }
  }
}



