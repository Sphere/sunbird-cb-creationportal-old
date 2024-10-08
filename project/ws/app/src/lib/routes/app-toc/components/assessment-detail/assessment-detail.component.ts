import { Component, Input, OnInit } from '@angular/core'
import { NSQuiz } from '../../../../../../../viewer/src/lib/plugins/quiz/quiz.model'
import { HttpClient } from '@angular/common/http'

@Component({
  selector: 'ws-app-assessment-detail',
  templateUrl: './assessment-detail.component.html',
  styleUrls: ['./assessment-detail.component.scss'],
})
export class AssessmentDetailComponent implements OnInit {

  @Input() forPreview = false
  @Input() resourceLink: any
  @Input() content: any
  assesmentdata: any = {
    timeLimit: 0,
    questions: [
      {
        multiSelection: false,
        question: '',
        questionId: '',
        options: [
          {
            optionId: '',
            text: '',
            isCorrect: false,
          },
        ],
      },
    ],
    isAssessment: false,
    passPercentage: 60,
  }

  constructor(
    private http: HttpClient,
  ) {
  }

  async ngOnInit() {
    this.assesmentdata = await this.transformQuiz(this.content)



    console.log("this.content", this.content, this.assesmentdata)

  }
  /* api call to get info of quiz or assessment */
  private async transformQuiz(content: any): Promise<any> {
    if (content.artifactUrl) {
      let quizJSON: NSQuiz.IQuiz = await this.http
        .get<any>(this.content.artifactUrl || '')
        .toPromise()
        .catch((_err: any) => {
          // throw new DataResponseError('MANIFEST_FETCH_FAILED');
        })
      return quizJSON
    }
  }
}
