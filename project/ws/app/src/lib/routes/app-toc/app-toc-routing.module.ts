import { NgModule } from '@angular/core'

import { RouterModule, Routes } from '@angular/router'

import { PageResolve } from '@ws-widget/utils'

import { AppTocResolverService } from './resolvers/app-toc-resolver.service'

import { AppTocContentsComponent } from './routes/app-toc-contents/app-toc-contents.component'

import { AppTocHomeComponent } from './routes/app-toc-home/app-toc-home.component'

import { AppTocSinglePageComponent as AppTocSinglePageRootComponent } from './routes/app-toc-single-page/app-toc-single-page.component'

import { LicenseComponent } from './components/license/license.component'

import { AppTocOverviewComponent as AppTocOverviewRootComponent } from './routes/app-toc-overview/app-toc-overview.component'

const routes: Routes = [
  {
    path: ':id',
    component: AppTocHomeComponent,
    data: {
      pageType: 'feature',
      pageKey: 'toc',
    },
    resolve: {
      pageData: PageResolve,
      content: AppTocResolverService,
    },
    runGuardsAndResolvers: 'paramsChange',
    children: [
      {
        path: 'contents',
        component: AppTocContentsComponent,
      },
      {
        path: 'comments',
        component: AppTocContentsComponent,
      },
      {
        path: 'overview',
        // component: AppTocSinglePageRootComponent,
        component: AppTocOverviewRootComponent,
        // pathMatch: 'full',
        // redirectTo: 'single-page-view',
      },
      {
        path: 'single-page-view',
        component: AppTocSinglePageRootComponent,
      },
      {
        path: 'license',
        component: LicenseComponent,
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'overview',
      },
      // {
      //   path: '',
      //   pathMatch: 'full',
      //   redirectTo: 'single-page-view',
      // },
    ],
  },
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppTocRoutingModule {}
