const fs = require('fs')
const path = require('path')

function walk(dir) {
  const r = []
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f)
    const s = fs.statSync(full)
    if (s.isDirectory()) {
      if (!['node_modules', 'dist', '.git', 'out-tsc'].includes(f)) r.push(...walk(full))
    } else if (f.endsWith('.ts')) {
      r.push(full)
    }
  }
  return r
}

let fixed = 0
for (const file of walk('.')) {
  const c = fs.readFileSync(file, 'utf8')
  // Fix double-quoted imports followed by @ without newline
  let n = c.replace(/(from "[^"]+")([@])/g, '$1\n$2')
  // Fix any import ending (single or double quote) followed directly by export/class/const/@
  n = n.replace(/(from ['"][^'"]+['"])([^'\n;])/g, (m, p1, p2) => {
    if (p2 === ';') return m
    return p1 + '\n' + p2
  })
  if (n !== c) {
    fs.writeFileSync(file, n, 'utf8')
    fixed++
    console.log('Fixed:', file)
  }
}
console.log('Total:', fixed)
