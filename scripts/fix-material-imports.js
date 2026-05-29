/**
 * Fixes @angular/material barrel imports → individual paths
 * Run: node scripts/fix-material-imports.js
 */
const fs = require('fs')
const path = require('path')

const MAPPING = {
  MatAutocompleteModule: '@angular/material/autocomplete',
  MatAutocompleteTrigger: '@angular/material/autocomplete',
  MatAutocomplete: '@angular/material/autocomplete',
  MatButtonModule: '@angular/material/button',
  MatButton: '@angular/material/button',
  MatButtonToggleModule: '@angular/material/button-toggle',
  MatButtonToggleGroup: '@angular/material/button-toggle',
  MatButtonToggle: '@angular/material/button-toggle',
  MatCardModule: '@angular/material/card',
  MatCard: '@angular/material/card',
  MatCheckboxModule: '@angular/material/checkbox',
  MatCheckbox: '@angular/material/checkbox',
  MatChipsModule: '@angular/material/chips',
  MatChip: '@angular/material/chips',
  MatChipList: '@angular/material/chips',
  MatChipInput: '@angular/material/chips',
  MatNativeDateModule: '@angular/material/core',
  MatRippleModule: '@angular/material/core',
  MatRipple: '@angular/material/core',
  MatOptionModule: '@angular/material/core',
  MatOption: '@angular/material/core',
  MatPseudoCheckboxModule: '@angular/material/core',
  DateAdapter: '@angular/material/core',
  MAT_DATE_LOCALE: '@angular/material/core',
  MAT_DATE_FORMATS: '@angular/material/core',
  MatDatepickerModule: '@angular/material/datepicker',
  MatDatepicker: '@angular/material/datepicker',
  MatDatepickerInput: '@angular/material/datepicker',
  MatDatepickerToggle: '@angular/material/datepicker',
  MatDialogModule: '@angular/material/dialog',
  MatDialog: '@angular/material/dialog',
  MatDialogRef: '@angular/material/dialog',
  MAT_DIALOG_DATA: '@angular/material/dialog',
  MatDialogConfig: '@angular/material/dialog',
  MatDividerModule: '@angular/material/divider',
  MatDivider: '@angular/material/divider',
  MatExpansionModule: '@angular/material/expansion',
  MatExpansionPanel: '@angular/material/expansion',
  MatExpansionPanelHeader: '@angular/material/expansion',
  MatFormFieldModule: '@angular/material/form-field',
  MatFormField: '@angular/material/form-field',
  MatFormFieldControl: '@angular/material/form-field',
  MatError: '@angular/material/form-field',
  MatHint: '@angular/material/form-field',
  MatLabel: '@angular/material/form-field',
  MatPrefix: '@angular/material/form-field',
  MatSuffix: '@angular/material/form-field',
  MatGridListModule: '@angular/material/grid-list',
  MatGridList: '@angular/material/grid-list',
  MatGridTile: '@angular/material/grid-list',
  MatIconModule: '@angular/material/icon',
  MatIcon: '@angular/material/icon',
  MatIconRegistry: '@angular/material/icon',
  MatInputModule: '@angular/material/input',
  MatInput: '@angular/material/input',
  MatListModule: '@angular/material/list',
  MatList: '@angular/material/list',
  MatListItem: '@angular/material/list',
  MatSelectionList: '@angular/material/list',
  MatListOption: '@angular/material/list',
  MatNavList: '@angular/material/list',
  MatMenuModule: '@angular/material/menu',
  MatMenu: '@angular/material/menu',
  MatMenuTrigger: '@angular/material/menu',
  MatMenuItem: '@angular/material/menu',
  MatPaginatorModule: '@angular/material/paginator',
  MatPaginator: '@angular/material/paginator',
  MatProgressBarModule: '@angular/material/progress-bar',
  MatProgressBar: '@angular/material/progress-bar',
  MatProgressSpinnerModule: '@angular/material/progress-spinner',
  MatProgressSpinner: '@angular/material/progress-spinner',
  MatSpinner: '@angular/material/progress-spinner',
  MAT_PROGRESS_SPINNER_DEFAULT_OPTIONS: '@angular/material/progress-spinner',
  MatRadioModule: '@angular/material/radio',
  MatRadioGroup: '@angular/material/radio',
  MatRadioButton: '@angular/material/radio',
  MatSelectModule: '@angular/material/select',
  MatSelect: '@angular/material/select',
  MatSidenavModule: '@angular/material/sidenav',
  MatSidenav: '@angular/material/sidenav',
  MatSidenavContainer: '@angular/material/sidenav',
  MatSidenavContent: '@angular/material/sidenav',
  MatDrawer: '@angular/material/sidenav',
  MatSliderModule: '@angular/material/slider',
  MatSlider: '@angular/material/slider',
  MatSlideToggleModule: '@angular/material/slide-toggle',
  MatSlideToggle: '@angular/material/slide-toggle',
  MatSnackBarModule: '@angular/material/snack-bar',
  MatSnackBar: '@angular/material/snack-bar',
  MAT_SNACK_BAR_DEFAULT_OPTIONS: '@angular/material/snack-bar',
  MatSnackBarRef: '@angular/material/snack-bar',
  MatSnackBarConfig: '@angular/material/snack-bar',
  MatSortModule: '@angular/material/sort',
  MatSort: '@angular/material/sort',
  MatSortHeader: '@angular/material/sort',
  MatStepperModule: '@angular/material/stepper',
  MatStepper: '@angular/material/stepper',
  MatStep: '@angular/material/stepper',
  MatStepLabel: '@angular/material/stepper',
  MatHorizontalStepper: '@angular/material/stepper',
  MatVerticalStepper: '@angular/material/stepper',
  MatTableModule: '@angular/material/table',
  MatTable: '@angular/material/table',
  MatHeaderCell: '@angular/material/table',
  MatCell: '@angular/material/table',
  MatColumnDef: '@angular/material/table',
  MatHeaderRow: '@angular/material/table',
  MatRow: '@angular/material/table',
  MatTabsModule: '@angular/material/tabs',
  MatTabGroup: '@angular/material/tabs',
  MatTab: '@angular/material/tabs',
  MatTabLabel: '@angular/material/tabs',
  MatTabContent: '@angular/material/tabs',
  MatToolbarModule: '@angular/material/toolbar',
  MatToolbar: '@angular/material/toolbar',
  MatToolbarRow: '@angular/material/toolbar',
  MatTooltipModule: '@angular/material/tooltip',
  MatTooltip: '@angular/material/tooltip',
  MAT_TOOLTIP_DEFAULT_OPTIONS: '@angular/material/tooltip',
  MatTreeModule: '@angular/material/tree',
  MatTree: '@angular/material/tree',
  MatTreeNode: '@angular/material/tree',
  MatTreeFlatDataSource: '@angular/material/tree',
  MatTreeFlattener: '@angular/material/tree',
  MatTreeNestedDataSource: '@angular/material/tree',
  FlatTreeControl: '@angular/material/tree',
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
  if (!content.includes("from '@angular/material'")) continue

  let changed = false
  const newContent = content.replace(BARREL_RE, (match, symbolsRaw) => {
    const symbols = symbolsRaw.split(',').map(s => s.trim()).filter(Boolean)
    // Group by target path
    const byPath = {}
    const unmapped = []
    for (const sym of symbols) {
      const target = MAPPING[sym]
      if (target) {
        if (!byPath[target]) byPath[target] = []
        byPath[target].push(sym)
      } else {
        unmapped.push(sym)
        console.warn(`  [WARN] No mapping for: ${sym} in ${file}`)
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
