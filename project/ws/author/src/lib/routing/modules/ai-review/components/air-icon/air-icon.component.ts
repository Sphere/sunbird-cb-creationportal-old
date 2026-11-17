import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'

/**
 * Icons for the AI review screens, drawn as AI Studio draws its own (aastrika-ai-service
 * frontend, ui/icon): one 1.75 stroke on a 24-unit grid, round caps and joins, in
 * `currentColor`. Where AI Studio has the glyph its path is used as is; the rest are drawn in
 * the same line language, so the two AI features in CBP read as one family.
 *
 * Inline paths, because CBP bundles an older Material Icons font that lacks newer glyphs.
 * Paths are fixed data in this file; nothing from the user or the AI is rendered as markup.
 */
export const AIR_ICONS = {
  // AI Studio's arrowLeft.
  arrowBack: 'M19 12H5M11 18l-6-6 6-6',
  // AI Studio's arrowRight.
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  // A clipboard with a tick.
  assessment: 'M9 3h6v3H9zM9 4.5H6a2 2 0 00-2 2V19a2 2 0 002 2h12a2 2 0 002-2V6.5a2 2 0 00-2-2h-3M9 14l2 2 4-4',
  // AI Studio's mic.
  audio: 'M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v3',
  chart: 'M18 20V10M12 20V4M6 20v-6',
  check: 'M20 6L9 17l-5-5',
  /** Coverage: covered. */
  checkCircle: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3',
  // AI Studio's listCheck.
  checklist: 'M11 6h10M11 12h10M11 18h10M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17',
  chevronDown: 'M6 9l6 6 6-6',
  // AI Studio's chevronLeft, chevronRight and users.
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  close: 'M18 6L6 18M6 6l12 12',
  code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  // AI Studio's document.
  document: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3',
  error: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 8v4M12 16h.01',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z',
  // A graduation cap: the subject expert.
  expert: 'M22 10L12 5 2 10l10 5 10-5zM6 12.2V17c3.3 2.7 8.7 2.7 12 0v-4.8M22 10v5',
  history: 'M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2',
  /** Coverage: missing. */
  cancelCircle: 'M12 22a10 10 0 100-20 10 10 0 000 20zM15 9l-6 6M9 9l6 6',
  info: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01',
  link: 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  /** Coverage: partial. A ring with its right half filled (drawn solid). */
  partial: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 010 16V4z',
  // AI Studio's document, for a PDF; the tile colour says "PDF".
  pdf: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  // AI Studio's answer options: a list with a radio dot on each line.
  quiz: 'M10 6h11M10 12h11M10 18h11M5 7.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM5 13.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM5 19.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  question: 'M12 22a10 10 0 100-20 10 10 0 000 20zM9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01',
  // AI Studio's book.
  read: 'M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5zM4 19.5A2.5 2.5 0 006.5 22H20v-5',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.35-4.35',
  // AI Studio's sparkles: the mark for "the model did this", drawn solid.
  sparkle:
    'M10 5L11.8 11.2L18 13L11.8 14.8L10 21L8.2 14.8L2 13L8.2 11.2ZM18 1.5L19 4L21.5 5L19 6L18 8.5L17 6L14.5 5L17 4ZM19.5 15.5L20.2 17.3L22 18L20.2 18.7L19.5 20.5L18.8 18.7L17 18L18.8 17.3Z',
  table: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18',
  target: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z',
  // AI Studio's clock.
  timer: 'M12 2a10 10 0 100 20 10 10 0 000-20M12 6v6l4 2',
  openNew: 'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3',
  // AI Studio's video camera (from its two-tone set).
  video: 'M3 7a2 2 0 012-2h9a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2zM16 10l5-3v10l-5-3',
  // AI Studio's alert.
  warning: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  upload: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
} as const

export type AirIconName = keyof typeof AIR_ICONS

/** Glyphs that are shapes rather than lines, drawn solid (as AI Studio draws its sparkles). */
export const AIR_FILLED: ReadonlySet<AirIconName> = new Set<AirIconName>(['sparkle', 'partial'])

@Component({
  standalone: false,
  selector: 'ws-auth-air-icon',
  template: `<svg
    viewBox="0 0 24 24"
    [attr.width]="size()"
    [attr.height]="size()"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path
      [attr.d]="path()"
      [attr.fill]="filled() ? 'currentColor' : 'none'"
      [attr.stroke]="filled() ? 'none' : 'currentColor'"
      [attr.fill-rule]="filled() ? 'evenodd' : null"
    />
  </svg>`,
  styles: [':host { display: inline-flex; flex-shrink: 0; line-height: 0; } svg { display: block; flex: none; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AirIconComponent {
  readonly name = input.required<AirIconName>()
  readonly size = input(20)
  readonly path = computed(() => AIR_ICONS[this.name()] || '')
  readonly filled = computed(() => AIR_FILLED.has(this.name()))
}
