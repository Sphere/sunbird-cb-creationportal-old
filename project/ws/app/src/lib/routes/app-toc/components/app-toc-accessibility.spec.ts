import * as fs from 'fs'
import * as path from 'path'

import { isActivationKey } from '@ws-widget/utils'

import { AppLearnerBannerComponent } from './app-learner-banner/app-learner-banner.component'

/**
 * Two WCAG failures Sonar raised as reliability bugs on these templates: a clickable
 * <span> with no keyboard path, and the certificate preview image with no alt text.
 *
 * Both live in markup rather than logic, so they are asserted against the templates.
 * Rendering the banner would mean standing up nine collaborators and a large template
 * for what is a two-attribute check.
 */
describe('app-toc accessibility', () => {
  const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, ...p), 'utf8')

  describe('learner banner: the organisation link', () => {
    const template = read('app-learner-banner', 'app-learner-banner.component.html')

    // A native <button> now (Sonar: tabindex only on interactive elements). It is
    // focusable, announced as a button and fires its click on Enter/Space by itself,
    // which the old span needed tabindex, role and a keydown handler to imitate.
    it('is a native button, so keyboard and screen readers get it for free', () => {
      expect(template).toMatch(/<button\s+type="button"[^>]*\(click\)="showOrgprofile\(content\?\.sourceName\)"/)
    })

    it('needs no tabindex, role or duplicate keydown', () => {
      const button = template.slice(
        template.indexOf('(click)="showOrgprofile'),
        template.indexOf('</button>', template.indexOf('(click)="showOrgprofile')),
      )
      expect(button).not.toMatch(/tabindex|role="button"|\(keydown\)/)
    })

    it('still opens the org profile on click', () => {
      expect(template).toContain('(click)="showOrgprofile(content?.sourceName)"')
    })

    it('exposes the activation-key helper the template calls', () => {
      const component = new AppLearnerBannerComponent(
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        document,
      )
      expect(component.isActivationKey).toBe(isActivationKey)
    })

    const keyEvent = (key: string) => ({ key, preventDefault: jest.fn() }) as any

    it.each([['Enter'], [' '], ['Spacebar']])('treats %s as activation', key => {
      expect(isActivationKey(keyEvent(key))).toBe(true)
    })

    it.each([['Tab'], ['Escape'], ['ArrowDown'], ['a']])('leaves %s alone', key => {
      expect(isActivationKey(keyEvent(key))).toBe(false)
    })

    // Space would scroll the page and Enter would submit an enclosing form, but only
    // when the key actually activates -- navigation keys must stay untouched.
    it('suppresses the default only for activation keys', () => {
      const activate = keyEvent('Enter')
      isActivationKey(activate)
      expect(activate.preventDefault).toHaveBeenCalled()

      const navigate = keyEvent('Tab')
      isActivationKey(navigate)
      expect(navigate.preventDefault).not.toHaveBeenCalled()
    })
  })

  describe('certificate modal: the preview image', () => {
    const template = read('app-toc-certificate-modal', 'app-toc-certificate-modal.component.html')

    it('has alt text, so a screen reader can describe it', () => {
      expect(template).toMatch(/<img[^>]*\balt="[^"]+"/)
    })

    it('keeps the alt translatable', () => {
      expect(template).toContain('i18n-alt')
    })

    it('has no image left without an alt attribute', () => {
      const imgs = template.match(/<img\b[^>]*>/g) || []
      expect(imgs.length).toBeGreaterThan(0)
      for (const img of imgs) {
        expect(img).toMatch(/\balt=/)
      }
    })
  })
})
