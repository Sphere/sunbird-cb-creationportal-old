/**
 * The AI Studio features, in one place.
 *
 * The id is the whole contract: it is the URL segment
 * (/author/my-content/ai-studio/contentStudio), the `?status=` value the
 * sidebar already uses, and the key the dashboard switches on. One list means a
 * new feature is added here and nowhere else — the ids used to be written out
 * again in the dashboard template, in the routing redirect and in my-content,
 * which is four copies free to drift apart.
 */
export interface AIStudioFeature {
  /** URL segment, ?status= value and dashboard key. */
  id: string
  /** What a person sees in the heading, the menu and the tabs. */
  label: string
  /**
   * SVG path data for the menu glyph.
   *
   * A path rather than an asset: it costs no request, takes `currentColor` so
   * it follows the active state by itself, and cannot 404.
   */
  icon: string
}

export const AI_STUDIO_FEATURES: AIStudioFeature[] = [
  {
    id: 'contentStudio',
    label: 'Content Creation',
    // A film camera — what this feature produces.
    icon: 'M23 7l-7 5 7 5V7z M14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z',
  },
  {
    id: 'assessment',
    label: 'Assessment Creation',
    // A checked box — a marked answer.
    icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
  },
  {
    id: 'reports',
    label: 'Reports',
    // Three bars — the figures.
    icon: 'M18 20V10 M12 20V4 M6 20v-6',
  },
]

/** The feature a bare or unknown path lands on. */
export const AI_STUDIO_DEFAULT_FEATURE = AI_STUDIO_FEATURES[0].id

/** Whether a string names a feature. Used to reject an unknown URL segment. */
export function isAIStudioFeature(id: string | null | undefined): boolean {
  return !!id && AI_STUDIO_FEATURES.some(f => f.id === id)
}
