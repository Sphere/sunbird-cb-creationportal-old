import { Injectable } from '@angular/core'

import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router'

import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'

import { AI_STUDIO_DEFAULT_FEATURE, aiStudioFeaturesFor } from './ai-studio.features'

/**
 * Keeps a feature this user may not open — or no feature at all — off the
 * screen.
 *
 * ':feature' matches any single segment, so '/ai-studio/whatever' used to
 * activate the dashboard with active = 'whatever'. Every branch in its template
 * tests for a known id, so all of them were false and the page rendered
 * nothing at all — a blank screen with no error, which reads as broken rather
 * than as a bad link.
 *
 * Redirecting rather than blocking: a wrong id is a typo or a stale bookmark,
 * and the useful answer to either is a feature the person can actually use, not
 * a dead end. A URL for a feature their roles do not cover is the same case —
 * a link someone shared — so it lands the same way.
 *
 * This is the menu's gate, not the system's: the service checks the caller
 * itself, because a host cannot be trusted to.
 */
@Injectable({ providedIn: 'root' })
export class AIStudioFeatureGuard implements CanActivate {
  constructor(
    private router: Router,
    private accessService: AccessControlService,
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const allowed = aiStudioFeaturesFor(roles => this.accessService.hasRole(roles))
    const wanted = route.paramMap.get('feature')

    if (allowed.some(f => f.id === wanted)) {
      return true
    }

    // The first feature they may open, rather than the catalogue's first: for
    // an assessment-only user, contentStudio is exactly as unreachable as the
    // typo they arrived with. Falls back to the default only if the list is
    // empty, which keeps the redirect a real URL in every case.
    const landing = allowed.length ? allowed[0].id : AI_STUDIO_DEFAULT_FEATURE
    return this.router.createUrlTree(['/author/my-content/ai-studio', landing])
  }
}
