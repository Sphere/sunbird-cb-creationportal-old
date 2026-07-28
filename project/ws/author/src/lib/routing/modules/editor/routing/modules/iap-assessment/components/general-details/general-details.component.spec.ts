import { FormBuilder } from '@angular/forms'
import { of, Subject } from 'rxjs'
import { GeneralDetailsComponent } from './general-details.component'

describe('GeneralDetailsComponent', () => {
  let component: GeneralDetailsComponent
  let contentService: any
  let loaderService: any
  let service: any
  let dialog: any
  let snackBar: any
  let changeActiveCont: Subject<string>
  let afterClosed: Subject<any>

  const contest = (over: any = {}) => ({
    instructions: 'Read carefully',
    objNegMarks: '0.25',
    videoProctoring: false,
    viewMarks: false,
    reviewAttempt: false,
    objNegMarksEnable: 'no',
    proctor: 'no',
    passPercentage: 60,
    ...over,
  })

  beforeEach(() => {
    changeActiveCont = new Subject<string>()
    afterClosed = new Subject<any>()
    contentService = {
      changeActiveCont,
      getOriginalMeta: jest.fn().mockReturnValue(undefined),
      setIapContent: jest.fn(),
      setUpdatedMeta: jest.fn(),
    }
    loaderService = { changeLoad: { next: jest.fn() } }
    service = {
      contestToDraft: jest.fn().mockReturnValue(of({ ok: true })),
      getContestDetails: jest.fn().mockReturnValue(of(contest())),
      getCreatedSection: jest.fn().mockReturnValue(of({ list: [] })),
      getIapId: jest.fn().mockReturnValue(of({ _id: 'iap_1' })),
      saveContestDetails: jest.fn().mockReturnValue(of({ status: 'done' })),
      getObjQuestions: jest.fn().mockReturnValue(of({ data: [] })),
      getGroupQuestions: jest.fn().mockReturnValue(of([])),
      addObjQuestionstoSections: jest.fn().mockReturnValue(of({ status: 'done' })),
      removeObjQuestionstoSections: jest.fn().mockReturnValue(of({ status: 'done' })),
      getSectionId: jest.fn().mockReturnValue(of({ ids: ['sec_1'] })),
      removeSection: jest.fn().mockReturnValue(of({ status: 'done' })),
      editSectionName: jest.fn().mockReturnValue(of({ ok: true })),
      adGroupQuestionsToSections: jest.fn().mockReturnValue(of({ status: 'done', message: 'added' })),
      editRandomization: jest.fn().mockReturnValue(of({ status: 'done' })),
      removeGroupFromSection: jest.fn().mockReturnValue(of({ status: 'done' })),
    }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }) }
    snackBar = { open: jest.fn(), openFromComponent: jest.fn() }

    component = new GeneralDetailsComponent(contentService, loaderService, service, dialog, snackBar, new FormBuilder())
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('createForm', () => {
    it('builds the settings form with the documented defaults', () => {
      component.createForm()
      expect(component.generalDetailsForm.value).toEqual({
        videoProctoring: 'false',
        viewMarks: 'true',
        objNegMarksEnable: 'false',
        proctor: 'false',
        reviewAttempt: 'true',
        objNegMarks: '',
        passPercentage: 80,
      })
    })

    it('pushes the default settings into the IAP content store', () => {
      component.createForm()
      expect(contentService.setIapContent).toHaveBeenCalledWith({ videoProctoring: false }, '')
      expect(contentService.setIapContent).toHaveBeenCalledWith({ viewMarks: true }, '')
      expect(contentService.setIapContent).toHaveBeenCalledWith({ passPercentage: 80 }, '')
    })
  })

  describe('ngOnInit — existing assessment', () => {
    beforeEach(() => {
      contentService.getOriginalMeta.mockReturnValue({ contentIdAtSource: 'test_1' })
    })

    it('tracks the active content id', () => {
      component.ngOnInit()
      changeActiveCont.next('do_1')
      expect(component.currentContent).toBe('do_1')
    })

    it('moves the contest to draft and loads its details', () => {
      component.ngOnInit()
      expect(service.contestToDraft).toHaveBeenCalledWith({ id: 'test_1' })
      expect(service.getContestDetails).toHaveBeenCalledWith({ id: 'test_1' })
      expect(component.contestData).toBeDefined()
    })

    it('emits the resolved assessment id', () => {
      const emitted: string[] = []
      component.id.subscribe(v => emitted.push(v))
      component.ngOnInit()
      expect(component._id).toBe('test_1')
      expect(emitted).toEqual(['test_1'])
    })

    it('seeds the instruction form from the loaded contest', () => {
      component.ngOnInit()
      expect(component.contentForm.value.assessmentInstruction).toBe('Read carefully')
    })

    it('falls back to a blank instruction when the contest has none', () => {
      service.getContestDetails.mockReturnValue(of(contest({ instructions: undefined })))
      component.ngOnInit()
      expect(component.contentForm.value.assessmentInstruction).toBe('')
    })

    it('turns the boolean settings on when the contest enables them', () => {
      service.getContestDetails.mockReturnValue(
        of(
          contest({
            videoProctoring: true,
            viewMarks: true,
            reviewAttempt: true,
            objNegMarksEnable: 'yes',
            proctor: 'yes',
          }),
        ),
      )
      component.ngOnInit()
      expect(component.generalDetailsForm.value.videoProctoring).toBe('true')
      expect(component.generalDetailsForm.value.viewMarks).toBe('true')
      expect(component.generalDetailsForm.value.reviewAttempt).toBe('true')
      expect(component.generalDetailsForm.value.objNegMarksEnable).toBe('true')
      expect(component.generalDetailsForm.value.proctor).toBe('true')
    })

    it('clears the negative marks when the contest disables them', () => {
      component.ngOnInit()
      expect(component.generalDetailsForm.value.objNegMarksEnable).toBe('false')
      expect(component.generalDetailsForm.value.objNegMarks).toBe('')
    })

    it('loads the created sections', () => {
      service.getCreatedSection.mockReturnValue(of({ list: [{ _id: 's1', objectiveQuestionsList: ['q1'] }] }))
      component.ngOnInit()
      expect(component.sectionDataList.length).toBe(1)
      expect(component.sectionDataList[0].numberOfQuestionsAdded).toBe(1)
    })

    it('tolerates a section response with no list', () => {
      service.getCreatedSection.mockReturnValue(of({}))
      component.ngOnInit()
      expect(component.sectionDataList).toEqual([])
    })
  })

  describe('ngOnInit — new assessment', () => {
    it('provisions a fresh assessment id and registers it', () => {
      component.ngOnInit()
      expect(service.getIapId).toHaveBeenCalled()
      expect(component._id).toBe('iap_1')
      expect(contentService.setIapContent).toHaveBeenCalledWith({ _id: 'iap_1' }, '')
      expect(contentService.setUpdatedMeta).toHaveBeenCalledWith({ contentIdAtSource: 'iap_1' }, '')
    })

    it('does not record the source id when the save is not confirmed', () => {
      service.saveContestDetails.mockReturnValue(of({ status: 'pending' }))
      component.ngOnInit()
      expect(contentService.setUpdatedMeta).not.toHaveBeenCalled()
    })

    it('starts with a blank instruction form', () => {
      component.ngOnInit()
      expect(component.contentForm.value.assessmentInstruction).toBe('')
    })
  })

  describe('setting toggles', () => {
    beforeEach(() => {
      component.createForm()
      contentService.setIapContent.mockClear()
      component.currentContent = 'do_1'
    })

    it('videoProctoringChange writes a boolean', () => {
      component.videoProctoringChange('true')
      expect(contentService.setIapContent).toHaveBeenCalledWith({ videoProctoring: true }, 'do_1')
      component.videoProctoringChange('false')
      expect(contentService.setIapContent).toHaveBeenCalledWith({ videoProctoring: false }, 'do_1')
    })

    it('viewMarks writes a boolean', () => {
      component.viewMarks('true')
      expect(contentService.setIapContent).toHaveBeenCalledWith({ viewMarks: true }, 'do_1')
      component.viewMarks('false')
      expect(contentService.setIapContent).toHaveBeenCalledWith({ viewMarks: false }, 'do_1')
    })

    it('reviewAttempt writes a boolean', () => {
      component.reviewAttempt('true')
      expect(contentService.setIapContent).toHaveBeenCalledWith({ reviewAttempt: true }, 'do_1')
      component.reviewAttempt('false')
      expect(contentService.setIapContent).toHaveBeenCalledWith({ reviewAttempt: false }, 'do_1')
    })

    it('objNegMarksEnable writes the yes/no flag', () => {
      component.objNegMarksEnable('true')
      expect(contentService.setIapContent).toHaveBeenCalledWith({ objNegMarksEnable: 'yes' }, 'do_1')
      component.objNegMarksEnable('false')
      expect(contentService.setIapContent).toHaveBeenCalledWith({ objNegMarksEnable: 'no' }, 'do_1')
    })

    it('proctor writes the yes/no flag', () => {
      component.proctor('true')
      expect(contentService.setIapContent).toHaveBeenCalledWith({ proctor: 'yes' }, 'do_1')
      component.proctor('false')
      expect(contentService.setIapContent).toHaveBeenCalledWith({ proctor: 'no' }, 'do_1')
    })

    it('objNegMarks and passPercentage write through verbatim', () => {
      component.objNegMarks('0.5')
      expect(contentService.setIapContent).toHaveBeenCalledWith({ objNegMarks: '0.5' }, 'do_1')
      component.passPercentage(75)
      expect(contentService.setIapContent).toHaveBeenCalledWith({ passPercentage: 75 }, 'do_1')
    })

    it('updateContentService patches the instruction and stores it', () => {
      component.updateContentService('instructions', 'Be quick')
      expect(component.contentForm.value.assessmentInstruction).toBe('Be quick')
      expect(contentService.setIapContent).toHaveBeenCalledWith({ instructions: 'Be quick' }, 'do_1')
    })

    it('showinfo toggles only for the proctor field', () => {
      component.showinfo('proctor')
      expect(component.showInfo).toBe(true)
      component.showinfo('other')
      expect(component.showInfo).toBe(true)
    })
  })

  describe('navigation events', () => {
    it('save emits the save action', () => {
      const spy = jest.fn()
      component.data.subscribe(spy)
      component.save()
      expect(spy).toHaveBeenCalledWith('save')
    })

    it('next emits the next action', () => {
      const spy = jest.fn()
      component.data.subscribe(spy)
      component.next()
      expect(spy).toHaveBeenCalledWith('next')
    })

    it('formNext moves the selected tab', () => {
      component.formNext(2)
      expect(component.selected.value).toBe(2)
    })
  })

  describe('question rendering', () => {
    it('renderObjectiveQuestions fills the table and clears the loader', () => {
      service.getObjQuestions.mockReturnValue(of({ data: [{ _id: 'q1' }] }))
      component.loaderFlag = true
      component.renderObjectiveQuestions()
      expect(component.objDataSource.data).toEqual([{ _id: 'q1' }])
      expect(component.loaderFlag).toBe(false)
      expect(component.questionDetails.searchQuery).toBe('')
    })

    it('marks questions already attached to the section', () => {
      service.getObjQuestions.mockReturnValue(of({ data: [{ _id: 'q1' }, { _id: 'q2' }] }))
      component.tempSection = { objectiveQuestionsList: ['q1'] } as any
      component.renderObjectiveQuestions()
      expect(component.objQuestionData.data[0].contestAdded).toBe(true)
      expect(component.objQuestionData.data[1].contestAdded).toBeUndefined()
    })

    it('renderGroupQuestions stores the group list', () => {
      service.getGroupQuestions.mockReturnValue(of([{ _id: 'g1' }]))
      component._id = 'test_1'
      component.renderGroupQuestions()
      expect(service.getGroupQuestions).toHaveBeenCalledWith({ testId: 'test_1' })
      expect(component.groupQuestionData).toEqual([{ _id: 'g1' }])
    })

    it('setQueType switches to relevance ordering', () => {
      component.setQueType('Relevance')
      expect(component.questionDetails.sortBy).toBe('relevance')
      expect(component.questionType).toBe('Relevance')
    })

    it('setQueType defaults to most recent ordering', () => {
      component.setQueType('Most Recent')
      expect(component.questionDetails.sortBy).toBe('most Recent')
      expect(component.questionType).toBe('Most Recent')
    })

    it('selectSortBy records the chosen facet', () => {
      component.selectSortBy('Tags')
      expect(component.sortbyValue).toBe('Tags')
    })
  })

  describe('search', () => {
    beforeEach(() => {
      component.searchInputElem = { nativeElement: { value: '  algebra  ' } } as any
    })

    it('searches by free text by default', () => {
      component.searchQuestions()
      // The trimmed term is kept on searchInu; renderObjectiveQuestions() blanks
      // questionDetails.searchQuery again once the results come back.
      expect(component.searchInu).toBe('algebra')
      expect(component.questionDetails.searchQuery).toBe('')
      expect(component.searchClicked).toBe(true)
      expect(service.getObjQuestions).toHaveBeenCalled()
    })

    it('searches by topic when sorting by Topic', () => {
      component.sortbyValue = 'Topic'
      component.searchQuestions()
      expect(component.questionDetails.topicList).toEqual(['algebra'])
    })

    it('searches by tag when sorting by Tags', () => {
      component.sortbyValue = 'Tags'
      component.searchQuestions()
      expect(component.questionDetails.tagsList).toEqual(['algebra'])
    })

    it('clearAllFilters resets the query and reloads', () => {
      component.searchClicked = true
      component.clearAllFilters()
      expect(component.searchInputElem.nativeElement.value).toBe('')
      expect(component.searchClicked).toBe(false)
      expect(component.questionDetails.searchQuery).toBe('')
      expect(service.getObjQuestions).toHaveBeenCalled()
    })
  })

  describe('adding and removing questions', () => {
    it('add marks the question attached on success', () => {
      const data: any = { _id: 'q1' }
      component.add(data)
      expect(data.contestAdded).toBe(true)
      expect(data.loader).toBe(false)
      expect(snackBar.open).toHaveBeenCalledWith('Question added to section')
    })

    it('add reports the service message on failure', () => {
      service.addObjQuestionstoSections.mockReturnValue(of({ status: 'notDone', message: 'full' }))
      const data: any = { _id: 'q1' }
      component.add(data)
      expect(data.contestAdded).toBe(false)
      expect(snackBar.open).toHaveBeenCalledWith('full')
    })

    it('remove detaches the question on success', () => {
      const data: any = { _id: 'q1', contestAdded: true }
      component.remove(data)
      expect(data.contestAdded).toBe(false)
      expect(snackBar.open).toHaveBeenCalledWith('Question removed from section')
    })

    it('remove keeps the question attached on failure', () => {
      service.removeObjQuestionstoSections.mockReturnValue(of({ status: 'notDone', message: 'busy' }))
      const data: any = { _id: 'q1' }
      component.remove(data)
      expect(data.contestAdded).toBe(true)
      expect(snackBar.open).toHaveBeenCalledWith('busy')
    })
  })

  describe('sections', () => {
    beforeEach(() => {
      component._id = 'test_1'
      const el = document.createElement('div')
      el.id = 'sectionContainer'
      ;(el as any).scrollIntoView = jest.fn()
      document.body.appendChild(el)
    })

    afterEach(() => {
      const el = document.getElementById('sectionContainer')
      if (el) {
        el.remove()
      }
    })

    it('addSection appends the created section and resets the form', () => {
      component.addSectionForm.patchValue({ sectionName: 'Part A', sectionDescription: 'Intro' })
      component.addSection()
      expect(service.getSectionId).toHaveBeenCalledWith({
        testId: 'test_1',
        sectionName: 'Part A',
        sectionDescription: 'Intro',
      })
      expect(component.sectionDataList.length).toBe(1)
      expect(component.addSectionForm.value.sectionName).toBe('')
      expect(loaderService.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('addSection substitutes a placeholder description when none is given', () => {
      component.addSectionForm.patchValue({ sectionName: 'Part A', sectionDescription: '' })
      component.addSection()
      expect(service.getSectionId).toHaveBeenCalledWith(expect.objectContaining({ sectionDescription: 'No description provided' }))
    })

    it('openOptions toggles the per-section menu', () => {
      const section: any = { _id: 's1', showOptions: false }
      component.openOptions(section)
      expect(section.showOptions).toBe(true)
      component.openOptions(section)
      expect(section.showOptions).toBe(false)
    })

    it('deleteSection removes the section from the list on success', () => {
      component.sectionDataList = [{ _id: 's1' }, { _id: 's2' }] as any
      component.deleteSection({ _id: 's1' } as any)
      expect(component.sectionDataList.map((s: any) => s._id)).toEqual(['s2'])
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('deleteSection keeps the list intact on failure', () => {
      service.removeSection.mockReturnValue(of({ status: 'notDone' }))
      component.sectionDataList = [{ _id: 's1' }] as any
      component.deleteSection({ _id: 's1' } as any)
      expect(component.sectionDataList.length).toBe(1)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('countTotalNoOfQuestionsInSections sums objective and group questions', () => {
      component.sectionDataList = [
        {
          _id: 's1',
          objectiveQuestionsList: ['q1', 'q2'],
          groupList: [{ questionsNeeded: 3 }, { questionsNeeded: 2 }],
        },
      ] as any
      component.countTotalNoOfQuestionsInSections()
      expect(component.sectionDataList[0].numberOfQuestionsAdded).toBe(7)
    })

    it('countTotalNoOfQuestionsInSections handles a section with no questions', () => {
      component.sectionDataList = [{ _id: 's1' }] as any
      component.countTotalNoOfQuestionsInSections()
      expect(component.sectionDataList[0].numberOfQuestionsAdded).toBe(0)
    })

    it('cardActions routes a delete request', () => {
      const spy = jest.spyOn(component, 'deleteSection').mockImplementation(() => {})
      component.cardActions('Delete Section', { _id: 's1' } as any)
      expect(spy).toHaveBeenCalled()
    })

    it('cardActions opens the question picker for the section', () => {
      component.cardActions('Add Questions', { _id: 's1' } as any)
      expect(component.tempSectionId).toBe('s1')
      expect(component.showQuestions).toBe(true)
      expect(component.showObjective).toBe(true)
      expect(component.showGroups).toBe(false)
      expect(component.selected.value).toBe(2)
      expect(service.getObjQuestions).toHaveBeenCalled()
      expect(service.getGroupQuestions).toHaveBeenCalled()
    })

    it('cardActions opens the edit dialog', () => {
      component.cardActions('Edit/View Section', { _id: 's1' } as any)
      expect(dialog.open).toHaveBeenCalled()
    })

    it('hideQuestions closes the picker for non-question tabs', () => {
      component.showQuestions = true
      component.hideQuestions(0)
      expect(component.showQuestions).toBe(false)
    })

    it('hideQuestions keeps the picker open on the questions tab', () => {
      component.showQuestions = true
      component.hideQuestions(2)
      expect(component.showQuestions).toBe(true)
    })

    it('hideQuestions reloads the sections when returning to the section tab', () => {
      component.hideQuestions(1)
      expect(service.getCreatedSection).toHaveBeenCalledWith({ testId: 'test_1' })
    })

    it('openDialog persists an edited section name', () => {
      const section: any = { _id: 's1', sectionName: 'Old', sectionDescription: 'Old desc' }
      component.sectionDataList = [section]
      component.openDialog(section)
      afterClosed.next({ value: { sectionName: 'New', sectionDescription: 'New desc' } })
      expect(section.sectionName).toBe('New')
      expect(service.editSectionName).toHaveBeenCalled()
      expect(service.getCreatedSection).toHaveBeenCalled()
    })

    it('openDialog ignores a cancelled edit', () => {
      const section: any = { _id: 's1', sectionName: 'Old' }
      component.sectionDataList = [section]
      component.openDialog(section)
      afterClosed.next(null)
      expect(service.editSectionName).not.toHaveBeenCalled()
      expect(section.sectionName).toBe('Old')
    })

    it('openViewQuestionDialog opens the read-only question view', () => {
      component.openViewQuestionDialog({ _id: 'q1' })
      expect(dialog.open).toHaveBeenCalled()
    })
  })

  describe('groups', () => {
    beforeEach(() => {
      component._id = 'test_1'
      component.tempSectionId = 's1'
      component.groupForm.patchValue({ randomization: '5' })
    })

    it('radioChange switches to the objective tab', () => {
      component.radioChange({ value: 'objective' })
      expect(component.showObjective).toBe(true)
      expect(component.showGroups).toBe(false)
    })

    it('radioChange switches to the groups tab', () => {
      component.radioChange({ value: 'groups' })
      expect(component.showGroups).toBe(true)
      expect(component.showObjective).toBe(false)
    })

    it('radioChange ignores an unknown value', () => {
      component.showObjective = true
      component.radioChange({ value: 'other' })
      expect(component.showObjective).toBe(true)
    })

    it('addGroupToSection attaches the group with the requested question count', () => {
      const group: any = { _id: 'g1' }
      component.addGroupToSection(group)
      expect(service.adGroupQuestionsToSections).toHaveBeenCalledWith({
        testId: 'test_1',
        sectionId: 's1',
        groupId: 'g1',
        questionsNeeded: 5,
      })
      expect(group.addedToContest).toBe(true)
    })

    it('addGroupToSection reports a failed attach', () => {
      service.adGroupQuestionsToSections.mockReturnValue(of({ status: 'notDone', message: 'nope' }))
      const group: any = { _id: 'g1' }
      component.addGroupToSection(group)
      expect(group.addedToContest).toBe(false)
      expect(snackBar.open).toHaveBeenCalledWith('nope')
    })

    it('editRandomization confirms a successful edit', () => {
      component.editRandomization({ _id: 'g1' })
      expect(snackBar.open).toHaveBeenCalledWith('Randomization is edited')
    })

    it('editRandomization surfaces a failure message', () => {
      service.editRandomization.mockReturnValue(of({ status: 'notDone', message: 'bad' }))
      component.editRandomization({ _id: 'g1' })
      expect(snackBar.open).toHaveBeenCalledWith('bad')
    })

    it('removeGroupQuestion detaches the group on success', () => {
      const group: any = { _id: 'g1', addedToContest: true }
      component.removeGroupQuestion(group)
      expect(group.addedToContest).toBe(false)
      expect(snackBar.open).toHaveBeenCalledWith('Group removed from section')
    })

    it('removeGroupQuestion keeps the group attached on failure', () => {
      service.removeGroupFromSection.mockReturnValue(of({ status: 'notDone', message: 'busy' }))
      const group: any = { _id: 'g1' }
      component.removeGroupQuestion(group)
      expect(group.addedToContest).toBe(true)
      expect(snackBar.open).toHaveBeenCalledWith('busy')
    })
  })

  describe('paginator wiring', () => {
    it('attaches the paginator to the data source when the view provides one', () => {
      const paginator: any = { pageSize: 10 }
      component.matPaginator = paginator
      expect(component.paginator).toBe(paginator)
      expect(component.objDataSource.paginator).toBe(paginator)
    })
  })
})
