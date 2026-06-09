import { Component, OnInit, ViewChild } from '@angular/core'

import { AppTocSinglePageDirective } from './app-toc-single-page.directive'

import { AppTocSinglePageService } from './app-toc-single-page.service'


@Component({
  standalone: false,
  selector: 'ws-app-app-toc-single-page-root',
  templateUrl: './app-toc-single-page.component.html',
  styleUrls: ['./app-toc-single-page.component.scss'],
})
export class AppTocSinglePageComponent implements OnInit {

  @ViewChild(AppTocSinglePageDirective, { static: true }) wsAppAppTocSinglePage!: AppTocSinglePageDirective

  constructor(
    private appTocSvc: AppTocSinglePageService,
  ) { }

  loadComponent() {
    const viewContainerRef = this.wsAppAppTocSinglePage.viewContainerRef
    viewContainerRef.clear()
    viewContainerRef.createComponent(this.appTocSvc.getComponent())
  }

  ngOnInit() {
    this.loadComponent()
  }

}
