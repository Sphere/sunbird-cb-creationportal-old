/**
 * Fix Angular Material 15 MDC breaking changes:
 * 1. MatChipsModule → MatLegacyChipsModule (mat-chip-list uses legacy API)
 * 2. matTextareaAutosize → cdkTextareaAutosize in templates
 * 3. Remove [selectable] from mat-chip (removed in MDC)
 * 4. MatInputModule autosize directives → CdkTextareaAutosize
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
    } else if (f.endsWith(ext)) {
      r.push(full)
    }
  }
  return r
}

let tsFixed = 0
let htmlFixed = 0

// 1. Fix TypeScript module files: MatChipsModule → MatLegacyChipsModule
const tsFiles = ['library', 'project', 'src'].reduce((acc, d) => acc.concat(walk(d, '.ts')), [])

for (const file of tsFiles) {
  const c = fs.readFileSync(file, 'utf8')
  if (!c.includes('MatChipsModule') && !c.includes('matTextareaAutosize') && !c.includes('CdkTextareaAutosize')) continue

  let n = c
  // Replace MatChipsModule import path
  n = n.replace(
    /import \{ MatChipsModule \} from '@angular\/material\/chips'/g,
    "import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips'"
  )
  // Handle cases where MatChipsModule is imported with other items from chips
  n = n.replace(
    /import \{ ([^}]*), MatChipsModule, ([^}]*) \} from '@angular\/material\/chips'/g,
    "import { $1, $2 } from '@angular/material/chips'\nimport { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips'"
  )
  n = n.replace(
    /import \{ MatChipsModule, ([^}]*) \} from '@angular\/material\/chips'/g,
    "import { $1 } from '@angular/material/chips'\nimport { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips'"
  )
  n = n.replace(
    /import \{ ([^}]*), MatChipsModule \} from '@angular\/material\/chips'/g,
    "import { $1 } from '@angular/material/chips'\nimport { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips'"
  )

  if (n !== c) {
    fs.writeFileSync(file, n, 'utf8')
    tsFixed++
  }
}

console.log('TypeScript files fixed:', tsFixed)

// 2. Fix HTML templates: matTextareaAutosize → cdkTextareaAutosize
const htmlFiles = ['library', 'project', 'src'].reduce((acc, d) => acc.concat(walk(d, '.html')), [])

for (const file of htmlFiles) {
  const c = fs.readFileSync(file, 'utf8')
  if (!c.includes('matTextareaAutosize') && !c.includes('matAutosizeMinRows') && !c.includes('matAutosizeMaxRows') && !c.includes('[selectable]')) continue

  let n = c
  // Replace autosize directives
  n = n.replace(/\[matTextareaAutosize\]/g, 'cdkTextareaAutosize')
  n = n.replace(/\[matTextareaAutosize\]="true"/g, 'cdkTextareaAutosize')
  n = n.replace(/\[matTextareaAutosize\]="[^"]*"/g, 'cdkTextareaAutosize')
  n = n.replace(/matTextareaAutosize/g, 'cdkTextareaAutosize')
  n = n.replace(/\[matAutosizeMinRows\]/g, '[cdkAutosizeMinRows]')
  n = n.replace(/matAutosizeMinRows/g, 'cdkAutosizeMinRows')
  n = n.replace(/\[matAutosizeMaxRows\]/g, '[cdkAutosizeMaxRows]')
  n = n.replace(/matAutosizeMaxRows/g, 'cdkAutosizeMaxRows')
  // Remove [selectable] from mat-chip (no longer supported in MDC)
  n = n.replace(/\[selectable\]="[^"]*"\s*/g, '')

  if (n !== c) {
    fs.writeFileSync(file, n, 'utf8')
    htmlFixed++
    console.log('HTML fixed:', file)
  }
}

console.log('HTML files fixed:', htmlFixed)
