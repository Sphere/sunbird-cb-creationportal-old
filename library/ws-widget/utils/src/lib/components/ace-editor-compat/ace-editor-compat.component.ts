import {
  Component,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core'

import * as ace from 'ace-builds'
import 'ace-builds/src-min-noconflict/mode-text'
import 'ace-builds/src-min-noconflict/mode-javascript'
import 'ace-builds/src-min-noconflict/mode-python'
import 'ace-builds/src-min-noconflict/mode-java'
import 'ace-builds/src-min-noconflict/mode-html'
import 'ace-builds/src-min-noconflict/mode-css'
import 'ace-builds/src-min-noconflict/mode-sql'
import 'ace-builds/src-min-noconflict/theme-monokai'
import 'ace-builds/src-min-noconflict/theme-eclipse'

@Component({
  standalone: false,
  // Drop-in replacement for ng2-ace-editor — matches both element and attribute selector
  selector: 'ace-editor, [ace-editor]',
  template: '<div #aceHost style="width:100%;height:100%;min-height:150px"></div>',
})
export class AceEditorCompatComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('aceHost', { static: true }) host!: ElementRef<HTMLDivElement>

  @Input() mode = 'text'
  @Input() theme = 'monokai'
  @Input() readOnly = false
  @Input() options: Record<string, any> = {}
  @Input() autoUpdateContent = true
  @Input() durationBeforeCallback = 0

  @Input() set text(v: string) {
    this._pendingText = v
    if (this._editor && this.autoUpdateContent) {
      const cur = this._editor.getValue()
      if (cur !== v) {
        this._editor.setValue(v || '', -1)
      }
    }
  }
  @Output() textChange = new EventEmitter<string>()
  @Output() textChanged = new EventEmitter<string>()

  private _editor: any = null
  private _pendingText = ''
  private _debounceTimer: any = null

  ngAfterViewInit() {
    this._editor = ace.edit(this.host.nativeElement)
    this._editor.setTheme(`ace/theme/${this.theme}`)
    this._editor.session.setMode(`ace/mode/${this.mode}`)
    this._editor.setReadOnly(this.readOnly)
    this._editor.setOptions({ ...this.options })
    if (this._pendingText) {
      this._editor.setValue(this._pendingText, -1)
    }
    this._editor.on('change', () => {
      const val = this._editor.getValue()
      if (this.durationBeforeCallback > 0) {
        clearTimeout(this._debounceTimer)
        this._debounceTimer = setTimeout(() => {
          this.textChange.emit(val)
          this.textChanged.emit(val)
        }, this.durationBeforeCallback)
      } else {
        this.textChange.emit(val)
        this.textChanged.emit(val)
      }
    })
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this._editor) { return }
    if (changes['mode']) { this._editor.session.setMode(`ace/mode/${this.mode}`) }
    if (changes['theme']) { this._editor.setTheme(`ace/theme/${this.theme}`) }
    if (changes['readOnly']) { this._editor.setReadOnly(this.readOnly) }
    if (changes['options']) { this._editor.setOptions({ ...this.options }) }
  }

  ngOnDestroy() {
    clearTimeout(this._debounceTimer)
    if (this._editor) { this._editor.destroy() }
  }
}
