/**
 * Add TextFieldModule from @angular/cdk/text-field to modules that use cdkTextareaAutosize
 */
const fs = require('fs')

const files = [
  'library/ws-widget/collection/src/lib/btn-content-feedback-v2/btn-content-feedback-v2.module.ts',
  'library/ws-widget/collection/src/lib/btn-mail-user/btn-mail-user.module.ts',
  'library/ws-widget/collection/src/lib/_common/email-input/email-input.module.ts',
  'library/ws-widget/collection/src/lib/_common/user-autocomplete/user-autocomplete.module.ts',
  // Author modules
  'project/ws/author/src/lib/modules/shared/shared.module.ts',
  'project/ws/author/src/lib/routing/modules/editor/shared/shared.module.ts',
  'project/ws/author/src/lib/routing/modules/editor/routing/modules/channel/channel.module.ts',
  // App modules
  'project/ws/app/src/lib/routes/app-toc/routes/app-toc-certification/app-toc-certification.module.ts',
]

for (const file of files) {
  if (!fs.existsSync(file)) continue
  const c = fs.readFileSync(file, 'utf8')
  if (c.includes('TextFieldModule')) continue // already imported

  // Add TextFieldModule import and to imports array
  let n = c
  // Add import statement after first @angular import
  n = n.replace(
    /import \{ CommonModule \} from '@angular\/common'/,
    "import { CommonModule } from '@angular/common'\nimport { TextFieldModule } from '@angular/cdk/text-field'"
  )
  // If CommonModule import not found, add after NgModule
  if (!n.includes('TextFieldModule')) {
    n = n.replace(
      /import \{ NgModule \} from '@angular\/core'/,
      "import { NgModule } from '@angular/core'\nimport { TextFieldModule } from '@angular/cdk/text-field'"
    )
  }
  // Add to imports array
  n = n.replace(/imports: \[(\s*CommonModule)/g, 'imports: [$1,\n    TextFieldModule')
  n = n.replace(/imports: \[\s*\n(\s+)BrowserModule/g, 'imports: [\n$1TextFieldModule,\n$1BrowserModule')

  if (n !== c) {
    fs.writeFileSync(file, n, 'utf8')
    console.log('Fixed:', file)
  }
}
