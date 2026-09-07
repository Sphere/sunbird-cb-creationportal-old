import { Injectable, inject } from '@angular/core'

import { DomSanitizer, SafeHtml, SafeResourceUrl, SafeStyle, SafeUrl } from '@angular/platform-browser'

/**
 * The single place in the application where Angular's built-in sanitization is
 * bypassed.
 *
 * Every `bypassSecurityTrust*` call used to be made inline at the point of use --
 * around thirty of them across nineteen files -- so the decision to trust a value
 * was taken over and over, in isolation, with no shared rule and nowhere to review
 * it. Routing them through here does not by itself make any single value safer, but
 * it does three things that do matter:
 *
 *   1. there is one file to audit, and one place a security review has to look;
 *   2. a guard applies to every bypass at once (see `EXECUTABLE_SCHEME`);
 *   3. a new call site is a call to this service, not a fresh unreviewed bypass.
 *
 * Callers must still only pass values they control or have already sanitized.
 * Passing unescaped user input here is an XSS hole exactly as it was before: this
 * centralises the risk, it does not remove it.
 *
 * Two ways in, same logic:
 *
 *   - the static methods, for the existing call sites. They already hold a
 *     `DomSanitizer` and are unit-tested by direct construction (`new Component(...)`,
 *     the convention for the heavy components here), which rules out `inject()` and
 *     would otherwise mean threading a new constructor argument through every one of
 *     them and the twenty-six specs that mock the sanitizer;
 *   - the instance methods, for DI callers such as `pipeSafeSanitizer` and any new
 *     code, which should prefer injecting the service.
 */
@Injectable({ providedIn: 'root' })
export class SafeContentService {
  private readonly sanitizer = inject(DomSanitizer)

  /**
   * Schemes that can execute script when placed in an href, src or url(). No
   * legitimate content here uses them, so they are refused rather than trusted.
   * `data:` is deliberately not refused -- certificate previews are data-URI SVGs.
   */
  private static readonly EXECUTABLE_SCHEME = /^\s*(javascript|vbscript)\s*:/i

  private static guard(value: string, kind: string): string {
    if (typeof value === 'string' && SafeContentService.EXECUTABLE_SCHEME.test(value)) {
      // Refusing outright would swap an injection for a crash, so degrade to a
      // harmless value and leave a trace for whoever has to explain the blank spot.
      // eslint-disable-next-line no-console
      console.error(`SafeContentService: refused to trust an executable-scheme ${kind}`)
      return ''
    }
    return value
  }

  /** Renders `value` as markup without escaping it. */
  static trustedHtml(sanitizer: DomSanitizer, value: string): SafeHtml {
    return sanitizer.bypassSecurityTrustHtml(SafeContentService.guard(value, 'html'))
  }

  /** Trusts `value` as a CSS value, typically a `url(...)` for a background. */
  static trustedStyle(sanitizer: DomSanitizer, value: string): SafeStyle {
    return sanitizer.bypassSecurityTrustStyle(SafeContentService.guard(value, 'style'))
  }

  /** Trusts `value` as a link or media URL. */
  static trustedUrl(sanitizer: DomSanitizer, value: string): SafeUrl {
    return sanitizer.bypassSecurityTrustUrl(SafeContentService.guard(value, 'url'))
  }

  /** Trusts `value` as a URL loaded into an iframe, object or embed. */
  static trustedResourceUrl(sanitizer: DomSanitizer, value: string): SafeResourceUrl {
    return sanitizer.bypassSecurityTrustResourceUrl(SafeContentService.guard(value, 'resource url'))
  }

  /**
   * Type-keyed static form, used by the `pipeSafeSanitizer` pipe.
   *
   * There is deliberately no 'script' case: bypassing sanitization to inject
   * executable script had no call site anywhere in the application, and the pipe is
   * only ever used with 'html' and 'resourceUrl'. Anything needing it should be
   * reviewed on its own merits rather than finding the door already open.
   */
  static trust(sanitizer: DomSanitizer, value: string, type: string = 'html'): SafeHtml | SafeStyle | SafeUrl | SafeResourceUrl {
    switch (type) {
      case 'html':
        return SafeContentService.trustedHtml(sanitizer, value)
      case 'style':
        return SafeContentService.trustedStyle(sanitizer, value)
      case 'url':
        return SafeContentService.trustedUrl(sanitizer, value)
      case 'resourceUrl':
        return SafeContentService.trustedResourceUrl(sanitizer, value)
      default:
        throw new Error(`Invalid safe type specified: ${type}`)
    }
  }

  trustedHtml(value: string): SafeHtml {
    return SafeContentService.trustedHtml(this.sanitizer, value)
  }

  trustedStyle(value: string): SafeStyle {
    return SafeContentService.trustedStyle(this.sanitizer, value)
  }

  trustedUrl(value: string): SafeUrl {
    return SafeContentService.trustedUrl(this.sanitizer, value)
  }

  trustedResourceUrl(value: string): SafeResourceUrl {
    return SafeContentService.trustedResourceUrl(this.sanitizer, value)
  }

  /**
   * Type-keyed entry point, for callers that pick the kind at runtime. Mirrors the
   * contract of the `pipeSafeSanitizer` pipe, which delegates here.
   */
  trust(value: string, type: string = 'html'): SafeHtml | SafeStyle | SafeUrl | SafeResourceUrl {
    return SafeContentService.trust(this.sanitizer, value, type)
  }
}
