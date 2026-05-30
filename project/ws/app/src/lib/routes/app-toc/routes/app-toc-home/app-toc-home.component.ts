import { Component, OnInit, ViewChild } from '@angular/core'

import { AppTocHomeDirective } from './app-toc-home.directive'

import { AppTocHomeService } from './app-toc-home.service'

@Component({
  standalone: false,
  selector: 'ws-app-app-toc-home-root',
  templateUrl: './app-toc-home.component.html',
  styleUrls: ['./app-toc-home.component.scss'],
})
export class AppTocHomeComponent implements OnInit {
  @ViewChild(AppTocHomeDirective, { static: true }) wsAppAppTocHome!: AppTocHomeDirective

  constructor(
    private appTocHomeSvc: AppTocHomeService,
  ) { }

  loadComponent() {
    const viewContainerRef = this.wsAppAppTocHome.viewContainerRef
    viewContainerRef.clear()
    viewContainerRef.createComponent(this.appTocHomeSvc.getComponent())
  }

  ngOnInit() {
    this.loadComponent()
  }

}
