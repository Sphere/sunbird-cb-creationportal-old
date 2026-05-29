/**
 * Comprehensive fix: ensures every import statement ending in from '...' or from "..."
 * is followed by at least one newline before the next non-whitespace content.
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
  // After: from 'anything' or from "anything" followed immediately by non-newline non-semicolon
  // Insert a newline
  // Pattern: the closing quote of the from path, then optional semicolon, then non-newline char
  let n = c.replace(/(from\s+['"][^'"]+['"];?)(\s*)([^\s\n])/g, (m, fromClause, spaces, nextChar) => {
    // If there's already a newline in spaces, keep it
    if (spaces.includes('\n')) return m
    // Otherwise insert newline
    return fromClause + '\n' + nextChar
  })
  if (n !== c) {
    fs.writeFileSync(file, n, 'utf8')
    fixed++
    console.log('Fixed:', file)
  }
}
console.log('Total:', fixed)
