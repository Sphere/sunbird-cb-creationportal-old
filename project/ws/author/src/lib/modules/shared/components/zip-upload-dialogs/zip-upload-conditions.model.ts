/**
 * The acceptance state behind the zip-upload guideline dialog.
 *
 * It is passed into the dialog components by reference and mutated in place by
 * their checkboxes, because both hosts read these flags off their own copy
 * after the dialog closes. Replacing the object instead of mutating it would
 * silently break that.
 */
export interface IZipUploadConditions {
  fileName: boolean
  eval: boolean
  externalReference: boolean
  iframe: boolean
  isSubmitPressed: boolean
  preview: boolean
  url: string
}
