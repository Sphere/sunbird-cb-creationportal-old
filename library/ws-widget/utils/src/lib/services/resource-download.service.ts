import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export interface IDownloadableResource {
  name?: string
  identifier?: string
  mimeType?: string
  contentType?: string
  artifactUrl?: string
  downloadUrl?: string
  children?: IDownloadableResource[]
}

export interface IDownloadableCourse extends IDownloadableResource {
  name?: string
  children?: IDownloadableResource[]
}

/**
 * Lets a course creator download course resources — individually or as a single
 * zip. Regular files (video, html-archive, pdf …) come down from their artifactUrl
 * as-is; quiz/assessment resources (mimeType application/json) are converted to an
 * Excel file using the same template as the bulk-upload (Question | Option 1-6 |
 * Correct Answer). File name = resource name + extension; zip name = course name.
 *
 * Lives in @ws-widget/utils so both @ws/author (course builder) and @ws/app
 * (content view) can use it without a cross-tier import cycle.
 */
@Injectable({ providedIn: 'root' })
export class ResourceDownloadService {
  constructor(private http: HttpClient) {}

  /** Download a single resource (file as-is, or quiz -> Excel). */
  async downloadResource(resource: any): Promise<void> {
    const { blob, fileName } = await this.buildResourceFile(resource)
    saveAs(blob, fileName)
  }

  /** Download every resource in the course as one zip named after the course. */
  async downloadAllAsZip(course: any): Promise<void> {
    const resources = this.collectResources(course)
    if (!resources.length) {
      return
    }
    const zip = new JSZip()
    const usedNames = new Set<string>()
    // Zero-padded width so entries sort correctly (01, 02 … 10) in any extractor.
    const padWidth = String(resources.length).length
    for (let i = 0; i < resources.length; i += 1) {
      try {
        const { blob, fileName } = await this.buildResourceFile(resources[i])
        // Prefix with the course position so the zip preserves the resource order
        // (file managers often re-sort by name, which would otherwise lose it).
        const seq = String(i + 1).padStart(padWidth, '0')
        zip.file(this.makeUnique(`${seq}. ${fileName}`, usedNames), blob)
      } catch {
        // Skip a resource that fails to download; keep going with the rest.
      }
    }
    const content = await zip.generateAsync({ type: 'blob' })
    saveAs(content, `${this.safeName(course.name) || 'course'}.zip`)
  }

  /** True if any downloadable resource exists under the course. */
  hasDownloadableResources(course: any): boolean {
    return !!course && this.collectResources(course).length > 0
  }

  // ── internals ─────────────────────────────────────────────────────────────

  private async buildResourceFile(
    resource: IDownloadableResource,
  ): Promise<{ blob: Blob; fileName: string }> {
    const baseName = this.safeName(resource.name) || resource.identifier || 'resource'
    const url = resource.artifactUrl || resource.downloadUrl || ''

    if (this.isQuiz(resource)) {
      const blob = await this.quizToExcelBlob(url)
      return { blob, fileName: `${baseName}.xlsx` }
    }

    const blob = await firstValueFrom(this.http.get(url, { responseType: 'blob' }))
    const ext = this.extFromUrl(url) || this.extFromMime(resource.mimeType) || 'bin'
    return { blob, fileName: `${baseName}.${ext}` }
  }

  private isQuiz(resource: IDownloadableResource): boolean {
    return (
      resource.mimeType === 'application/json' ||
      (resource.artifactUrl || '').split('?')[0].toLowerCase().endsWith('.json')
    )
  }

  /** Fetch the quiz.json and build an Excel matching the bulk-upload template. */
  private async quizToExcelBlob(url: string): Promise<Blob> {
    const json: any = await firstValueFrom(this.http.get(url))
    const questions: any[] =
      json?.questions || json?.data?.questions || json?.contents?.[0]?.data?.questions || []

    const rows = questions.map((q: any) => {
      const options: any[] = q?.options || []
      const row: Record<string, string> = { Question: this.stripHtml(q?.question) }
      for (let i = 0; i < 6; i += 1) {
        row[`Option ${i + 1}`] = options[i] ? this.stripHtml(options[i].text) : ''
      }
      row['Correct Answer'] = options
        .map((opt: any, index: number) => (opt && opt.isCorrect ? index + 1 : null))
        .filter((value: number | null) => value !== null)
        .join(', ')
      return row
    })

    // Always emit the header row even for an empty/unparseable quiz.
    const sheetData = rows.length
      ? rows
      : [{ Question: '', 'Option 1': '', 'Option 2': '', 'Option 3': '',
           'Option 4': '', 'Option 5': '', 'Option 6': '', 'Correct Answer': '' }]

    const worksheet = XLSX.utils.json_to_sheet(sheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions')
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  }

  /** Flatten the course tree to its downloadable resource leaves (any depth). */
  private collectResources(course: IDownloadableCourse): IDownloadableResource[] {
    const out: IDownloadableResource[] = []
    const walk = (nodes: IDownloadableResource[] | undefined) => {
      (nodes || []).forEach(node => {
        if ((node.artifactUrl || node.downloadUrl) && node.contentType !== 'CourseUnit') {
          out.push(node)
        }
        if (node.children && node.children.length) {
          walk(node.children)
        }
      })
    }
    walk(course?.children)
    return out
  }

  private safeName(name: string | undefined): string {
    return (name || '')
      .toString()
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, ' ')
      .slice(0, 120)
  }

  private extFromUrl(url: string): string | null {
    const match = (url || '').split('?')[0].match(/\.([a-zA-Z0-9]+)$/)
    return match ? match[1].toLowerCase() : null
  }

  private extFromMime(mime: string | undefined): string | null {
    const map: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/json': 'json',
      'video/mp4': 'mp4',
      'application/vnd.ekstep.html-archive': 'zip',
      'application/zip': 'zip',
      'application/epub': 'epub',
      'application/x-mpegURL': 'm3u8',
    }
    return (mime && map[mime]) || null
  }

  /** Ensure a unique entry name inside the zip (appends "(n)" before the ext). */
  private makeUnique(fileName: string, used: Set<string>): string {
    if (!used.has(fileName)) {
      used.add(fileName)
      return fileName
    }
    const dot = fileName.lastIndexOf('.')
    const base = dot > 0 ? fileName.slice(0, dot) : fileName
    const ext = dot > 0 ? fileName.slice(dot) : ''
    let i = 1
    let candidate = `${base} (${i})${ext}`
    while (used.has(candidate)) {
      i += 1
      candidate = `${base} (${i})${ext}`
    }
    used.add(candidate)
    return candidate
  }

  private stripHtml(value: string | undefined): string {
    return (value || '').toString().replace(/<[^>]*>/g, '').trim()
  }
}
