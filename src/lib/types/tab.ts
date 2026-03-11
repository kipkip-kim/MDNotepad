export interface TabData {
  id: string
  filePath: string | null
  fileName: string
  content: string
  savedContent: string
  isMarkdown: boolean
  viewMode: 'wysiwyg' | 'source'
  encoding: string
  lineEnding: 'CRLF' | 'LF'
  cursorPosition: { line: number; col: number }
  scrollTop: number
}
