import { Component, Inject, OnInit } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material'
import { Router } from '@angular/router'
import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'

@Component({
  selector: 'ws-app-app-toc-desktop-modal',
  templateUrl: './app-toc-desktop-modal.component.html',
  styleUrls: ['./app-toc-desktop-modal.component.scss'],
})
export class AppTocDesktopModalComponent implements OnInit {
  cometencyData: { name: any; levels: string }[] = []
  competencyLevelDescription: any = []
  courseName!: ''
  constructor(
    public dialogRef: MatDialogRef<AppTocDesktopModalComponent>,
    private router: Router,
    private editorService: EditorService,
    @Inject(MAT_DIALOG_DATA) public content: any,
  ) { }

  ngOnInit() {
    if (this.content.type === 'COMPETENCY') {
      this.competencyData(this.content.competency)
    }
  }
  showOrgprofile(orgId: string) {
    this.dialogRef.close()
    this.router.navigate(['/app/org-details'], { queryParams: { orgId } })
  }
  competencyData(data: any) {
    console.log("data", data)
    data = JSON.parse(data)
    this.courseName = data[0].competencyName
    console.log("data[0].competencyName", data[0].competencyName)
    let competencyId: any = 0
    if (data && data.length > 0) {
      competencyId = parseInt(data[0].competencyId, 10)  // Convert to a number
      console.log(competencyId)  // Log the converted number
    }

    let proficiencyList = []
    this.editorService.getEntities(competencyId).subscribe(async (res: any) => {
      proficiencyList = await res.result.response
      if (proficiencyList.length > 0) {
        console.log("proficiency list", proficiencyList)
        if (proficiencyList[0].additionalProperties.competencyLevelDescription) {
          this.competencyLevelDescription = JSON.parse(proficiencyList[0].additionalProperties.competencyLevelDescription)
        } else {
          this.competencyLevelDescription = 'Levels data not found'
        }
        console.log(this.competencyLevelDescription, "competencyLevelDescription")
      }
    })

  }

}
