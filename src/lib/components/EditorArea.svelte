<script lang="ts">
  import { onMount } from 'svelte'
  import { Editor } from '@tiptap/core'
  import { createExtensions } from '../editor/extensions'
  import { tabStore } from '../stores/tabs.svelte'
  import { appState } from '../stores/app.svelte'

  // Map of tabId -> Editor instance
  const editors = new Map<string, Editor>()
  // Map of tabId -> DOM element
  const editorElements = new Map<string, HTMLElement>()

  let container: HTMLElement | undefined = $state()
  let activeEditorId = $state('')

  // Track active tab changes and create/show editors
  $effect(() => {
    const tab = tabStore.activeTab
    if (!tab || !container) return

    // Hide all editors
    for (const [id, el] of editorElements) {
      el.style.display = id === tab.id ? 'block' : 'none'
    }

    // Create editor if it doesn't exist
    if (!editors.has(tab.id)) {
      createEditorForTab(tab.id, tab.content, tab.isMarkdown)
    }

    // Show the active editor
    const el = editorElements.get(tab.id)
    if (el) {
      el.style.display = 'block'
      editors.get(tab.id)?.commands.focus()
    }

    activeEditorId = tab.id
  })

  // Apply zoom level to editors
  $effect(() => {
    const fontSize = appState.editorFontSize
    for (const el of editorElements.values()) {
      const pm = el.querySelector('.ProseMirror') as HTMLElement | null
      if (pm) pm.style.fontSize = `${fontSize}px`
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
      }
    }
  })

  function createEditorForTab(tabId: string, content: string, isMarkdown: boolean) {
    if (!container) return

    const wrapper = document.createElement('div')
    wrapper.className = 'editor-instance'
    wrapper.style.display = 'none'
    wrapper.style.height = '100%'
    container.appendChild(wrapper)
    editorElements.set(tabId, wrapper)

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

    // Set content
    if (isMarkdown && content) {
      editor.commands.setContent(content)
    } else if (!isMarkdown && content) {
      const html = content
        .split('\n')
        .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
        .join('')
      editor.commands.setContent(html)
    }

    // Mark as saved content (initial load shouldn't be dirty)
    const tab = tabStore.getTabById(tabId)
    if (tab) {
      const md = editor.storage.markdown.getMarkdown()
      tab.content = md
      tab.savedContent = md
    }

    // Apply zoom
    const pm = wrapper.querySelector('.ProseMirror') as HTMLElement | null
    if (pm) pm.style.fontSize = `${appState.editorFontSize}px`

    editors.set(tabId, editor)

    // Initial counts
    appState.characterCount = editor.storage.characterCount.characters()
    const pos = getCursorPosition(editor)
    tabStore.updateCursorPosition(tabId, pos.line, pos.col)
  }

  function getCursorPosition(editor: Editor): { line: number; col: number } {
    const { from } = editor.state.selection
    const text = editor.state.doc.textBetween(0, from, '\n')
    const lines = text.split('\n')
    return {
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    }
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
    const editor = getActiveEditor()
    if (editor) {
      editor.chain().focus().insertContent(text).run()
    }
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
</style>
