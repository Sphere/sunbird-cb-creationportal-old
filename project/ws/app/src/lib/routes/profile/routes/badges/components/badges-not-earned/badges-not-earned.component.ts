import { Component, OnInit, Input } from '@angular/core'

import { IBadge } from '../../badges.model'


@Component({
  standalone: false,
  selector: 'ws-app-badges-not-earned',
  templateUrl: './badges-not-earned.component.html',
  styleUrls: ['./badges-not-earned.component.scss'],
})
export class BadgesNotEarnedComponent implements OnInit {
  constructor() { }
  @Input()
  badge!: IBadge

  ngOnInit() { }
}
