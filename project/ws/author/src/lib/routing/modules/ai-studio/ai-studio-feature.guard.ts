import { Injectable } from '@angular/core'

import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router'

import { AI_STUDIO_DEFAULT_FEATURE, isAIStudioFeature } from './ai-studio.features'

/**
 * Keeps an unknown feature id off the screen.
 *
 * ':feature' matches any single segment, so '/ai-studio/whatever' used to
 * activate the dashboard with active = 'whatever'. Every branch in its template
 * tests for a known id, so all of them were false and the page rendered
 * nothing at all — a blank screen with no error, which reads as broken rather
 * than as a bad link.
 *
 * Redirecting rather than blocking: a wrong id is a typo or a stale bookmark,
 * and the useful answer to either is the default feature, not a dead end.
 */
@Injectable({ providedIn: 'root' })
export class AIStudioFeatureGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    if (isAIStudioFeature(route.paramMap.get('feature'))) {
      return true
    }

    return this.router.createUrlTree(['/author/my-content/ai-studio', AI_STUDIO_DEFAULT_FEATURE])
  }
}
