import { enableProdMode } from '@angular/core'

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'


import { environment } from './environments/environment'

import { AppModule } from './app/app.module'


if (environment.production) {
  enableProdMode()
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  // eslint-disable-next-line no-console -- surface bootstrap failures
  .catch(err => console.error(err))
