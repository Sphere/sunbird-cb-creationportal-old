/**
 * Fixes remaining @angular/material barrel imports that the v1 script missed
 */
const fs = require('fs')
const path = require('path')

const EXTRA_MAPPING = {
  MatBadgeModule: '@angular/material/badge',
  MatBadge: '@angular/material/badge',
  MatChipInputEvent: '@angular/material/chips',
  MatChipsModule: '@angular/material/chips',
  MatSelectChange: '@angular/material/select',
  MatAutocompleteSelectedEvent: '@angular/material/autocomplete',
  MAT_SNACK_BAR_DATA: '@angular/material/snack-bar',
  MatTableDataSource: '@angular/material/table',
  MatTabChangeEvent: '@angular/material/tabs',
  ThemePalette: '@angular/material/core',
  MatCalendarCellCssClasses: '@angular/material/datepicker',
  MatCalendar: '@angular/material/datepicker',
  PageEvent: '@angular/material/paginator',
  MatBottomSheetModule: '@angular/material/bottom-sheet',
  MatBottomSheet: '@angular/material/bottom-sheet',
  MatBadgePosition: '@angular/material/badge',
  MatBadgeSize: '@angular/material/badge',
  MatButtonToggleChange: '@angular/material/button-toggle',
  MatDialogActions: '@angular/material/dialog',
  MatDialogContent: '@angular/material/dialog',
  MatDialogTitle: '@angular/material/dialog',
  MatDatepickerInputEvent: '@angular/material/datepicker',
  MatExpansionPanelActionRow: '@angular/material/expansion',
}

function walk(dir) {
  const results = []
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat && stat.isDirectory()) {
      if (['node_modules', 'dist', '.git', 'out-tsc'].includes(file)) continue
      results.push(...walk(filePath))
    } else if (file.endsWith('.ts')) {
      results.push(filePath)
    }
  }
  return results
}

const BARREL_RE = /import\s*\{([^}]+)\}\s*from\s*'@angular\/material'\s*;?/g

let filesChanged = 0
const root = path.resolve(__dirname, '..')
const files = walk(root)

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8')
  if (!content.includes("from '@angular/material'") && !content.includes('from "@angular/material"')) continue

  let changed = false
  const newContent = content.replace(BARREL_RE, (match, symbolsRaw) => {
    const symbols = symbolsRaw.split(',').map(s => s.trim()).filter(Boolean)
    const byPath = {}
    const unmapped = []
    for (const sym of symbols) {
      const target = EXTRA_MAPPING[sym]
      if (target) {
        if (!byPath[target]) byPath[target] = []
        byPath[target].push(sym)
      } else {
        unmapped.push(sym)
      }
    }
    const lines = Object.entries(byPath).map(([pkg, syms]) =>
      `import { ${syms.join(', ')} } from '${pkg}'`
    )
    if (unmapped.length > 0) {
      lines.push(`import { ${unmapped.join(', ')} } from '@angular/material'`)
    }
    changed = true
    return lines.join('\n')
  })

  if (changed) {
    fs.writeFileSync(file, newContent, 'utf8')
    filesChanged++
    console.log(`Fixed: ${file.replace(root + path.sep, '')}`)
  }
}

console.log(`\nTotal files fixed: ${filesChanged}`)
