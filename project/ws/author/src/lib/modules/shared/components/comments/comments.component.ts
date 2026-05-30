import { NSContent } from '@ws/author/src/lib/interface/content'

import { Component, OnInit, Input } from '@angular/core'


@Component({
  standalone: false,
  selector: 'ws-auth-root-comments',
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.scss'],
})
export class CommentsComponent implements OnInit {

  @Input() comments: NSContent.IComments[] = []
  constructor() { }

  ngOnInit() {
  }

}
