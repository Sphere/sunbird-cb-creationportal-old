/**
 * The AI review's addresses, in one place.
 *
 *   /author/ai-review                      Past reviews: every review this account started
 *   /author/ai-review/new                  New review of the user's own files
 *   /author/ai-review/reports              Every review across everyone, and the spend (admins)
 *   /author/ai-review/courses/<courseId>   A course's review (set up, follow, report)
 *
 * `?review=<id>` opens a particular review on the last two. Fixed words and ids never share a
 * segment, so a new page can never be mistaken for a course id. The addresses used before
 * (/mine, /files, /<courseId>) redirect here, so old links and bookmarks keep working.
 */
export const AI_REVIEW_HOME = '/author/ai-review'
export const AI_REVIEW_NEW = '/author/ai-review/new'
/** AI review admins (AI_REVIEW_ADMIN): every review across everyone, who ran it, and what it cost. */
export const AI_REVIEW_REPORTS = '/author/ai-review/reports'

/** A course's review, as router commands. */
export const aiReviewCourse = (courseId: string): string[] => ['/author/ai-review/courses', courseId]
