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
  // Remove .ts extension from import paths
  const n = c.replace(/from '([^']+)\.ts'/g, "from '$1'")
  if (n !== c) {
    fs.writeFileSync(file, n, 'utf8')
    fixed++
    console.log('Fixed:', file)
  }
}
console.log('Total:', fixed)
