const fs = require('fs')

let content = fs.readFileSync('angular.json', 'utf8')

const tslintLintBlock = /"lint"\s*:\s*\{\s*"builder"\s*:\s*"@angular-devkit\/build-angular:tslint"[\s\S]*?"exclude"[\s\S]*?\]\s*\}\s*\}/g

const eslintLintBlock = `"lint": {
          "builder": "@angular-eslint/builder:lint",
          "options": {
            "lintFilePatterns": ["src/**/*.ts", "src/**/*.html"]
          }
        }`

let count = 0
const result = content.replace(tslintLintBlock, () => { count++; return eslintLintBlock })
fs.writeFileSync('angular.json', result, 'utf8')
console.log(`Replaced ${count} tslint lint targets`)
