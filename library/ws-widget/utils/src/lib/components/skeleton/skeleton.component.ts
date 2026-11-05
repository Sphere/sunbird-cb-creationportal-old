import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core'

export type SkeletonShape = 'line' | 'block' | 'circle' | 'pill'

/**
 * One shimmering placeholder shape, shown where content will appear while it loads.
 * Lay several out in the shape of the page (title line, media block, list rows) inside
 * a `<ws-skeleton-group>`, which tells screen readers that the area is loading.
 *
 * ```html
 * <ws-skeleton-group label="Loading the course">
 *   <ws-skeleton shape="line" width="40%" height="24px" />
 *   <ws-skeleton shape="block" height="320px" />
 * </ws-skeleton-group>
 * ```
 */
@Component({
  standalone: false,
  selector: 'ws-skeleton',
  template: '',
  styleUrls: ['./skeleton.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    class: 'ws-skeleton',
    '[class.ws-skeleton--line]': "shape() === 'line'",
    '[class.ws-skeleton--block]': "shape() === 'block'",
    '[class.ws-skeleton--circle]': "shape() === 'circle'",
    '[class.ws-skeleton--pill]': "shape() === 'pill'",
    '[style.width]': 'resolvedWidth()',
    '[style.height]': 'resolvedHeight()',
    '[style.border-radius]': 'radius() || null',
  },
})
export class SkeletonComponent {
  readonly shape = input<SkeletonShape>('line')
  /** Any CSS width; a line defaults to the full width, a circle to its height. */
  readonly width = input<string>('')
  /** Any CSS height; defaults per shape (a text line, a 16:9 block, a 40px circle). */
  readonly height = input<string>('')
  /** Any CSS border radius, to match the real element. */
  readonly radius = input<string>('')

  readonly resolvedHeight = computed(() => {
    if (this.height()) {
      return this.height()
    }
    switch (this.shape()) {
      case 'circle':
        return '40px'
      case 'pill':
        return '32px'
      case 'block':
        return null // the block keeps a 16:9 shape from its stylesheet
      default:
        return '14px'
    }
  })

  readonly resolvedWidth = computed(() => {
    if (this.width()) {
      return this.width()
    }
    if (this.shape() === 'circle') {
      return this.resolvedHeight()
    }
    return this.shape() === 'pill' ? '96px' : '100%'
  })
}

/**
 * Wraps the placeholder shapes of one loading area. Announces the area once as busy
 * (role="status", with a label read by screen readers) instead of each shape.
 */
@Component({
  standalone: false,
  selector: 'ws-skeleton-group',
  template: '<span class="ws-skeleton-sr">{{ label() }}</span><ng-content />',
  styleUrls: ['./skeleton.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'status',
    'aria-live': 'polite',
    'aria-busy': 'true',
    class: 'ws-skeleton-group',
  },
})
export class SkeletonGroupComponent {
  /** What is loading, for screen readers. */
  readonly label = input<string>('Loading…')
}
