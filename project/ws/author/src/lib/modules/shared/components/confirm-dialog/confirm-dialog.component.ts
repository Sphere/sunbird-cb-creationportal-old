import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout'
import { Component, OnInit, Inject, EventEmitter, Output } from '@angular/core'
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms'
import { MatSnackBar, MAT_DIALOG_DATA } from '@angular/material'
import { Observable, Subscription } from 'rxjs'
import { debounceTime, map } from 'rxjs/operators'
import { McqQuiz, Option } from '../../../../routing/modules/editor/routing/modules/quiz/components/quiz-class'
import { QuizStoreService } from '../../../../routing/modules/editor/routing/modules/quiz/services/store.service'
import { NotificationComponent } from '../notification/notification.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { NOTIFICATION_TIME } from '../../../../constants/constant'
import { MatSnackBarRef } from '@angular/material/snack-bar'

@Component({
  selector: 'ws-auth-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss'],
  providers: [QuizStoreService],
})
export class ConfirmDialogComponent implements OnInit {
  @Output() value = new EventEmitter<any>()
  @Output() onFormChange = new EventEmitter();
  @Output() onFormQuestion = new EventEmitter();
  quizForm!: FormGroup
  questionForm!: FormGroup
  smallScreen: Observable<boolean> = this.breakpointObserver
    .observe('(max-width:600px)')
    .pipe(map((res: BreakpointState) => res.matches))
  isSmallScreen = false
  activeIndexSubscription?: Subscription
  contentLoaded!: boolean
  index!: number
  selectedQuiz?: McqQuiz
  mcqOptions: any = {}
  selectedCount!: number
  snackbarRef?: MatSnackBarRef<NotificationComponent>

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private breakpointObserver: BreakpointObserver,
    private quizStoreSvc: QuizStoreService,
    private snackBar: MatSnackBar,
    private formBuilder: FormBuilder,
  ) {
  }

  ngOnInit() {
    if (this.data.type === 'editAssessment') {
      if (this.data.data.questionType == 'mcq-sca') {
        this.smallScreen.subscribe(v => this.isSmallScreen = v)
        this.activeIndexSubscription = this.quizStoreSvc.selectedQuizIndex.subscribe(index => {
          this.contentLoaded = false
          this.index = index
          const val = this.quizStoreSvc.getQuiz(index)
          this.selectedQuiz =
            val && (val.questionType === 'mcq-sca' || val.questionType === 'mcq-mca')
              ? new McqQuiz(val)
              : undefined
          if (val && (val.questionType === 'mcq-sca' || val.questionType === 'mcq-mca')) {
            this.setUp()
            this.contentLoaded = true
          }
        })
      } else if (this.data.data.questionType == 'fitb') {

      } else if (this.data.data.questionType == 'mtf') {

      }
    }
  }

  ngOnDestroy() {
    if (this.activeIndexSubscription) {
      this.activeIndexSubscription.unsubscribe()
    }
  }

  /*assessment functionality start*/
  setUp() {
    if (this.selectedQuiz && this.selectedQuiz.options) {
      if (this.mcqOptions) {
        this.mcqOptions = this.quizStoreSvc.getQuizConfig('mcq-sca')
      }
      this.createForm()
      for (let i = 0; i < this.mcqOptions.minOptions; i = i + 1) {
        if (this.selectedQuiz.options.length < this.mcqOptions.minOptions) {
          this.addOption()
        }
      }
      this.assignForm()
      this.selectedCount = 0
      this.selectedQuiz.options.forEach(op => {
        if (op.isCorrect) {
          this.selectedCount = this.selectedCount + 1
        }
      })
    }
  }

  assignForm() {
    const newData = this.quizStoreSvc.getQuiz(this.index)
    if (newData && newData.isInValid) {
      // this.quizForm.markAllAsTouched()
      Object.keys(this.quizForm.controls).map(v => {
        const optionsArr = this.quizForm.controls[v] as FormArray
        optionsArr.controls.map((d: any) => {
          Object.keys(d.controls).map(e => {
            if (e === 'text') {
              d.controls[e].markAsDirty()
              d.controls[e].markAsTouched()
            }
          })
        })
      })
    }
  }

  createForm() {
    this.questionForm = this.formBuilder.group({
      question: [],
    })

    this.quizForm = this.formBuilder.group({
      options: this.formBuilder.array([]),
    })
    if (this.selectedQuiz && this.selectedQuiz.options.length) {
      this.selectedQuiz.options.forEach(v => {
        this.createOptionControl(v)
      })
    }
    this.quizForm.valueChanges.pipe(debounceTime(100)).subscribe(() => {
      this.onFormChange.emit(JSON.parse(JSON.stringify(this.quizForm.value)))
      this.value.emit(JSON.parse(JSON.stringify(this.quizForm.value)))
    })

    this.questionForm.valueChanges.pipe(debounceTime(100)).subscribe(() => {
      this.onFormQuestion.emit(JSON.parse(JSON.stringify(this.questionForm.value)))
    })
  }

  createOptionControl(optionObj: Option) {
    const noWhiteSpace = new RegExp('\\S')
    const newControl = this.formBuilder.group({
      text: [optionObj.text || '', [Validators.required, Validators.pattern(noWhiteSpace)]],
      isCorrect: [optionObj.isCorrect || false],
      hint: [optionObj.hint || ''],
    })
    const optionsArr = this.quizForm.controls['options'] as FormArray
    optionsArr.push(newControl)
  }

  addOption() {
    if (this.selectedQuiz) {
      const optionsLen = this.selectedQuiz.options.length
      if (optionsLen < this.mcqOptions.maxOptions) {
        const newOption = new Option({ isCorrect: false })
        this.createOptionControl(newOption)
        this.selectedQuiz.options.push(newOption)
      } else {
        this.snackBar.openFromComponent(NotificationComponent, {
          data: {
            type: Notify.MAX_OPTIONS_REACHED,
          },
          duration: NOTIFICATION_TIME * 1000,
        })
      }
    }
  }

  onSelected($event: any) {
    this.selectedCount = $event.checked ? this.selectedCount + 1 : this.selectedCount - 1
    if (
      this.selectedQuiz &&
      this.selectedQuiz.options &&
      this.selectedCount === this.selectedQuiz.options.length
    ) {
      this.snackbarRef = this.snackBar.openFromComponent(NotificationComponent, {
        data: {
          type: Notify.MCQ_ALL_OPTIONS_CORRECT,
        },
        duration: NOTIFICATION_TIME * 500,
      })
    } else {
      if (this.snackbarRef) {
        this.snackbarRef.dismiss()
      }
    }
  }
  /*assessment functionality end*/
}
