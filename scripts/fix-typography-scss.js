const fs = require('fs')

// Fix mat-typography.scss
let c = fs.readFileSync('src/styles/mat-typography.scss', 'utf8')

// Replace old import with @use + keep ws-vars
c = c.replace("@import '~@angular/material/theming';", "@use '@angular/material' as mat;")
// mat-core
c = c.replace('@include mat-core();', '@include mat.core();')
// typography functions
c = c.replace(/mat-typography-config\(/g, 'mat.define-legacy-typography-config(')
c = c.replace(/mat-typography-level\(/g, 'mat.define-typography-level(')
c = c.replace(/@include angular-material-typography\(/g, '@include mat.all-legacy-component-typographies(')

fs.writeFileSync('src/styles/mat-typography.scss', c, 'utf8')
console.log('Fixed mat-typography.scss')

// Fix styles.scss - add space before ( in @media query
let s = fs.readFileSync('src/styles/styles.scss', 'utf8')
s = s.replace(/@media only screen and\(/g, '@media only screen and (')
fs.writeFileSync('src/styles/styles.scss', s, 'utf8')
console.log('Fixed styles.scss media query')
