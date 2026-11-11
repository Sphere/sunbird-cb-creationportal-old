import { IAiReview } from '../models/ai-review.model'
import { collectIssues } from './issues'

const review = {
  items: [
    {
      contentId: 'do_v',
      name: 'BP video',
      kind: 'video',
      status: 'done',
      result: {
        addie: {
          score: {
            areas: [
              {
                area: 'Content',
                items: [
                  { id: 'C2', text: 'Accurate', verdict: 'no', note: 'Wrong cuff', fix: 'Bare arm', atSec: 12 },
                  { id: 'C1', text: 'Current', verdict: 'yes', note: '' },
                ],
              },
            ],
          },
        },
        domain: {
          score: {
            areas: [{ area: 'Domain', items: [{ id: 'D2', text: 'Level fit', verdict: 'no', note: 'Below', fix: 'Add Level 4' }] }],
          },
          coverage: [
            { component: 'Identifies HRP', status: 'missing', evidence: 'Not shown' },
            { component: 'Fundal height', status: 'covered', evidence: 'At 1:44' },
            { component: 'Tape method', status: 'partial', evidence: 'Shown at 1:44' },
          ],
        },
        alignment: { verdict: 'off_topic', note: 'Nutrition only', fix: 'Move it' },
      },
    },
    {
      contentId: 'do_q',
      name: 'Quiz',
      kind: 'quiz',
      status: 'done',
      result: {
        addie: { error: 'Gemini timed out' },
        questions: [{ n: 3, question: 'Dose?', verdict: 'issue', issues: ['Key wrong', 'Two answers'], fix: 'Mark 4 g' }],
      },
    },
    { contentId: 'do_x', name: 'Broken', kind: 'pdf', status: 'failed', error: 'Could not download', result: null },
    { contentId: 'do_s', name: 'Link', kind: null, status: 'skipped', result: null },
  ],
} as unknown as IAiReview

describe('the issues to fix', () => {
  it('lists every finding to act on, from every review, and nothing that was met or left out', () => {
    const issues = collectIssues(review)
    expect(issues.map(x => [x.item.name, x.source, x.id || x.what, x.verdict])).toEqual([
      ['BP video', 'checklist', 'C2', 'Not met'],
      ['BP video', 'domain', 'D2', 'Not met'],
      ['BP video', 'coverage', 'Identifies HRP', 'Missing'],
      ['BP video', 'coverage', 'Tape method', 'Partial'],
      ['BP video', 'alignment', 'Fits the course name and description', 'Off topic for this course'],
      ['Quiz', 'question', 'Q3', 'Needs attention'],
      ['Quiz', 'failed', 'CBP checklist could not run', 'Could not be reviewed'],
      ['Broken', 'failed', 'This resource could not be reviewed', 'Could not be reviewed'],
    ])
  })

  it('lists a reviewed video with no sound as a "No sound" finding, first among its findings, with what to do', () => {
    const withSilent = {
      items: [
        ...review.items,
        {
          contentId: 'do_m',
          name: 'Silent demo',
          kind: 'video',
          status: 'done',
          result: { noSound: true, alignment: { verdict: 'partial', note: 'Half', fix: '' } },
        },
      ],
    } as unknown as IAiReview
    const silent = collectIssues(withSilent).filter(x => x.item.name === 'Silent demo')
    expect(silent.map(x => x.source)).toEqual(['noSound', 'alignment'])
    expect(silent[0]).toMatchObject({ verdict: 'No sound', tone: 'partial' })
    expect(silent[0].fix).toMatch(/add a voice-over/)
    expect(collectIssues(review).some(x => x.source === 'noSound')).toBe(false)
  })

  it('keeps where each one is, and the fix', () => {
    const [checklist, , , partial] = collectIssues(review)
    expect(checklist).toMatchObject({ finding: 'Wrong cuff', fix: 'Bare arm', place: { atSec: 12 } })
    expect(partial.place).toEqual({ at: '1:44', atSec: 104 })
  })
})

describe('findings the guard doubts', () => {
  it('carry the reason a person should check them, from every review', () => {
    const doubted = {
      items: [
        {
          contentId: 'do_v',
          name: 'BP video',
          kind: 'video',
          status: 'done',
          result: {
            addie: {
              score: {
                areas: [
                  {
                    area: 'Content',
                    items: [
                      {
                        id: 'C2',
                        text: 'Accurate',
                        verdict: 'no',
                        note: 'Wrong dose.',
                        borderline: true,
                        check: 'It calls the content wrong without naming the guideline it is wrong against.',
                      },
                    ],
                  },
                ],
              },
            },
            questions: [
              {
                n: 1,
                question: 'Dose?',
                verdict: 'issue',
                issues: ['The marked answer is wrong.'],
                borderline: true,
                check: 'It says the marked answer is wrong without naming the guideline or source.',
              },
            ],
          },
        },
      ],
    } as unknown as IAiReview
    const [c2, q1] = collectIssues(doubted)
    expect(c2).toMatchObject({
      id: 'C2',
      borderline: true,
      check: 'It calls the content wrong without naming the guideline it is wrong against.',
    })
    expect(q1).toMatchObject({
      id: 'Q1',
      borderline: true,
      check: 'It says the marked answer is wrong without naming the guideline or source.',
    })
  })
})
