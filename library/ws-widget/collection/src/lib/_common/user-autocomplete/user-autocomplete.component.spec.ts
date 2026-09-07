import { of, throwError } from 'rxjs'

import { UserAutocompleteComponent } from './user-autocomplete.component'

describe('UserAutocompleteComponent', () => {
  let component: UserAutocompleteComponent
  let matSnackBar: any
  let userAutocompleteSvc: any
  let configSvc: any

  const buildUser = (wid: string): any => ({ wid, first_name: wid })

  const createComponent = (userProfile: any = { userId: 'me-123' }): UserAutocompleteComponent => {
    matSnackBar = { open: jest.fn() }
    userAutocompleteSvc = {
      fetchAutoComplete: jest.fn().mockReturnValue(of([buildUser('a')])),
      fetchAutoCompleteByDept: jest.fn().mockReturnValue(of([buildUser('b')])),
    }
    configSvc = { userProfile, instanceConfig: {} }
    const cmp = new UserAutocompleteComponent(matSnackBar, userAutocompleteSvc, configSvc)
    cmp.userInputFormRef = { nativeElement: { value: 'typed' } } as any
    return cmp
  }

  beforeEach(() => {
    component = createComponent()
  })

  it('should create and set userId from configSvc userProfile', () => {
    expect(component).toBeTruthy()
    expect(component.userId).toBe('me-123')
  })

  it('should leave userId empty when no userProfile', () => {
    const cmp = createComponent(null)
    expect(cmp.userId).toBe('')
  })

  describe('ngOnInit valueChanges', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })
    afterEach(() => {
      jest.useRealTimers()
    })

    it('should fetch autocomplete for string value and mark done', () => {
      component.ngOnInit()
      const usersOut = jest.spyOn(component.usersList, 'emit')
      expect(usersOut).toBeDefined()
      component.userFormControl.setValue('john')
      jest.advanceTimersByTime(600)
      expect(userAutocompleteSvc.fetchAutoComplete).toHaveBeenCalledWith('john')
      expect(component.autocompleteAllUsers.length).toBe(1)
      expect(component.fetchTagsStatus).toBe('done')
    })

    it('should fetch by department when autocompleteByDepartment is true', () => {
      component.autocompleteByDepartment = true
      component.departments = ['ias'] as any
      component.ngOnInit()
      component.userFormControl.setValue('jane')
      jest.advanceTimersByTime(600)
      expect(userAutocompleteSvc.fetchAutoCompleteByDept).toHaveBeenCalledWith('jane', ['ias'])
      expect(component.fetchTagsStatus).toBe('done')
    })

    it('should not fetch for non-string / empty values', () => {
      component.ngOnInit()
      component.userFormControl.setValue(buildUser('obj'))
      jest.advanceTimersByTime(600)
      expect(userAutocompleteSvc.fetchAutoComplete).not.toHaveBeenCalled()
    })

    it('should swallow fetch errors and yield empty list', () => {
      userAutocompleteSvc.fetchAutoComplete.mockReturnValue(throwError(() => new Error('boom')))
      component.ngOnInit()
      component.userFormControl.setValue('err')
      jest.advanceTimersByTime(600)
      expect(component.autocompleteAllUsers).toEqual([])
      expect(component.fetchTagsStatus).toBe('done')
    })
  })

  describe('removeUser', () => {
    it('should remove a matching user and emit events', () => {
      const removed = jest.spyOn(component.removedUser, 'emit')
      const listed = jest.spyOn(component.usersList, 'emit')
      component.selectedUsers = [buildUser('a'), buildUser('b')]
      component.removeUser(buildUser('a'))
      expect(removed).toHaveBeenCalled()
      expect(component.selectedUsers.map(u => u.wid)).toEqual(['b'])
      expect(listed).toHaveBeenCalledWith(component.selectedUsers)
    })

    it('should not remove when user not found but still emit list', () => {
      const removed = jest.spyOn(component.removedUser, 'emit')
      const listed = jest.spyOn(component.usersList, 'emit')
      component.selectedUsers = [buildUser('a')]
      component.removeUser(buildUser('zzz'))
      expect(removed).not.toHaveBeenCalled()
      expect(component.selectedUsers.length).toBe(1)
      expect(listed).toHaveBeenCalled()
    })
  })

  describe('selectUser', () => {
    const evtFor = (wid: string): any => ({ option: { value: buildUser(wid) } })

    it('should block self selection when not allowed', () => {
      component.userId = 'me-123'
      component.allowSelfAutocomplete = false
      component.selectUser(evtFor('me-123'), 'dup', 'self')
      expect(matSnackBar.open).toHaveBeenCalledWith('self')
      expect(component.selectedUsers.length).toBe(0)
    })

    it('should add a new user and emit', () => {
      const added = jest.spyOn(component.addedUser, 'emit')
      const listed = jest.spyOn(component.usersList, 'emit')
      component.selectUser(evtFor('other'), 'dup', 'self')
      expect(added).toHaveBeenCalled()
      expect(component.selectedUsers.map(u => u.wid)).toEqual(['other'])
      expect(listed).toHaveBeenCalled()
      expect(component.userInputFormRef.nativeElement.value).toBe('')
      expect(component.userFormControl.value).toBeNull()
    })

    it('should warn on duplicate user', () => {
      component.selectedUsers = [buildUser('other')]
      component.selectUser(evtFor('other'), 'dup', 'self')
      expect(matSnackBar.open).toHaveBeenCalledWith('dup')
      expect(component.selectedUsers.length).toBe(1)
    })

    it('should allow self selection when allowSelfAutocomplete is true', () => {
      component.userId = 'me-123'
      component.allowSelfAutocomplete = true
      component.selectUser(evtFor('me-123'), 'dup', 'self')
      expect(component.selectedUsers.length).toBe(1)
    })
  })
})
