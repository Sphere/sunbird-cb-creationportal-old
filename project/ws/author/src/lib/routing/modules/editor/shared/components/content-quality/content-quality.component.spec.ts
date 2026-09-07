import { FormBuilder } from '@angular/forms'
import { of, Subject } from 'rxjs'
import { ContentQualityComponent } from './content-quality.component'

describe('ContentQualityComponent', () => {
  let changeDetector: any
  let contentService: any
  let editorService: any
  let activateRoute: any
  let configurationsService: any
  let breakpointObserver: any
  let loaderService: any
  let authInitService: any
  let qualityService: any
  let snackBar: any
  let accessService: any
  let router: any
  let changeActiveCont: Subject<string>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  /** The quality template the resolver puts on the parent route snapshot. */
  const qualityJSON = () => ({
    criteria: [
      {
        criteria: 'Content Accuracy',
        description: 'Is it accurate?',
        qualifiers: [
          {
            description: 'Are the facts right?',
            qualifier: 'facts',
            options: [{ name: 'Yes' }, { name: 'Partly' }, { name: 'No' }],
          },
          {
            description: 'Are the sources cited?',
            qualifier: 'sources',
            options: [{ name: 'Yes' }, { name: 'Partly' }, { name: 'No' }],
          },
        ],
      },
      {
        criteria: 'Design Quality',
        qualifiers: [
          {
            description: 'Is it readable?',
            qualifier: 'readable',
            options: [{ name: 'Yes' }, { name: 'No' }],
          },
        ],
      },
    ],
  })

  const build = () =>
    new ContentQualityComponent(
      changeDetector,
      contentService,
      editorService,
      activateRoute,
      configurationsService,
      breakpointObserver,
      loaderService,
      authInitService,
      new FormBuilder(),
      qualityService,
      snackBar,
      accessService,
      router,
    )

  beforeEach(() => {
    changeActiveCont = new Subject<string>()
    changeDetector = { detectChanges: jest.fn() }
    contentService = {
      currentContentID: null,
      changeActiveCont,
      originalContent: { do_1: { versionKey: 'vk1' } },
      resetOriginalMeta: jest.fn(),
      resetOriginalMetaWithHierarchy: jest.fn(),
    }
    editorService = { readcontentV3: jest.fn().mockReturnValue(of({ identifier: 'do_1' })) }
    activateRoute = {
      parent: {
        parent: { snapshot: { data: {} } },
        snapshot: { data: { qualityJSON: qualityJSON() } },
      },
    }
    configurationsService = { userProfile: { userId: 'u1' } }
    breakpointObserver = { observe: jest.fn().mockReturnValue(of({ matches: false })) }
    loaderService = { changeLoad: { next: jest.fn() } }
    authInitService = { authAdditionalConfig: {} }
    qualityService = {
      fetchresult: jest.fn().mockReturnValue(of({ result: { resources: [] } })),
      postResponse: jest.fn().mockReturnValue(of({ ok: true })),
      getFile: jest.fn(),
    }
    snackBar = { open: jest.fn() }
    accessService = { hasRole: jest.fn().mockReturnValue(false) }
    router = { url: '/author/editor/do_1/quality' }
  })

  it('should be created', () => {
    expect(build()).toBeTruthy()
  })

  describe('construction', () => {
    it('registers the routed content id as the active content', () => {
      build()
      expect(contentService.currentContentID).toBe('do_1')
      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_1')
    })

    it('resets the hierarchy meta for ordinary content', () => {
      build()
      expect(contentService.resetOriginalMetaWithHierarchy).toHaveBeenCalled()
      expect(contentService.resetOriginalMeta).not.toHaveBeenCalled()
    })

    it('resets the flat meta for a Program', () => {
      editorService.readcontentV3.mockReturnValue(of({ identifier: 'do_1', primaryCategory: 'Program' }))
      build()
      expect(contentService.resetOriginalMeta).toHaveBeenCalledWith({ identifier: 'do_1', primaryCategory: 'Program' }, 'do_1')
    })

    it('adopts the configured minimum pass percentage', () => {
      authInitService.authAdditionalConfig = { contentQuality: { passPercentage: 65 } }
      expect(build().minPassPercentage).toBe(65)
    })

    it('keeps the built-in pass percentage when none is configured', () => {
      expect(build().minPassPercentage).toBe(10)
    })

    it('refills the response data when the active content changes', () => {
      const component = build()
      changeActiveCont.next('do_1')
      expect(component.currentContent).toBe('do_1')
      expect(qualityService.fetchresult).toHaveBeenCalled()
    })

    it('ignores a blank active-content notification', () => {
      const component = build()
      qualityService.fetchresult.mockClear()
      changeActiveCont.next('')
      expect(qualityService.fetchresult).not.toHaveBeenCalled()
      expect(component.currentContent).toBeUndefined()
    })
  })

  describe('getJSON', () => {
    it('builds the question set with an Instructions section first', () => {
      const component = build()
      expect(component.questionData[0]).toEqual({
        name: 'Instructions',
        desc: 'Instructions',
        questions: [],
        type: 'instructions',
        comment: '',
      })
      expect(component.questionData.length).toBe(3)
    })

    it('maps each criterion into a typed question block', () => {
      const component = build()
      const block = component.questionData[1]
      expect(block.name).toBe('Content Accuracy')
      expect(block.type).toBe('ContentAccuracy')
      expect(block.desc).toBe('Is it accurate?')
      expect(block.questions.length).toBe(2)
      expect(block.questions[0].question).toBe('Are the facts right?')
      expect(block.questions[0].type).toBe('facts')
      expect(block.questions[0].position).toBe(0)
      expect(block.questions[0].options).toEqual([
        { name: 'Yes', weight: 'Yes', selected: false },
        { name: 'Partly', weight: 'Partly', selected: false },
        { name: 'No', weight: 'No', selected: false },
      ])
    })

    it('substitutes a placeholder description when the criterion has none', () => {
      expect(build().questionData[2].desc).toBe('desc')
    })

    it('renders the criteria list as roman-numbered display text', () => {
      expect(build().fieldsToDisplay).toBe(' i) Content Accuracy , ii) Design Quality ')
    })

    it('leaves the question set unset when the route carries no template', () => {
      activateRoute = { parent: null }
      expect(build().questionData).toBeUndefined()
    })
  })

  describe('romanize', () => {
    it('converts ones, tens and hundreds', () => {
      const component = build()
      expect(component.romanize(1)).toBe('i')
      expect(component.romanize(4)).toBe('iv')
      expect(component.romanize(9)).toBe('ix')
      expect(component.romanize(14)).toBe('xiv')
      expect(component.romanize(40)).toBe('xl')
      expect(component.romanize(100)).toBe('c')
      expect(component.romanize(400)).toBe('cd')
    })
  })

  describe('ngOnInit', () => {
    it('builds a form control per question block', () => {
      const component = build()
      component.ngOnInit()
      const arr = component.qualityForm.controls['questionsArray'] as any
      expect(arr.length).toBe(3)
      expect(arr.at(1).value.name).toBe('Content Accuracy')
      expect(arr.at(1).value.ques.length).toBe(2)
    })

    it('opens the sidebar on a wide screen', () => {
      const component = build()
      component.ngOnInit()
      expect(component.mediumScreen).toBe(false)
      expect(component.sideBarOpened).toBe(true)
    })

    it('collapses the sidebar on a narrow screen', () => {
      breakpointObserver.observe.mockReturnValue(of({ matches: true }))
      const component = build()
      component.ngOnInit()
      expect(component.mediumScreen).toBe(true)
      expect(component.sideBarOpened).toBe(false)
    })

    it('creates an empty form when there is no question data', () => {
      activateRoute = { parent: null }
      const component = build()
      component.ngOnInit()
      expect((component.qualityForm.controls['questionsArray'] as any).length).toBe(0)
    })
  })

  describe('fillResponseData', () => {
    let component: ContentQualityComponent

    beforeEach(() => {
      component = build()
      component.currentContent = 'do_1'
    })

    it('requests the latest quality record for the current content', () => {
      component.fillResponseData()
      expect(qualityService.fetchresult).toHaveBeenCalledWith({
        resourceId: 'do_1',
        resourceType: 'content',
        getLatestRecordEnabled: true,
      })
    })

    it('shows a result whose version matches the current content', () => {
      qualityService.fetchresult.mockReturnValue(of({ result: { resources: [{ versionKey: 'vk1', finalWeightedScore: 80 }] } }))
      component.fillResponseData()
      expect(component.displayResult).toBe(true)
      expect(component.qualityResponse).toEqual({ versionKey: 'vk1', finalWeightedScore: 80 })
    })

    it('shows a stale result to a reviewer', () => {
      accessService.hasRole.mockImplementation((r: string[]) => r[0] === 'content_reviewer')
      qualityService.fetchresult.mockReturnValue(of({ result: { resources: [{ versionKey: 'old' }] } }))
      component.fillResponseData()
      expect(component.displayResult).toBe(true)
    })

    it('hides a stale result from an ordinary author', () => {
      qualityService.fetchresult.mockReturnValue(of({ result: { resources: [{ versionKey: 'old' }] } }))
      component.fillResponseData()
      expect(component.displayResult).toBe(false)
    })

    it('does nothing when the response carries no resources', () => {
      qualityService.fetchresult.mockReturnValue(of({}))
      component.fillResponseData()
      expect(component.displayResult).toBe(false)
    })

    it('does nothing when no user is signed in', () => {
      configurationsService.userProfile = null
      qualityService.fetchresult.mockClear()
      component.fillResponseData()
      expect(qualityService.fetchresult).not.toHaveBeenCalled()
    })
  })

  describe('result readers', () => {
    let component: ContentQualityComponent

    beforeEach(() => {
      component = build()
      component.qualityResponse = {
        finalWeightedScore: 76.55,
        criteriaModels: [
          { criteria: 'Content Accuracy', qualifiedMinCriteria: true, qualifiers: [{ name: 'facts' }] },
          { criteria: 'Design Quality', qualifiedMinCriteria: false, qualifiers: [{ name: 'readable' }] },
        ],
      } as any
    })

    it('lists the sections that did not qualify', () => {
      expect(component.UnQualidiedSections.map(s => s.criteria)).toEqual(['Design Quality'])
    })

    it('checkUnQualidied reports each section flag', () => {
      expect(component.checkUnQualidied(0)).toBe(true)
      expect(component.checkUnQualidied(1)).toBe(false)
    })

    it('checkUnQualidied is falsy for an unknown section', () => {
      expect(component.checkUnQualidied(9)).toBeFalsy()
    })

    it('formats the quality percentage to one decimal', () => {
      component.qualityResponse.finalWeightedScore = 76.58
      expect(component.getQualityPercent).toBe('76.6')
    })

    it('formats a missing score as zero', () => {
      component.qualityResponse.finalWeightedScore = 0
      expect(component.getQualityPercent).toBe('0.0')
    })

    it('getFirstHeadingName reads the criterion title', () => {
      expect(component.getFirstHeadingName(1)).toBe('Design Quality')
      expect(component.getFirstHeadingName(0)).toBe('Content Accuracy')
    })

    it('getTableData returns the qualifier rows', () => {
      expect(component.getTableData(0)).toEqual([{ name: 'facts' }])
    })

    it('download exports the qualifier rows as a report', () => {
      component.download()
      expect(qualityService.getFile).toHaveBeenCalledWith(expect.anything(), 'Content-Quality-Report', true)
    })
  })

  describe('starting the questionnaire', () => {
    it('starts at the first real section when the course has children', () => {
      contentService.originalContent = { do_1: { versionKey: 'vk1' }, do_2: {} }
      const component = build()
      component.currentContent = 'do_1'
      component.start()
      expect(component.startQ).toBe(true)
      expect(component.selectedIndex).toBe(1)
      expect(component.selectedKey).toBe('ContentAccuracy')
    })

    it('refuses to start for a course with no resources', () => {
      const component = build()
      component.currentContent = 'do_1'
      component.start()
      expect(component.startQ).toBe(false)
      expect(snackBar.open).toHaveBeenCalledWith('To start content quality check, minimum one resourse/child is required')
    })
  })

  describe('question navigation', () => {
    let component: ContentQualityComponent

    beforeEach(() => {
      component = build()
      component.selectedIndex = 1
      component.selectedQIndex = 0
    })

    it('nextQ advances within the current section', () => {
      component.nextQ()
      expect(component.selectedQIndex).toBe(1)
      expect(component.selectedIndex).toBe(1)
    })

    it('nextQ moves to the following section at the end of one', () => {
      component.selectedQIndex = 1
      component.nextQ()
      expect(component.selectedIndex).toBe(2)
      expect(component.selectedQIndex).toBe(0)
      expect(component.selectedKey).toBe('DesignQuality')
    })

    it('nextQ flags the last question of the last section', () => {
      component.selectedIndex = 2
      component.selectedQIndex = 0
      component.nextQ()
      expect(component.lastQ).toBe(true)
    })

    it('previousQ steps back within the section', () => {
      component.selectedQIndex = 1
      component.lastQ = true
      component.previousQ()
      expect(component.selectedQIndex).toBe(0)
      expect(component.lastQ).toBe(false)
    })

    it('previousQ steps back to the end of the previous section', () => {
      component.selectedIndex = 2
      component.selectedQIndex = 0
      component.previousQ()
      expect(component.selectedIndex).toBe(1)
      expect(component.selectedQIndex).toBe(1)
      expect(component.selectedKey).toBe('ContentAccuracy')
    })

    it('previousQ lands on index 0 for a section with no questions', () => {
      component.selectedIndex = 1
      component.selectedQIndex = 0
      component.previousQ()
      expect(component.selectedIndex).toBe(0)
      expect(component.selectedQIndex).toBe(0)
    })

    it('previousQ does nothing at the very first question', () => {
      component.selectedIndex = 0
      component.selectedQIndex = 0
      component.previousQ()
      expect(component.selectedIndex).toBe(0)
    })

    it('getCurrentQuestions returns the active section questions', () => {
      expect(component.getCurrentQuestions.length).toBe(2)
    })

    it('questionNumberClick jumps to the numbered question', () => {
      component.questionNumberClick(1)
      expect(component.selectedQIndex).toBe(1)
    })

    it('autoNextQ advances after the progress bar completes', () => {
      jest.useFakeTimers()
      component.autoNextQ()
      expect(component.showQuestionProgressBar).toBe(true)
      jest.advanceTimersByTime(600)
      expect(component.showQuestionProgressBar).toBe(false)
      expect(component.selectedQIndex).toBe(1)
      jest.useRealTimers()
    })

    it('takeAgain resets the questionnaire to the start', () => {
      component.displayResult = true
      component.lastQ = true
      component.selectedIndex = 2
      component.selectedQIndex = 1
      component.takeAgain()
      expect(component.displayResult).toBe(false)
      expect(component.lastQ).toBe(false)
      expect(component.selectedIndex).toBe(0)
      expect(component.selectedQIndex).toBe(0)
      expect(component.selectedKey).toBe('instructions')
    })
  })

  describe('menu state', () => {
    let component: ContentQualityComponent

    beforeEach(() => {
      component = build()
    })

    it('isTouched marks every menu entry once results are shown', () => {
      component.displayResult = true
      expect(component.isTouched('menu', 5)).toBe(true)
    })

    it('isTouched marks the first menu entry once past it', () => {
      component.selectedIndex = 2
      expect(component.isTouched('menu', 0)).toBe(true)
    })

    it('isTouched marks earlier menu entries', () => {
      component.selectedIndex = 2
      expect(component.isTouched('menu', 1)).toBe(true)
      expect(component.isTouched('menu', 3)).toBe(false)
    })

    it('isTouched marks earlier questions', () => {
      component.selectedQIndex = 2
      expect(component.isTouched('question', 0)).toBe(true)
      expect(component.isTouched('question', 1)).toBe(true)
      expect(component.isTouched('question', 3)).toBe(false)
    })

    it('selectMenu switches section only while the questionnaire is running', () => {
      const event = { preventDefault: jest.fn() } as any
      component.startQ = true
      component.selectMenu(event, 'DesignQuality', 2)
      expect(event.preventDefault).toHaveBeenCalled()
      expect(component.selectedKey).toBe('DesignQuality')
      expect(component.selectedIndex).toBe(2)
      expect(component.selectedQIndex).toBe(0)
    })

    it('selectMenu is inert before the questionnaire starts', () => {
      const event = { preventDefault: jest.fn() } as any
      component.selectMenu(event, 'DesignQuality', 2)
      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(component.selectedIndex).toBe(0)
    })

    it('isLinkActive highlights the first entry at the start', () => {
      expect(component.isLinkActive('instructions', 0)).toBe(true)
    })

    it('isLinkActive highlights the selected key', () => {
      component.selectedIndex = 1
      component.selectedKey = 'ContentAccuracy'
      expect(component.isLinkActive('ContentAccuracy', 1)).toBe(true)
      expect(component.isLinkActive('DesignQuality', 2)).toBe(false)
    })

    it('isLinkActive is false without a key', () => {
      component.selectedIndex = 1
      expect(component.isLinkActive('', 1)).toBe(false)
    })

    it('showHideResult toggles the expanded result panel', () => {
      component.showHideResult()
      expect(component.isResultExpend).toBe(true)
      component.showHideResult()
      expect(component.isResultExpend).toBe(false)
    })

    it('showMinDialogue explains the passing threshold', () => {
      component.showMinDialogue()
      expect(snackBar.open).toHaveBeenCalledWith(
        'To proceed further minimum quality score must be  10% or greater, and need to qualify in all the sections',
      )
    })

    it('sidenavClose restores the arrow after the animation', () => {
      jest.useFakeTimers()
      component.leftArrow = false
      component.sidenavClose()
      jest.advanceTimersByTime(600)
      expect(component.leftArrow).toBe(true)
      jest.useRealTimers()
    })
  })

  describe('isAnswered', () => {
    let component: ContentQualityComponent

    beforeEach(() => {
      component = build()
      component.ngOnInit()
      component.selectedIndex = 1
    })

    it('is false while the question is unanswered', () => {
      expect(component.isAnswered(0)).toBe(false)
    })

    it('is true once an option is chosen', () => {
      const arr = component.qualityForm.controls['questionsArray'] as any
      arr.at(1).get('ques').at(0).get('options').setValue('Yes')
      expect(component.isAnswered(0)).toBe(true)
    })

    it('is false when the form has no question blocks', () => {
      activateRoute = { parent: null }
      const empty = build()
      empty.ngOnInit()
      expect(empty.isAnswered(0)).toBe(false)
    })
  })

  describe('getCount', () => {
    it('pads the index to a fixed width', () => {
      const component = build()
      expect(component.getCount(0)).toBe('_000')
      expect(component.getCount(7)).toBe('_007')
      expect(component.getCount(42)).toBe('_042')
      expect(component.getCount(512)).toBe('_512')
      expect(component.getCount(1500)).toBe('_000')
    })
  })

  describe('submitResult', () => {
    let component: ContentQualityComponent

    beforeEach(() => {
      component = build()
      component.ngOnInit()
      component.currentContent = 'do_1'
    })

    it('posts the answers without the instructions block', () => {
      const value = component.qualityForm.value
      component.submitResult(value)
      const payload = qualityService.postResponse.mock.calls[0][0]
      expect(payload.resourceId).toBe('do_1')
      expect(payload.userId).toBe('u1')
      expect(payload.versionKey).toBe('vk1')
      expect(payload.templateId).toBe('content_scoring_template')
      expect(payload.criteriaModels.length).toBe(2)
      expect(payload.criteriaModels[0].criteria).toBe('Content Accuracy')
    })

    it('falls back to the default option for an unanswered question', () => {
      component.submitResult(component.qualityForm.value)
      const payload = qualityService.postResponse.mock.calls[0][0]
      // 3 options -> the default sits at index length-2 ("Partly").
      expect(payload.criteriaModels[0].qualifiers[0].evaluated).toBe('Partly')
      // 2 options -> the default sits at index 1 ("No").
      expect(payload.criteriaModels[1].qualifiers[0].evaluated).toBe('No')
    })

    it('keeps a chosen answer', () => {
      const arr = component.qualityForm.controls['questionsArray'] as any
      arr.at(1).get('ques').at(0).get('options').setValue('Yes')
      component.submitResult(component.qualityForm.value)
      const payload = qualityService.postResponse.mock.calls[0][0]
      expect(payload.criteriaModels[0].qualifiers[0].evaluated).toBe('Yes')
    })

    it('closes the questionnaire and refreshes the result on success', () => {
      jest.useFakeTimers()
      component.startQ = true
      component.submitResult(component.qualityForm.value)
      expect(component.startQ).toBe(false)
      jest.advanceTimersByTime(2000)
      expect(component.showParentLoader).toBe(false)
      jest.useRealTimers()
    })

    it('clears the loader when the post reports nothing', () => {
      qualityService.postResponse.mockReturnValue(of(null))
      component.submitResult(component.qualityForm.value)
      expect(component.showParentLoader).toBe(false)
    })

    it('does nothing without a form', () => {
      component.submitResult(null)
      expect(qualityService.postResponse).not.toHaveBeenCalled()
      expect(component.showParentLoader).toBe(false)
    })

    it('does nothing without a signed-in user', () => {
      configurationsService.userProfile = null
      component.submitResult(component.qualityForm.value)
      expect(qualityService.postResponse).not.toHaveBeenCalled()
    })
  })

  describe('lifecycle', () => {
    it('ngOnDestroy hides the loader', () => {
      const component = build()
      component.ngOnDestroy()
      expect(loaderService.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('ngAfterViewInit is a no-op', () => {
      expect(() => build().ngAfterViewInit()).not.toThrow()
    })
  })
})
