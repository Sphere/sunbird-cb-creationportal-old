const fs = require('fs')
const path = require('path')

function walk(dir) {
  const r = []
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f)
    const s = fs.statSync(full)
    if (s.isDirectory()) {
      if (!['node_modules', 'dist', '.git', 'out-tsc'].includes(f)) r.push(...walk(full))
    } else if (f.endsWith('.scss')) {
      r.push(full)
    }
  }
  return r
}

let fixed = 0
const dirs = ['src', 'library', 'project']
const allFiles = dirs.reduce((acc, d) => acc.concat(walk(d)), [])

for (const file of allFiles) {
  const c = fs.readFileSync(file, 'utf8')
  // Replace ~src/styles/ imports with bare names (src/styles is in angular.json includePaths)
  let n = c.replace(/@import '~src\/styles\/([^']+)'/g, "@import '$1'")
  n = n.replace(/@import "~src\/styles\/([^"]+)"/g, '@import "$1"')
  if (n !== c) {
    fs.writeFileSync(file, n, 'utf8')
    fixed++
    console.log('Fixed:', file)
  }
}
console.log('Total fixed:', fixed)
