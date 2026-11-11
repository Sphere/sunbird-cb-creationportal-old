import { AI_REVIEW_HOME, AI_REVIEW_NEW, aiReviewCourse } from './routes'

describe('AI review addresses', () => {
  it('are plain nouns, with fixed words and ids never sharing a segment', () => {
    expect(AI_REVIEW_HOME).toBe('/author/ai-review')
    expect(AI_REVIEW_NEW).toBe('/author/ai-review/new')
    expect(aiReviewCourse('do_1')).toEqual(['/author/ai-review/courses', 'do_1'])
  })

  it('send the addresses used before to the new ones, keeping old links working', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path')
    const src = fs.readFileSync(path.join(__dirname, '../ai-review.module.ts'), 'utf8').replace(/\s+/g, ' ')
    expect(src).toContain("{ path: '', pathMatch: 'full', component: AiReviewHistoryPageComponent }")
    expect(src).toContain("{ path: 'new', component: AiReviewNewPageComponent }")
    expect(src).toContain("{ path: 'courses/:courseId', component: AiReviewCoursePageComponent }")
    expect(src).toContain("{ path: 'mine', redirectTo: '', pathMatch: 'full' }")
    expect(src).toContain("{ path: 'files', redirectTo: 'new', pathMatch: 'full' }")
    expect(src).toContain("{ path: ':courseId', redirectTo: 'courses/:courseId', pathMatch: 'full' }")
  })
})
