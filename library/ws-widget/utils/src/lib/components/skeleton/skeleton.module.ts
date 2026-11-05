import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'

import { SkeletonComponent, SkeletonGroupComponent } from './skeleton.component'

/** Shimmer placeholders for loading states: `<ws-skeleton-group>` and `<ws-skeleton>`. */
@NgModule({
  declarations: [SkeletonComponent, SkeletonGroupComponent],
  imports: [CommonModule],
  exports: [SkeletonComponent, SkeletonGroupComponent],
})
export class SkeletonModule {}
