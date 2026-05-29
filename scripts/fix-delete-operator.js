/**
 * Fixes TS2790: "The operand of a 'delete' operator must be optional"
 * Wraps delete expressions with (obj as any) cast so TS 4.x doesn't reject them.
 * Pattern: delete someObj.property  →  delete (someObj as any).property
 */
const fs = require('fs')
const path = require('path')

const TARGET_FILES = [
  'project/ws/author/src/lib/routing/modules/editor/routing/modules/collection/components/collection/module-creation/module-creation.component.ts',
  'project/ws/author/src/lib/routing/modules/editor/routing/modules/collection/components/course-collection/course-collection.component.ts',
  'project/ws/author/src/lib/routing/modules/editor/routing/modules/upload/components/file-upload/file-upload.component.ts',
  'project/ws/author/src/lib/routing/modules/editor/routing/modules/web-page/components/web-module-editor/web-module-editor.component.ts',
  'project/ws/author/src/lib/routing/modules/editor/services/editor-content.service.ts',
]

let fixed = 0
for (const relPath of TARGET_FILES) {
  const file = path.resolve(relPath)
  if (!fs.existsSync(file)) { console.log('Skip (not found):', relPath); continue }
  const c = fs.readFileSync(file, 'utf8')
  // Replace: delete obj.prop  with  delete (obj as any).prop
  // But don't double-wrap existing (x as any) casts
  const n = c.replace(/\bdelete\s+(?!\(.*as any\))(\w[\w.[\]'"]*)\b/g, (m, target) => {
    return `delete (${target} as any)`
  })
  if (n !== c) {
    fs.writeFileSync(file, n, 'utf8')
    fixed++
    console.log('Fixed:', relPath)
  }
}
console.log('Total:', fixed)
