import { of } from 'rxjs'
import { SectionDialogComponent } from './section-dialog.component'

describe('SectionDialogComponent', () => {
  let iapService: any
  let dialogRef: any
  let snackbar: any
  let data: any

  const sectionResponse = {
    objectiveQuestionsData: [{ _id: 'q1' }],
    groupData: [{ _id: 'g1' }],
  }

  const build = () => new SectionDialogComponent(iapService, dialogRef, snackbar, data)

  beforeEach(() => {
    iapService = {
      getSectionData: jest.fn().mockReturnValue(of(sectionResponse)),
      removeObjQuestionstoSections: jest.fn().mockReturnValue(of({ status: 'done' })),
      removeGroupFromSection: jest.fn().mockReturnValue(of({ status: 'done' })),
    }
    dialogRef = { updateSize: jest.fn(), close: jest.fn() }
    snackbar = { open: jest.fn() }
    data = {
      _id: 'sec1',
      testId: 'test1',
      sectionName: 'My Section',
      sectionDescription: 'Desc',
    }
  })

  it('should create with the form seeded from dialog data', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.addSectionForm.value.sectionName).toBe('My Section')
    expect(c.addSectionForm.value.sectionDescription).toBe('Desc')
    expect(c.loaderFlag).toBe(false)
  })

  describe('ngOnInit', () => {
    it('sizes the dialog and loads section data', () => {
      const c = build()
      c.ngOnInit()
      expect(dialogRef.updateSize).toHaveBeenCalledWith('80%', '80%')
      expect(iapService.getSectionData).toHaveBeenCalledWith('sec1')
      expect(c.objectiveQuestionsData).toEqual(sectionResponse.objectiveQuestionsData)
      expect(c.groupQuestionsData).toEqual(sectionResponse.groupData as any)
      expect(c.loaderFlag).toBe(false)
    })
  })

  describe('onNoClick', () => {
    it('closes the dialog', () => {
      const c = build()
      c.onNoClick()
      expect(dialogRef.close).toHaveBeenCalled()
    })
  })

  describe('removeQuestions', () => {
    it('removes a question and reloads objective questions on success', () => {
      const c = build()
      c.removeQuestions({ _id: 'q1' })
      expect(iapService.removeObjQuestionstoSections).toHaveBeenCalledWith({
        testId: 'test1',
        sectionId: 'sec1',
        objectiveQuestionsList: ['q1'],
      })
      expect(snackbar.open).toHaveBeenCalledWith('Question removed from section')
      expect(iapService.getSectionData).toHaveBeenCalledWith('sec1')
      expect(c.objectiveQuestionsData).toEqual(sectionResponse.objectiveQuestionsData)
    })

    it('surfaces the server message when status is notDone', () => {
      iapService.removeObjQuestionstoSections.mockReturnValue(of({ status: 'notDone', message: 'cannot remove' }))
      const c = build()
      c.removeQuestions({ _id: 'q1' })
      expect(snackbar.open).toHaveBeenCalledWith('cannot remove')
    })
  })

  describe('removeGroup', () => {
    it('removes a group and reloads group data on success', () => {
      const c = build()
      c.removeGroup({ _id: 'g1' })
      expect(iapService.removeGroupFromSection).toHaveBeenCalledWith({
        testId: 'test1',
        sectionId: 'sec1',
        groupId: 'g1',
      })
      expect(snackbar.open).toHaveBeenCalledWith('Group removed from section')
      expect(iapService.getSectionData).toHaveBeenCalledWith('sec1')
      expect(c.groupQuestionsData).toEqual(sectionResponse.groupData as any)
    })

    it('surfaces the server message when status is notDone', () => {
      iapService.removeGroupFromSection.mockReturnValue(of({ status: 'notDone', message: 'group locked' }))
      const c = build()
      c.removeGroup({ _id: 'g1' })
      expect(snackbar.open).toHaveBeenCalledWith('group locked')
    })
  })
})
