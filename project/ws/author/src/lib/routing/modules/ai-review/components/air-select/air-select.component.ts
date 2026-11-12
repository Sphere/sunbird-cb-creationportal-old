import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, input, output, signal } from '@angular/core'

export interface AirSelectOption {
  value: string
  label: string
  /** A second, quieter line under the label. */
  hint?: string
}

let nextId = 0

/**
 * A dropdown with a styled list, following the WAI-ARIA "select-only combobox" pattern:
 * the button is the combobox, the list is a listbox, and the highlighted option is announced
 * through aria-activedescendant. Keyboard: Enter/Space/↓ open; ↑ ↓ Home End move; Enter/Space
 * choose; Escape or Tab close; typing a letter jumps to the next option starting with it.
 *
 * `searchable` adds a filter box at the top of the list, for long lists (every competency):
 * typing narrows the options by label or hint, and the arrow keys and Enter still work.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-air-select',
  templateUrl: './air-select.component.html',
  styleUrls: ['./air-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AirSelectComponent {
  private readonly host = inject(ElementRef<HTMLElement>)

  readonly options = input.required<AirSelectOption[]>()
  readonly value = input<string | null>(null)
  readonly placeholder = input('Select')
  /** Id of the visible label, so the combobox is announced with it. */
  readonly labelledBy = input<string | null>(null)
  readonly invalid = input(false)
  readonly searchable = input(false)
  readonly searchPlaceholder = input('Type to search')
  readonly valueChange = output<string>()

  readonly id = `air-select-${++nextId}`
  readonly open = signal(false)
  readonly active = signal(0)
  readonly query = signal('')

  readonly selected = computed(() => this.options().find(o => o.value === this.value()) || null)
  /** The options shown: all of them, or those matching the search. */
  readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase()
    if (!this.searchable() || !q) {
      return this.options()
    }
    return this.options().filter(o => `${o.label} ${o.hint || ''}`.toLowerCase().includes(q))
  })
  readonly activeId = computed(() => (this.open() ? `${this.id}-opt-${this.active()}` : null))

  toggle(): void {
    if (this.open()) {
      this.close()
    } else {
      this.openList()
    }
  }

  openList(seed = ''): void {
    this.query.set(seed)
    const i = this.visible().findIndex(o => o.value === this.value())
    this.active.set(i >= 0 ? i : 0)
    this.open.set(true)
    if (this.searchable()) {
      setTimeout(() => ((this.host.nativeElement as HTMLElement).querySelector?.('.air-select-search input') as HTMLInputElement | null)?.focus())
    }
  }

  onSearch(text: string): void {
    this.query.set(text)
    this.active.set(0)
  }

  close(): void {
    this.open.set(false)
  }

  choose(index: number): void {
    const option = this.visible()[index]
    if (option) {
      this.valueChange.emit(option.value)
    }
    this.close()
  }

  onKeydown(event: KeyboardEvent): void {
    const inSearch = (event.target as HTMLElement | null)?.tagName === 'INPUT'
    // In the search box, a space or a letter is text, not a command.
    if (inSearch && event.key === ' ') {
      return
    }
    // On the closed button of a searchable list, a letter opens it with that letter typed.
    if (!inSearch && this.searchable() && event.key.length === 1 && /\S/.test(event.key)) {
      event.preventDefault()
      this.openList(event.key)
      return
    }
    const count = this.visible().length
    if (!count && event.key !== 'Escape') {
      return
    }
    const move = (to: number) => {
      event.preventDefault()
      if (!this.open()) {
        this.openList()
        return
      }
      this.active.set(Math.max(0, Math.min(count - 1, to)))
      this.scrollActiveIntoView()
    }
    switch (event.key) {
      case 'ArrowDown':
        return move(this.active() + 1)
      case 'ArrowUp':
        return move(this.active() - 1)
      case 'Home':
        return move(0)
      case 'End':
        return move(count - 1)
      case 'Enter':
      case ' ':
        event.preventDefault()
        return this.open() ? this.choose(this.active()) : this.openList()
      case 'Escape':
        if (this.open()) {
          event.preventDefault()
          this.close()
          ;(this.host.nativeElement as HTMLElement).querySelector?.<HTMLElement>('.air-select-trigger')?.focus()
        }
        return
      case 'Tab':
        return this.close()
      default:
        if (!inSearch && event.key.length === 1 && /\S/.test(event.key)) {
          this.typeahead(event.key)
        }
    }
  }

  /** Jumps to the next option whose label starts with the typed character. */
  private typeahead(char: string): void {
    const list = this.visible()
    const start = this.open() ? this.active() + 1 : 0
    for (let n = 0; n < list.length; n++) {
      const i = (start + n) % list.length
      if (list[i].label.toLowerCase().startsWith(char.toLowerCase())) {
        if (!this.open()) {
          this.open.set(true)
        }
        this.active.set(i)
        this.scrollActiveIntoView()
        return
      }
    }
  }

  private scrollActiveIntoView(): void {
    const el = (this.host.nativeElement as HTMLElement).querySelector?.(`#${this.id}-opt-${this.active()}`) as HTMLElement | null
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' })
    }
  }

  /** Closes when a click lands anywhere outside this dropdown. */
  @HostListener('document:mousedown', ['$event'])
  onDocumentMousedown(event: MouseEvent): void {
    if (this.open() && !(this.host.nativeElement as HTMLElement).contains(event.target as Node)) {
      this.close()
    }
  }
}
