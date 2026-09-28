import { NgModule } from '@angular/core'

import { Routes, RouterModule } from '@angular/router'

import { AIStudioDashboardComponent } from './components/ai-studio-dashboard/ai-studio-dashboard.component'

import { AIStudioFeatureGuard } from './ai-studio-feature.guard'

import { AI_STUDIO_DEFAULT_FEATURE } from './ai-studio.features'

/**
 * A feature per URL: /author/my-content/ai-studio/contentStudio.
 *
 * The segment is the same id the sidebar already uses, so one name identifies a
 * feature in the menu, in the URL and in the component — nothing has to be
 * translated between them, and adding a feature does not touch this file.
 *
 * The bare path lands on the first feature rather than an empty screen, and an
 * id that names no feature is sent there too: ':feature' matches ANY segment,
 * so without the guard '/ai-studio/anything' rendered a blank page — every
 * branch in the dashboard was false and nothing was left to show.
 *
 * This does not replace ?status=contentStudio; that still works, and is still
 * what the sidebar uses. Both reach the same component, which takes the route
 * where there is one and the input otherwise.
 */
const routes: Routes = [
  {
    path: '',
    redirectTo: AI_STUDIO_DEFAULT_FEATURE,
    pathMatch: 'full',
  },
  {
    path: ':feature',
    component: AIStudioDashboardComponent,
    canActivate: [AIStudioFeatureGuard],
  },
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AIStudioRoutingModule {}
