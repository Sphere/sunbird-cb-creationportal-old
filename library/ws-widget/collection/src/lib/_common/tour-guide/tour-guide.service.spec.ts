import { NavigationEnd, NavigationStart } from '@angular/router'
import { Subject } from 'rxjs'

import { CustomTourService } from './tour-guide.service'

describe('CustomTourService', () => {
  let service: CustomTourService
  let routerEvents: Subject<any>
  let router: any
  let configSvc: any
  let tourInstance: any

  beforeEach(() => {
    routerEvents = new Subject()
    router = { events: routerEvents, url: '/home' }
    configSvc = { userPreference: { isDarkMode: false } }

    tourInstance = {
      addStep: jest.fn(),
      start: jest.fn(),
      on: jest.fn(),
      back: jest.fn(),
      next: jest.fn(),
      cancel: jest.fn(),
    }
    ;(global as any).Shepherd = { Tour: jest.fn().mockImplementation(() => tourInstance) }

    service = new CustomTourService(router, configSvc)
  })

  afterEach(() => {
    delete (global as any).Shepherd
  })

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  it('startTour creates and starts a Shepherd tour and returns false', () => {
    const result = service.startTour()
    expect((global as any).Shepherd.Tour).toHaveBeenCalled()
    expect(tourInstance.start).toHaveBeenCalled()
    expect(service.tour).toBe(tourInstance)
    expect(result).toBe(false)
  })

  it('startTour adds a step for a section that has rendered children', () => {
    const section = document.createElement('div')
    section.id = 'sec1'
    section.appendChild(document.createElement('span'))
    document.body.appendChild(section)

    service.data = [['#sec1', 'Title', 'Body text']]
    service.startTour()

    expect(tourInstance.addStep).toHaveBeenCalledTimes(1)
    section.remove()
  })

  it('startTour uses dark-mode classes when the user prefers dark mode', () => {
    configSvc.userPreference.isDarkMode = true
    service.startTour()
    const options = (global as any).Shepherd.Tour.mock.calls[0][0]
    expect(options.defaultStepOptions.classes).toBe('tour-darkmode')
  })

  it('cancelTour cancels the active tour and signals completion', done => {
    service.tour = tourInstance
    service.isTourComplete.subscribe(v => {
      expect(v).toBe(true)
      done()
    })
    service.cancelTour()
    expect(tourInstance.cancel).toHaveBeenCalled()
  })

  it('createPopupTour builds and stores a popup tour', () => {
    const tour = service.createPopupTour()
    expect(tour).toBe(tourInstance)
    expect(service.popupTour).toBe(tourInstance)
    expect(tourInstance.addStep).toHaveBeenCalled()
  })

  it('startPopupTour starts the stored popup tour', () => {
    service.popupTour = tourInstance
    service.startPopupTour()
    expect(tourInstance.start).toHaveBeenCalled()
  })

  it('cancelPopupTour cancels the stored popup tour', () => {
    service.popupTour = tourInstance
    service.cancelPopupTour()
    expect(tourInstance.cancel).toHaveBeenCalled()
  })

  it('cancels the active tour on router navigation events', () => {
    service.tour = tourInstance
    const spy = jest.spyOn(service, 'cancelTour')
    routerEvents.next(new NavigationStart(1, '/next'))
    expect(spy).toHaveBeenCalled()
    routerEvents.next(new NavigationEnd(1, '/next', '/next'))
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
