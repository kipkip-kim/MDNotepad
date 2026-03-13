import type { TabData } from '../types/tab'

class TabStore {
  tabs = $state<TabData[]>([])
  activeTabId = $state<string>('')

  get activeTab(): TabData | undefined {
    return this.tabs.find((t) => t.id === this.activeTabId)
  }

  get isDirty(): boolean {
    const tab = this.activeTab
    return tab ? tab.content !== tab.savedContent : false
  }

  constructor() {
    // Start with one empty tab
    this.createTab()
  }

  createTab(
    filePath?: string | null,
    content?: string,
    isMarkdown?: boolean,
    encoding?: string,
    lineEnding?: 'CRLF' | 'LF'
  ): string {
    const id = crypto.randomUUID()
    const tab: TabData = {
      id,
      filePath: filePath ?? null,
      fileName: filePath ? filePath.split(/[/\\]/).pop()! : 'Untitled',
      content: content ?? '',
      savedContent: content ?? '',
      isMarkdown: isMarkdown ?? true,
      viewMode: 'wysiwyg',
      encoding: encoding ?? 'UTF-8',
      lineEnding: lineEnding ?? 'CRLF',
      cursorPosition: { line: 1, col: 1 },
      scrollTop: 0,
    }
    this.tabs.push(tab)
    this.activeTabId = id
    return id
  }

  closeTab(id: string): boolean {
    const idx = this.tabs.findIndex((t) => t.id === id)
    if (idx === -1) return false

    this.tabs.splice(idx, 1)

    // If closed the active tab, activate nearest
    if (this.activeTabId === id) {
      if (this.tabs.length > 0) {
        const newIdx = Math.min(idx, this.tabs.length - 1)
        this.activeTabId = this.tabs[newIdx].id
      } else {
        // Last tab closed - create new empty tab
        this.createTab()
      }
    }

    return true
  }

  setActiveTab(id: string): void {
    this.activeTabId = id
  }

  updateContent(id: string, content: string): void {
    const tab = this.tabs.find((t) => t.id === id)
    if (tab) tab.content = content
  }

  markSaved(id: string, savedContent?: string): void {
    const tab = this.tabs.find((t) => t.id === id)
    if (tab) tab.savedContent = savedContent ?? tab.content
  }

  updateTabFilePath(id: string, newPath: string, isMarkdown: boolean): void {
    const tab = this.tabs.find((t) => t.id === id)
    if (tab) {
      tab.filePath = newPath
      tab.fileName = newPath.split(/[/\\]/).pop()!
      tab.isMarkdown = isMarkdown
    }
  }

  updateCursorPosition(id: string, line: number, col: number): void {
    const tab = this.tabs.find((t) => t.id === id)
    if (tab) tab.cursorPosition = { line, col }
  }

  updateScrollTop(id: string, scrollTop: number): void {
    const tab = this.tabs.find((t) => t.id === id)
    if (tab) tab.scrollTop = scrollTop
  }

  setViewMode(id: string, mode: 'wysiwyg' | 'source'): void {
    const tab = this.tabs.find((t) => t.id === id)
    if (tab) tab.viewMode = mode
  }

  isTabDirty(id: string): boolean {
    const tab = this.tabs.find((t) => t.id === id)
    return tab ? tab.content !== tab.savedContent : false
  }

  getTabById(id: string): TabData | undefined {
    return this.tabs.find((t) => t.id === id)
  }

  reorderTabs(fromIdx: number, toIdx: number): void {
    if (fromIdx === toIdx) return
    const [tab] = this.tabs.splice(fromIdx, 1)
    this.tabs.splice(toIdx, 0, tab)
  }

  nextTab(): void {
    if (this.tabs.length <= 1) return
    const idx = this.tabs.findIndex((t) => t.id === this.activeTabId)
    const next = (idx + 1) % this.tabs.length
    this.activeTabId = this.tabs[next].id
  }

  prevTab(): void {
    if (this.tabs.length <= 1) return
    const idx = this.tabs.findIndex((t) => t.id === this.activeTabId)
    const prev = (idx - 1 + this.tabs.length) % this.tabs.length
    this.activeTabId = this.tabs[prev].id
  }

  /** Check if a file is already open and activate it */
  findTabByPath(filePath: string): TabData | undefined {
    const normalized = filePath.replace(/\\/g, '/').toLowerCase()
    return this.tabs.find(
      (t) => t.filePath?.replace(/\\/g, '/').toLowerCase() === normalized
    )
  }
}

export const tabStore = new TabStore()
