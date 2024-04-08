import { Component, OnInit } from '@angular/core'
import { FormBuilder, FormGroup } from '@angular/forms'
import { AIHubService } from '../../services/aihub.service'
@Component({
  selector: 'ws-author-translate',
  templateUrl: './translate.component.html',
  styleUrls: ['./translate.component.scss']
})
export class TranslateComponent implements OnInit {
  translateForm!: FormGroup
  languages = [
    { code: 'en', name: 'English' },
    { code: 'kn', name: 'Kannada' },
    { code: 'pa', name: 'Punjabi' },
    { code: 'hi', name: 'Hindi' }
  ];

  constructor(private formBuilder: FormBuilder, private aiHubService: AIHubService) {
    console.log('call me')
  }

  ngOnInit() {
    this.translateForm = this.formBuilder.group({
      sourceLanguage: ['en'],
      inputText: [''],
      translatedText: [{ value: '', disabled: false }]
    })
  }
  onSubmit() {

    if (this.translateForm.invalid) {
      return
    }
    if (this.translateForm.value.sourceLanguage && this.translateForm.value.inputText) {
      const reqBody = {
        sourceLanguage: 'en',
        targetLanguage: this.translateForm.value.sourceLanguage,
        source: this.translateForm.value.inputText
      }

      this.aiHubService.translate(reqBody).subscribe(
        (response: any) => {
          if (response) {
            const translatedText = response.pipelineResponse[0].output[0].target
            const translatedTextControl = this.translateForm.get('translatedText')
            if (translatedTextControl) {
              translatedTextControl.patchValue(translatedText)
            }
          }

        },
        (error: any) => {
          console.error('Error occurred while translating:', error)
          // Handle error
        }
      )
    }
  }

}
