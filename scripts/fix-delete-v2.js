const fs = require('fs')

const files = [
  'project/ws/author/src/lib/routing/modules/editor/services/editor-content.service.ts',
  'project/ws/author/src/lib/routing/modules/editor/routing/modules/collection/components/collection/module-creation/module-creation.component.ts',
  'project/ws/author/src/lib/routing/modules/editor/routing/modules/collection/components/course-collection/course-collection.component.ts',
  'project/ws/author/src/lib/routing/modules/editor/routing/modules/upload/components/file-upload/file-upload.component.ts',
  'project/ws/author/src/lib/routing/modules/editor/routing/modules/web-page/components/web-module-editor/web-module-editor.component.ts',
]

for (const file of files) {
  if (!fs.existsSync(file)) continue
  let c = fs.readFileSync(file, 'utf8')

  // Fix broken: delete (obj[key as any)]  ->  delete (obj as any)[key]
  c = c.replace(/delete \((\w[\w.]*)\[([^\]]+) as any\]\)/g, function(m, obj, key) {
    return 'delete (' + obj + ' as any)[' + key + ']'
  })

  // Undo any remaining (x as any)] bracket mismatches from previous script
  c = c.replace(/\(([^)]+) as any\]\)/g, function(m, inner) {
    return '(' + inner + ' as any)'
  })

  // Now apply clean delete fix for property access: delete obj.prop
  c = c.replace(/\bdelete (?!\()(\w+)\.(\w+)/g, function(m, obj, prop) {
    return 'delete (' + obj + ' as any).' + prop
  })

  // Clean delete fix for bracket access: delete obj[key]
  c = c.replace(/\bdelete (?!\()(\w+)\[([^\]]+)\]/g, function(m, obj, key) {
    return 'delete (' + obj + ' as any)[' + key + ']'
  })

  fs.writeFileSync(file, c, 'utf8')
  console.log('Fixed:', file)
}
