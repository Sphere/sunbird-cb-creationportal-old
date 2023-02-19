import {
  Component, OnInit,
} from '@angular/core'
import {
  MatDialogRef,
} from '@angular/material/dialog'
import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'
import { Router } from '@angular/router'

@Component({
  selector: 'ws-competency-popup',
  templateUrl: './competency-popup.component.html',
  styleUrls: ['./competency-popup.component.scss']
})
export class CompetencyPopupComponent implements OnInit {
  proficiency: any
  proficiencyList: any
  selectLevel: any
  parentData: any
  levelList: any = [
    {
      "value": "1",
      "name": "Level 1"
    },
    {
      "value": "2",
      "name": "Level 2"
    },
    {
      "value": "3",
      "name": "Level 3"
    },
    {
      "value": "4",
      "name": "Level 4"
    },
    {
      "value": "5",
      "name": "Level 5"
    },

  ]
  constructor(
    public dialogRef: MatDialogRef<CompetencyPopupComponent>,
    private editorService: EditorService,
    private router: Router
  ) {

  }

  ngOnInit() {
    this.editorService.getAllEntities().subscribe(async (res: any) => {
      this.proficiencyList = await res.result.response
    })
    const url = this.router.url
    const id = url.split('/')
    this.editorService.checkReadAPI(id[3])
      .subscribe(async (res: any) => {
        this.parentData = await res.result.content
      })
  }
  eventSelection(event: any) {
    this.proficiency = event
  }

  listSelection(event: any) {
    this.selectLevel = event
  }
  addCompetency(proficiency: any, selectLevel: any, onclose: boolean) {
    if (onclose) {
      let competencyID = proficiency.id + '-' + selectLevel.value
      let competencies_obj = [{
        competencyName: proficiency.name,
        competencyId: proficiency.id,
        level: selectLevel.value
      }]
      let requestBody: any
      let meta: any = {
        versionKey: this.parentData.versionKey,
        competencySearch: [competencyID],
        competency: false,
        competencies_v1: competencies_obj
      }

      requestBody = {
        request: {
          content: meta
        }
      }
      this.editorService.updateNewContentV3(requestBody, this.parentData.identifier).subscribe(
        (response: any) => {
          if (response.params.status === "successful") {
            this.dialogRef.close(onclose)
          }
        })
    } else {
      this.dialogRef.close(onclose)
    }
  }
}
