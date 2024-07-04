import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { saveAs } from 'file-saver'
const PROTECTED_SLAG_V8 = '/apis/protected/v8'
const API_END_POINTS = {
  TRANSLATE: `${PROTECTED_SLAG_V8}/AI/translate`,
  UPLOAD_FILE_AND_GET_UUID: `${PROTECTED_SLAG_V8}/AI/uploadFileAndGetUUID`,
  GET_QUESTION: `${PROTECTED_SLAG_V8}/AI/getQuestions`
}
@Injectable({
  providedIn: 'root'
})
export class AIHubService {

  constructor(private http: HttpClient) { }

  translate(reqBody: any) {
    return this.http.post(API_END_POINTS.TRANSLATE, reqBody)
  }
  getUUID(reqBody: any) {
    return this.http.post(API_END_POINTS.UPLOAD_FILE_AND_GET_UUID, reqBody)
  }
  downloadQuestions(uuid_number: any, numQuestions: any) {
    const headers = {
      'Content-Type': 'application/json',
    }

    this.http.post(API_END_POINTS.GET_QUESTION, {
      uuid: uuid_number,
      numQuestions: numQuestions
    }, { headers, responseType: 'text' }).subscribe(response => {
      const jsonData = JSON.parse(response) // Parse JSON data
      const csvData = this.convertJSONToCSV(jsonData)
      const blob = new Blob([csvData], { type: 'text/csv' })
      saveAs(blob, 'questions.csv')
    }, error => {
      console.error('Error downloading questions:', error)
    })
  }
  convertJSONToCSV(jsonData: any): string {
    let csv = ''
    jsonData.data.forEach((item: any) => {
      Object.keys(item).forEach(key => {
        csv += item[key] + ','
      })
      csv += '\n'
    })
    return csv
  }
}
