import { loadStore } from './portable'
import { tabStore } from '../stores/tabs.svelte'
import { readFile } from './file-service'
import type { Editor } from '@tiptap/core'

interface SessionTab {
  filePath: string | null
  content: string | null
  isDirty: boolean
  isMarkdown: boolean
  viewMode: 'wysiwyg' | 'source'
  encoding: string
  lineEnding: 'CRLF' | 'LF'
  cursorPosition: { line: number; col: number }
  scrollTop: number
}

interface SessionData {
  tabs: SessionTab[]
  activeIndex: number
  savedAt: number
}

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export async function saveSession(editors: Map<string, Editor>): Promise<void> {
  try {
    const sessionTabs: SessionTab[] = tabStore.tabs.map((tab) => {
      let content: string | null = null
      const dirty = tabStore.isTabDirty(tab.id)

      if (tab.filePath) {
        // File-backed tab: save content only if dirty (unsaved edits)
        if (dirty) {
          if (tab.viewMode === 'wysiwyg') {
            const editor = editors.get(tab.id)
            content = editor ? editor.storage.markdown.getMarkdown() : tab.content
          } else {
            content = tab.content
          }
        }
      } else {
        // Untitled tab: always save content if non-empty
        if (tab.viewMode === 'wysiwyg') {
          const editor = editors.get(tab.id)
          content = editor ? editor.storage.markdown.getMarkdown() : tab.content
        } else {
          content = tab.content
        }
        if (!content || content.trim() === '') content = null
      }

      return {
        filePath: tab.filePath,
        content,
        isDirty: dirty,
        isMarkdown: tab.isMarkdown,
        viewMode: tab.viewMode,
        encoding: tab.encoding,
        lineEnding: tab.lineEnding,
        cursorPosition: tab.cursorPosition,
        scrollTop: tab.scrollTop,
      }
    })

    const activeIndex = tabStore.tabs.findIndex((t) => t.id === tabStore.activeTabId)

    const data: SessionData = {
      tabs: sessionTabs,
      activeIndex: Math.max(0, activeIndex),
      savedAt: Date.now(),
    }

    const store = await loadStore('session.json')
    await store.set('session', data)
    await store.save()
  } catch {
    // Ignore session save errors
  }
}

export async function restoreSession(): Promise<boolean> {
  try {
    const store = await loadStore('session.json')
    const data = await store.get<SessionData>('session')
    if (!data || !data.tabs || data.tabs.length === 0) return false

    // Skip stale sessions
    if (Date.now() - data.savedAt > SESSION_MAX_AGE_MS) return false

    // Track mapping: original index -> restored tab ID
    const indexToId = new Map<number, string>()

    for (let i = 0; i < data.tabs.length; i++) {
      const sessionTab = data.tabs[i]
      try {
        if (sessionTab.filePath) {
          // File-backed tab: check if already open
          const existing = tabStore.findTabByPath(sessionTab.filePath)
          if (existing) {
            indexToId.set(i, existing.id)
            continue
          }

          let content: string
          let encoding: string
          try {
            const result = await readFile(sessionTab.filePath)
            content = result.content
            encoding = result.encoding
          } catch {
            // File deleted/moved — use dirty content if available, else skip
            if (sessionTab.isDirty && sessionTab.content) {
              content = sessionTab.content
              encoding = sessionTab.encoding
            } else {
              continue
            }
          }

          const id = tabStore.createTab(
            sessionTab.filePath,
            content,
            sessionTab.isMarkdown,
            encoding,
            sessionTab.lineEnding
          )

          // If we have dirty content, apply it over the disk content
          if (sessionTab.isDirty && sessionTab.content) {
            tabStore.updateContent(id, sessionTab.content)
          }

          const tab = tabStore.getTabById(id)
          if (tab) {
            tab.viewMode = sessionTab.viewMode
            tab.cursorPosition = sessionTab.cursorPosition
            tab.scrollTop = sessionTab.scrollTop
          }
          indexToId.set(i, id)
        } else if (sessionTab.content) {
          // Untitled tab with content
          const id = tabStore.createTab(
            null,
            sessionTab.content,
            sessionTab.isMarkdown,
            sessionTab.encoding,
            sessionTab.lineEnding
          )
          const tab = tabStore.getTabById(id)
          if (tab) {
            tab.viewMode = sessionTab.viewMode
            tab.cursorPosition = sessionTab.cursorPosition
            tab.scrollTop = sessionTab.scrollTop
          }
          indexToId.set(i, id)
        }
        // Skip untitled tabs with no content
      } catch {
        // Skip tabs that fail to restore
        continue
      }
    }

    if (indexToId.size === 0) return false

    // Remove the default empty tab created by TabStore constructor
    const restoredIds = new Set(indexToId.values())
    const defaultTab = tabStore.tabs.find((t) => !restoredIds.has(t.id))
    if (defaultTab && !tabStore.isTabDirty(defaultTab.id) && !defaultTab.filePath) {
      tabStore.closeTab(defaultTab.id)
    }

    // Restore active tab using correct index mapping
    const activeId = indexToId.get(data.activeIndex)
    if (activeId) {
      tabStore.setActiveTab(activeId)
    }

    return true
  } catch {
    return false
  }
}
