const instances: any[] = []

jest.mock('jsplumb', () => ({
  jsPlumb: {
    getInstance: jest.fn(() => instances[instances.length - 1]),
  },
}))

import { jsPlumb } from 'jsplumb'
import { QuestionComponent } from './question.component'

describe('QuestionComponent', () => {
  let component: QuestionComponent
  let domSanitizer: any
  let elementRef: any
  let host: HTMLDivElement
  let logSpy: jest.SpyInstance
  let alertSpy: jest.SpyInstance

  /** A jsPlumb instance double that records the handlers bound to it. */
  const makePlumb = () => {
    const bound: Record<string, (...a: any[]) => void> = {}
    return {
      bound,
      bind: jest.fn((name: string, cb: any) => {
        bound[name] = cb
      }),
      getSelector: jest.fn((sel: string) => Array.from(host.querySelectorAll(sel))),
      batch: jest.fn((fn: () => void) => fn()),
      makeSource: jest.fn(),
      makeTarget: jest.fn(),
      getAllConnections: jest.fn().mockReturnValue([]),
      deleteEveryConnection: jest.fn(),
      repaintEverything: jest.fn(),
      connect: jest.fn(),
    }
  }

  let plumb: ReturnType<typeof makePlumb>

  const fitbQuestion = () => ({
    multiSelection: false,
    questionType: 'fitb',
    question: 'A <input> and a <input>',
    questionId: 'q1',
    options: [
      { optionId: 'o1', text: 'apple', isCorrect: true },
      { optionId: 'o2', text: 'banana', isCorrect: true },
    ],
  })

  const mtfQuestion = () => ({
    multiSelection: false,
    questionType: 'mtf',
    question: 'Match these',
    questionId: 'q2',
    options: [
      { optionId: 'o1', text: 'One', match: 'Uno', isCorrect: true, hint: 'first' },
      { optionId: 'o2', text: 'Two', match: 'Dos', isCorrect: true },
    ],
  })

  /** Render the two fitb inputs the component expects to find in the DOM. */
  const renderBlanks = (questionId = 'q1', count = 2) => {
    host.innerHTML = ''
    for (let i = 0; i < count; i += 1) {
      const input = document.createElement('input')
      input.id = `${questionId}${i}`
      host.appendChild(input)
    }
  }

  const blank = (id: string) => document.getElementById(id) as HTMLInputElement

  beforeEach(() => {
    instances.length = 0
    plumb = makePlumb()
    instances.push(plumb)

    host = document.createElement('div')
    document.body.appendChild(host)

    domSanitizer = { bypassSecurityTrustHtml: jest.fn((h: string) => `safe:${h}`) }
    elementRef = { nativeElement: host }
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined)

    component = new QuestionComponent(domSanitizer, elementRef)
  })

  afterEach(() => {
    document.body.removeChild(host)
    logSpy.mockRestore()
    alertSpy.mockRestore()
    jest.clearAllMocks()
  })

  it('should be created with sane defaults', () => {
    expect(component).toBeTruthy()
    expect(component.title).toBe('match')
    expect(component.viewState).toBe('initial')
    expect(component.correctOption).toEqual([])
    expect(component.numConnections).toBe(0)
  })

  describe('ngOnInit', () => {
    it('leaves a plain multiple-choice question untouched', () => {
      component.question = { ...mtfQuestion(), questionType: 'mcq' } as any
      component.ngOnInit()

      expect(component.safeQuestion).toBe('')
      expect(component.correctOption).toEqual([])
    })

    it('rewrites fitb placeholders into identified inputs', () => {
      component.question = fitbQuestion() as any
      component.ngOnInit()

      expect(component.question.question).toContain('id="q10"')
      expect(component.question.question).toContain('id="q11"')
      expect(component.question.question).not.toContain('idMarkerForReplacement')
      expect(component.correctOption).toEqual([false, false])
      expect(component.unTouchedBlank).toEqual([true, true])
      expect(domSanitizer.bypassSecurityTrustHtml).toHaveBeenCalled()
      expect(component.safeQuestion).toBe(`safe:${component.question.question}`)
    })

    it('shuffles the mtf answers while keeping the same set', () => {
      component.question = mtfQuestion() as any
      component.ngOnInit()

      const shown = component.question.options.map(o => o.matchForView).sort()
      expect(shown).toEqual(['Dos', 'Uno'])
    })

    it('collects only the mtf options that carry a hint', () => {
      component.question = mtfQuestion() as any
      component.ngOnInit()

      expect(component.matchHintDisplay.map(o => o.optionId)).toEqual(['o1'])
    })
  })

  describe('ngAfterViewInit', () => {
    it('does nothing for a question type that needs no wiring', () => {
      component.question = { ...mtfQuestion(), questionType: 'mcq' } as any
      component.ngAfterViewInit()

      expect(jsPlumb.getInstance).not.toHaveBeenCalled()
    })

    it('builds the jsPlumb instance and makes the sources and targets', () => {
      component.question = mtfQuestion() as any
      component.ngAfterViewInit()

      expect(jsPlumb.getInstance).toHaveBeenCalled()
      expect(component.jsPlumbInstance).toBe(plumb)
      expect(plumb.getSelector).toHaveBeenCalledWith('.questionq2')
      expect(plumb.getSelector).toHaveBeenCalledWith('.answerq2')
      expect(plumb.makeSource).toHaveBeenCalled()
      expect(plumb.makeTarget).toHaveBeenCalled()
      expect(plumb.batch).toHaveBeenCalled()
    })

    it('emits the connection list when a connection is made', () => {
      const spy = jest.fn()
      component.itemSelected.subscribe(spy)
      component.question = mtfQuestion() as any
      component.ngAfterViewInit()
      plumb.getAllConnections.mockReturnValue([{ id: 'c1' }])

      plumb.bound.connection({}, {})

      expect(spy).toHaveBeenCalledWith([{ id: 'c1' }])
    })

    it('clears the borders when a connection is detached', () => {
      const source = document.createElement('div')
      source.id = 'src'
      const target = document.createElement('div')
      target.id = 'tgt'
      host.append(source, target)
      component.question = mtfQuestion() as any
      component.ngAfterViewInit()
      const conn = { setPaintStyle: jest.fn() }
      plumb.getAllConnections.mockReturnValue([conn])

      plumb.bound.connectionDetached({ sourceId: 'src', targetId: 'tgt' }, {})

      expect(conn.setPaintStyle).toHaveBeenCalledWith({ stroke: 'rgba(0,0,0,0.5)' })
    })

    it('resets the borders of every endpoint a moved connection touched', () => {
      const setSpy = jest.spyOn(component, 'setBorderColorById')
      component.question = mtfQuestion() as any
      component.ngAfterViewInit()

      plumb.bound.connectionMoved({ originalSourceId: 'a', newSourceId: 'b', originalTargetId: 'c' }, {})

      expect(setSpy).toHaveBeenCalledWith('a', '')
      expect(setSpy).toHaveBeenCalledWith('b', '')
      expect(setSpy).toHaveBeenCalledWith('c', '')
    })

    it('binds a change listener to every fitb blank', () => {
      component.question = fitbQuestion() as any
      component.ngOnInit()
      renderBlanks()
      const onChange = jest.spyOn(component, 'onChange')

      component.ngAfterViewInit()
      blank('q10').value = 'apple'
      blank('q11').value = 'banana'
      blank('q10').dispatchEvent(new Event('change'))

      expect(onChange).toHaveBeenCalledWith('q10', expect.anything())
    })
  })

  describe('numConnections', () => {
    it('counts the live jsPlumb connections', () => {
      component.jsPlumbInstance = plumb
      plumb.getAllConnections.mockReturnValue([{}, {}, {}])

      expect(component.numConnections).toBe(3)
    })
  })

  describe('fill-in-the-blank answering', () => {
    beforeEach(() => {
      component.question = fitbQuestion() as any
      component.ngOnInit()
      renderBlanks()
    })

    it('emits the joined blank values', () => {
      const spy = jest.fn()
      component.itemSelected.subscribe(spy)
      blank('q10').value = ' apple '
      blank('q11').value = 'pear'

      component.onEntryInBlank('q10')

      expect(spy).toHaveBeenCalledWith('apple,pear')
    })

    it('marks a matching blank correct and touched', () => {
      blank('q10').value = 'Apple'

      component.ifFillInTheBlankCorrect('q10')

      expect(component.correctOption[0]).toBe(true)
      expect(component.unTouchedBlank[0]).toBe(false)
    })

    it('marks a mismatching blank incorrect', () => {
      blank('q11').value = 'grape'

      component.ifFillInTheBlankCorrect('q11')

      expect(component.correctOption[1]).toBe(false)
      expect(component.unTouchedBlank[1]).toBe(false)
    })

    it('treats an empty blank as untouched', () => {
      blank('q10').value = ''

      component.ifFillInTheBlankCorrect('q10')

      expect(component.unTouchedBlank[0]).toBe(true)
    })

    it('routes a change event through to the blank evaluation', () => {
      const spy = jest.spyOn(component, 'onEntryInBlank')
      blank('q10').value = 'apple'

      component.onChange('q10', new Event('change'))

      expect(spy).toHaveBeenCalledWith('q10')
    })

    it('paints a correct blank green', () => {
      component.correctOption = [true, true]
      component.unTouchedBlank = [false, false]

      component.functionChangeBlankBorder()

      expect(blank('q10').getAttribute('style')).toContain('#357a38')
    })

    it('paints an incorrect blank red', () => {
      component.correctOption = [false, false]
      component.unTouchedBlank = [false, false]

      component.functionChangeBlankBorder()

      expect(blank('q10').getAttribute('style')).toContain('#f44336')
    })

    it('leaves an untouched blank unpainted', () => {
      component.correctOption = [false, false]
      component.unTouchedBlank = [true, true]

      component.functionChangeBlankBorder()

      expect(blank('q10').getAttribute('style')).not.toContain('border-color')
    })

    it('does not repaint blanks for a non-fitb question', () => {
      component.question = { ...mtfQuestion() } as any

      expect(() => component.functionChangeBlankBorder()).not.toThrow()
    })

    it('resets every blank border', () => {
      blank('q10').setAttribute('style', 'border-color: #f44336')

      component.resetBlankBorder()

      expect(blank('q10').getAttribute('style')).not.toContain('#f44336')
    })

    it('reset clears the blank borders', () => {
      const spy = jest.spyOn(component, 'resetBlankBorder')
      component.reset()

      expect(spy).toHaveBeenCalled()
    })
  })

  describe('option selection', () => {
    it('reports an option as selected when it is in the list', () => {
      component.itemSelectedList = ['o1']

      expect(component.isSelected({ optionId: 'o1' } as any)).toBe(true)
      expect(component.isSelected({ optionId: 'o2' } as any)).toBe(false)
    })

    it('reports nothing selected without a list', () => {
      component.itemSelectedList = null as any

      expect(component.isSelected({ optionId: 'o1' } as any)).toBeFalsy()
    })
  })

  describe('marking questions', () => {
    beforeEach(() => {
      component.question = mtfQuestion() as any
    })

    it('marks an unmarked question', () => {
      component.markQuestion()

      expect(component.isQuestionMarked()).toBe(true)
    })

    it('unmarks an already marked question', () => {
      component.markQuestion()
      component.markQuestion()

      expect(component.isQuestionMarked()).toBe(false)
    })
  })

  describe('border colouring', () => {
    it('sets the border colour of an element by id', () => {
      const el = document.createElement('div')
      el.id = 'node1'
      host.appendChild(el)

      component.setBorderColorById('node1', 'red')

      expect(el.style.borderColor).toBe('red')
    })

    it('ignores a missing element or an empty colour', () => {
      const el = document.createElement('div')
      el.id = 'node2'
      el.style.borderColor = 'blue'
      host.appendChild(el)

      component.setBorderColorById('nope', 'red')
      component.setBorderColorById('node2', '')

      expect(el.style.borderColor).toBe('blue')
    })

    it('colours both ends of a connection', () => {
      const src = document.createElement('div')
      src.id = 's1'
      const tgt = document.createElement('div')
      tgt.id = 't1'
      host.append(src, tgt)

      component.setBorderColor({ sourceId: 's1', targetId: 't1' } as any, 'green')

      expect(src.style.borderColor).toBe('green')
      expect(tgt.style.borderColor).toBe('green')
    })

    it('tolerates a connection whose endpoints are not in the DOM', () => {
      expect(() => component.setBorderColor({ sourceId: 'gone', targetId: 'gone2' } as any, 'green')).not.toThrow()
    })
  })

  describe('repainting', () => {
    beforeEach(() => {
      component.jsPlumbInstance = plumb
    })

    it('repaints on window resize for an mtf question', () => {
      component.question = mtfQuestion() as any
      component.onResize()

      expect(plumb.repaintEverything).toHaveBeenCalled()
    })

    it('does not repaint on resize for other question types', () => {
      component.question = fitbQuestion() as any
      component.onResize()

      expect(plumb.repaintEverything).not.toHaveBeenCalled()
    })

    it('repaints on demand for an mtf question', () => {
      component.question = mtfQuestion() as any
      component.repaintEveryThing()

      expect(plumb.repaintEverything).toHaveBeenCalled()
    })

    it('does nothing on demand for other question types', () => {
      component.question = fitbQuestion() as any
      component.repaintEveryThing()

      expect(plumb.repaintEverything).not.toHaveBeenCalled()
    })
  })

  describe('shuffle', () => {
    it('keeps every element of the array', () => {
      const result = component.shuffle([1, 2, 3, 4, 5])

      expect([...result].sort()).toEqual([1, 2, 3, 4, 5])
    })

    it('handles an empty array', () => {
      expect(component.shuffle([])).toEqual([])
    })
  })

  describe('mtf reset', () => {
    beforeEach(() => {
      component.jsPlumbInstance = plumb
      component.question = mtfQuestion() as any
    })

    it('clears the connections and their colours', () => {
      const conn = { setPaintStyle: jest.fn() }
      plumb.getAllConnections.mockReturnValue([conn])

      component.reset()

      expect(conn.setPaintStyle).toHaveBeenCalledWith({ stroke: 'rgba(0,0,0,0.5)' })
      expect(plumb.deleteEveryConnection).toHaveBeenCalled()
    })

    it('does not delete connections for other question types', () => {
      component.question = fitbQuestion() as any
      component.resetMtf()

      expect(plumb.deleteEveryConnection).not.toHaveBeenCalled()
    })
  })

  describe('changeColor', () => {
    beforeEach(() => {
      component.jsPlumbInstance = plumb
      component.question = mtfQuestion() as any
    })

    const connection = (sourceId: string, innerHTML: string) => {
      const target = document.createElement('div')
      target.id = `t-${sourceId}`
      target.innerHTML = innerHTML
      host.appendChild(target)
      const source = document.createElement('div')
      source.id = sourceId
      host.appendChild(source)
      return { sourceId, target, setPaintStyle: jest.fn() }
    }

    it('warns when not every answer has been matched', () => {
      plumb.getAllConnections.mockReturnValue([connection('c1q21', 'Uno')])

      component.changeColor()

      expect(alertSpy).toHaveBeenCalledWith('Please select all answers')
    })

    it('paints a correct match green', () => {
      const conn = connection('c1q21', 'Uno')
      plumb.getAllConnections.mockReturnValue([conn, connection('c1q22', 'Dos')])

      component.changeColor()

      expect(conn.setPaintStyle).toHaveBeenCalledWith({ stroke: '#357a38' })
    })

    it('paints a wrong match red', () => {
      const conn = connection('c1q21', 'Dos')
      plumb.getAllConnections.mockReturnValue([conn, connection('c1q22', 'Uno')])

      component.changeColor()

      expect(conn.setPaintStyle).toHaveBeenCalledWith({ stroke: '#f44336' })
    })
  })

  describe('matchShowAnswer', () => {
    beforeEach(() => {
      component.jsPlumbInstance = plumb
      component.question = mtfQuestion() as any
    })

    it('does nothing for a non-mtf question', () => {
      component.question = fitbQuestion() as any
      component.matchShowAnswer()

      expect(plumb.connect).not.toHaveBeenCalled()
    })

    it('connects each prompt to its correct answer', () => {
      const build = (id: string, text: string) => {
        const el = document.createElement('div')
        el.id = id
        Object.defineProperty(el, 'innerText', { value: text, configurable: true })
        host.appendChild(el)
      }
      build('c1q21', 'One')
      build('c1q22', 'Two')
      build('c2q21', 'Uno')
      build('c2q22', 'Dos')
      plumb.getAllConnections.mockReturnValue([
        { sourceId: 'c1q21', target: { innerHTML: 'Uno' }, setPaintStyle: jest.fn() },
        { sourceId: 'c1q22', target: { innerHTML: 'Dos' }, setPaintStyle: jest.fn() },
      ])

      component.matchShowAnswer()

      expect(plumb.deleteEveryConnection).toHaveBeenCalled()
      expect(plumb.connect).toHaveBeenCalledTimes(2)
      expect(plumb.connect).toHaveBeenCalledWith(expect.objectContaining({ anchors: ['Right', 'Left'] }))
    })
  })
})
