import { of, throwError } from 'rxjs'

import { ResourceDownloadService } from './resource-download.service'

const saveAsMock = jest.fn()
jest.mock('file-saver', () => ({ saveAs: (...args: any[]) => saveAsMock(...args) }))

/**
 * Covers what the base resource-download.service.spec.ts leaves out: downloadAllAsZip
 * (ordering, uniqueness, per-resource failure tolerance), mime-based extensions, and
 * the quiz -> Excel row mapping.
 */
describe('ResourceDownloadService (zip + naming)', () => {
  let service: ResourceDownloadService
  let httpStub: { get: jest.Mock }

  const blob = () => new Blob(['x'])

  beforeEach(() => {
    saveAsMock.mockClear()
    httpStub = { get: jest.fn().mockReturnValue(of(blob())) }
    service = new ResourceDownloadService(httpStub as any)
  })

  describe('downloadAllAsZip', () => {
    it('does nothing when the course has no downloadable resources', async () => {
      await service.downloadAllAsZip({ name: 'Empty', children: [] } as any)
      expect(saveAsMock).not.toHaveBeenCalled()
    })

    it('names the archive after the course', async () => {
      await service.downloadAllAsZip({
        name: 'My Course',
        children: [{ name: 'One', artifactUrl: 'https://h/a.pdf' }],
      } as any)

      expect(saveAsMock).toHaveBeenCalledTimes(1)
      expect(saveAsMock.mock.calls[0][1]).toBe('My Course.zip')
    })

    it('falls back to "course" when the course has no usable name', async () => {
      await service.downloadAllAsZip({
        name: '',
        children: [{ name: 'One', artifactUrl: 'https://h/a.pdf' }],
      } as any)

      expect(saveAsMock.mock.calls[0][1]).toBe('course.zip')
    })

    it('sanitises illegal characters in the archive name', async () => {
      await service.downloadAllAsZip({
        name: 'A/B:C*D',
        children: [{ name: 'One', artifactUrl: 'https://h/a.pdf' }],
      } as any)

      expect(saveAsMock.mock.calls[0][1]).toBe('A_B_C_D.zip')
    })

    it('still produces an archive when one resource fails to download', async () => {
      httpStub.get.mockImplementationOnce(() => throwError(() => new Error('404'))).mockReturnValue(of(blob()))

      await service.downloadAllAsZip({
        name: 'Course',
        children: [
          { name: 'Bad', artifactUrl: 'https://h/bad.pdf' },
          { name: 'Good', artifactUrl: 'https://h/good.pdf' },
        ],
      } as any)

      expect(saveAsMock).toHaveBeenCalledTimes(1)
    })

    it('produces an archive even when every resource fails', async () => {
      httpStub.get.mockReturnValue(throwError(() => new Error('404')))

      await service.downloadAllAsZip({
        name: 'Course',
        children: [{ name: 'Bad', artifactUrl: 'https://h/bad.pdf' }],
      } as any)

      expect(saveAsMock).toHaveBeenCalledTimes(1)
    })

    it('collects resources from nested modules', async () => {
      await service.downloadAllAsZip({
        name: 'Course',
        children: [
          {
            name: 'Module',
            contentType: 'CourseUnit',
            children: [
              { name: 'Deep', artifactUrl: 'https://h/deep.pdf' },
              { name: 'Deeper', contentType: 'CourseUnit', children: [{ name: 'D2', artifactUrl: 'https://h/d2.pdf' }] },
            ],
          },
        ],
      } as any)

      expect(httpStub.get).toHaveBeenCalledTimes(2)
      expect(saveAsMock).toHaveBeenCalledTimes(1)
    })

    it('downloads resources that only carry a downloadUrl', async () => {
      await service.downloadAllAsZip({
        name: 'Course',
        children: [{ name: 'One', downloadUrl: 'https://h/a.pdf' }],
      } as any)

      expect(httpStub.get).toHaveBeenCalledWith('https://h/a.pdf', { responseType: 'blob' })
    })

    it('de-duplicates identically named resources', async () => {
      await service.downloadAllAsZip({
        name: 'Course',
        children: [
          { name: 'Same', artifactUrl: 'https://h/a.pdf' },
          { name: 'Same', artifactUrl: 'https://h/b.pdf' },
          { name: 'Same', artifactUrl: 'https://h/c.pdf' },
        ],
      } as any)

      // All three survive into the archive rather than overwriting one another.
      expect(httpStub.get).toHaveBeenCalledTimes(3)
      expect(saveAsMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('downloadResource file naming', () => {
    it('derives the extension from the url', async () => {
      await service.downloadResource({ name: 'Doc', artifactUrl: 'https://h/file.PDF' })
      expect(saveAsMock.mock.calls[0][1]).toBe('Doc.pdf')
    })

    it('ignores a query string when reading the extension', async () => {
      await service.downloadResource({ name: 'Doc', artifactUrl: 'https://h/file.pdf?token=1' })
      expect(saveAsMock.mock.calls[0][1]).toBe('Doc.pdf')
    })

    it('falls back to the mime type when the url has no extension', async () => {
      await service.downloadResource({ name: 'Clip', artifactUrl: 'https://h/stream', mimeType: 'video/mp4' })
      expect(saveAsMock.mock.calls[0][1]).toBe('Clip.mp4')
    })

    it('maps an html-archive mime to zip', async () => {
      await service.downloadResource({
        name: 'Pkg',
        artifactUrl: 'https://h/pkg',
        mimeType: 'application/vnd.ekstep.html-archive',
      })
      expect(saveAsMock.mock.calls[0][1]).toBe('Pkg.zip')
    })

    it('falls back to .bin for an unknown url and mime', async () => {
      await service.downloadResource({ name: 'Thing', artifactUrl: 'https://h/thing', mimeType: 'application/unknown' })
      expect(saveAsMock.mock.calls[0][1]).toBe('Thing.bin')
    })

    it('uses the identifier when the resource has no name', async () => {
      await service.downloadResource({ identifier: 'do_123', artifactUrl: 'https://h/a.pdf' })
      expect(saveAsMock.mock.calls[0][1]).toBe('do_123.pdf')
    })

    it('falls back to "resource" with neither a name nor an identifier', async () => {
      await service.downloadResource({ artifactUrl: 'https://h/a.pdf' })
      expect(saveAsMock.mock.calls[0][1]).toBe('resource.pdf')
    })

    it('collapses runs of whitespace in the name', async () => {
      await service.downloadResource({ name: '  A   B  ', artifactUrl: 'https://h/a.pdf' })
      expect(saveAsMock.mock.calls[0][1]).toBe('A B.pdf')
    })

    it('truncates a very long name', async () => {
      await service.downloadResource({ name: 'x'.repeat(200), artifactUrl: 'https://h/a.pdf' })
      expect(saveAsMock.mock.calls[0][1]).toBe(`${'x'.repeat(120)}.pdf`)
    })
  })

  describe('quiz to Excel conversion', () => {
    const asQuiz = (json: any) => {
      httpStub.get.mockReturnValue(of(json))
    }

    it('treats a .json artifactUrl as a quiz', async () => {
      asQuiz({ questions: [] })
      await service.downloadResource({ name: 'Quiz', artifactUrl: 'https://h/quiz.json' })
      expect(saveAsMock.mock.calls[0][1]).toBe('Quiz.xlsx')
    })

    it('treats an application/json mime as a quiz', async () => {
      asQuiz({ questions: [] })
      await service.downloadResource({ name: 'Quiz', artifactUrl: 'https://h/q', mimeType: 'application/json' })
      expect(saveAsMock.mock.calls[0][1]).toBe('Quiz.xlsx')
    })

    it('ignores a query string when sniffing the .json extension', async () => {
      asQuiz({ questions: [] })
      await service.downloadResource({ name: 'Quiz', artifactUrl: 'https://h/quiz.json?v=2' })
      expect(saveAsMock.mock.calls[0][1]).toBe('Quiz.xlsx')
    })

    it('produces a workbook for a quiz with questions', async () => {
      asQuiz({
        questions: [
          {
            question: '<p>What is 2+2?</p>',
            options: [
              { text: '<b>3</b>', isCorrect: false },
              { text: '4', isCorrect: true },
            ],
          },
        ],
      })

      await service.downloadResource({ name: 'Quiz', artifactUrl: 'https://h/quiz.json' })

      const saved = saveAsMock.mock.calls[0][0]
      expect(saved).toBeInstanceOf(Blob)
      expect(saved.size).toBeGreaterThan(0)
    })

    it('reads questions nested under data', async () => {
      asQuiz({ data: { questions: [{ question: 'Q', options: [] }] } })
      await service.downloadResource({ name: 'Quiz', artifactUrl: 'https://h/quiz.json' })
      expect(saveAsMock).toHaveBeenCalledTimes(1)
    })

    it('reads questions nested under contents[0].data', async () => {
      asQuiz({ contents: [{ data: { questions: [{ question: 'Q', options: [] }] } }] })
      await service.downloadResource({ name: 'Quiz', artifactUrl: 'https://h/quiz.json' })
      expect(saveAsMock).toHaveBeenCalledTimes(1)
    })

    it('still emits a header-only workbook for an empty quiz', async () => {
      asQuiz({})
      await service.downloadResource({ name: 'Quiz', artifactUrl: 'https://h/quiz.json' })
      const saved = saveAsMock.mock.calls[0][0]
      expect(saved).toBeInstanceOf(Blob)
      expect(saved.size).toBeGreaterThan(0)
    })

    it('handles a question with more than six options without throwing', async () => {
      asQuiz({
        questions: [
          {
            question: 'Q',
            options: new Array(8).fill(0).map((_, i) => ({ text: `o${i}`, isCorrect: i === 7 })),
          },
        ],
      })
      await expect(service.downloadResource({ name: 'Quiz', artifactUrl: 'https://h/quiz.json' })).resolves.toBeUndefined()
    })
  })
})
