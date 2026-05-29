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

  // Fix pattern: delete (obj[key as any)]  -> delete (obj as any)[key]
  // Note: broken bracket order is )] not ])
  c = c.replace(/delete \(([\w.]+)\[([^\]]+) as any\)\]/g, function(m, obj, key) {
    return 'delete (' + obj + ' as any)[' + key + ']'
  })

  // Fix pattern: delete (obj.prop as any).rest (double wrap from v2 script)
  c = c.replace(/delete \(([\w.]+) as any\)\.([\w]+)/g, function(m, obj, prop) {
    return 'delete (' + obj + ' as any).' + prop
  })

  // Any remaining non-wrapped: delete obj.prop -> delete (obj as any).prop
  c = c.replace(/\bdelete (?!\()([\w]+)\.([\w]+)/g, function(m, obj, prop) {
    return 'delete (' + obj + ' as any).' + prop
  })

  // Any remaining non-wrapped: delete obj[key] -> delete (obj as any)[key]
  c = c.replace(/\bdelete (?!\()([\w]+)\[([^\]]+)\]/g, function(m, obj, key) {
    return 'delete (' + obj + ' as any)[' + key + ']'
  })

  fs.writeFileSync(file, c, 'utf8')
  console.log('Fixed:', file)
}
