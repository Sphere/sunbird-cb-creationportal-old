/**
 * Fixes RxJS 7 breaking change: throwError(value) → throwError(() => value)
 * Only wraps direct values — skips already-wrapped factory functions.
 */
const fs = require('fs')
const path = require('path')

function walk(dir) {
  const r = []
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f)
    const s = fs.statSync(full)
    if (s.isDirectory()) {
      if (!['node_modules', 'dist', '.git', 'out-tsc'].includes(f)) r.push(...walk(full))
    } else if (f.endsWith('.ts') && !f.endsWith('.d.ts')) {
      r.push(full)
    }
  }
  return r
}

let fixed = 0
for (const file of walk('.')) {
  const c = fs.readFileSync(file, 'utf8')
  if (!c.includes('throwError(')) continue

  // Match throwError(expr) where expr is NOT already a function/arrow
  // Skip: throwError(() => ...) and throwError(function
  const n = c.replace(/throwError\((?!\s*(?:\(\s*\)|[^)]*=>\s*|\bfunction\s*\())([^)]+)\)/g, function(m, inner) {
    const trimmed = inner.trim()
    // Already wrapped check
    if (trimmed.startsWith('()') || trimmed.startsWith('function')) return m
    return 'throwError(() => ' + trimmed + ')'
  })

  if (n !== c) {
    fs.writeFileSync(file, n, 'utf8')
    fixed++
    console.log('Fixed:', file)
  }
}
console.log('Total:', fixed)
