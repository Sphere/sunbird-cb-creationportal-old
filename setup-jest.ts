import 'jest-preset-angular/setup-jest'

// jsdom does not implement the object-URL APIs. Some libraries (e.g. ngx-image-cropper,
// pulled in transitively via the utils public-api barrel) call URL.createObjectURL at
// module-load time, which otherwise throws and fails the whole suite. Polyfill as no-ops.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = jest.fn(() => 'blob:mock') as unknown as typeof URL.createObjectURL
  URL.revokeObjectURL = jest.fn() as unknown as typeof URL.revokeObjectURL
}
