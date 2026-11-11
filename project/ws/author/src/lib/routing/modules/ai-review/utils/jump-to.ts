/**
 * Takes the user to what needs fixing: scrolls a section into view, puts the keyboard focus on
 * its first control, and briefly highlights it so the eye lands there. Instant, with no
 * highlight animation, for anyone who has asked for less motion.
 */
export function jumpTo(doc: Document, id: string): void {
  const el = doc.getElementById(id)
  if (!el) {
    return
  }
  const still = !!doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView?.({ behavior: still ? 'auto' : 'smooth', block: 'center' })
  const control = el.querySelector<HTMLElement>('input:not([disabled]):not([type="hidden"]), button:not([disabled]), textarea, select')
  control?.focus({ preventScroll: true })
  if (still) {
    return
  }
  el.classList.remove('air-flash')
  // Restart the highlight if it is asked for again before it ends.
  void el.offsetWidth
  el.classList.add('air-flash')
  doc.defaultView?.setTimeout(() => el.classList.remove('air-flash'), 1600)
}

/** What a blocked Start can take the user to, from its message; null when there is no one place. */
export function fixFor(message: string, resourcesId: string, unit: 'resource' | 'file'): { id: string; label: string } | null {
  if (message.startsWith('Pick the audience')) {
    return { id: 'air-audience', label: 'Go to Audience' }
  }
  if (message.startsWith('Tick at least one') || /are chosen; one review covers/.test(message) || /Untick \d+/.test(message)) {
    return { id: resourcesId, label: unit === 'file' ? 'Choose files' : 'Choose resources' }
  }
  return null
}
