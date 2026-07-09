import { Component, OnInit, Inject } from '@angular/core'

import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'

import { FormControl } from '@angular/forms'

import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'

import { Router } from '@angular/router'

import { MatSnackBar } from '@angular/material/snack-bar'

import { NotificationComponent } from '@ws/author/src/lib/modules/shared/components/notification/notification.component'

import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

import { NOTIFICATION_TIME } from '@ws/author/src/lib/constants/constant'

import { LoaderService } from '@ws/author/src/lib/services/loader.service'

@Component({
  standalone: false,
  selector: 'ws-competency-popup',
  templateUrl: './competency-popup.component.html',
  styleUrls: ['./competency-popup.component.scss'],
})
export class CompetencyPopupComponent implements OnInit {
  proficiency: any
  proficiencyList: any
  competencyCtrl = new FormControl('')
  parentData: any
  levelList: any[] = [
    { selected: false, alreadyAdded: false, value: '1', name: 'Level 1' },
    { selected: false, alreadyAdded: false, value: '2', name: 'Level 2' },
    { selected: false, alreadyAdded: false, value: '3', name: 'Level 3' },
    { selected: false, alreadyAdded: false, value: '4', name: 'Level 4' },
    { selected: false, alreadyAdded: false, value: '5', name: 'Level 5' },
  ]
  hasOneChecked = false
  selectedSelfAssessment: any
  disableLevel = false
  searchComp: any = ''

  constructor(
    private loader: LoaderService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<CompetencyPopupComponent>,
    private editorService: EditorService,
    private router: Router,
    @Inject(MAT_DIALOG_DATA) data: any,
  ) {
    this.selectedSelfAssessment = data
  }

  displayCompetency = (option: any): string => {
    if (!option) {
      return ''
    }
    if (typeof option === 'string') {
      return option
    }
    return option.code ? `${option.code} - ${option.name}` : option.name || ''
  }

  ngOnInit() {
    if (this.selectedSelfAssessment === true) {
      this.disableLevel = true
    }
    const id = this.router.url.split('/')[3]
    this.editorService.readcontentV3(id).subscribe((res: any) => {
      this.parentData = res
      const lang = res?.lang || 'en'
      this.editorService.getAllEntities(lang).subscribe((entRes: any) => {
        this.proficiencyList = entRes.result.entity
        this.searchComp = this.proficiencyList
      })
    })

    this.competencyCtrl.valueChanges.subscribe((val: any) => {
      if (typeof val === 'string') {
        this.onKey(val)
      }
    })
  }

  // When user picks a competency from the dropdown: pre-populate levels that are already saved
  eventSelection(event: any) {
    this.proficiency = event
    // Reset all levels
    this.levelList.forEach(l => {
      l.selected = false
      l.alreadyAdded = false
    })
    this.hasOneChecked = false

    if (!this.disableLevel && this.parentData?.competencies_v1 && event?.id) {
      let existing: any[] = []
      try {
        const raw = this.parentData.competencies_v1
        // API returns a JSON string; after an in-memory write it may be an array already
        existing = typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : []
      } catch {
        existing = []
      }

      existing.forEach((comp: any) => {
        if (String(comp.competencyId) === String(event.entityId) && comp.level !== undefined) {
          const found = this.levelList.find(l => String(l.value) === String(comp.level))
          if (found) {
            found.selected = true
            found.alreadyAdded = true
            this.hasOneChecked = true
          }
        }
      })
    }
  }

  listSelection(levelList: any[], i: number, $event: any) {
    levelList[i].selected = $event.checked
    this.hasOneChecked = levelList.some(l => l.selected)
  }

  addCompetency(proficiency: any, _selectLevel: any, onclose: boolean) {
    if (!onclose) {
      this.dialogRef.close(false)
      return
    }

    // Gather currently selected levels from levelList directly (avoids null selectLevel bug)
    const selectedLevels = this.disableLevel ? [] : this.levelList.filter(l => l.selected)

    let arr1: string[] = this.parentData?.competencySearch ? [...this.parentData.competencySearch] : []
    let arr2: any[] = []
    try {
      const raw = this.parentData?.competencies_v1
      if (raw) {
        arr2 = typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : []
      }
    } catch {
      arr2 = []
    }

    // Remove all existing entries for this competency so we can re-add cleanly (no duplicates)
    const compIdStr = String(proficiency.entityId)
    arr1 = arr1.filter((id: string) => !String(id).startsWith(compIdStr + '-') && String(id) !== compIdStr)
    arr2 = arr2.filter((comp: any) => String(comp.competencyId) !== compIdStr)

    if (this.disableLevel) {
      arr2.push({
        competencyName: proficiency.name,
        competencyId: compIdStr,
      })
    } else {
      selectedLevels.forEach((item: any) => {
        arr1.push(compIdStr + '-' + item.value)
        arr2.push({
          competencyName: proficiency.name,
          competencyId: compIdStr,
          level: item.value,
        })
      })
    }

    const meta: any = {
      versionKey: this.parentData.versionKey,
      selfAssessment: this.disableLevel,
      competencySearch: arr1,
      competency: this.disableLevel,
      competencies_v1: arr2,
    }

    this.loader.changeLoad.next(true)
    this.editorService.updateNewContentV3({ request: { content: meta } }, this.parentData.identifier).subscribe(
      (response: any) => {
        if (response?.params?.status === 'successful') {
          this.dialogRef.close(true)
        } else {
          this.loader.changeLoad.next(false)
          this.snackBar.openFromComponent(NotificationComponent, {
            data: { type: Notify.FAIL },
            duration: NOTIFICATION_TIME * 1000,
          })
        }
      },
      () => {
        this.loader.changeLoad.next(false)
        this.snackBar.openFromComponent(NotificationComponent, {
          data: { type: Notify.FAIL },
          duration: NOTIFICATION_TIME * 1000,
        })
      },
    )
  }

  onKey(value: string) {
    this.proficiencyList = this.search(value)
  }

  search(value: string) {
    const filter = value.toLowerCase()
    if (!filter) {
      return this.searchComp
    }
    return this.searchComp.filter((option: any) => {
      const nameMatches = option.name.toLowerCase().includes(filter)
      const codeMatches = option.code ? option.code.toLowerCase().includes(filter) : false
      return nameMatches || codeMatches
    })
  }
}
