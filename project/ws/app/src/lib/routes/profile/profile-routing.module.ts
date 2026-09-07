import { NgModule } from '@angular/core'

import { RouterModule, Routes } from '@angular/router'

import { PageResolve } from '@ws-widget/utils'

import { ProfileComponent } from './profile.component'

import { AchievementsComponent } from './routes/competency/components/achievements/achievements.component'

import { BadgesResolver2 } from './routes/badges/badges.resolver2'

import { CardDetailComponent } from './routes/competency/components/card-detail/card-detail.component'

import { CompetencyHomeComponent } from './routes/competency/components/competency-home/competency-home.component'

import { CompetencyResolverService } from './routes/competency/resolver/assessment.resolver'

import { DashboardComponent } from './routes/dashboard/components/dashboard/dashboard.component'

import { SettingsComponent } from './routes/settings/settings.component'

// import { BadgeComponent } from '../gamification/routes/badges/components/badge/badge.component'

import { BadgesComponent } from './routes/badges/badges.component'

import { GeneralGuard } from '../../../../../../../src/app/guards/general.guard'

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    data: {
      pageType: 'feature',
      pageKey: 'profile',
    },
    resolve: {
      pageData: PageResolve,
    },
  },
  {
    path: 'competency',
    component: CompetencyHomeComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'assessment',
      },
      {
        path: 'badges',
        component: BadgesComponent,
        resolve: {
          badges: BadgesResolver2,
        },
        canActivate: [GeneralGuard],
      },
      {
        path: ':type',
        component: AchievementsComponent,
        resolve: {
          competencyData: CompetencyResolverService,
        },
      },
      {
        path: ':type/details',
        component: CardDetailComponent,
      },
    ],
    data: {
      pageType: 'feature',
      pageKey: 'profile',
    },
    resolve: {
      pageData: PageResolve,
    },
  },
  {
    path: 'settings',
    component: SettingsComponent,
  },
]

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        component: ProfileComponent,
        children: routes,
        data: {
          pageType: 'feature',
          pageKey: 'profile',
        },
        resolve: {
          pageData: PageResolve,
        },
      },
    ]),
  ],
  exports: [RouterModule],
})
export class ProfileRoutingModule {}
