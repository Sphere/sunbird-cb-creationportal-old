import { Component, OnInit } from '@angular/core'
import { AIHubService } from '../../services/aihub.service'

@Component({
  selector: 'ws-author-question-generator',
  templateUrl: './question-generator.component.html',
  styleUrls: ['./question-generator.component.scss']
})
export class QuestionGeneratorComponent implements OnInit {

  constructor(private aiHubService: AIHubService) { }

  ngOnInit() {
  }
  upload(files: File[]) {
    const formData = new FormData()
    Array.from(files).forEach(f => formData.append('file', f))
    this.aiHubService.getUUID(formData).subscribe((res: any) => {
      console.log('Upload uui:', res)
      localStorage.removeItem('uuid_number')
      localStorage.setItem('uuid_number', res.data)
    })
  }
  onDownloadClick() {
    this.aiHubService.downloadQuestions(localStorage.getItem('uuid_number'))
  }
}
