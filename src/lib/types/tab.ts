export interface SourceEditorExports {
  setContent(text: string): void
  focus(): void
  insertText(text: string): void
  goToLine(lineNum: number): void
  getLineCount(): number
  getContent(): string
  getTextarea(): HTMLTextAreaElement | undefined
}

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
