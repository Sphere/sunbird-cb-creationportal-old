const fs = require('fs')
const path = require('path')

const files = [
  'project/ws/author/src/lib/routing/modules/editor/routing/modules/curate/components/curate/curate.component.ts',
  'project/ws/author/src/lib/routing/modules/editor/routing/modules/upload/components/upload/upload.component.ts',
  'project/ws/author/src/lib/routing/modules/editor/routing/modules/web-page/components/web-module-editor/web-module-editor.component.ts',
]

for (const file of files) {
  if (!fs.existsSync(file)) continue
  let c = fs.readFileSync(file, 'utf8')
  // Replace pattern: const varName = expr || {} as any  ->  const varName: any = expr || {}
  c = c.replace(/const (\w+) = (.*) \|\| \{\} as any/g, function(m, v, expr) {
    return 'const ' + v + ': any = ' + expr + ' || {}'
  })
  // Also replace remaining: const x = ... || {}  patterns where x might be inferred as {}
  // Look for: const updatedContent = ... || {}  (no 'as any')
  c = c.replace(/const (updatedContent|updatedMeta) = (.*) \|\| \{\}\n/g, function(m, v, expr) {
    return 'const ' + v + ': any = ' + expr + ' || {}\n'
  })
  fs.writeFileSync(file, c, 'utf8')
  console.log('Fixed:', file)
}
