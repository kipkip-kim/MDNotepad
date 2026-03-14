import type { Editor } from '@tiptap/core'
import { tabStore } from '../stores/tabs.svelte'
import { writeFile } from './file-service'

const AUTO_SAVE_INTERVAL = 30_000 // 30 seconds

let intervalId: ReturnType<typeof setInterval> | null = null
let running = false

// Set of tab IDs currently being manually saved — auto-save skips these
const manuallySaving = new Set<string>()

export function startAutoSave(getEditors: () => Map<string, Editor> | undefined): void {
  stopAutoSave()

  intervalId = setInterval(() => {
    if (running) return
    autoSaveDirtyTabs(getEditors)
  }, AUTO_SAVE_INTERVAL)
}

export function stopAutoSave(): void {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}

/** Mark a tab as being manually saved so auto-save skips it */
export function markManualSaveStart(tabId: string): void {
  manuallySaving.add(tabId)
}

/** Clear manual save lock for a tab */
export function markManualSaveEnd(tabId: string): void {
  manuallySaving.delete(tabId)
}

async function autoSaveDirtyTabs(
  getEditors: () => Map<string, Editor> | undefined
): Promise<void> {
  running = true
  try {
    const editors = getEditors()
    if (!editors) return

    // Snapshot tab list to avoid mutation during async iteration
    const tabs = [...tabStore.tabs]

    for (const tab of tabs) {
      if (!tab.filePath || !tabStore.isTabDirty(tab.id)) continue
      // Skip tabs being manually saved to prevent race condition
      if (manuallySaving.has(tab.id)) continue

      try {
        let content: string
        if (tab.viewMode === 'source') {
          content = tab.content
        } else {
          const editor = editors.get(tab.id)
          if (editor) {
            content = tab.isMarkdown
              ? editor.storage.markdown.getMarkdown()
              : editor.getText()
          } else {
            content = tab.content
          }
        }

        await writeFile(tab.filePath, content, tab.encoding, tab.lineEnding)
        // Re-check: if manual save happened during writeFile, skip markSaved
        if (manuallySaving.has(tab.id)) continue
        tabStore.updateContent(tab.id, content)
        tabStore.markSaved(tab.id, content)
      } catch (err) {
        console.warn(`Auto-save failed for ${tab.fileName}:`, err)
      }
    }
  } finally {
    running = false
  }
}
