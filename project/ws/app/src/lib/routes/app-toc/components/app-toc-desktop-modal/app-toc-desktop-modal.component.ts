import { Component, Inject, OnInit } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material'
import { Router } from '@angular/router'
// import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'

@Component({
  selector: 'ws-app-app-toc-desktop-modal',
  templateUrl: './app-toc-desktop-modal.component.html',
  styleUrls: ['./app-toc-desktop-modal.component.scss'],
})
export class AppTocDesktopModalComponent implements OnInit {
  cometencyData: { name: any; levels: string }[] = []
  competencyLevelDescription: any = []
  courseName!: ''
  addedCompetency!: any
  constructor(
    public dialogRef: MatDialogRef<AppTocDesktopModalComponent>,
    private router: Router,
    // private editorService: EditorService,
    @Inject(MAT_DIALOG_DATA) public content: any,
  ) { }

  ngOnInit() {
    if (this.content.type === 'COMPETENCY') {
      this.competencyData(this.content)
    }
  }
  showOrgprofile(orgId: string) {
    this.dialogRef.close()
    this.router.navigate(['/app/org-details'], { queryParams: { orgId } })
  }
  competencyData(data: any) {
    console.log("data", data)
    let combinedMap = new Map<string, any>()
    let competencies = JSON.parse(data.competency)

    if (!Array.isArray(competencies)) {
      competencies = [competencies]
    }

    if (competencies && competencies.length > 0) {
      competencies.forEach((element: any) => {
        if (!element.competencyId) return

        const matchingValue = data.proficiencyList.find((value: any) => value.id == element.competencyId)

        let levelName = ''
        if (
          matchingValue &&
          matchingValue.additionalProperties &&
          matchingValue.additionalProperties.competencyLevelDescription
        ) {
          const levelDescriptions = JSON.parse(matchingValue.additionalProperties.competencyLevelDescription)
          const levelMatch = levelDescriptions.find((desc: any) => desc.level === element.level)
          if (levelMatch && levelMatch.name) {
            levelName = `Level ${element.level} - ${levelMatch.name}`
          }
        }

        if (combinedMap.has(element.competencyId)) {
          const existing = combinedMap.get(element.competencyId)
          existing.levels.push(levelName)
        } else {
          combinedMap.set(element.competencyId, {
            ...element,
            ...(matchingValue && matchingValue.additionalProperties ? matchingValue.additionalProperties : {}),
            levels: levelName ? [levelName] : []
          })
        }
      })
    }

    this.addedCompetency = Array.from(combinedMap.values())
    console.log("this.addedCompetency", this.addedCompetency)
  }



}
