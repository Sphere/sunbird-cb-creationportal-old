/**
 * Angular Material 17: legacy-chips removed → migrate to MDC chips
 * MatLegacyChipsModule → MatChipsModule from @angular/material/chips
 * Templates: mat-chip-list → mat-chip-set (display) / mat-chip-listbox (selectable)
 */
const fs = require('fs')
const path = require('path')

function walk(dir, ext) {
  const r = []
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f)
    const s = fs.statSync(full)
    if (s.isDirectory()) {
      if (!['node_modules', 'dist', '.git', 'out-tsc'].includes(f)) r.push(...walk(full, ext))
    } else if (f.endsWith(ext)) r.push(full)
  }
  return r
}

let tsFixed = 0, htmlFixed = 0

// 1. Fix TS: MatLegacyChipsModule → MatChipsModule from @angular/material/chips
const tsFiles = ['library', 'project', 'src'].reduce((acc, d) => acc.concat(walk(d, '.ts')), [])

for (const file of tsFiles) {
  const c = fs.readFileSync(file, 'utf8')
  if (!c.includes('legacy-chips')) continue
  let n = c.replace(
    /import \{ MatLegacyChipsModule as MatChipsModule \} from '@angular\/material\/legacy-chips'/g,
    "import { MatChipsModule } from '@angular/material/chips'"
  )
  if (n !== c) { fs.writeFileSync(file, n, 'utf8'); tsFixed++ }
}
console.log('TS files fixed:', tsFixed)

// 2. Fix HTML templates: mat-chip-list → mat-chip-set (for non-input use)
// and mat-chip-list with formControlName/matChipInputFor → mat-chip-grid
const htmlFiles = ['library', 'project', 'src'].reduce((acc, d) => acc.concat(walk(d, '.html')), [])

for (const file of htmlFiles) {
  const c = fs.readFileSync(file, 'utf8')
  if (!c.includes('mat-chip-list') && !c.includes('<mat-chip>') && !c.includes('matChipInputFor')) continue

  let n = c
  // mat-chip-list with matChipInputFor (input chips) → mat-chip-grid
  if (n.includes('matChipInputFor')) {
    n = n.replace(/<mat-chip-list(\s[^>]*)?>/g, '<mat-chip-grid$1>')
    n = n.replace(/<\/mat-chip-list>/g, '</mat-chip-grid>')
    n = n.replace(/<mat-chip\s/g, '<mat-chip-row ')
    n = n.replace(/<\/mat-chip>/g, '</mat-chip-row>')
    n = n.replace(/\[matChipInputFor\]="([^"]+)"/g, '[matChipInputFor]="$1"')
  } else {
    // mat-chip-list for display/selection → mat-chip-set
    n = n.replace(/<mat-chip-list(\s[^>]*)?>/g, '<mat-chip-set$1>')
    n = n.replace(/<\/mat-chip-list>/g, '</mat-chip-set>')
  }
  // Remove deprecated [selectable] from mat-chip (already done but double-check)
  n = n.replace(/\s*\[selectable\]="[^"]*"/g, '')
  // Remove deprecated [removable] from mat-chip
  n = n.replace(/\s*\[removable\]="[^"]*"/g, '')

  if (n !== c) { fs.writeFileSync(file, n, 'utf8'); htmlFixed++; console.log('HTML fixed:', file) }
}
console.log('HTML files fixed:', htmlFixed)
