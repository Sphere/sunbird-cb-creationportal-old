/**
 * Properly fix TS2790/TS2703 delete operator errors.
 * The correct pattern is: delete (firstObj as any).rest.of.path
 * Casting the FIRST identifier makes the whole chain `any`.
 */
const fs = require('fs')

const files = [
  'project/ws/author/src/lib/routing/modules/editor/services/editor-content.service.ts',
  'project/ws/author/src/lib/routing/modules/editor/routing/modules/collection/components/collection/module-creation/module-creation.component.ts',
  'project/ws/author/src/lib/routing/modules/editor/routing/modules/collection/components/course-collection/course-collection.component.ts',
  'project/ws/author/src/lib/routing/modules/editor/routing/modules/upload/components/file-upload/file-upload.component.ts',
  'project/ws/author/src/lib/routing/modules/editor/routing/modules/web-page/components/web-module-editor/web-module-editor.component.ts',
  'project/ws/author/src/lib/routing/modules/editor/routing/modules/collection/components/auth-toc/auth-toc.component.ts',
]

for (const file of files) {
  if (!fs.existsSync(file)) continue
  let c = fs.readFileSync(file, 'utf8')

  // First undo previous broken patterns:
  // delete (multipart.expr as any)  ->  undo: delete multipart.expr
  c = c.replace(/\bdelete \(([\w][\w.[\]'"]+) as any\)\s*\n/g, function(m, expr) {
    return 'delete ' + expr + '\n'
  })
  c = c.replace(/\bdelete \(([\w][\w.[\]'"]+) as any\)([\s;,\n])/g, function(m, expr, after) {
    return 'delete ' + expr + after
  })

  // Now properly fix: delete firstIdent.rest.of.chain  ->  delete (firstIdent as any).rest.of.chain
  // Also: delete firstIdent[key]  ->  delete (firstIdent as any)[key]
  c = c.replace(/\bdelete (?!\()([\w]+)(\.[\w.[\]'"]+)/g, function(m, first, rest) {
    return 'delete (' + first + ' as any)' + rest
  })
  c = c.replace(/\bdelete (?!\()([\w]+)(\[)/g, function(m, first, bracket) {
    return 'delete (' + first + ' as any)' + bracket
  })

  fs.writeFileSync(file, c, 'utf8')
  console.log('Fixed:', file)
}
