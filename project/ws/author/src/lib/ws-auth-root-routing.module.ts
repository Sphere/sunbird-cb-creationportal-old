import { CreateCourseComponent } from './routing/modules/create/components/create-course/create-course.component'
import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { GeneralGuard } from '../../../../../src/app/guards/general.guard'
import { AuthRootComponent } from './components/root/root.component'
import { ViewerComponent } from './routing/components/viewer/viewer.component'
import { CreateComponent } from './routing/modules/create/components/create/create.component'
import { AuthHomeComponent } from './routing/modules/home/components/home/home.component'
import { ContentAndDataReadMultiLangTOCResolver } from './services/content-and-data-read-multi-lang.service'
import { ContentTOCResolver } from './services/content-resolve.service'
import { InitResolver } from './services/init-resolve.service'
import { ReviewerChecklist } from '../../../author/src/lib/routing/modules/editor/shared/components/reviewer-checklist/reviewer-checklist.component'


const routes: Routes = [
  {
    path: 'home',
    component: AuthHomeComponent,
    resolve: {
      script: InitResolver,
    },
  },
  {
    path: 'reviewerChecklist/:id',
    component: ReviewerChecklist,
  },
  {
    path: 'editor',
    loadChildren: () => import('./routing/modules/editor/editor.module').then(u => u.EditorModule),
    data: {
      load: ['ordinals', 'ckeditor', 'meta'],
    },
    resolve: {
      script: InitResolver,
    },
  },
  {
    path: 'editor/:id',
    loadChildren: () => import('./routing/modules/editor/editor.module').then(u => u.EditorModule),
    data: { load: ['ordinals', 'ckeditor', 'meta'] },
    resolve: {
      script: InitResolver,
      contents: ContentAndDataReadMultiLangTOCResolver,
    },
  },
  {
    path: 'my-content',
    loadChildren: () =>
      import('./routing/modules/my-content/my-content.module').then(u => u.MyContentModule),
    data: { load: ['ordinals', 'meta'] },
    resolve: {
      script: InitResolver,
    },
  },
  {
    path: 'create-content',
    data: {
      load: ['create', 'ordinals'],
      requiredFeatures: ['authoring'],
    },
    canActivate: [GeneralGuard],
    component: CreateComponent,
    resolve: {
      script: InitResolver,
    },
  },
  {
    path: 'my-content/ai-hub',
    loadChildren: () =>
      import('./routing/modules/aihub/aihub.module').then(u => u.AIHubModule),
    data: { load: ['ordinals', 'meta'] },
    resolve: {
      script: InitResolver,
    }
  },
  {
    path: 'create',
    data: {
      load: ['create', 'ordinals', 'meta'],
      requiredFeatures: ['authoring'],
    },
    canActivate: [GeneralGuard],
    component: CreateComponent,
    resolve: {
      script: InitResolver,
    },
  },
  {
    path: 'create-course',
    data: {
      // load: ['create', 'ordinals'],
      requiredFeatures: ['authoring'],
    },
    canActivate: [GeneralGuard],
    component: CreateCourseComponent,
    resolve: {
      script: InitResolver,
    },
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: 'viewer/:id',
    component: ViewerComponent,
    resolve: {
      content: ContentTOCResolver,
    },
  },
]

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        component: AuthRootComponent,
        children: routes,
      },
    ]),
  ],
  exports: [RouterModule],
})
export class WsAuthorRootRoutingModule { }
