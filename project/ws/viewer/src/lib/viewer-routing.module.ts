import { NgModule } from '@angular/core'

import { Routes, RouterModule } from '@angular/router'

import { ViewerComponent } from './viewer.component'

import { ViewerResolve } from './viewer.resolve'

import { AudioComponent } from './routes/audio/audio.component'

import { AudioModule } from './routes/audio/audio.module'

import { HtmlComponent } from './routes/html/html.component'

import { HtmlModule } from './routes/html/html.module'

import { PdfComponent } from './routes/pdf/pdf.component'

import { PdfModule } from './routes/pdf/pdf.module'

import { VideoComponent } from './routes/video/video.component'

import { VideoModule } from './routes/video/video.module'

import { YoutubeComponent } from './routes/youtube/youtube.component'

import { YoutubeModule } from './routes/youtube/youtube.module'

const routes: Routes = [
  {
    path: 'audio/:resourceId',
    component: AudioComponent,
    data: {
      resourceType: 'audio',
    },
    resolve: {
      content: ViewerResolve,
    },
  },
  {
    path: 'dnd-quiz',
    data: {
      resourceType: 'dnd-quiz',
    },
    loadChildren: () => import('./routes/dnd-quiz/dnd-quiz.module').then(u => u.DndQuizModule),
  },
  {
    path: 'html/:resourceId',
    component: HtmlComponent,
    data: {
      resourceType: 'html',
    },
    resolve: {
      content: ViewerResolve,
    },
  },
  {
    path: 'html-picker',
    data: {
      resourceType: 'html-picker',
    },
    loadChildren: () => import('./routes/html-picker/html-picker.module').then(u => u.HtmlPickerModule),
  },
  {
    path: 'iap',
    data: {
      resourceType: 'iap',
    },
    loadChildren: () => import('./routes/iap/iap.module').then(u => u.IapModule),
  },
  {
    path: 'interactive-exercise',
    data: {
      resourceType: 'interactive-exercise',
    },
    loadChildren: () => import('./routes/interactive-exercise/interactive-exercise.module').then(u => u.InteractiveExerciseModule),
  },
  {
    path: 'pdf/:resourceId',
    component: PdfComponent,
    data: {
      resourceType: 'pdf',
    },
    resolve: {
      content: ViewerResolve,
    },
  },
  {
    path: 'quiz',
    data: {
      resourceType: 'quiz',
    },
    loadChildren: () => import('./routes/quiz/quiz.module').then(u => u.QuizModule),
  },
  {
    path: 'resource-collection',
    data: {
      resourceType: 'resource-collection',
    },
    loadChildren: () => import('./routes/resource-collection/resource-collection.module').then(u => u.ResourceCollectionModule),
  },
  {
    path: 'video/:resourceId',
    component: VideoComponent,
    data: {
      resourceType: 'video',
    },
    resolve: {
      content: ViewerResolve,
    },
  },
  {
    path: 'web-module',
    data: {
      resourceType: 'web-module',
    },
    loadChildren: () => import('./routes/web-module/web-module.module').then(u => u.WebModuleModule),
  },
  {
    path: 'youtube/:resourceId',
    component: YoutubeComponent,
    data: {
      resourceType: 'youtube',
    },
    resolve: {
      content: ViewerResolve,
    },
  },
  {
    path: ':resourceId',
    component: ViewerComponent,
    data: {
      resourceType: 'unknown',
    },
    resolve: {
      content: ViewerResolve,
    },
  },
  {
    path: '**',
    data: {
      resourceType: 'error',
    },
    resolve: {
      content: ViewerResolve,
    },
  },
]

@NgModule({
  imports: [
    AudioModule,
    HtmlModule,
    PdfModule,
    VideoModule,
    YoutubeModule,
    RouterModule.forChild([
      {
        path: '',
        component: ViewerComponent,
        children: routes,
      },
    ]),
  ],
  exports: [RouterModule],
  providers: [ViewerResolve],
})
export class ViewerRoutingModule {}
