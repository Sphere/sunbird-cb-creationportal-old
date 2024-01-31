// require('jest-preset-angular/ngcc-jest-processor');

globalThis.ngJest = {
  skipNgcc: true,
  tsconfig: 'tsconfig.spec.json', // this is the project root tsconfig
}

/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  moduleNameMapper: {
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
  },
}
