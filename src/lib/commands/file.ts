import type { Editor } from '@tiptap/core'
import { openFileDialog, saveFileDialog, readFile, writeFile } from '../services/file-service'
import { detectLineEnding } from '../editor/markdown-utils'
import { tabStore } from '../stores/tabs.svelte'
import { markManualSaveStart, markManualSaveEnd } from '../services/auto-save'
import type { TabData } from '../types/tab'

export async function handleOpen() {
  const path = await openFileDialog()
  if (!path) return
  await handleOpenPath(path)
}

export async function handleOpenPath(path: string) {
  // Check if file is already open
  const existing = tabStore.findTabByPath(path)
  if (existing) {
    tabStore.setActiveTab(existing.id)
    return
  }

  const { content, encoding } = await readFile(path)
  const isMarkdown = /\.(md|markdown)$/i.test(path)
  const lineEnding = detectLineEnding(content)
  tabStore.createTab(path, content, isMarkdown, encoding, lineEnding)
}

function getContentForSave(tab: TabData, editors: Map<string, Editor>): string {
  // In source mode, tab.content is always up-to-date from the textarea
  if (tab.viewMode === 'source') {
    return tab.content
  }
  const editor = editors.get(tab.id)
  if (!editor) return tab.content
  if (tab.isMarkdown) {
    return editor.storage.markdown.getMarkdown()
  } else {
    return editor.getText()
  }
}

export async function handleSave(tab: TabData, editors: Map<string, Editor>) {
  if (tab.filePath) {
    markManualSaveStart(tab.id)
    try {
      const content = getContentForSave(tab, editors)
      await writeFile(tab.filePath, content, tab.encoding, tab.lineEnding)
      tabStore.updateContent(tab.id, content)
      tabStore.markSaved(tab.id, content)
    } finally {
      markManualSaveEnd(tab.id)
    }
  } else {
    await handleSaveAs(tab, editors)
  }
}

export async function handleSaveAs(tab: TabData, editors: Map<string, Editor>) {
  const path = await saveFileDialog(tab.fileName)
  if (!path) return
  const isMarkdown = /\.(md|markdown)$/i.test(path)

  let content: string
  if (tab.viewMode === 'source') {
    content = tab.content
  } else {
    const editor = editors.get(tab.id)
    if (editor) {
      content = isMarkdown ? editor.storage.markdown.getMarkdown() : editor.getText()
    } else {
      content = tab.content
    }
  }

  await writeFile(path, content, tab.encoding, tab.lineEnding)
  tabStore.updateTabFilePath(tab.id, path, isMarkdown)
  tabStore.updateContent(tab.id, content)
  tabStore.markSaved(tab.id, content)
}
