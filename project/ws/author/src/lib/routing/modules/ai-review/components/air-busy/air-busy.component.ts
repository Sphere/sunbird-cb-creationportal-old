import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { interval } from 'rxjs'

/**
 * One way to show that the AI review is working on something: a turning ring, what is being
 * done, how long it has taken so far, and how long it usually takes ("Taking longer than
 * usual" once that has passed). An honest stand-in for "time left", which these calls cannot
 * know. Used for every wait on the setup screen, so they all look and read the same.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-air-busy',
  templateUrl: './air-busy.component.html',
  styleUrls: ['./air-busy.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AirBusyComponent {
  /** What is being done, as a phrase: "Reading the course". */
  readonly label = input.required<string>()
  /** A second, quieter line: what it is for. */
  readonly detail = input('')
  /** How long this usually takes, in seconds; 0 hides the hint. */
  readonly typicalSec = input(0)
  /** 'md' for a whole card waiting, 'sm' for a line inside one. */
  readonly size = input<'sm' | 'md'>('sm')

  readonly elapsed = signal(0)
  readonly slow = computed(() => this.typicalSec() > 0 && this.elapsed() > this.typicalSec())
  /** "8 s", "1 min 5 s". */
  readonly elapsedText = computed(() => {
    const s = this.elapsed()
    return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`
  })

  constructor() {
    interval(1000)
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.elapsed.update(s => s + 1))
  }
}
