// require('jest-preset-angular/ngcc-jest-processor');

const { pathsToModuleNameMapper } = require('ts-jest')
const { compilerOptions } = require('./tsconfig.json')

globalThis.ngJest = {
  skipNgcc: true,
  tsconfig: 'tsconfig.spec.json', // this is the project root tsconfig
}

/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  // Measure coverage across all three monorepo tiers (not just whatever a test
  // happens to import). Excludes generated/boilerplate files that aren't unit-testable.
  collectCoverageFrom: [
    'src/app/**/*.ts',
    'project/ws/**/*.ts',
    'library/ws-widget/**/*.ts',
    '!**/*.spec.ts',
    '!**/*.module.ts',
    '!**/*.d.ts',
    '!**/public-api.ts',
    '!**/index.ts',
    '!**/*.model.ts',
    '!**/environments/**',
    '!**/*.routing.ts',
    '!**/*-routing.module.ts',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/out-tsc/'],
  // Coverage ratchet: a floor set just below the current measured baseline so the
  // build fails if coverage regresses. Raise these numbers as new suites land —
  // never lower them. Current baseline (2026-07, SonarQube A-grade M1 service specs):
  // stmts 10.09 / br 8.61 / fn 3.68 / ln 9.58.
  coverageThreshold: {
    global: {
      statements: 10,
      branches: 8.6,
      functions: 3.6,
      lines: 9.5,
    },
  },
  moduleNameMapper: {
    // Auto-map every tsconfig path alias so new specs don't each need a hand-written
    // entry (this is why the suite had only ~12 specs). The curated bare-alias entries
    // below repeat after this spread and win on key collision (e.g. point package
    // roots at their public-api.ts instead of the folder).
    ...pathsToModuleNameMapper(compilerOptions.paths || {}, { prefix: '<rootDir>/' }),
    '^@ws-widget/utils$': '<rootDir>/library/ws-widget/utils',
    '^@ws/author/src/lib/modules/shared/components/delete-dialog/delete-dialog.component':
      '<rootDir>/project/ws/author/src/lib/modules/shared/components/delete-dialog/delete-dialog.component.ts',
    '^@ws-widget/utils/src/lib/services/configurations.service':
      '<rootDir>/library/ws-widget/utils/src/lib/services/configurations.service.ts',
    '^@ws/author/src/lib/services/notification.service':
      '<rootDir>/project/ws/author/src/lib/services/notification.service.ts',
    '^@ws/author/src/lib/services/init.service':
      '<rootDir>/project/ws/author/src/lib/services/init.service.ts',
    '^@ws/author/src/lib/modules/shared/services/access-control.service':
      '<rootDir>/project/ws/author/src/lib/modules/shared/services/access-control.service.ts',
    '^@ws/author/src/lib/constants/apiEndpoints':
      '<rootDir>/project/ws/author/src/lib/constants/apiEndpoints.ts',
    '^@ws/author/src/lib/constants/icons': '<rootDir>/project/ws/author/src/lib/constants/icons.ts',
    '^@ws/author/src/lib/constants/mimeType':
      '<rootDir>/project/ws/author/src/lib/constants/mimeType.ts',
    '^@ws/author/src/lib/modules/shared/services/condition-check.service':
      '<rootDir>/project/ws/author/src/lib/modules/shared/services/condition-check.service.ts',
    '^project/ws/author/src/lib/modules/shared/services/api.service':
      '<rootDir>/project/ws/author/src/lib/modules/shared/services/api.service.ts',
    '^@ws/author/src/lib/modules/shared/services/api.service':
      '<rootDir>/project/ws/author/src/lib/modules/shared/services/api.service.ts',
    '^@ws/author/src/lib/constants/constant':
      '<rootDir>/project/ws/author/src/lib/constants/constant.ts',
    '^@ws/author/src/lib/modules/shared/components/notification/notification.component':
      '<rootDir>/project/ws/author/src/lib/modules/shared/components/notification/notification.component.ts',
    '^@ws/author/src/lib/constants/notificationMessage':
      '<rootDir>/project/ws/author/src/lib/constants/notificationMessage.ts',
    '^@ws-widget/utils/src/public-api': '<rootDir>/library/ws-widget/utils/src/public-api.ts',
    '^@ws/author/src/lib/modules/shared/components/comments-dialog/comments-dialog.component':
      '<rootDir>/project/ws/author/src/lib/modules/shared/components/comments-dialog/comments-dialog.component.ts',
    '^@ws/author/src/lib/interface/content':
      '<rootDir>/project/ws/author/src/lib/interface/content.ts',
    '^@ws-widget/collection': '<rootDir>/library/ws-widget/collection/src/public-api.ts',
    '^@ws-widget/resolver': '<rootDir>/library/ws-widget/resolver/src/public-api.ts',
    '^@ws/author/src/lib/routing/modules/editor/services/editor.service':
      '<rootDir>/project/ws/author/src/lib/routing/modules/editor/services/editor.service.ts',
    '^@ws/app/src/lib/routes/search/apis/search-api.service':
      '<rootDir>/project/ws/app/src/lib/routes/search/apis/search-api.service.ts',
    '^@ws/app/src/lib/routes/search/services/search-serv.service':
      '<rootDir>/project/ws/app/src/lib/routes/search/services/search-serv.service.ts',
    '^@ws/author/src/lib/modules/shared/components/confirm-dialog/confirm-dialog.component':
      '<rootDir>/project/ws/author/src/lib/modules/shared/components/confirm-dialog/confirm-dialog.component.ts',
    '^@ws/author/src/lib/modules/shared/components/error-parser/error-parser.component':
      '<rootDir>/project/ws/author/src/lib/modules/shared/components/error-parser/error-parser.component.ts',
    '^@ws/author/src/lib/routing/modules/editor/services/editor-content.service':
      '<rootDir>/project/ws/author/src/lib/routing/modules/editor/services/editor-content.service.ts',
    '^@ws/author/src/lib/services/loader.service':
      '<rootDir>/project/ws/author/src/lib/services/loader.service.ts',
    '^@ws/author/src/lib/constants/upload':
      '<rootDir>/project/ws/author/src/lib/constants/upload.ts',
    '^project/ws/author/src/lib/routing/modules/editor/services/editor-content.service':
      '<rootDir>/project/ws/author/src/lib/routing/modules/editor/services/editor-content.service.ts',
    '^library/ws-widget/utils/src/lib/services/configurations.service':
      '<rootDir>/library/ws-widget/utils/src/lib/services/configurations.service.ts',
    '^@ws/author/src/lib/constants/depth-rule':
      '<rootDir>/project/ws/author/src/lib/constants/depth-rule.ts',
    '^@ws/author/src/lib/modules/shared/components/user-index-confirm/user-index-confirm.component':
      '<rootDir>/project/ws/author/src/lib/modules/shared/components/user-index-confirm/user-index-confirm.component.ts',
    '^@ws/author/src/lib/modules/shared/pipes/seconds-to-hour.pipe':
      '<rootDir>/project/ws/author/src/lib/modules/shared/pipes/seconds-to-hour.pipe.ts',
    '^@ws/author/src/lib/modules/shared/pipes/mime-type.pipe':
      '<rootDir>/project/ws/author/src/lib/modules/shared/pipes/mime-type.pipe.ts',

    '^@ws/author/src/lib/routing/modules/editor/shared/services/upload.service':
      '<rootDir>/project/ws/author/src/lib/routing/modules/editor/shared/services/upload.service.ts',

    '^@ws/author/src/lib/routing/modules/editor/routing/modules/quiz/constants/quiz-constants':
      '<rootDir>/project/ws/author/src/lib/routing/modules/editor/routing/modules/quiz/constants/quiz-constants.ts',
    '^@ws-widget/utils/src/lib/services/utility.service':
      '<rootDir>/library/ws-widget/utils/src/lib/services/utility.service.ts',

    '^@ws/author': '<rootDir>/project/ws/author/src/public-api.ts',
    '^project/ws/author/src/lib/routing/modules/editor/routing/modules/collection/services/resolver.service':
      '<rootDir>/project/ws/author/src/lib/routing/modules/editor/routing/modules/collection/services/resolver.service.ts',

    '^project/ws/author/src/lib/routing/modules/editor/shared/services/upload.service':
      '<rootDir>/project/ws/author/src/lib/routing/modules/editor/shared/services/upload.service.ts',

    '^project/ws/author/src/lib/services/loader.service':
      '<rootDir>/project/ws/author/src/lib/services/loader.service.ts',
    '^project/ws/viewer/src/lib/viewer-data.service':
      '<rootDir>/project/ws/viewer/src/lib/viewer-data.service.ts',
    // A couple of components import @angular packages via a hardcoded deep-relative
    // node_modules path (resolves at build time, but not through jest's resolver).
    // Redirect any such specifier back to the real package.
    '^.*/node_modules/@angular/router$': '@angular/router',
    // Baseurl-style absolute imports rooted at the app source (tsconfig baseUrl),
    // e.g. 'src/app/...'. Keep this last so the explicit aliases above win.
    '^src/(.*)$': '<rootDir>/src/$1',
  },
}
