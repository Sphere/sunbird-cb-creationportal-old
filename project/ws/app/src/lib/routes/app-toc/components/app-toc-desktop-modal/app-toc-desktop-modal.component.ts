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
    const combinedMap = new Map<string, any>()
    // The entity list only enriches what is shown -- the competency code and the
    // names of its levels. It comes from a separate call that can fail or still be
    // in flight, so treat it as optional: it used to be dereferenced directly, and
    // a missing list threw out of ngOnInit and left the dialog blank.
    const proficiencyList: any[] = Array.isArray(data?.proficiencyList) ? data.proficiencyList : []
    const competencies = this.parseCompetencies(data?.competency?.competencies_v1)

    competencies.forEach((element: any) => {
      const matchingValue = proficiencyList.find((value: any) => String(value.entityId) === String(element.competencyId))
      const entityLevels: any[] = matchingValue?.levels || []
      let levels: string[] = []

      if (entityLevels.length > 0) {
        if (data.competency && data.competency.competency === true) {
          levels = entityLevels.map((desc: any) => `Level ${desc.levelNumber} - ${desc.levelName}`)
        } else {
          const levelMatch = entityLevels.find((desc: any) => String(desc.levelNumber) === String(element.level))
          if (levelMatch) {
            levels = [`Level ${levelMatch.levelNumber} - ${levelMatch.levelName}`]
          }
        }
      }

      // Without the entity list there is no level name, but the level number is on
      // the content itself, so show that rather than nothing.
      if (!levels.length && element.level !== undefined && element.level !== null && element.level !== '') {
        levels = [`Level ${element.level}`]
      }

      const existing = combinedMap.get(element.competencyId)
      if (existing) {
        existing.levels = Array.from(new Set([...existing.levels, ...levels]))
      } else {
        combinedMap.set(element.competencyId, {
          ...element,
          code: matchingValue?.code,
          name: matchingValue?.name || element.competencyName,
          levels,
        })
      }
    })

    this.addedCompetency = Array.from(combinedMap.values())
  }

  /**
   * competencies_v1 is a JSON string from the API but an array once written in
   * memory, and can be absent on a course that maps none.
   */
  private parseCompetencies(raw: any): any[] {
    try {
      if (!raw) {
        return []
      }
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      return Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      return []
    }
  }
}
