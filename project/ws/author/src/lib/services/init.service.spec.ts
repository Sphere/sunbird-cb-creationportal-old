import { AuthInitService } from './init.service'

describe('AuthInitService', () => {
  let svc: AuthInitService

  beforeEach(() => {
    svc = new AuthInitService()
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('changeMessage() emits on currentMessage', done => {
    svc.currentMessage.subscribe(v => {
      expect(v).toBe('hello')
      done()
    })
    svc.changeMessage('hello')
  })

  it('publishData() emits on publishMessage', done => {
    const payload = { a: 1 }
    svc.publishMessage.subscribe(v => {
      expect(v).toBe(payload)
      done()
    })
    svc.publishData(payload)
  })

  it('reviewCheck() emits on reviewMessage', done => {
    svc.reviewMessage.subscribe(v => {
      expect(v).toEqual({ ok: true })
      done()
    })
    svc.reviewCheck({ ok: true })
  })

  it('uploadData() emits on uploadMessage', done => {
    svc.uploadMessage.subscribe(v => {
      expect(v).toBe('upload')
      done()
    })
    svc.uploadData('upload')
  })

  it('editCourse() emits on editCourseMessage', done => {
    svc.editCourseMessage.subscribe(v => {
      expect(v).toBe('edit')
      done()
    })
    svc.editCourse('edit')
  })

  it('saveData() emits on saveContentMessage', done => {
    svc.saveContentMessage.subscribe(v => {
      expect(v).toBe('save')
      done()
    })
    svc.saveData('save')
  })

  it('createModuleUnit() emits on createModuleMessage', done => {
    svc.createModuleMessage.subscribe(v => {
      expect(v).toBe('module')
      done()
    })
    svc.createModuleUnit('module')
  })

  it('updateResources() emits on updateResourceMessage', done => {
    svc.updateResourceMessage.subscribe(v => {
      expect(v).toBe('res')
      done()
    })
    svc.updateResources('res')
  })

  it('updateAssessment() emits on updateAssessmentMessage', done => {
    svc.updateAssessmentMessage.subscribe(v => {
      expect(v).toBe('assess')
      done()
    })
    svc.updateAssessment('assess')
  })

  it('editAssessmentAction() emits on editAssessmentMessage', done => {
    svc.editAssessmentMessage.subscribe(v => {
      expect(v).toBe('editA')
      done()
    })
    svc.editAssessmentAction('editA')
  })

  it('showAssessmentAction() emits on showAssessmentMessage', done => {
    svc.showAssessmentMessage.subscribe(v => {
      expect(v).toBe('showA')
      done()
    })
    svc.showAssessmentAction('showA')
  })

  it('isAssessmentOrQuizAction() emits on isAssessmentOrQuizMessage', done => {
    svc.isAssessmentOrQuizMessage.subscribe(v => {
      expect(v).toBe('quiz')
      done()
    })
    svc.isAssessmentOrQuizAction('quiz')
  })

  it('isBackButtonClickedAction() emits on isBackButtonClickedMessage', done => {
    svc.isBackButtonClickedMessage.subscribe(v => {
      expect(v).toBe(true)
      done()
    })
    svc.isBackButtonClickedAction(true)
  })

  it('isBackButtonClickedFromAssessmentAction() emits on isBackButtonFromAssessmentClickedMessage', done => {
    svc.isBackButtonFromAssessmentClickedMessage.subscribe(v => {
      expect(v).toBe(false)
      done()
    })
    svc.isBackButtonClickedFromAssessmentAction(false)
  })

  it('isEditMetaPageAction() emits on isEditMetaPageClickedClickedMessage', done => {
    svc.isEditMetaPageClickedClickedMessage.subscribe(v => {
      expect(v).toBe('meta')
      done()
    })
    svc.isEditMetaPageAction('meta')
  })

  it('currentPageAction() emits on currentPageStatusMessage', done => {
    svc.currentPageStatusMessage.subscribe(v => {
      expect(v).toBe('page')
      done()
    })
    svc.currentPageAction('page')
  })

  it('backToHome() emits on backToHomeMessage', done => {
    svc.backToHomeMessage.subscribe(v => {
      expect(v).toBe('home')
      done()
    })
    svc.backToHome('home')
  })

  it('currentNavigations() emits on currentNavigationMessage', done => {
    svc.currentNavigationMessage.subscribe(v => {
      expect(v).toBe('nav')
      done()
    })
    svc.currentNavigations('nav')
  })

  it('acts as a mutable store for config/state properties', () => {
    svc.ordinals = { a: 1 }
    svc.authAdditionalConfig = { b: 2 }
    svc.creationEntity.set('k', { some: 'entity' } as any)
    expect(svc.ordinals).toEqual({ a: 1 })
    expect(svc.authAdditionalConfig).toEqual({ b: 2 })
    expect(svc.creationEntity.get('k')).toEqual({ some: 'entity' })
  })
})
