import { Component, Inject, OnInit } from '@angular/core'

import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { Router } from '@angular/router'

// import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'

@Component({
  standalone: false,
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
  ) {}

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
    console.log('data', data)
    let combinedMap = new Map<string, any>()
    let competencies = JSON.parse(data.competency.competencies_v1)

    if (!Array.isArray(competencies)) {
      competencies = [competencies]
    }

    if (competencies && competencies.length > 0) {
      competencies.forEach((element: any) => {
        const matchingValue = data.proficiencyList.find((value: any) => String(value.entityId) === String(element.competencyId))

        let levels: string[] = []

        if (matchingValue?.levels?.length > 0) {
          const entityLevels: any[] = matchingValue.levels
          if (data.competency && data.competency.competency === true) {
            levels = entityLevels.map((desc: any) => `Level ${desc.levelNumber} - ${desc.levelName}`)
          } else {
            const levelMatch = entityLevels.find((desc: any) => String(desc.levelNumber) === String(element.level))
            if (levelMatch) {
              levels = [`Level ${levelMatch.levelNumber} - ${levelMatch.levelName}`]
            }
          }
        }

        if (combinedMap.has(element.competencyId)) {
          const existing = combinedMap.get(element.competencyId)
          existing.levels.push(...levels)
          existing.levels = Array.from(new Set(existing.levels))
        } else {
          combinedMap.set(element.competencyId, {
            ...element,
            code: matchingValue?.code,
            name: matchingValue?.name || element.competencyName,
            levels,
          })
        }
      })
    }

    this.addedCompetency = Array.from(combinedMap.values())
    console.log('this.addedCompetency', this.addedCompetency)
  }
}
