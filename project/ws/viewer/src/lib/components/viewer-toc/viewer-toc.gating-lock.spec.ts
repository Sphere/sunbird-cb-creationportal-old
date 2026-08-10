import * as fs from 'fs'
import * as path from 'path'

/**
 * ViewerTocComponent is heavy (editor/viewer services, NgZone, ChangeDetectorRef,
 * a mat-tree) so it is not rendered here. What kept breaking was structural, not
 * behavioural: the gating lock was nested inside per-mimeType blocks, so
 * assessments and quizzes never showed one, and once moved into .resource-meta it
 * lost the flex parent that margin-left:auto needs to position it. Both are
 * visible in the markup, so guard them there.
 */
describe('viewer-toc gating lock placement', () => {
  const dir = __dirname
  const template = fs.readFileSync(path.join(dir, 'viewer-toc.component.html'), 'utf8')
  const styles = fs.readFileSync(path.join(dir, 'viewer-toc.component.scss'), 'utf8')
  const lines = template.split('\n')

  const lineOf = (needle: string) => {
    const i = lines.findIndex(l => l.includes(needle))
    expect(i).toBeGreaterThan(-1)
    return i
  }
  const indentOf = (needle: string) => (lines[lineOf(needle)].match(/^\s*/) as RegExpMatchArray)[0].length

  it('renders the lock exactly once', () => {
    expect(template.split('cbp-assets/icons/lock.png').length - 1).toBe(1)
  })

  it('shows the lock on the course-level gating flag alone, with no mimeType condition', () => {
    expect(template).toContain('<div *ngIf="isGetingEnabled" class="align-rt progrss-box">')
  })

  it('keeps the lock a sibling of .resource-meta rather than a child of it', () => {
    expect(indentOf('*ngIf="isGetingEnabled"')).toBe(indentOf('class="resource-meta'))
  })

  it('places the lock after the row body so it trails the content', () => {
    expect(lineOf('*ngIf="isGetingEnabled"')).toBeGreaterThan(lineOf('*ngIf="content?.mimeType === \'application/json\'"'))
  })

  it('gives the lock a flex parent, which margin-left:auto needs to push it right', () => {
    expect(styles).toMatch(/\.resource-container\s*\{[^}]*display:\s*flex/)
    expect(styles).toMatch(/\.progrss-box\s*\{[^}]*margin-left:\s*auto/)
  })

  it('centres the lock, since the row itself aligns to flex-start', () => {
    expect(styles).toMatch(/\.progrss-box\s*\{[^}]*align-self:\s*center/)
  })
})
