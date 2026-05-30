import { Component, OnInit, ViewChild } from '@angular/core'

import { AppTocCohortsService } from './app-toc-cohorts.service'

import { AppTocCohortsDirective } from './app-toc-cohorts.directive'


@Component({
  standalone: false,
  selector: 'ws-app-app-toc-cohorts',
  templateUrl: './app-toc-cohorts.component.html',
  styleUrls: ['./app-toc-cohorts.component.scss'],
})
export class AppTocCohortsComponent implements OnInit {

  @ViewChild(AppTocCohortsDirective, { static: true }) wsAppAppTocCohorts!: AppTocCohortsDirective
  constructor(
    private appTocCohortsSvc: AppTocCohortsService,
  ) { }

  loadComponent() {
    const viewContainerRef = this.wsAppAppTocCohorts.viewContainerRef
    viewContainerRef.clear()
    viewContainerRef.createComponent(this.appTocCohortsSvc.getComponent())
  }

  ngOnInit() {
    this.loadComponent()
  }

}
