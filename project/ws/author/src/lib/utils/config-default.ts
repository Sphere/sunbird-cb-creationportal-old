/**
 * Safe access to the authoring form config (`authConfig`) defaults.
 *
 * The edit screens fill an emptied field from
 * `authConfig[field].defaultValue[contentType][0].value`. Several form controls
 * (cneName, trackContactsCtrl, publisherDetailsCtrl, activateLink, ...) have no
 * entry there, and some content types have no default for a field. The direct
 * lookup then threw, which aborted the whole save -- Course Settings showed
 * "Please Save Parent first and refresh page." on a fresh course until a reload
 * made the saved and form values match.
 */

/** Returned when the config has no default for the field and content type. */
export const NO_CONFIG_DEFAULT: unique symbol = Symbol('no-config-default')

/** A deep copy of the configured default, or {@link NO_CONFIG_DEFAULT}. */
export function configDefault(authConfig: unknown, field: string, contentType: string | undefined): unknown {
  const config = authConfig as Record<string, any> | null | undefined
  const entries = contentType ? config?.[field]?.defaultValue?.[contentType] : undefined
  const first = Array.isArray(entries) ? entries[0] : undefined
  if (!first || typeof first !== 'object' || !('value' in first)) {
    return NO_CONFIG_DEFAULT
  }
  return first.value === undefined ? undefined : JSON.parse(JSON.stringify(first.value))
}

/** True when the config declares the field as a boolean (false is then a real value). */
export function isBooleanConfigField(authConfig: unknown, field: string): boolean {
  return (authConfig as Record<string, any> | null | undefined)?.[field]?.type === 'boolean'
}

/** True when a saved value is meaningful, so clearing it in the form is a real change. */
export function hasSavedValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') {
    return false
  }
  return !(Array.isArray(value) && value.length === 0)
}

/**
 * The value to store for a field the user left empty: the configured default
 * when there is one; otherwise the empty value itself, but only when it clears
 * something that was saved. Returns {@link NO_CONFIG_DEFAULT} to leave the field
 * out, which is what happened once a reload made the form match the saved copy.
 */
export function emptiedFieldValue(
  authConfig: unknown,
  field: string,
  contentType: string | undefined,
  currentValue: unknown,
  savedValue: unknown,
): unknown {
  const fallback = configDefault(authConfig, field, contentType)
  if (fallback !== NO_CONFIG_DEFAULT) {
    return fallback
  }
  return hasSavedValue(savedValue) ? currentValue : NO_CONFIG_DEFAULT
}
