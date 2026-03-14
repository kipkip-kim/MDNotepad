<script lang="ts">
  import { onDestroy, mount, unmount } from 'svelte'
  import { Editor } from '@tiptap/core'
  import { createExtensions } from '../editor/extensions'
  import { tabStore } from '../stores/tabs.svelte'
  import { appState } from '../stores/app.svelte'
  import { settingsStore } from '../stores/settings.svelte'
  import type { SourceEditorExports } from '../types/tab'
  import SourceEditor from './SourceEditor.svelte'

  // Map of tabId -> Editor instance (TipTap)
  const editors = new Map<string, Editor>()
  // Map of tabId -> DOM element (TipTap wrapper)
  const editorElements = new Map<string, HTMLElement>()
  // Map of tabId -> SourceEditor exports
  const sourceEditors = new Map<string, SourceEditorExports>()
  // Map of tabId -> DOM element (source wrapper)
  const sourceElements = new Map<string, HTMLElement>()
  // Track previous view mode per tab for change detection
  const previousViewModes = new Map<string, 'wysiwyg' | 'source'>()

  let container: HTMLElement | undefined = $state()

  // Track active tab changes and create/show editors
  $effect(() => {
    const tab = tabStore.activeTab
    if (!tab || !container) return

    const isSource = tab.viewMode === 'source'

    // Hide all editors (both TipTap and source)
    for (const el of editorElements.values()) {
      el.style.display = 'none'
    }
    for (const el of sourceElements.values()) {
      el.style.display = 'none'
    }

    // Detect view mode change
    const prevMode = previousViewModes.get(tab.id)
    if (prevMode !== undefined && prevMode !== tab.viewMode) {
      syncContentOnModeChange(tab.id, prevMode, tab.viewMode)
    }
    previousViewModes.set(tab.id, tab.viewMode)

    if (isSource) {
      // Source mode
      if (!sourceEditors.has(tab.id)) {
        createSourceEditorForTab(tab.id, tab.content)
      }
      const el = sourceElements.get(tab.id)
      if (el) {
        el.style.display = 'block'
        // Restore scroll position
        if (tab.scrollTop > 0) {
          const ta = el.querySelector('textarea') as HTMLElement | null
          if (ta) ta.scrollTop = tab.scrollTop
        }
      }
      // Update char count from source
      const srcEditor = sourceEditors.get(tab.id)
      if (srcEditor) {
        appState.characterCount = srcEditor.getContent().length
      }
      // Focus source editor (slight delay to ensure mount)
      setTimeout(() => sourceEditors.get(tab.id)?.focus(), 0)
    } else {
      // WYSIWYG mode
      if (!editors.has(tab.id)) {
        createEditorForTab(tab.id, tab.content, tab.isMarkdown)
      }
      const el = editorElements.get(tab.id)
      if (el) {
        el.style.display = 'block'
        // Restore scroll position
        if (tab.scrollTop > 0) {
          el.scrollTop = tab.scrollTop
        }
        editors.get(tab.id)?.commands.focus()
      }
      // Update char count from TipTap
      const editor = editors.get(tab.id)
      if (editor) {
        appState.characterCount = editor.storage.characterCount.characters()
      }
    }

  })

  // Apply zoom level to all editors
  $effect(() => {
    const fontSize = appState.editorFontSize
    for (const el of editorElements.values()) {
      const pm = el.querySelector('.ProseMirror') as HTMLElement | null
      if (pm) pm.style.fontSize = `${fontSize}px`
    }
    // Also update source editors' font size via their wrapper textarea
    for (const el of sourceElements.values()) {
      const ta = el.querySelector('textarea') as HTMLElement | null
      if (ta) ta.style.fontSize = `${fontSize}px`
    }
  })

  // Apply font family from settings
  $effect(() => {
    const fontFamily = settingsStore.editorFontFamily
    for (const el of editorElements.values()) {
      const pm = el.querySelector('.ProseMirror') as HTMLElement | null
      if (pm) pm.style.fontFamily = fontFamily
    }
    for (const el of sourceElements.values()) {
      const ta = el.querySelector('textarea') as HTMLElement | null
      if (ta) ta.style.fontFamily = fontFamily
    }
  })

  // Apply word wrap from settings
  $effect(() => {
    const wrap = settingsStore.wordWrap
    for (const el of editorElements.values()) {
      const pm = el.querySelector('.ProseMirror') as HTMLElement | null
      if (pm) {
        if (wrap) {
          pm.style.whiteSpace = ''
          pm.style.overflowX = ''
        } else {
          pm.style.whiteSpace = 'pre'
          pm.style.overflowX = 'auto'
        }
      }
    }
    for (const el of sourceElements.values()) {
      const ta = el.querySelector('textarea') as HTMLElement | null
      if (ta) {
        if (wrap) {
          ta.style.whiteSpace = 'pre-wrap'
          ta.style.wordWrap = 'break-word'
          ta.style.overflowX = ''
        } else {
          ta.style.whiteSpace = 'pre'
          ta.style.wordWrap = ''
          ta.style.overflowX = 'auto'
        }
      }
    }
  })

  // Apply spell check from settings
  $effect(() => {
    const spellCheck = settingsStore.spellCheck
    for (const el of editorElements.values()) {
      const pm = el.querySelector('.ProseMirror') as HTMLElement | null
      if (pm) pm.setAttribute('spellcheck', String(spellCheck))
    }
    for (const el of sourceElements.values()) {
      const ta = el.querySelector('textarea') as HTMLElement | null
      if (ta) ta.setAttribute('spellcheck', String(spellCheck))
    }
  })

  // Clean up destroyed tabs
  $effect(() => {
    const tabIds = new Set(tabStore.tabs.map((t) => t.id))
    for (const [id, editor] of editors) {
      if (!tabIds.has(id)) {
        editor.destroy()
        editors.delete(id)
        const el = editorElements.get(id)
        el?.remove()
        editorElements.delete(id)
        previousViewModes.delete(id)
      }
    }
    for (const [id, comp] of sourceEditors) {
      if (!tabIds.has(id)) {
        unmount(comp)
        sourceEditors.delete(id)
        const el = sourceElements.get(id)
        el?.remove()
        sourceElements.delete(id)
        previousViewModes.delete(id)
      }
    }
  })

  onDestroy(() => {
    for (const editor of editors.values()) {
      editor.destroy()
    }
    editors.clear()
    editorElements.clear()
    for (const comp of sourceEditors.values()) {
      unmount(comp)
    }
    sourceEditors.clear()
    sourceElements.clear()
    previousViewModes.clear()
  })

  function syncContentOnModeChange(
    tabId: string,
    from: 'wysiwyg' | 'source',
    to: 'wysiwyg' | 'source'
  ) {
    if (from === 'wysiwyg' && to === 'source') {
      // Get markdown from TipTap and push to source
      const editor = editors.get(tabId)
      if (editor) {
        const md = editor.storage.markdown.getMarkdown()
        tabStore.updateContent(tabId, md)
        const srcEditor = sourceEditors.get(tabId)
        if (srcEditor) {
          srcEditor.setContent(md)
        }
        // If source editor doesn't exist yet, it'll be created with tab.content
      }
    } else if (from === 'source' && to === 'wysiwyg') {
      // Push current tab.content into TipTap
      const tab = tabStore.getTabById(tabId)
      if (!tab) return
      const editor = editors.get(tabId)
      if (editor) {
        editor.commands.setContent(tab.content, false)
        // Update char count
        appState.characterCount = editor.storage.characterCount.characters()
      }
    }
  }

  function createEditorForTab(tabId: string, content: string, isMarkdown: boolean) {
    if (!container) return

    const wrapper = document.createElement('div')
    wrapper.className = 'editor-instance'
    wrapper.style.display = 'none'
    wrapper.style.height = '100%'
    container.appendChild(wrapper)
    editorElements.set(tabId, wrapper)

    // Track scroll position
    wrapper.addEventListener('scroll', () => {
      tabStore.updateScrollTop(tabId, wrapper.scrollTop)
    })

    const editor = new Editor({
      element: wrapper,
      extensions: createExtensions(),
      content: '',
      onTransaction: () => {
        // No-op for reactivity - we use direct state updates
      },
      onUpdate: ({ editor: ed }) => {
        const md = ed.storage.markdown.getMarkdown()
        tabStore.updateContent(tabId, md)
        appState.characterCount = ed.storage.characterCount.characters()
      },
      onSelectionUpdate: ({ editor: ed }) => {
        const pos = getCursorPosition(ed)
        tabStore.updateCursorPosition(tabId, pos.line, pos.col)
      },
    })

    // Set content (emitUpdate=false to prevent triggering onUpdate during init)
    if (isMarkdown && content) {
      editor.commands.setContent(content, false)
    } else if (!isMarkdown && content) {
      const html = content
        .split('\n')
        .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
        .join('')
      editor.commands.setContent(html, false)
    }

    // Mark as saved content (initial load shouldn't be dirty)
    // Use store API instead of direct $state mutation to avoid cascading effects
    const md = editor.storage.markdown.getMarkdown()
    tabStore.updateContent(tabId, md)
    tabStore.markSaved(tabId, md)

    // Apply current settings to newly created editor
    const pm = wrapper.querySelector('.ProseMirror') as HTMLElement | null
    if (pm) {
      pm.style.fontSize = `${appState.editorFontSize}px`
      pm.style.fontFamily = settingsStore.editorFontFamily
      pm.setAttribute('spellcheck', String(settingsStore.spellCheck))
      if (!settingsStore.wordWrap) {
        pm.style.whiteSpace = 'pre'
        pm.style.overflowX = 'auto'
      }
    }

    editors.set(tabId, editor)

    // Initial counts
    appState.characterCount = editor.storage.characterCount.characters()
    const pos = getCursorPosition(editor)
    tabStore.updateCursorPosition(tabId, pos.line, pos.col)
  }

  function createSourceEditorForTab(tabId: string, content: string) {
    if (!container) return

    const wrapper = document.createElement('div')
    wrapper.className = 'source-instance'
    wrapper.style.display = 'none'
    wrapper.style.height = '100%'
    container.appendChild(wrapper)
    sourceElements.set(tabId, wrapper)

    const comp = mount(SourceEditor, {
      target: wrapper,
      props: {
        content,
        oncontentchange: (newContent: string) => {
          tabStore.updateContent(tabId, newContent)
        },
        oncursorchange: (line: number, col: number) => {
          tabStore.updateCursorPosition(tabId, line, col)
        },
        oncharcount: (count: number) => {
          // Only update if this tab is still active
          if (tabStore.activeTabId === tabId) {
            appState.characterCount = count
          }
        },
      },
    })

    sourceEditors.set(tabId, comp as SourceEditorExports)

    // Apply current settings to newly created source editor
    const ta = wrapper.querySelector('textarea') as HTMLElement | null
    if (ta) {
      ta.style.fontSize = `${appState.editorFontSize}px`
      ta.style.fontFamily = settingsStore.editorFontFamily
      ta.setAttribute('spellcheck', String(settingsStore.spellCheck))
      if (settingsStore.wordWrap) {
        ta.style.whiteSpace = 'pre-wrap'
        ta.style.wordWrap = 'break-word'
      } else {
        ta.style.whiteSpace = 'pre'
        ta.style.overflowX = 'auto'
      }

      // Track scroll position
      ta.addEventListener('scroll', () => {
        tabStore.updateScrollTop(tabId, ta.scrollTop)
      })
    }
  }

  function getCursorPosition(editor: Editor): { line: number; col: number } {
    const { from } = editor.state.selection
    let line = 0
    let col = 1

    editor.state.doc.descendants((node, pos) => {
      if (node.isTextblock) {
        line++
        const contentStart = pos + 1
        const contentEnd = pos + node.nodeSize - 1
        if (from >= contentStart && from <= contentEnd) {
          col = from - contentStart + 1
          return false
        }
      }
      return true
    })

    return { line: Math.max(1, line), col }
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  /** Get the editor for a specific tab (used by file commands, slash commands etc.) */
  export function getEditor(tabId: string): Editor | undefined {
    return editors.get(tabId)
  }

  /** Get the active editor */
  export function getActiveEditor(): Editor | undefined {
    return tabStore.activeTab ? editors.get(tabStore.activeTab.id) : undefined
  }

  /** Get editors map (used by file save) */
  export function getEditors(): Map<string, Editor> {
    return editors
  }

  /** Insert text at cursor position in the active editor */
  export function insertText(text: string) {
    const tab = tabStore.activeTab
    if (!tab) return

    if (tab.viewMode === 'source') {
      const srcEditor = sourceEditors.get(tab.id)
      if (srcEditor) srcEditor.insertText(text)
    } else {
      const editor = getActiveEditor()
      if (editor) {
        editor.chain().focus().insertContent(text).run()
      }
    }
  }

  /** Go to a specific line number */
  export function goToLine(lineNum: number) {
    const tab = tabStore.activeTab
    if (!tab) return

    if (tab.viewMode === 'source') {
      const srcEditor = sourceEditors.get(tab.id)
      if (srcEditor) srcEditor.goToLine(lineNum)
    } else {
      const editor = getActiveEditor()
      if (!editor) return
      const doc = editor.state.doc
      let currentLine = 0
      let targetPos = 1
      doc.descendants((node, pos) => {
        if (node.isTextblock) {
          currentLine++
          if (currentLine === lineNum) {
            targetPos = pos + 1
            return false
          }
        }
        return true
      })
      editor.commands.focus()
      editor.commands.setTextSelection(targetPos)
    }
  }

  /** Get total line count for the active editor */
  export function getLineCount(): number {
    const tab = tabStore.activeTab
    if (!tab) return 0

    if (tab.viewMode === 'source') {
      const srcEditor = sourceEditors.get(tab.id)
      return srcEditor?.getLineCount() ?? 0
    } else {
      const editor = getActiveEditor()
      if (!editor) return 0
      let count = 0
      editor.state.doc.descendants((node) => {
        if (node.isTextblock) count++
        return true
      })
      return count
    }
  }

  /** Get source editor for a tab */
  export function getSourceEditor(tabId: string): SourceEditorExports | undefined {
    return sourceEditors.get(tabId)
  }
</script>

<div class="editor-area" bind:this={container}></div>

<style>
  .editor-area {
    flex: 1;
    overflow: hidden;
    background: var(--bg-card);
    margin: 0 8px;
    border-radius: var(--radius) var(--radius) 0 0;
    position: relative;
  }

  .editor-area :global(.editor-instance) {
    overflow-y: auto;
  }

  .editor-area :global(.ProseMirror) {
    min-height: 100%;
    outline: none;
  }

  .editor-area :global(.source-instance) {
    overflow: hidden;
  }
</style>
