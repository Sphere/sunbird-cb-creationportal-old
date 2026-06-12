import { of } from 'rxjs'

import { ResourceDownloadService } from './resource-download.service'

// Capture what gets handed to the browser "save" so we can assert file names.
const saveAsMock = jest.fn()
jest.mock('file-saver', () => ({ saveAs: (...args: any[]) => saveAsMock(...args) }))

describe('ResourceDownloadService', () => {
  let service: ResourceDownloadService
  let httpStub: { get: jest.Mock }

  beforeEach(() => {
    saveAsMock.mockClear()
    httpStub = { get: jest.fn() }
    service = new ResourceDownloadService(httpStub as any)
  })

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  describe('hasDownloadableResources', () => {
    it('returns false for a null/undefined course', () => {
      expect(service.hasDownloadableResources(null as any)).toBe(false)
      expect(service.hasDownloadableResources(undefined as any)).toBe(false)
    })

    it('returns false when the course has no children', () => {
      expect(service.hasDownloadableResources({ name: 'Empty' } as any)).toBe(false)
      expect(service.hasDownloadableResources({ name: 'Empty', children: [] } as any)).toBe(false)
    })

    it('returns false when no child has an artifactUrl or downloadUrl', () => {
      const course = { name: 'C', children: [{ name: 'r1' }, { name: 'r2' }] }
      expect(service.hasDownloadableResources(course as any)).toBe(false)
    })

    it('returns true when a child has an artifactUrl', () => {
      const course = { name: 'C', children: [{ name: 'r1', artifactUrl: 'http://x/a.pdf' }] }
      expect(service.hasDownloadableResources(course as any)).toBe(true)
    })

    it('returns true when a child only has a downloadUrl', () => {
      const course = { name: 'C', children: [{ name: 'r1', downloadUrl: 'http://x/a.pdf' }] }
      expect(service.hasDownloadableResources(course as any)).toBe(true)
    })

    it('walks nested children (module -> resource)', () => {
      const course = {
        name: 'C',
        children: [
          { name: 'Module 1', contentType: 'CourseUnit', children: [{ name: 'r', artifactUrl: 'http://x/a.mp4' }] },
        ],
      }
      expect(service.hasDownloadableResources(course as any)).toBe(true)
    })

    it('does not count a CourseUnit itself, even if it has an artifactUrl', () => {
      const course = {
        name: 'C',
        children: [{ name: 'Module 1', contentType: 'CourseUnit', artifactUrl: 'http://x/unit' }],
      }
      expect(service.hasDownloadableResources(course as any)).toBe(false)
    })
  })

  describe('downloadResource', () => {
    it('fetches a plain file and saves it with the resource name + extension from the URL', async () => {
      const blob = new Blob(['data'])
      httpStub.get.mockReturnValue(of(blob))

      await service.downloadResource({ name: 'My PDF', artifactUrl: 'http://x/file.pdf' } as any)

      expect(httpStub.get).toHaveBeenCalledWith('http://x/file.pdf', { responseType: 'blob' })
      expect(saveAsMock).toHaveBeenCalledTimes(1)
      expect(saveAsMock.mock.calls[0][1]).toBe('My PDF.pdf')
    })

    it('sanitizes illegal filename characters in the resource name', async () => {
      httpStub.get.mockReturnValue(of(new Blob(['x'])))

      await service.downloadResource({ name: 'a/b:c*?', artifactUrl: 'http://x/f.mp4' } as any)

      expect(saveAsMock.mock.calls[0][1]).toBe('a_b_c_.mp4')
    })

    it('converts a quiz (application/json) to an .xlsx file', async () => {
      const quizJson = {
        questions: [
          {
            question: '<p>What is 2+2?</p>',
            options: [
              { text: '3', isCorrect: false },
              { text: '4', isCorrect: true },
            ],
          },
        ],
      }
      httpStub.get.mockReturnValue(of(quizJson))

      await service.downloadResource({
        name: 'Quiz 1',
        mimeType: 'application/json',
        artifactUrl: 'http://x/quiz.json',
      } as any)

      expect(saveAsMock).toHaveBeenCalledTimes(1)
      expect(saveAsMock.mock.calls[0][1]).toBe('Quiz 1.xlsx')
      // quiz path fetches the JSON without a blob responseType
      expect(httpStub.get).toHaveBeenCalledWith('http://x/quiz.json')
    })
  })
})
