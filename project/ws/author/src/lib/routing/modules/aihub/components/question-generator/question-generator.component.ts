import { Component, OnInit } from '@angular/core'
import { AIHubService } from '../../services/aihub.service'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'

@Component({
  selector: 'ws-author-question-generator',
  templateUrl: './question-generator.component.html',
  styleUrls: ['./question-generator.component.scss']
})
export class QuestionGeneratorComponent implements OnInit {
  questionForm!: FormGroup
  isDownload: boolean = false
  constructor(private aiHubService: AIHubService, private formBuilder: FormBuilder) { }

  ngOnInit() {
    this.initForm()
  }
  initForm(): void {
    this.questionForm = this.formBuilder.group({
      numberOfQuestions: ['', [Validators.required, Validators.min(1), Validators.max(20)]],
      file: [null, Validators.required]
    })


  }
  upload(files: File[]) {
    if (!files) {
      console.error('No files provided.')
      return
    }
    const formData = new FormData()
    Array.from(files).forEach(f => formData.append('file', f))
    this.aiHubService.getUUID(formData).subscribe((res: any) => {
      console.log('Upload uui:', res)
      localStorage.removeItem('uuid_number')
      localStorage.setItem('uuid_number', res.data)
      this.isDownload = true
    })
  }
  onKeyPress(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement
    if (input.value.length >= 2 || (input.value === '2' && parseInt(event.key) > 0) || parseInt(input.value + event.key) > 20) {
      event.preventDefault()
    }
  }
  onDownloadClick() {
    if (this.questionForm.valid && this.questionForm.value.numberOfQuestions) {
      const numberOfQuestions = this.questionForm.value.numberOfQuestions
      this.aiHubService.downloadQuestions(localStorage.getItem('uuid_number'), numberOfQuestions)
    }
  }
}
