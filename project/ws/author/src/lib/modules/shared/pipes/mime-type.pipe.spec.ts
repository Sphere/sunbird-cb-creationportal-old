import { MimeTypePipe } from './mime-type.pipe'

describe('MimeTypePipe', () => {
  it('create an instance', () => {
    const pipe = new MimeTypePipe()
    expect(pipe).toBeTruthy()
  })

  it('labels a zip marked packageType html as HTML', () => {
    expect(new MimeTypePipe().transform('application/vnd.ekstep.html-archive', 'html')).toBe('HTML')
  })

  it('keeps the SCORM label for any other zip', () => {
    const pipe = new MimeTypePipe()
    expect(pipe.transform('application/vnd.ekstep.html-archive', '/index.html')).toBe('Scrom')
    expect(pipe.transform('application/vnd.ekstep.html-archive')).toBe('Scrom')
  })

  it('ignores the package type for other types', () => {
    const pipe = new MimeTypePipe()
    expect(pipe.transform('application/pdf', 'html')).toBe('PDF')
    expect(pipe.transform('text/unknown')).toBe('Unknown')
  })
})
