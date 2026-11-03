import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, input, output, signal } from '@angular/core'

let nextId = 0

/**
 * A text field with suggestions: type anything, or pick one of the suggestions shown under
 * it, filtered by what is typed (WAI-ARIA "editable combobox with list autocomplete").
 * Keyboard: ↓ opens and moves, ↑ moves, Enter picks the highlighted one, Escape closes.
 * Styled like the other AI review fields; the native datalist looked and filtered
 * differently in every browser.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-air-combobox',
  templateUrl: './air-combobox.component.html',
  styleUrls: ['./air-combobox.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AirComboboxComponent {
  private readonly host = inject(ElementRef<HTMLElement>)

  readonly suggestions = input<string[]>([])
  readonly value = input('')
  readonly placeholder = input('')
  readonly maxLength = input(200)
  /** Id of the visible label, so the field is announced with it. */
  readonly labelledBy = input<string | null>(null)
  readonly valueChange = output<string>()

  readonly id = `air-combobox-${++nextId}`
  readonly open = signal(false)
  readonly active = signal(-1)
  /** What the user has typed since opening; empty shows every suggestion. */
  readonly filter = signal('')

  readonly visible = computed(() => {
    const q = this.filter().trim().toLowerCase()
    const list = this.suggestions()
    return q ? list.filter(s => s.toLowerCase().includes(q)) : list
  })
  readonly activeId = computed(() => (this.open() && this.active() >= 0 ? `${this.id}-opt-${this.active()}` : null))

  onInput(text: string): void {
    this.valueChange.emit(text)
    this.filter.set(text)
    this.active.set(-1)
    this.open.set(this.suggestions().length > 0)
  }

  /** Opening from the field or the arrow shows every suggestion, not only those matching. */
  openList(): void {
    if (!this.suggestions().length) {
      return
    }
    this.filter.set('')
    this.active.set(Math.max(0, this.suggestions().indexOf(this.value())))
    this.open.set(true)
  }

  toggle(): void {
    if (this.open()) {
      this.open.set(false)
    } else {
      this.openList()
      ;(this.host.nativeElement as HTMLElement).querySelector?.<HTMLInputElement>('input')?.focus()
    }
  }

  pick(index: number): void {
    const choice = this.visible()[index]
    if (choice !== undefined) {
      this.valueChange.emit(choice)
    }
    this.open.set(false)
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.visible().length
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!this.open()) {
          this.openList()
        } else if (count) {
          this.active.set(Math.min(count - 1, this.active() + 1))
          this.scrollActiveIntoView()
        }
        return
      case 'ArrowUp':
        if (this.open() && count) {
          event.preventDefault()
          this.active.set(Math.max(0, this.active() - 1))
          this.scrollActiveIntoView()
        }
        return
      case 'Enter':
        if (this.open() && this.active() >= 0) {
          event.preventDefault()
          this.pick(this.active())
        }
        return
      case 'Escape':
        if (this.open()) {
          event.preventDefault()
          this.open.set(false)
        }
        return
      case 'Tab':
        this.open.set(false)
        return
    }
  }

  private scrollActiveIntoView(): void {
    const el = (this.host.nativeElement as HTMLElement).querySelector?.(`#${this.id}-opt-${this.active()}`) as HTMLElement | null
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' })
    }
  }

  /** Closes when a click lands anywhere outside the field and its list. */
  @HostListener('document:mousedown', ['$event'])
  onDocumentMousedown(event: MouseEvent): void {
    if (this.open() && !(this.host.nativeElement as HTMLElement).contains(event.target as Node)) {
      this.open.set(false)
    }
  }
}
