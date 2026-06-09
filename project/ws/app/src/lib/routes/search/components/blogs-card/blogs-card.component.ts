import { Component, OnInit, Input } from '@angular/core'

import { IWsSocialSearchResultData } from '../../models/search.model'


@Component({
  standalone: false,
  selector: 'ws-app-blogs-card',
  templateUrl: './blogs-card.component.html',
  styleUrls: ['./blogs-card.component.scss'],
})
export class BlogsCardComponent implements OnInit {
  @Input() result: IWsSocialSearchResultData = {} as IWsSocialSearchResultData
  constructor() {}

  ngOnInit() {}
}
