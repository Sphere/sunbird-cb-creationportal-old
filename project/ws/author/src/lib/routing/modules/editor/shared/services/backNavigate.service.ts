import { Injectable } from '@angular/core'


@Injectable()
export class BackNavigateService {

  constructor() {

  }

  back(): void {
    console.log("here")
  }
}
